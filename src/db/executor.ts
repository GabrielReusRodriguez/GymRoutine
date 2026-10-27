/** Método de ejecución que Drizzle pasa al driver de sqlite-proxy. */
export type QueryMethod = 'run' | 'all' | 'get' | 'values';

/** Filas devueltas como arrays de valores, en el orden de columnas del SELECT. */
export interface SqlResult {
  rows: unknown[][];
}

/**
 * Contrato mínimo de acceso a SQLite. Lo implementan:
 *  - el driver del navegador (sqlite-wasm + OPFS), en src/db/client.ts
 *  - el driver de tests (sql.js en memoria), en tests/helpers/sqljs.ts
 */
export type SqlExecutor = (
  sql: string,
  params: unknown[],
  method: QueryMethod,
) => Promise<SqlResult>;

/**
 * Normaliza parámetros para los bindings de SQLite: `undefined` → NULL y
 * booleanos → 0/1. Evita diferencias entre sqlite-wasm y sql.js.
 */
export function sanitizeParams(params: unknown[]): Array<string | number | null> {
  return params.map((value) => {
    if (value === undefined) return null;
    if (typeof value === 'boolean') return value ? 1 : 0;
    if (value === null || typeof value === 'string' || typeof value === 'number') return value;
    return String(value);
  });
}
