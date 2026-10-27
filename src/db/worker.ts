import sqlite3InitModule, { type Database, type Sqlite3Static } from '@sqlite.org/sqlite-wasm';
import { createDbHandle } from '.';
import { sanitizeParams, type SqlExecutor } from './executor';
import { runMigrations } from './migrations';
import { seedGlobalExercises } from './repositories/seed';
import {
  DB_FILENAME,
  VFS_DIRECTORY,
  VFS_NAME,
  type WorkerRequest,
  type WorkerResponse,
} from './worker-protocol';

/**
 * Worker dedicado que posee la base de datos SQLite.
 *
 * El VFS `opfs-sahpool` exige `FileSystemFileHandle.createSyncAccessHandle`,
 * que no existe en el hilo principal. Aquí sí está disponible, y además las
 * peticiones se serializan: una transacción (BEGIN…COMMIT) nunca se cruza con
 * otra consulta.
 */

interface WorkerScope {
  postMessage: (message: WorkerResponse) => void;
  addEventListener: (type: 'message', listener: (event: MessageEvent<WorkerRequest>) => void) => void;
}

const scope = self as unknown as WorkerScope;

function post(message: WorkerResponse): void {
  scope.postMessage(message);
}

function createWasmExecutor(database: Database): SqlExecutor {
  return async (sql, params, method) => {
    const bounds = sanitizeParams(params);

    if (method === 'run') {
      database.exec({ sql, bind: bounds as never[] });
      return { rows: [] };
    }

    const rows = database.exec({
      sql,
      bind: bounds as never[],
      rowMode: 'array',
      returnValue: 'resultRows',
    });

    return { rows: rows as unknown[][] };
  };
}

async function openDatabase(): Promise<Database> {
  // Los tipos publicados declaran init() sin argumentos, pero en runtime
  // acepta la configuración de Emscripten (print/locateFile).
  const initSqlite = sqlite3InitModule as unknown as (config: {
    print?: (message: string) => void;
    printErr?: (message: string) => void;
    locateFile?: (file: string) => string;
  }) => Promise<Sqlite3Static>;

  const sqlite3 = await initSqlite({
    print: () => undefined,
    printErr: (message: string) => console.error('[sqlite-wasm]', message),
    // El binario se copia a public/ en predev/prebuild.
    locateFile: (file: string) => `/${file}`,
  });

  const pool = await sqlite3.installOpfsSAHPoolVfs({
    name: VFS_NAME,
    directory: VFS_DIRECTORY,
    initialCapacity: 8,
  });

  const database = new pool.OpfsSAHPoolDb(DB_FILENAME);
  database.exec('PRAGMA foreign_keys = ON');
  return database;
}

async function boot(): Promise<SqlExecutor> {
  const database = await openDatabase();
  const executor = createWasmExecutor(database);

  await runMigrations(executor);
  const handle = createDbHandle(executor);
  await seedGlobalExercises(handle);

  return executor;
}

const ready = boot();
let chain: Promise<void> = Promise.resolve();

scope.addEventListener('message', (event) => {
  const request = event.data;
  if (!request || request.type !== 'exec') return;

  chain = chain.then(async () => {
    try {
      const executor = await ready;
      const { rows } = await executor(request.sql, request.params, request.method);
      post({ type: 'result', id: request.id, rows });
    } catch (error) {
      post({
        type: 'error',
        id: request.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
});

ready.then(
  () => post({ type: 'ready' }),
  (error: unknown) =>
    post({
      type: 'init-error',
      message: error instanceof Error ? error.message : String(error),
    }),
);
