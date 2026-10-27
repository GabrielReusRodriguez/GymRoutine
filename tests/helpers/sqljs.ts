import initSqlJs from 'sql.js';
import { createDbHandle } from '../../src/db';
import type { SqlExecutor } from '../../src/db/executor';
import { sanitizeParams } from '../../src/db/executor';
import { runMigrations } from '../../src/db/migrations';
import { seedGlobalExercises } from '../../src/db/repositories/seed';
import type { DbHandle } from '../../src/db';

export interface TestDb {
  handle: DbHandle;
  close: () => void;
}

/**
 * BD en memoria con la misma forma que la de producción: mismas migraciones,
 * mismo seed y mismo contrato SqlExecutor. Solo cambia el motor (sql.js).
 */
export async function createTestDb(options: { seed?: boolean } = {}): Promise<TestDb> {
  const SQL = await initSqlJs();
  const database = new SQL.Database();
  database.run('PRAGMA foreign_keys = ON');

  const exec: SqlExecutor = async (sql, params) => {
    const bounds = sanitizeParams(params);
    const statement = database.prepare(sql);
    try {
      if (bounds.length > 0) statement.bind(bounds as never[]);
      const rows: unknown[][] = [];
      while (statement.step()) {
        rows.push(statement.get() as unknown[]);
      }
      return { rows };
    } finally {
      statement.free();
    }
  };

  await runMigrations(exec);
  const handle = createDbHandle(exec);
  if (options.seed !== false) await seedGlobalExercises(handle);

  return { handle, close: () => database.close() };
}
