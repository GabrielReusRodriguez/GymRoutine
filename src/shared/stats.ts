import type { LogDetail, SessionDetail } from './types';

/** 1RM estimado con la fórmula de Epley. Reps 0 o peso nulo no estiman. */
export function epley1RM(weightKg: number | null, reps: number | null): number | null {
  if (weightKg === null || reps === null) return null;
  if (weightKg <= 0 || reps <= 0) return null;
  return weightKg * (1 + reps / 30);
}

export interface WeekPoint {
  /** Lunes de la semana en ISO yyyy-mm-dd. */
  week: string;
  value: number;
}

/** Lunes (UTC) de la semana ISO a la que pertenece la fecha. */
export function weekStart(dateISO: string): string {
  const date = new Date(`${dateISO}T00:00:00Z`);
  const day = (date.getUTCDay() + 6) % 7; // 0 = lunes
  date.setUTCDate(date.getUTCDate() - day);
  return date.toISOString().slice(0, 10);
}

function addToWeeks(map: Map<string, number>, date: string, value: number): void {
  const key = weekStart(date);
  map.set(key, (map.get(key) ?? 0) + value);
}

function toSortedPoints(map: Map<string, number>): WeekPoint[] {
  return [...map.entries()]
    .map(([week, value]) => ({ week, value }))
    .sort((a, b) => a.week.localeCompare(b.week));
}

/** Volumen semanal de pesas: Σ(peso × reps). */
export function weeklyStrengthVolume(sessions: SessionDetail[]): WeekPoint[] {
  const map = new Map<string, number>();
  for (const session of sessions) {
    for (const log of session.logs) {
      if (log.exerciseType !== 'weights') continue;
      const volume = log.sets.reduce(
        (sum, set) => sum + (set.weightKg ?? 0) * (set.reps ?? 0),
        0,
      );
      addToWeeks(map, session.date, volume);
    }
  }
  return toSortedPoints(map);
}

export function weeklyCardioMinutes(sessions: SessionDetail[]): WeekPoint[] {
  const map = new Map<string, number>();
  for (const session of sessions) {
    for (const log of session.logs) {
      if (log.exerciseType !== 'cardio' || !log.durationMin) continue;
      addToWeeks(map, session.date, log.durationMin);
    }
  }
  return toSortedPoints(map);
}

export function weeklyCardioDistance(sessions: SessionDetail[]): WeekPoint[] {
  const map = new Map<string, number>();
  for (const session of sessions) {
    for (const log of session.logs) {
      if (log.exerciseType !== 'cardio' || !log.distanceKm) continue;
      addToWeeks(map, session.date, log.distanceKm);
    }
  }
  return toSortedPoints(map);
}

export interface ExerciseProgressPoint {
  date: string;
  best1RM: number;
  topWeight: number;
  volume: number;
}

/** Progreso por sesión de un ejercicio de pesas. */
export function exerciseProgress(
  sessions: SessionDetail[],
  exerciseId: number,
): ExerciseProgressPoint[] {
  const points: ExerciseProgressPoint[] = [];

  for (const session of sessions) {
    const logs = session.logs.filter(
      (log) => log.exerciseId === exerciseId && log.exerciseType === 'weights',
    );
    if (logs.length === 0) continue;

    let best1RM = 0;
    let topWeight = 0;
    let volume = 0;

    for (const log of logs) {
      for (const set of log.sets) {
        const estimate = epley1RM(set.weightKg, set.reps);
        if (estimate !== null) best1RM = Math.max(best1RM, estimate);
        if (set.weightKg !== null) topWeight = Math.max(topWeight, set.weightKg);
        volume += (set.weightKg ?? 0) * (set.reps ?? 0);
      }
    }

    points.push({ date: session.date, best1RM, topWeight, volume });
  }

  return points.sort((a, b) => a.date.localeCompare(b.date));
}

/** Mejor serie (por 1RM estimado) de un log. */
export function bestSetOfLog(log: LogDetail): {
  weightKg: number | null;
  reps: number | null;
  estimated1RM: number | null;
} | null {
  let best: { weightKg: number | null; reps: number | null; estimated1RM: number | null } | null =
    null;
  for (const set of log.sets) {
    const estimated1RM = epley1RM(set.weightKg, set.reps);
    if (!best || (estimated1RM ?? 0) > (best.estimated1RM ?? 0)) {
      best = { weightKg: set.weightKg, reps: set.reps, estimated1RM };
    }
  }
  return best;
}

/** Totales por ejercicio para la tabla de estadísticas. */
export interface ExerciseTotal {
  exerciseId: number;
  exerciseName: string;
  type: 'cardio' | 'weights';
  sessions: number;
  totalVolume: number;
  totalMinutes: number;
  totalDistanceKm: number;
  best1RM: number;
}

export function exerciseTotals(sessions: SessionDetail[]): ExerciseTotal[] {
  const map = new Map<number, ExerciseTotal>();

  for (const session of sessions) {
    for (const log of session.logs) {
      const current =
        map.get(log.exerciseId) ??
        ({
          exerciseId: log.exerciseId,
          exerciseName: log.exerciseName,
          type: log.exerciseType,
          sessions: 0,
          totalVolume: 0,
          totalMinutes: 0,
          totalDistanceKm: 0,
          best1RM: 0,
        } satisfies ExerciseTotal);

      current.sessions += 1;
      if (log.exerciseType === 'cardio') {
        current.totalMinutes += log.durationMin ?? 0;
        current.totalDistanceKm += log.distanceKm ?? 0;
      } else {
        for (const set of log.sets) {
          current.totalVolume += (set.weightKg ?? 0) * (set.reps ?? 0);
          const estimate = epley1RM(set.weightKg, set.reps);
          if (estimate !== null) current.best1RM = Math.max(current.best1RM, estimate);
        }
      }
      map.set(log.exerciseId, current);
    }
  }

  return [...map.values()].sort((a, b) => b.sessions - a.sessions);
}
