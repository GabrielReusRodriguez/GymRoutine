import { eq, inArray, isNull, or } from 'drizzle-orm';
import { withTransaction, type DbHandle } from '..';
import { normalize } from '../../library';
import type { BackupFile, SessionInput } from '../../shared/types';
import { exerciseLogs, exercises, series, sessions } from '../schema';
import { NotFoundError } from './errors';
import { validateSessionInput, listSessionDetails, writeSession } from './sessions';
import { getUser } from './users';

/** Exporta todos los datos del perfil activo (Spec §10). */
export async function exportUserData(h: DbHandle, userId: number): Promise<BackupFile> {
  const user = await getUser(h, userId);
  if (!user) throw new NotFoundError('Usuario no encontrado.');

  const details = await listSessionDetails(h, userId);
  const usedExerciseIds = new Set(
    details.flatMap((session) => session.logs.map((log) => log.exerciseId)),
  );

  const usedRows =
    usedExerciseIds.size > 0
      ? await h.db.select().from(exercises).where(inArray(exercises.id, [...usedExerciseIds]))
      : [];

  const ownRows = await h.db.select().from(exercises).where(eq(exercises.userId, userId));
  const byId = new Map<number, (typeof usedRows)[number]>();
  for (const row of [...usedRows, ...ownRows]) byId.set(row.id, row);

  return {
    format: 'gym-tracker',
    version: 1,
    exportedAt: new Date().toISOString(),
    user: { email: user.email, name: user.name },
    exercises: [...byId.values()].map((row) => ({
      name: row.name,
      type: row.type,
      muscleGroup: row.muscleGroup,
      libraryId: row.libraryId,
      notes: row.notes,
    })),
    sessions: details.map((session) => ({
      date: session.date,
      notes: session.notes,
      logs: session.logs.map((log) => ({
        exercise: log.exerciseName,
        durationMin: log.durationMin,
        distanceKm: log.distanceKm,
        sets: log.sets.map((set) => ({ weightKg: set.weightKg, reps: set.reps })),
      })),
    })),
  };
}

/**
 * Reemplaza los datos del perfil con los de un backup (sin merge, Spec §10).
 * Los ejercicios se resuelven por nombre: si ya existe un global, se reutiliza.
 */
export async function importUserData(
  h: DbHandle,
  userId: number,
  backup: BackupFile,
): Promise<void> {
  const user = await getUser(h, userId);
  if (!user) throw new NotFoundError('Usuario no encontrado.');

  await withTransaction(h.exec, async () => {
    // 1. Vaciar sesiones del usuario
    const sessionRows = await h.db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.userId, userId));
    const sessionIds = sessionRows.map((row) => row.id);

    if (sessionIds.length > 0) {
      const logRows = await h.db
        .select({ id: exerciseLogs.id })
        .from(exerciseLogs)
        .where(inArray(exerciseLogs.sessionId, sessionIds));
      const logIds = logRows.map((row) => row.id);
      if (logIds.length > 0) {
        await h.db.delete(series).where(inArray(series.exerciseLogId, logIds));
      }
      await h.db.delete(exerciseLogs).where(inArray(exerciseLogs.sessionId, sessionIds));
      await h.db.delete(sessions).where(inArray(sessions.id, sessionIds));
    }

    // 2. Vaciar ejercicios propios y reconstruir el mapa de nombres
    await h.db.delete(exercises).where(eq(exercises.userId, userId));

    const allRows = await h.db
      .select()
      .from(exercises)
      .where(or(isNull(exercises.userId), eq(exercises.userId, userId)));
    const idByName = new Map<string, number>();
    for (const row of allRows) {
      if (!idByName.has(normalize(row.name))) idByName.set(normalize(row.name), row.id);
    }

    const now = new Date().toISOString();
    for (const exercise of backup.exercises) {
      const key = normalize(exercise.name);
      if (idByName.has(key)) continue;
      const inserted = await h.db
        .insert(exercises)
        .values({
          userId,
          name: exercise.name,
          type: exercise.type,
          muscleGroup: exercise.muscleGroup,
          libraryId: exercise.libraryId,
          notes: exercise.notes,
          hidden: false,
          createdAt: now,
        })
        .returning({ id: exercises.id });
      const row = inserted[0];
      if (row) idByName.set(key, row.id);
    }

    // 3. Insertar sesiones
    for (const session of backup.sessions) {
      const input: SessionInput = {
        date: session.date,
        notes: session.notes,
        logs: session.logs.map((log) => {
          const exerciseId = idByName.get(normalize(log.exercise));
          if (!exerciseId) {
            throw new Error(`La copia referencia un ejercicio desconocido: ${log.exercise}`);
          }
          return {
            exerciseId,
            durationMin: log.durationMin,
            distanceKm: log.distanceKm,
            sets: log.sets,
          };
        }),
      };
      await validateSessionInput(h, userId, input);
      await writeSession(h, userId, input);
    }
  });
}
