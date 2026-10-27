import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

/**
 * Esquema Drizzle. Única fuente de verdad del modelo de datos: cualquier
 * cambio aquí exige una nueva entrada en src/db/migrations.
 */

export const users = sqliteTable(
  'users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull(),
    name: text('name').notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [uniqueIndex('users_email_unique').on(t.email)],
);

export const exercises = sqliteTable(
  'exercises',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** NULL = catálogo global (seed). */
    userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: text('type', { enum: ['cardio', 'weights'] }).notNull(),
    muscleGroup: text('muscle_group').notNull(),
    /** Enlace opcional a la biblioteca embebida. */
    libraryId: text('library_id'),
    notes: text('notes'),
    /** Soft-hide: ejercicios en uso no se borran, se ocultan. */
    hidden: integer('hidden', { mode: 'boolean' }).notNull().default(false),
    createdAt: text('created_at').notNull(),
  },
  (t) => [index('exercises_user_idx').on(t.userId)],
);

export const sessions = sqliteTable(
  'sessions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** ISO yyyy-mm-dd. */
    date: text('date').notNull(),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('sessions_user_date_unique').on(t.userId, t.date),
    index('sessions_date_idx').on(t.date),
  ],
);

export const exerciseLogs = sqliteTable(
  'exercise_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    sessionId: integer('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    exerciseId: integer('exercise_id')
      .notNull()
      .references(() => exercises.id),
    order: integer('order').notNull(),
    /** Solo cardio. */
    durationMin: real('duration_min'),
    /** Solo cardio. */
    distanceKm: real('distance_km'),
  },
  (t) => [index('exercise_logs_session_idx').on(t.sessionId)],
);

export const series = sqliteTable(
  'series',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    exerciseLogId: integer('exercise_log_id')
      .notNull()
      .references(() => exerciseLogs.id, { onDelete: 'cascade' }),
    setNumber: integer('set_number').notNull(),
    weightKg: real('weight_kg'),
    reps: integer('reps'),
  },
  (t) => [index('series_log_idx').on(t.exerciseLogId)],
);

/** Plantilla de sesión: lista reutilizable de ejercicios (Spec §3). */
export const templates = sqliteTable(
  'templates',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    notes: text('notes'),
    createdAt: text('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('templates_user_name_unique').on(t.userId, t.name),
    index('templates_user_idx').on(t.userId),
  ],
);

export const templateItems = sqliteTable(
  'template_items',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    templateId: integer('template_id')
      .notNull()
      .references(() => templates.id, { onDelete: 'cascade' }),
    exerciseId: integer('exercise_id')
      .notNull()
      .references(() => exercises.id),
    order: integer('order').notNull(),
    /** Solo pesas: filas de series que se precrean al aplicar. */
    seriesCount: integer('series_count'),
    /** Solo pesas: valores de reserva si no hay historial del ejercicio. */
    defaultWeightKg: real('default_weight_kg'),
    defaultReps: integer('default_reps'),
    /** Solo cardio. */
    durationMin: real('duration_min'),
    /** Solo cardio. */
    distanceKm: real('distance_km'),
  },
  (t) => [
    index('template_items_template_idx').on(t.templateId),
    index('template_items_exercise_idx').on(t.exerciseId),
  ],
);

export type User = typeof users.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type ExerciseLog = typeof exerciseLogs.$inferSelect;
export type WorkSet = typeof series.$inferSelect;
export type Template = typeof templates.$inferSelect;
export type TemplateItem = typeof templateItems.$inferSelect;
