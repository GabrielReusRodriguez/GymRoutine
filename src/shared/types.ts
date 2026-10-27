import type { Muscle } from '../library/types';

export type ExerciseType = 'cardio' | 'weights';

/** Fila de serie tal como la maneja la UI. */
export interface SetEntry {
  weightKg: number | null;
  reps: number | null;
}

/** Log de un ejercicio dentro de una sesión, con datos de presentación. */
export interface LogDetail {
  id: number;
  exerciseId: number;
  exerciseName: string;
  exerciseType: ExerciseType;
  libraryId: string | null;
  order: number;
  durationMin: number | null;
  distanceKm: number | null;
  sets: Array<{
    id: number;
    setNumber: number;
    weightKg: number | null;
    reps: number | null;
  }>;
}

export interface SessionDetail {
  id: number;
  date: string;
  notes: string | null;
  logs: LogDetail[];
}

export interface SessionSummary {
  id: number;
  date: string;
  notes: string | null;
  exerciseCount: number;
  totalMinutes: number;
}

/** Entrada para guardar una sesión completa (upsert por fecha). */
export interface SessionLogInput {
  exerciseId: number;
  durationMin: number | null;
  distanceKm: number | null;
  sets: SetEntry[];
}

export interface SessionInput {
  date: string;
  notes: string | null;
  logs: SessionLogInput[];
}

export interface ExerciseInput {
  name: string;
  type: ExerciseType;
  muscleGroup: Muscle;
  notes?: string | null;
  libraryId?: string | null;
}

export interface UserSummary {
  id: number;
  email: string;
  name: string;
}

/** Describe cómo se exporta e importa la copia de seguridad (Spec §10). */
export interface BackupExercise {
  name: string;
  type: ExerciseType;
  muscleGroup: string;
  libraryId: string | null;
  notes: string | null;
}

export interface BackupLog {
  exercise: string;
  durationMin: number | null;
  distanceKm: number | null;
  sets: SetEntry[];
}

export interface BackupSession {
  date: string;
  notes: string | null;
  logs: BackupLog[];
}

export interface BackupFile {
  format: 'gym-tracker';
  version: 1;
  exportedAt: string;
  user: { email: string; name: string };
  exercises: BackupExercise[];
  sessions: BackupSession[];
}
