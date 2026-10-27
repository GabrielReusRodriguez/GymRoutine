import { drizzle } from 'drizzle-orm/sqlite-proxy';
import type { SqlExecutor } from './executor';
import * as schema from './schema';

/**
 * Instancia de Drizzle + el ejecutor subyacente. Los repositorios reciben el
 * handle completo porque las transacciones se manejan con SQL explícito
 * (BEGIN/COMMIT), que Drizzle no expone de forma portable en sqlite-proxy.
 */
export interface DbHandle {
  db: ReturnType<typeof createDb>;
  exec: SqlExecutor;
}

export function createDb(executor: SqlExecutor) {
  return drizzle(executor, { schema });
}

export function createDbHandle(executor: SqlExecutor): DbHandle {
  return { db: createDb(executor), exec: executor };
}

/** Ejecuta `fn` dentro de una transacción y hace rollback si lanza. */
export async function withTransaction<T>(
  exec: SqlExecutor,
  fn: () => Promise<T>,
): Promise<T> {
  await exec('BEGIN', [], 'run');
  try {
    const result = await fn();
    await exec('COMMIT', [], 'run');
    return result;
  } catch (error) {
    await exec('ROLLBACK', [], 'run');
    throw error;
  }
}

export type { SqlExecutor };
export * as schema from './schema';
