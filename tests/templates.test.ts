import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Exercise } from '../src/db/schema';
import { createTestDb, type TestDb } from './helpers/sqljs';
import { createUser, deleteUser } from '../src/db/repositories/users';
import {
  createExercise,
  deleteExercise,
  getExercise,
  listAllExercisesForUser,
  listVisibleExercises,
} from '../src/db/repositories/exercises';
import { saveSession } from '../src/db/repositories/sessions';
import {
  applyTemplate,
  createTemplate,
  deleteTemplate,
  duplicateTemplate,
  getTemplate,
  listTemplates,
  updateTemplate,
} from '../src/db/repositories/templates';
import { exportUserData, importUserData } from '../src/db/repositories/backup';
import type { TemplateInput } from '../src/shared/types';
import { ERROR_KEYS } from '../src/shared/errors';

let db: TestDb;

beforeEach(async () => {
  db = await createTestDb();
});

afterEach(() => {
  db.close();
});

async function makeUser(email: string): Promise<number> {
  const user = await createUser(db.handle, { email, name: 'Test', password: 'contraseña-segura' });
  return user.id;
}

async function globalByLibraryId(userId: number, libraryId: string): Promise<Exercise> {
  const all = await listAllExercisesForUser(db.handle, userId);
  const found = all.find((exercise) => exercise.libraryId === libraryId);
  if (!found) throw new Error(`No existe el ejercicio global ${libraryId}`);
  return found;
}

async function cardioExercise(userId: number): Promise<Exercise> {
  const all = await listAllExercisesForUser(db.handle, userId);
  const found = all.find((exercise) => exercise.type === 'cardio');
  if (!found) throw new Error('No hay ejercicios de cardio en el seed');
  return found;
}

function weightsItem(exerciseId: number, seriesCount = 3): TemplateInput['items'][number] {
  return {
    exerciseId,
    seriesCount,
    defaultWeightKg: null,
    defaultReps: null,
    durationMin: null,
    distanceKm: null,
  };
}

function cardioItem(exerciseId: number, durationMin: number | null = null): TemplateInput['items'][number] {
  return {
    exerciseId,
    seriesCount: null,
    defaultWeightKg: null,
    defaultReps: null,
    durationMin,
    distanceKm: null,
  };
}

describe('plantillas', () => {
  it('crea, lista, edita y borra plantillas propias', async () => {
    const userId = await makeUser('plantillas@example.com');
    const press = await globalByLibraryId(userId, 'barbell-bench-press');
    const run = await cardioExercise(userId);

    const templateId = await createTemplate(db.handle, userId, {
      name: 'Día de empuje',
      notes: 'Pecho y tríceps',
      items: [weightsItem(press.id, 4), cardioItem(run.id)],
    });

    const list = await listTemplates(db.handle, userId);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: templateId, name: 'Día de empuje', itemCount: 2 });

    const detail = await getTemplate(db.handle, userId, templateId);
    expect(detail.items.map((item) => item.exerciseName)).toEqual([press.name, run.name]);
    expect(detail.items[0]?.seriesCount).toBe(4);
    expect(detail.items[1]?.seriesCount).toBeNull();

    await updateTemplate(db.handle, userId, templateId, {
      name: 'Empuje A',
      notes: null,
      items: [weightsItem(press.id, 2)],
    });
    const updated = await getTemplate(db.handle, userId, templateId);
    expect(updated.name).toBe('Empuje A');
    expect(updated.items).toHaveLength(1);
    expect(updated.items[0]?.seriesCount).toBe(2);

    await deleteTemplate(db.handle, userId, templateId);
    expect(await listTemplates(db.handle, userId)).toHaveLength(0);
  });

  it('no deja ver ni tocar plantillas de otro usuario', async () => {
    const owner = await makeUser('duenio@example.com');
    const intruder = await makeUser('intruso@example.com');
    const press = await globalByLibraryId(owner, 'barbell-bench-press');

    const templateId = await createTemplate(db.handle, owner, {
      name: 'Privada',
      notes: null,
      items: [weightsItem(press.id)],
    });

    expect(await listTemplates(db.handle, intruder)).toHaveLength(0);
    await expect(getTemplate(db.handle, intruder, templateId)).rejects.toThrow(
      ERROR_KEYS.templates.notFound,
    );
    await expect(
      updateTemplate(db.handle, intruder, templateId, {
        name: 'Robada',
        notes: null,
        items: [weightsItem(press.id)],
      }),
    ).rejects.toThrow(ERROR_KEYS.templates.notFound);
    await expect(deleteTemplate(db.handle, intruder, templateId)).rejects.toThrow(
      ERROR_KEYS.templates.notFound,
    );
  });

  it('valida nombre, items y coherencia cardio/pesas', async () => {
    const userId = await makeUser('validacion@example.com');
    const press = await globalByLibraryId(userId, 'barbell-bench-press');
    const run = await cardioExercise(userId);

    await expect(
      createTemplate(db.handle, userId, { name: 'A', notes: null, items: [weightsItem(press.id)] }),
    ).rejects.toThrow(ERROR_KEYS.templates.nameTooShort);

    await expect(
      createTemplate(db.handle, userId, { name: 'Vacía', notes: null, items: [] }),
    ).rejects.toThrow(ERROR_KEYS.templates.empty);

    await expect(
      createTemplate(db.handle, userId, {
        name: 'Cardio con series',
        notes: null,
        items: [{ ...cardioItem(run.id), seriesCount: 3 }],
      }),
    ).rejects.toThrow(ERROR_KEYS.templates.cardioNoSeries);

    await expect(
      createTemplate(db.handle, userId, {
        name: 'Pesas con minutos',
        notes: null,
        items: [{ ...weightsItem(press.id), durationMin: 20 }],
      }),
    ).rejects.toThrow(ERROR_KEYS.templates.weightsNoDuration);

    await expect(
      createTemplate(db.handle, userId, {
        name: 'Cero series',
        notes: null,
        items: [weightsItem(press.id, 0)],
      }),
    ).rejects.toThrow(ERROR_KEYS.templates.seriesRange);

    await createTemplate(db.handle, userId, {
      name: 'Repetida',
      notes: null,
      items: [weightsItem(press.id)],
    });
    await expect(
      createTemplate(db.handle, userId, { name: 'Repetida', notes: null, items: [weightsItem(press.id)] }),
    ).rejects.toThrow(ERROR_KEYS.templates.duplicateName);
    await expect(
      createTemplate(db.handle, userId, {
        name: 'Duplicada por dentro',
        notes: null,
        items: [weightsItem(press.id), weightsItem(press.id)],
      }),
    ).rejects.toThrow(ERROR_KEYS.templates.exerciseDuplicated);
  });

  it('duplica con un nombre libre y los mismos items', async () => {
    const userId = await makeUser('duplicar@example.com');
    const press = await globalByLibraryId(userId, 'barbell-bench-press');

    const id = await createTemplate(db.handle, userId, {
      name: 'Full body',
      notes: null,
      items: [weightsItem(press.id, 5)],
    });
    const copyId = await duplicateTemplate(db.handle, userId, id);
    const copy = await getTemplate(db.handle, userId, copyId);

    expect(copy.name).toBe('Full body (copia)');
    expect(copy.items).toHaveLength(1);
    expect(copy.items[0]?.seriesCount).toBe(5);
  });

  it('aplica la plantilla con el último registro como prellenado', async () => {
    const userId = await makeUser('aplicar@example.com');
    const press = await globalByLibraryId(userId, 'barbell-bench-press');
    const run = await cardioExercise(userId);

    const templateId = await createTemplate(db.handle, userId, {
      name: 'Empuje',
      notes: null,
      items: [weightsItem(press.id, 3), cardioItem(run.id, 20)],
    });

    // Sin historial: usa los valores por defecto de la plantilla (aquí, vacíos).
    const empty = await applyTemplate(db.handle, userId, templateId);
    expect(empty.items[0]?.sets).toHaveLength(3);
    expect(empty.items[0]?.sets[0]).toEqual({ weightKg: null, reps: null });
    expect(empty.items[1]).toMatchObject({ type: 'cardio', durationMin: 20, distanceKm: null });

    // Con historial: prellena peso/reps y minutos del último registro.
    await saveSession(db.handle, userId, {
      date: '2026-03-02',
      notes: null,
      logs: [
        {
          exerciseId: press.id,
          durationMin: null,
          distanceKm: null,
          sets: [
            { weightKg: 80, reps: 5 },
            { weightKg: 85, reps: 3 },
          ],
        },
        { exerciseId: run.id, durationMin: 30, distanceKm: 5.2, sets: [] },
      ],
    });

    const applied = await applyTemplate(db.handle, userId, templateId);
    expect(applied.items[0]?.sets).toEqual([
      { weightKg: 80, reps: 5 },
      { weightKg: 85, reps: 3 },
      // La tercera serie repite la última del historial.
      { weightKg: 85, reps: 3 },
    ]);
    expect(applied.items[1]).toMatchObject({ durationMin: 30, distanceKm: 5.2 });
    expect(applied.skipped).toEqual([]);
  });

  it('usa el registro más reciente del ejercicio', async () => {
    const userId = await makeUser('reciente@example.com');
    const press = await globalByLibraryId(userId, 'barbell-bench-press');
    const templateId = await createTemplate(db.handle, userId, {
      name: 'Pecho',
      notes: null,
      items: [weightsItem(press.id, 1)],
    });

    await saveSession(db.handle, userId, {
      date: '2026-01-05',
      notes: null,
      logs: [
        { exerciseId: press.id, durationMin: null, distanceKm: null, sets: [{ weightKg: 70, reps: 8 }] },
      ],
    });
    await saveSession(db.handle, userId, {
      date: '2026-02-10',
      notes: null,
      logs: [
        { exerciseId: press.id, durationMin: null, distanceKm: null, sets: [{ weightKg: 90, reps: 2 }] },
      ],
    });

    const applied = await applyTemplate(db.handle, userId, templateId);
    expect(applied.items[0]?.sets).toEqual([{ weightKg: 90, reps: 2 }]);
  });

  it('oculta (no borra) un ejercicio que solo usa una plantilla', async () => {
    const userId = await makeUser('oculto@example.com');
    const own = await createExercise(db.handle, userId, {
      name: 'Remo en polea baja',
      type: 'weights',
      muscleGroup: 'dorsal',
    });
    const templateId = await createTemplate(db.handle, userId, {
      name: 'Espalda',
      notes: null,
      items: [weightsItem(own.id)],
    });

    expect(await deleteExercise(db.handle, userId, own.id)).toBe('hidden');
    await expect(getExercise(db.handle, userId, own.id)).resolves.toMatchObject({ hidden: true });

    const detail = await getTemplate(db.handle, userId, templateId);
    expect(detail.items).toHaveLength(1);
    expect(detail.items[0]?.available).toBe(true);

    const visible = await listVisibleExercises(db.handle, userId);
    expect(visible.some((exercise) => exercise.id === own.id)).toBe(false);
  });

  it('exporta e importa plantillas resolviendo ejercicios por nombre', async () => {
    const userId = await makeUser('backup@example.com');
    const press = await globalByLibraryId(userId, 'barbell-bench-press');

    const templateId = await createTemplate(db.handle, userId, {
      name: 'Empuje',
      notes: 'Notas de la plantilla',
      items: [weightsItem(press.id, 4)],
    });
    expect(templateId).toBeGreaterThan(0);

    const backup = await exportUserData(db.handle, userId);
    expect(backup.version).toBe(2);
    expect(backup.templates).toHaveLength(1);
    expect(backup.templates?.[0]?.items[0]).toMatchObject({
      exercise: press.name,
      seriesCount: 4,
    });

    await importUserData(db.handle, userId, backup);

    const list = await listTemplates(db.handle, userId);
    expect(list).toHaveLength(1);
    expect(list[0]?.name).toBe('Empuje');
    expect(list[0]?.itemCount).toBe(1);
    expect(list[0]?.notes).toBe('Notas de la plantilla');

    const restored = await getTemplate(db.handle, userId, list[0]!.id);
    expect(restored.items[0]?.seriesCount).toBe(4);
    expect(restored.items[0]?.exerciseName).toBe(press.name);
  });

  it('borra las plantillas del perfil al eliminar el usuario', async () => {
    const userId = await makeUser('borrar@example.com');
    const press = await globalByLibraryId(userId, 'barbell-bench-press');
    await createTemplate(db.handle, userId, {
      name: 'Temporal',
      notes: null,
      items: [weightsItem(press.id)],
    });

    await deleteUser(db.handle, userId);

    const rows = await db.handle.exec('SELECT COUNT(*) FROM templates', [], 'get');
    expect(Number(rows.rows[0]?.[0] ?? 0)).toBe(0);
    const items = await db.handle.exec('SELECT COUNT(*) FROM template_items', [], 'get');
    expect(Number(items.rows[0]?.[0] ?? 0)).toBe(0);
  });
});
