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

/** Item de plantilla tal como lo edita la UI. */
export interface TemplateItemInput {
  exerciseId: number;
  /** Solo pesas: filas de series a precrear. */
  seriesCount: number | null;
  /** Solo pesas: valores de reserva si el ejercicio no tiene historial. */
  defaultWeightKg: number | null;
  defaultReps: number | null;
  /** Solo cardio. */
  durationMin: number | null;
  distanceKm: number | null;
}

export interface TemplateInput {
  name: string;
  notes: string | null;
  items: TemplateItemInput[];
}

export interface TemplateItemDetail extends TemplateItemInput {
  id: number;
  order: number;
  exerciseName: string;
  exerciseType: ExerciseType;
  libraryId: string | null;
  /** `false` si el ejercicio se borró del catálogo y el item ya no es aplicable. */
  available: boolean;
}

export interface TemplateSummary {
  id: number;
  name: string;
  notes: string | null;
  itemCount: number;
  createdAt: string;
}

export interface TemplateDetail {
  id: number;
  name: string;
  notes: string | null;
  items: TemplateItemDetail[];
}

/** Ejercicio de una plantilla ya resuelto con el prellenado del último registro. */
export interface TemplateItemPrefill {
  exerciseId: number;
  name: string;
  type: ExerciseType;
  libraryId: string | null;
  durationMin: number | null;
  distanceKm: number | null;
  sets: SetEntry[];
}

export interface TemplateApplication {
  id: number;
  name: string;
  items: TemplateItemPrefill[];
  /** Nombres de ejercicios que ya no existen en el catálogo. */
  skipped: string[];
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

export interface BackupTemplateItem {
  exercise: string;
  seriesCount: number | null;
  defaultWeightKg: number | null;
  defaultReps: number | null;
  durationMin: number | null;
  distanceKm: number | null;
}

export interface BackupTemplate {
  name: string;
  notes: string | null;
  items: BackupTemplateItem[];
}

export interface BackupFile {
  format: 'gym-tracker';
  /** v1 no tenía plantillas; se acepta al importar. */
  version: 1 | 2;
  exportedAt: string;
  user: { email: string; name: string };
  exercises: BackupExercise[];
  sessions: BackupSession[];
  templates?: BackupTemplate[];
}
