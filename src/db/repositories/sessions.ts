import { and, asc, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import { withTransaction, type DbHandle } from '..';
import type { Exercise, Session } from '../schema';
import { exerciseLogs, exercises, series, sessions } from '../schema';
import type {
  LogDetail,
  SessionDetail,
  SessionInput,
  SessionLogInput,
  SessionSummary,
} from '../../shared/types';
import { exerciseTypesById } from './exercises';
import { NotFoundError, ValidationError } from './errors';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function assertDate(date: string): void {
  if (!DATE_RE.test(date)) throw new ValidationError('Fecha inválida (usa yyyy-mm-dd).');
}

function validateLogs(logs: SessionLogInput[], exerciseMap: Map<number, Exercise>): void {
  for (const log of logs) {
    const exercise = exerciseMap.get(log.exerciseId);
    if (!exercise) throw new ValidationError('Hay un ejercicio que no existe o no es tuyo.');

    if (exercise.type === 'cardio') {
      if (log.durationMin === null || !(log.durationMin > 0)) {
        throw new ValidationError(`"${exercise.name}": indica los minutos de cardio.`);
      }
      if (log.sets.length > 0) {
        throw new ValidationError(`"${exercise.name}": el cardio no admite series.`);
      }
      if (log.distanceKm !== null && log.distanceKm < 0) {
        throw new ValidationError(`"${exercise.name}": la distancia no puede ser negativa.`);
      }
    } else {
      if (log.durationMin !== null || log.distanceKm !== null) {
        throw new ValidationError(`"${exercise.name}": un ejercicio de pesas no lleva duración.`);
      }
      if (log.sets.length === 0) {
        throw new ValidationError(`"${exercise.name}": añade al menos una serie.`);
      }
      for (const set of log.sets) {
        if (set.weightKg === null && set.reps === null) {
          throw new ValidationError(`"${exercise.name}": cada serie necesita peso o repeticiones.`);
        }
        if (set.weightKg !== null && (set.weightKg < 0 || !Number.isFinite(set.weightKg))) {
          throw new ValidationError(`"${exercise.name}": peso inválido.`);
        }
        if (set.reps !== null && (!Number.isInteger(set.reps) || set.reps <= 0)) {
          throw new ValidationError(`"${exercise.name}": las repeticiones deben ser un entero positivo.`);
        }
      }
    }
  }
}

/** Borra los logs de una sesión y sus series (sin depender de foreign_keys). */
async function clearSessionLogs(h: DbHandle, sessionId: number): Promise<void> {
  await h.exec(
    `DELETE FROM series WHERE exercise_log_id IN (
       SELECT id FROM exercise_logs WHERE session_id = ?
     )`,
    [sessionId],
    'run',
  );
  await h.db.delete(exerciseLogs).where(eq(exerciseLogs.sessionId, sessionId));
}

/** Guarda una sesión completa haciendo upsert por (usuario, fecha). */
export async function saveSession(
  h: DbHandle,
  userId: number,
  input: SessionInput,
): Promise<number> {
  await validateSessionInput(h, userId, input);
  let sessionId = 0;
  await withTransaction(h.exec, async () => {
    sessionId = await writeSession(h, userId, input);
  });
  return sessionId;
}

export async function validateSessionInput(
  h: DbHandle,
  userId: number,
  input: SessionInput,
): Promise<void> {
  assertDate(input.date);

  const uniqueIds = [...new Set(input.logs.map((log) => log.exerciseId))];
  const exerciseMap = await exerciseTypesById(h, uniqueIds);

  for (const id of uniqueIds) {
    const exercise = exerciseMap.get(id);
    if (!exercise || (exercise.userId !== null && exercise.userId !== userId)) {
      throw new ValidationError('Hay un ejercicio que no existe o no es tuyo.');
    }
  }

  validateLogs(input.logs, exerciseMap);
}

/**
 * Upsert sin transacción propia: el llamador debe envolverlo en
 * withTransaction (lo usan saveSession y la importación de backups).
 */
export async function writeSession(
  h: DbHandle,
  userId: number,
  input: SessionInput,
): Promise<number> {
  assertDate(input.date);

  let sessionId = 0;

  const existing: Session[] = await h.db
    .select()
    .from(sessions)
    .where(and(eq(sessions.userId, userId), eq(sessions.date, input.date)))
    .limit(1);

  if (existing[0]) {
    sessionId = existing[0].id;
    await h.db
      .update(sessions)
      .set({ notes: input.notes?.trim() || null })
      .where(eq(sessions.id, sessionId));
    await clearSessionLogs(h, sessionId);
  } else {
    const inserted = await h.db
      .insert(sessions)
      .values({
        userId,
        date: input.date,
        notes: input.notes?.trim() || null,
        createdAt: new Date().toISOString(),
      })
      .returning({ id: sessions.id });
    const row = inserted[0];
    if (!row) throw new Error('No se pudo crear la sesión.');
    sessionId = row.id;
  }

  for (const [index, log] of input.logs.entries()) {
    const insertedLog = await h.db
      .insert(exerciseLogs)
      .values({
        sessionId,
        exerciseId: log.exerciseId,
        order: index,
        durationMin: log.durationMin,
        distanceKm: log.distanceKm,
      })
      .returning({ id: exerciseLogs.id });

    const logRow = insertedLog[0];
    if (!logRow) throw new Error('No se pudo guardar el ejercicio.');

    if (log.sets.length > 0) {
      await h.db.insert(series).values(
        log.sets.map((set, setIndex) => ({
          exerciseLogId: logRow.id,
          setNumber: setIndex + 1,
          weightKg: set.weightKg,
          reps: set.reps,
        })),
      );
    }
  }

  return sessionId;
}

export interface ListOptions {
  from?: string;
  to?: string;
}

export async function listSessions(
  h: DbHandle,
  userId: number,
  options: ListOptions = {},
): Promise<SessionSummary[]> {
  const conditions = [eq(sessions.userId, userId)];
  if (options.from) conditions.push(gte(sessions.date, options.from));
  if (options.to) conditions.push(lte(sessions.date, options.to));

  const rows = await h.db
    .select()
    .from(sessions)
    .where(and(...conditions))
    .orderBy(desc(sessions.date));

  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);

  const logRows = await h.db
    .select({
      sessionId: exerciseLogs.sessionId,
      durationMin: exerciseLogs.durationMin,
    })
    .from(exerciseLogs)
    .where(inArray(exerciseLogs.sessionId, ids));

  const bySession = new Map<number, { count: number; minutes: number }>();
  for (const log of logRows) {
    const current = bySession.get(log.sessionId) ?? { count: 0, minutes: 0 };
    current.count += 1;
    current.minutes += log.durationMin ?? 0;
    bySession.set(log.sessionId, current);
  }

  return rows.map((row) => {
    const stats = bySession.get(row.id) ?? { count: 0, minutes: 0 };
    return {
      id: row.id,
      date: row.date,
      notes: row.notes,
      exerciseCount: stats.count,
      totalMinutes: Math.round(stats.minutes * 10) / 10,
    };
  });
}

/** Sesiones completas (logs + series) en un rango, ordenadas por fecha desc. */
export async function listSessionDetails(
  h: DbHandle,
  userId: number,
  options: ListOptions = {},
): Promise<SessionDetail[]> {
  const conditions = [eq(sessions.userId, userId)];
  if (options.from) conditions.push(gte(sessions.date, options.from));
  if (options.to) conditions.push(lte(sessions.date, options.to));

  const sessionRows = await h.db
    .select()
    .from(sessions)
    .where(and(...conditions))
    .orderBy(desc(sessions.date));

  if (sessionRows.length === 0) return [];

  const sessionIds = sessionRows.map((row) => row.id);
  const logRows = await h.db
    .select({
      id: exerciseLogs.id,
      sessionId: exerciseLogs.sessionId,
      exerciseId: exerciseLogs.exerciseId,
      order: exerciseLogs.order,
      durationMin: exerciseLogs.durationMin,
      distanceKm: exerciseLogs.distanceKm,
      exerciseName: exercises.name,
      exerciseType: exercises.type,
      libraryId: exercises.libraryId,
    })
    .from(exerciseLogs)
    .innerJoin(exercises, eq(exerciseLogs.exerciseId, exercises.id))
    .where(inArray(exerciseLogs.sessionId, sessionIds))
    .orderBy(asc(exerciseLogs.order));

  const logIds = logRows.map((row) => row.id);
  const setRows =
    logIds.length > 0
      ? await h.db
          .select()
          .from(series)
          .where(inArray(series.exerciseLogId, logIds))
          .orderBy(asc(series.setNumber))
      : [];

  const setsByLog = new Map<number, LogDetail['sets']>();
  for (const set of setRows) {
    const list = setsByLog.get(set.exerciseLogId) ?? [];
    list.push({
      id: set.id,
      setNumber: set.setNumber,
      weightKg: set.weightKg,
      reps: set.reps,
    });
    setsByLog.set(set.exerciseLogId, list);
  }

  const logsBySession = new Map<number, LogDetail[]>();
  for (const row of logRows) {
    const list = logsBySession.get(row.sessionId) ?? [];
    list.push({
      id: row.id,
      exerciseId: row.exerciseId,
      exerciseName: row.exerciseName,
      exerciseType: row.exerciseType,
      libraryId: row.libraryId,
      order: row.order,
      durationMin: row.durationMin,
      distanceKm: row.distanceKm,
      sets: setsByLog.get(row.id) ?? [],
    });
    logsBySession.set(row.sessionId, list);
  }

  return sessionRows.map((row) => ({
    id: row.id,
    date: row.date,
    notes: row.notes,
    logs: logsBySession.get(row.id) ?? [],
  }));
}

export async function getSessionByDate(
  h: DbHandle,
  userId: number,
  date: string,
): Promise<SessionDetail | null> {
  const details = await listSessionDetails(h, userId, { from: date, to: date });
  return details[0] ?? null;
}

export async function deleteSession(
  h: DbHandle,
  userId: number,
  sessionId: number,
): Promise<void> {
  const rows = await h.db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)));
  if (rows.length === 0) throw new NotFoundError('Sesión no encontrada.');

  await withTransaction(h.exec, async () => {
    await clearSessionLogs(h, sessionId);
    await h.db.delete(sessions).where(eq(sessions.id, sessionId));
  });
}
