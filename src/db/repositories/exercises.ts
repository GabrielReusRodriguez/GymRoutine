import { and, asc, eq, inArray, isNull, or } from 'drizzle-orm';
import type { DbHandle } from '..';
import type { Exercise } from '../schema';
import { exerciseLogs, exercises } from '../schema';
import type { ExerciseInput } from '../../shared/types';
import { MUSCLES } from '../../library/types';
import { NotFoundError, ValidationError } from './errors';

function normalizeInput(input: ExerciseInput): ExerciseInput {
  const name = input.name.trim();
  if (name.length < 2) throw new ValidationError('El nombre del ejercicio es demasiado corto.');
  if (input.type !== 'cardio' && input.type !== 'weights') {
    throw new ValidationError('Tipo de ejercicio inválido.');
  }
  if (!MUSCLES.includes(input.muscleGroup) && input.muscleGroup !== 'cardio') {
    throw new ValidationError('Grupo muscular inválido.');
  }
  if (input.type === 'cardio' && input.muscleGroup !== 'cardio') {
    throw new ValidationError('Los ejercicios de cardio deben usar el grupo "cardio".');
  }
  if (input.type === 'weights' && input.muscleGroup === 'cardio') {
    throw new ValidationError('Elige un grupo muscular para el ejercicio de pesas.');
  }
  return {
    name,
    type: input.type,
    muscleGroup: input.muscleGroup,
    notes: input.notes?.trim() || null,
    libraryId: input.libraryId ?? null,
  };
}

/** Catálogo visible: globales del seed + propios del usuario, sin ocultos. */
export async function listVisibleExercises(
  h: DbHandle,
  userId: number,
): Promise<Exercise[]> {
  return h.db
    .select()
    .from(exercises)
    .where(
      and(
        eq(exercises.hidden, false),
        or(isNull(exercises.userId), eq(exercises.userId, userId)),
      ),
    )
    .orderBy(asc(exercises.name));
}

/** Igual que el anterior pero incluye ocultos (para el catálogo propio). */
export async function listOwnExercises(h: DbHandle, userId: number): Promise<Exercise[]> {
  return h.db
    .select()
    .from(exercises)
    .where(and(eq(exercises.userId, userId), eq(exercises.hidden, false)))
    .orderBy(asc(exercises.name));
}

export async function listAllExercisesForUser(
  h: DbHandle,
  userId: number,
): Promise<Exercise[]> {
  return h.db
    .select()
    .from(exercises)
    .where(or(isNull(exercises.userId), eq(exercises.userId, userId)))
    .orderBy(asc(exercises.name));
}

export async function getExercise(
  h: DbHandle,
  userId: number,
  exerciseId: number,
): Promise<Exercise> {
  const rows = await h.db
    .select()
    .from(exercises)
    .where(and(eq(exercises.id, exerciseId), or(isNull(exercises.userId), eq(exercises.userId, userId))));
  const row = rows[0];
  if (!row) throw new NotFoundError('Ejercicio no encontrado.');
  return row;
}

export async function createExercise(
  h: DbHandle,
  userId: number,
  input: ExerciseInput,
): Promise<Exercise> {
  const data = normalizeInput(input);
  const duplicate = await h.db
    .select({ id: exercises.id })
    .from(exercises)
    .where(and(eq(exercises.userId, userId), eq(exercises.name, data.name)));
  if (duplicate.length > 0) {
    throw new ValidationError('Ya tienes un ejercicio con ese nombre.');
  }

  const inserted = await h.db
    .insert(exercises)
    .values({
      userId,
      name: data.name,
      type: data.type,
      muscleGroup: data.muscleGroup,
      libraryId: data.libraryId ?? null,
      notes: data.notes ?? null,
      hidden: false,
      createdAt: new Date().toISOString(),
    })
    .returning();

  const created = inserted[0];
  if (!created) throw new Error('No se pudo crear el ejercicio.');
  return created;
}

export async function updateExercise(
  h: DbHandle,
  userId: number,
  exerciseId: number,
  input: ExerciseInput,
): Promise<Exercise> {
  const data = normalizeInput(input);
  const updated = await h.db
    .update(exercises)
    .set({
      name: data.name,
      type: data.type,
      muscleGroup: data.muscleGroup,
      notes: data.notes ?? null,
    })
    .where(and(eq(exercises.id, exerciseId), eq(exercises.userId, userId)))
    .returning();

  const row = updated[0];
  if (!row) throw new NotFoundError('Solo puedes editar ejercicios propios.');
  return row;
}

/**
 * Borra un ejercicio propio o lo oculta si ya está en uso. Los ejercicios
 * globales nunca se borran (Spec §3).
 */
export async function deleteExercise(
  h: DbHandle,
  userId: number,
  exerciseId: number,
): Promise<'deleted' | 'hidden'> {
  const rows = await h.db
    .select()
    .from(exercises)
    .where(and(eq(exercises.id, exerciseId), eq(exercises.userId, userId)));
  const exercise = rows[0];
  if (!exercise) throw new NotFoundError('Solo puedes borrar ejercicios propios.');

  const used = await h.db
    .select({ id: exerciseLogs.id })
    .from(exerciseLogs)
    .where(eq(exerciseLogs.exerciseId, exerciseId))
    .limit(1);

  if (used.length > 0) {
    await h.db.update(exercises).set({ hidden: true }).where(eq(exercises.id, exerciseId));
    return 'hidden';
  }

  await h.db.delete(exercises).where(eq(exercises.id, exerciseId));
  return 'deleted';
}

/** Tipos por id, para validar sesiones en una sola consulta. */
export async function exerciseTypesById(
  h: DbHandle,
  ids: number[],
): Promise<Map<number, Exercise>> {
  if (ids.length === 0) return new Map();
  const rows = await h.db.select().from(exercises).where(inArray(exercises.id, ids));
  return new Map(rows.map((row) => [row.id, row]));
}
