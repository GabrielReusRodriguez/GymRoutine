import { eq, inArray, isNull, or } from 'drizzle-orm';
import { withTransaction, type DbHandle } from '..';
import { normalize } from '../../library';
import type { BackupFile, SessionInput } from '../../shared/types';
import { exerciseLogs, exercises, series, sessions, templateItems, templates } from '../schema';
import { NotFoundError } from './errors';
import { validateSessionInput, listSessionDetails, writeSession } from './sessions';
import { getTemplate, listTemplates, writeTemplate } from './templates';
import { getUser } from './users';

/** Exporta todos los datos del perfil activo (Spec §10). */
export async function exportUserData(h: DbHandle, userId: number): Promise<BackupFile> {
  const user = await getUser(h, userId);
  if (!user) throw new NotFoundError('Usuario no encontrado.');

  const details = await listSessionDetails(h, userId);
  const templateDetails = await Promise.all(
    (await listTemplates(h, userId)).map((summary) => getTemplate(h, userId, summary.id)),
  );

  const usedExerciseIds = new Set([
    ...details.flatMap((session) => session.logs.map((log) => log.exerciseId)),
    ...templateDetails.flatMap((template) => template.items.map((item) => item.exerciseId)),
  ]);

  const usedRows =
    usedExerciseIds.size > 0
      ? await h.db.select().from(exercises).where(inArray(exercises.id, [...usedExerciseIds]))
      : [];

  const ownRows = await h.db.select().from(exercises).where(eq(exercises.userId, userId));
  const byId = new Map<number, (typeof usedRows)[number]>();
  for (const row of [...usedRows, ...ownRows]) byId.set(row.id, row);

  return {
    format: 'gym-tracker',
    version: 2,
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
    templates: templateDetails.map((template) => ({
      name: template.name,
      notes: template.notes,
      items: template.items.map((item) => ({
        exercise: item.exerciseName,
        seriesCount: item.seriesCount,
        defaultWeightKg: item.defaultWeightKg,
        defaultReps: item.defaultReps,
        durationMin: item.durationMin,
        distanceKm: item.distanceKm,
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

    // 2. Vaciar plantillas y ejercicios propios; luego reconstruir el mapa de nombres
    const templateRows = await h.db
      .select({ id: templates.id })
      .from(templates)
      .where(eq(templates.userId, userId));
    if (templateRows.length > 0) {
      await h.db.delete(templateItems).where(
        inArray(
          templateItems.templateId,
          templateRows.map((row) => row.id),
        ),
      );
      await h.db.delete(templates).where(eq(templates.userId, userId));
    }

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

    // 4. Insertar plantillas (los ejercicios ya existen por nombre)
    for (const template of backup.templates ?? []) {
      await writeTemplate(h, userId, {
        name: template.name,
        notes: template.notes,
        items: template.items.map((item) => {
          const exerciseId = idByName.get(normalize(item.exercise));
          if (!exerciseId) {
            throw new Error(`La copia referencia un ejercicio desconocido: ${item.exercise}`);
          }
          return {
            exerciseId,
            seriesCount: item.seriesCount,
            defaultWeightKg: item.defaultWeightKg,
            defaultReps: item.defaultReps,
            durationMin: item.durationMin,
            distanceKm: item.distanceKm,
          };
        }),
      });
    }
  });
}
