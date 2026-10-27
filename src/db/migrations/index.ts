import type { SqlExecutor } from '../executor';

/**
 * Migraciones embebidas: la app las aplica al abrir la BD usando
 * PRAGMA user_version como marcador. Nunca edites una migración ya
 * publicada; añade una nueva entrada al final.
 */
export interface Migration {
  version: number;
  statements: string[];
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    statements: [
      `CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
      `CREATE UNIQUE INDEX users_email_unique ON users(email)`,
      `CREATE TABLE exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('cardio', 'weights')),
        muscle_group TEXT NOT NULL,
        library_id TEXT,
        notes TEXT,
        hidden INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1)),
        created_at TEXT NOT NULL
      )`,
      `CREATE INDEX exercises_user_idx ON exercises(user_id)`,
      `CREATE TABLE sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL
      )`,
      `CREATE UNIQUE INDEX sessions_user_date_unique ON sessions(user_id, date)`,
      `CREATE INDEX sessions_date_idx ON sessions(date)`,
      `CREATE TABLE exercise_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        exercise_id INTEGER NOT NULL REFERENCES exercises(id),
        "order" INTEGER NOT NULL,
        duration_min REAL,
        distance_km REAL
      )`,
      `CREATE INDEX exercise_logs_session_idx ON exercise_logs(session_id)`,
      `CREATE TABLE series (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exercise_log_id INTEGER NOT NULL REFERENCES exercise_logs(id) ON DELETE CASCADE,
        set_number INTEGER NOT NULL,
        weight_kg REAL,
        reps INTEGER
      )`,
      `CREATE INDEX series_log_idx ON series(exercise_log_id)`,
    ],
  },
  {
    version: 2,
    statements: [
      `CREATE TABLE templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL
      )`,
      `CREATE UNIQUE INDEX templates_user_name_unique ON templates(user_id, name)`,
      `CREATE INDEX templates_user_idx ON templates(user_id)`,
      `CREATE TABLE template_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
        exercise_id INTEGER NOT NULL REFERENCES exercises(id),
        "order" INTEGER NOT NULL,
        series_count INTEGER,
        default_weight_kg REAL,
        default_reps INTEGER,
        duration_min REAL,
        distance_km REAL
      )`,
      `CREATE INDEX template_items_template_idx ON template_items(template_id)`,
      `CREATE INDEX template_items_exercise_idx ON template_items(exercise_id)`,
    ],
  },
];

export const LATEST_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;

/** Aplica las migraciones pendientes. Idempotente. */
export async function runMigrations(exec: SqlExecutor): Promise<void> {
  // SQLite no permite parametrizar PRAGMA; el valor es una constante nuestra.
  const current = await exec('PRAGMA user_version', [], 'get');
  const applied = Number(current.rows[0]?.[0] ?? 0);

  const pending = MIGRATIONS.filter((m) => m.version > applied);
  if (pending.length === 0) return;

  await exec('BEGIN', [], 'run');
  try {
    for (const migration of pending) {
      for (const statement of migration.statements) {
        await exec(statement, [], 'run');
      }
    }
    await exec(`PRAGMA user_version = ${pending[pending.length - 1]!.version}`, [], 'run');
    await exec('COMMIT', [], 'run');
  } catch (error) {
    await exec('ROLLBACK', [], 'run');
    throw error;
  }
}
