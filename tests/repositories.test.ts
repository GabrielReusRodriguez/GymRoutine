import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import type { Exercise } from '../src/db/schema';
import { createTestDb, type TestDb } from './helpers/sqljs';
import { authenticate, changePassword, createUser, deleteUser } from '../src/db/repositories/users';
import {
  createExercise,
  deleteExercise,
  getExercise,
  listAllExercisesForUser,
  listVisibleExercises,
  updateExercise,
} from '../src/db/repositories/exercises';
import {
  deleteSession,
  getSessionByDate,
  listSessionDetails,
  saveSession,
} from '../src/db/repositories/sessions';
import { exportUserData, importUserData } from '../src/db/repositories/backup';
import type { SessionInput } from '../src/shared/types';

let db: TestDb;

beforeEach(async () => {
  db = await createTestDb();
});

afterEach(() => {
  db.close();
});

async function makeUser(email: string, name = 'Test'): Promise<number> {
  const user = await createUser(db.handle, { email, name, password: 'contraseña-segura' });
  return user.id;
}

async function globalByLibraryId(userId: number, libraryId: string): Promise<Exercise> {
  const all = await listAllExercisesForUser(db.handle, userId);
  const found = all.find((exercise) => exercise.libraryId === libraryId);
  if (!found) throw new Error(`No existe el ejercicio global ${libraryId}`);
  return found;
}

function weightsSession(date: string, exerciseId: number): SessionInput {
  return {
    date,
    notes: null,
    logs: [{ exerciseId, durationMin: null, distanceKm: null, sets: [{ weightKg: 80, reps: 5 }, { weightKg: 85, reps: 3 }] }],
  };
}

describe('usuarios', () => {
  it('crea la cuenta y autentica con argon2id', async () => {
    const user = await createUser(db.handle, {
      email: 'Ana@Example.com',
      name: 'Ana',
      password: 'contraseña-segura',
    });
    expect(user.email).toBe('ana@example.com');

    const authenticated = await authenticate(db.handle, 'ANA@example.com', 'contraseña-segura');
    expect(authenticated.id).toBe(user.id);

    await expect(authenticate(db.handle, 'ana@example.com', 'incorrecta')).rejects.toThrow(
      /incorrectos/,
    );
  });

  it('rechaza emails duplicados y contraseñas débiles', async () => {
    await makeUser('ana@example.com');
    await expect(makeUser('ANA@example.com')).rejects.toThrow(/Ya existe/);
    await expect(
      createUser(db.handle, { email: 'b@example.com', name: 'Bea', password: 'corta' }),
    ).rejects.toThrow(/8 caracteres/);
  });

  it('cambia la contraseña y borra el perfil conservando el catálogo global', async () => {
    const userId = await makeUser('ana@example.com');
    await changePassword(db.handle, userId, 'contraseña-segura', 'nueva-contraseña');

    await expect(authenticate(db.handle, 'ana@example.com', 'contraseña-segura')).rejects.toThrow();
    await expect(authenticate(db.handle, 'ana@example.com', 'nueva-contraseña')).resolves.toBeTruthy();

    const bench = await globalByLibraryId(userId, 'barbell-bench-press');
    await saveSession(db.handle, userId, weightsSession('2026-01-05', bench.id));
    await deleteUser(db.handle, userId);

    const remaining = await db.handle.db.select().from((await import('../src/db/schema')).exercises);
    expect(remaining.every((exercise) => exercise.userId === null)).toBe(true);
    expect(remaining.length).toBeGreaterThan(50);
  });
});

describe('catálogo de ejercicios', () => {
  it('aísla los ejercicios propios entre usuarios', async () => {
    const ana = await makeUser('ana@example.com');
    const luis = await makeUser('luis@example.com');

    const own = await createExercise(db.handle, ana, {
      name: 'Press banca Smith',
      type: 'weights',
      muscleGroup: 'pectorales',
    });

    const anaList = await listVisibleExercises(db.handle, ana);
    const luisList = await listVisibleExercises(db.handle, luis);
    expect(anaList.some((exercise) => exercise.id === own.id)).toBe(true);
    expect(luisList.some((exercise) => exercise.id === own.id)).toBe(false);

    await expect(getExercise(db.handle, luis, own.id)).rejects.toThrow(/no encontrado/);
  });

  it('no permite renombrar ni borrar ejercicios globales', async () => {
    const userId = await makeUser('ana@example.com');
    const bench = await globalByLibraryId(userId, 'barbell-bench-press');

    await expect(
      updateExercise(db.handle, userId, bench.id, {
        name: 'Otro',
        type: 'weights',
        muscleGroup: 'pectorales',
      }),
    ).rejects.toThrow(/propios/);

    await expect(deleteExercise(db.handle, userId, bench.id)).rejects.toThrow(/propios/);
  });

  it('oculta un ejercicio propio en uso en lugar de borrarlo', async () => {
    const userId = await makeUser('ana@example.com');
    const own = await createExercise(db.handle, userId, {
      name: 'Mi máquina rara',
      type: 'weights',
      muscleGroup: 'dorsal',
    });

    await saveSession(db.handle, userId, weightsSession('2026-01-06', own.id));

    const first = await deleteExercise(db.handle, userId, own.id);
    expect(first).toBe('hidden');

    const visible = await listVisibleExercises(db.handle, userId);
    expect(visible.some((exercise) => exercise.id === own.id)).toBe(false);
  });

  it('borra un ejercicio propio sin uso', async () => {
    const userId = await makeUser('ana@example.com');
    const own = await createExercise(db.handle, userId, {
      name: 'Ejercicio temporal',
      type: 'weights',
      muscleGroup: 'biceps',
    });

    expect(await deleteExercise(db.handle, userId, own.id)).toBe('deleted');
    await expect(getExercise(db.handle, userId, own.id)).rejects.toThrow();
  });
});

describe('sesiones', () => {
  it('guarda series y las recupera con el ejercicio', async () => {
    const userId = await makeUser('ana@example.com');
    const bench = await globalByLibraryId(userId, 'barbell-bench-press');

    await saveSession(db.handle, userId, weightsSession('2026-01-05', bench.id));
    const session = await getSessionByDate(db.handle, userId, '2026-01-05');

    expect(session).not.toBeNull();
    expect(session!.logs).toHaveLength(1);
    expect(session!.logs[0]!.exerciseName).toBe('Press banca con barra');
    expect(session!.logs[0]!.sets.map((set) => [set.weightKg, set.reps])).toEqual([
      [80, 5],
      [85, 3],
    ]);
  });

  it('hace upsert por fecha: vuelve a guardar el mismo día y reemplaza los logs', async () => {
    const userId = await makeUser('ana@example.com');
    const bench = await globalByLibraryId(userId, 'barbell-bench-press');

    const firstId = await saveSession(db.handle, userId, weightsSession('2026-01-05', bench.id));
    const secondId = await saveSession(db.handle, userId, {
      date: '2026-01-05',
      notes: 'segunda visita',
      logs: [
        {
          exerciseId: bench.id,
          durationMin: null,
          distanceKm: null,
          sets: [{ weightKg: 90, reps: 1 }],
        },
      ],
    });

    expect(secondId).toBe(firstId);

    const session = await getSessionByDate(db.handle, userId, '2026-01-05');
    expect(session!.notes).toBe('segunda visita');
    expect(session!.logs).toHaveLength(1);
    expect(session!.logs[0]!.sets).toHaveLength(1);
    expect(session!.logs[0]!.sets[0]!.weightKg).toBe(90);
  });

  it('valida cardio (duración obligatoria, sin series)', async () => {
    const userId = await makeUser('ana@example.com');
    const cardio = (await listAllExercisesForUser(db.handle, userId)).find(
      (exercise) => exercise.type === 'cardio',
    )!;

    await expect(
      saveSession(db.handle, userId, {
        date: '2026-01-07',
        notes: null,
        logs: [{ exerciseId: cardio.id, durationMin: null, distanceKm: null, sets: [] }],
      }),
    ).rejects.toThrow(/minutos/);

    await expect(
      saveSession(db.handle, userId, {
        date: '2026-01-07',
        notes: null,
        logs: [
          {
            exerciseId: cardio.id,
            durationMin: 30,
            distanceKm: null,
            sets: [{ weightKg: 10, reps: 10 }],
          },
        ],
      }),
    ).rejects.toThrow(/no admite series/);

    await saveSession(db.handle, userId, {
      date: '2026-01-07',
      notes: null,
      logs: [{ exerciseId: cardio.id, durationMin: 30, distanceKm: 5.2, sets: [] }],
    });

    const session = await getSessionByDate(db.handle, userId, '2026-01-07');
    expect(session!.logs[0]!.durationMin).toBe(30);
    expect(session!.logs[0]!.distanceKm).toBe(5.2);
  });

  it('rechaza pesas sin series y con duración', async () => {
    const userId = await makeUser('ana@example.com');
    const bench = await globalByLibraryId(userId, 'barbell-bench-press');

    await expect(
      saveSession(db.handle, userId, {
        date: '2026-01-08',
        notes: null,
        logs: [{ exerciseId: bench.id, durationMin: null, distanceKm: null, sets: [] }],
      }),
    ).rejects.toThrow(/al menos una serie/);

    await expect(
      saveSession(db.handle, userId, {
        date: '2026-01-08',
        notes: null,
        logs: [
          {
            exerciseId: bench.id,
            durationMin: 20,
            distanceKm: null,
            sets: [{ weightKg: 60, reps: 10 }],
          },
        ],
      }),
    ).rejects.toThrow(/no lleva duración/);
  });

  it('no permite usar el ejercicio propio de otro usuario', async () => {
    const ana = await makeUser('ana@example.com');
    const luis = await makeUser('luis@example.com');
    const own = await createExercise(db.handle, ana, {
      name: 'Ejercicio de Ana',
      type: 'weights',
      muscleGroup: 'gluteo',
    });

    await expect(
      saveSession(db.handle, luis, weightsSession('2026-01-09', own.id)),
    ).rejects.toThrow(/no existe o no es tuyo/);
  });

  it('lista el histórico ordenado y borra la sesión con sus series', async () => {
    const userId = await makeUser('ana@example.com');
    const bench = await globalByLibraryId(userId, 'barbell-bench-press');

    await saveSession(db.handle, userId, weightsSession('2026-01-05', bench.id));
    await saveSession(db.handle, userId, weightsSession('2026-01-12', bench.id));

    const details = await listSessionDetails(db.handle, userId);
    expect(details.map((session) => session.date)).toEqual(['2026-01-12', '2026-01-05']);

    await deleteSession(db.handle, userId, details[0]!.id);

    const seriesCount = await db.handle.exec('SELECT COUNT(*) FROM series', [], 'get');
    expect(Number(seriesCount.rows[0]![0])).toBe(2);
  });
});

describe('export / import', () => {
  it('exporta el perfil y lo restaura en otro usuario', async () => {
    const ana = await makeUser('ana@example.com');
    const luis = await makeUser('luis@example.com');
    const bench = await globalByLibraryId(ana, 'barbell-bench-press');
    const own = await createExercise(db.handle, ana, {
      name: 'Mi máquina',
      type: 'weights',
      muscleGroup: 'cuadriceps',
    });

    await saveSession(db.handle, ana, {
      date: '2026-02-01',
      notes: 'buen día',
      logs: [
        { exerciseId: bench.id, durationMin: null, distanceKm: null, sets: [{ weightKg: 100, reps: 3 }] },
        { exerciseId: own.id, durationMin: null, distanceKm: null, sets: [{ weightKg: 120, reps: 8 }] },
      ],
    });

    const backup = await exportUserData(db.handle, ana);
    expect(backup.sessions).toHaveLength(1);
    expect(backup.user.email).toBe('ana@example.com');

    await importUserData(db.handle, luis, backup);

    const imported = await getSessionByDate(db.handle, luis, '2026-02-01');
    expect(imported).not.toBeNull();
    expect(imported!.logs).toHaveLength(2);
    expect(imported!.logs.map((log) => log.exerciseName).sort()).toEqual(
      ['Mi máquina', 'Press banca con barra'].sort(),
    );

    // El catálogo propio se recrea para Luis, no se comparte con Ana.
    const luisExercises = await listVisibleExercises(db.handle, luis);
    expect(luisExercises.some((exercise) => exercise.name === 'Mi máquina')).toBe(true);
  });
});
