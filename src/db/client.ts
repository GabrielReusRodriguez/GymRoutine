import { createDbHandle, type DbHandle } from '.';
import type { SqlExecutor } from './executor';
import type { WorkerRequest, WorkerResponse } from './worker-protocol';

const LOCK_NAME = 'gym-tracker:db';

/** Error específico cuando otra pestaña tiene la BD abierta (Spec §4). */
export class DbLockedError extends Error {
  constructor() {
    super('La base de datos está abierta en otra pestaña de Gym Tracker.');
    this.name = 'DbLockedError';
  }
}

export class DbOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DbOpenError';
  }
}

let handlePromise: Promise<DbHandle> | null = null;
let releaseLock: (() => void) | null = null;
let activeWorker: Worker | null = null;

/**
 * Abre la BD local (OPFS) una sola vez por pestaña.
 *
 * El lock de pestaña se toma aquí con Web Locks; SQLite se ejecuta en un
 * dedicated worker porque el VFS `opfs-sahpool` necesita API síncrona de
 * OPFS que solo existe en workers.
 */
export async function openDb(): Promise<DbHandle> {
  if (!handlePromise) {
    handlePromise = openInternal();
    // Si falla, permitir reintentos (p. ej. tras cerrar la otra pestaña).
    handlePromise.catch(() => {
      handlePromise = null;
    });
  }
  return handlePromise;
}

async function openInternal(): Promise<DbHandle> {
  await acquireTabLock();

  if (!('storage' in navigator) || typeof navigator.storage.getDirectory !== 'function') {
    throw new DbOpenError(
      'Este navegador no soporta OPFS (almacenamiento privado de origen). Usa un navegador actualizado.',
    );
  }

  const executor = await startWorker();
  return createDbHandle(executor);
}

interface Pending {
  resolve: (rows: unknown[][]) => void;
  reject: (error: Error) => void;
}

/** Arranca el worker de SQLite y devuelve un ejecutor que habla con él. */
function startWorker(): Promise<SqlExecutor> {
  return new Promise<SqlExecutor>((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
    } catch (error) {
      reject(
        new DbOpenError(
          `No se pudo iniciar el worker de la base de datos: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
      );
      return;
    }

    activeWorker = worker;
    const pending = new Map<number, Pending>();
    let nextId = 0;

    const failAll = (error: Error) => {
      for (const entry of pending.values()) entry.reject(error);
      pending.clear();
    };

    worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;

      switch (message.type) {
        case 'ready':
          resolve(createWorkerExecutor(worker, pending, () => nextId++));
          break;
        case 'init-error':
          worker.terminate();
          activeWorker = null;
          reject(new DbOpenError(`No se pudo abrir el almacenamiento local (OPFS). ${message.message}`));
          break;
        case 'result':
        case 'error': {
          const entry = pending.get(message.id);
          if (!entry) return;
          pending.delete(message.id);
          if (message.type === 'result') entry.resolve(message.rows);
          else entry.reject(new Error(message.message));
          break;
        }
      }
    });

    worker.addEventListener('error', (event) => {
      const error = new DbOpenError(
        `El worker de la base de datos falló: ${event.message || 'error desconocido'}`,
      );
      failAll(error);
      worker.terminate();
      activeWorker = null;
      reject(error);
    });
  });
}

function createWorkerExecutor(
  worker: Worker,
  pending: Map<number, Pending>,
  nextId: () => number,
): SqlExecutor {
  return (sql, params, method) =>
    new Promise((resolve, reject) => {
      const id = nextId();
      pending.set(id, {
        resolve: (rows) => resolve({ rows }),
        reject,
      });

      const request: WorkerRequest = { type: 'exec', id, sql, params, method };
      try {
        worker.postMessage(request);
      } catch (error) {
        pending.delete(id);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
}

/** Cierra la BD y libera el lock de pestaña (se usa al recargar/cerrar). */
export async function closeDb(): Promise<void> {
  activeWorker?.terminate();
  activeWorker = null;

  if (releaseLock) {
    releaseLock();
    releaseLock = null;
  }
  handlePromise = null;
}

function acquireTabLock(): Promise<void> {
  const locks = navigator.locks;
  if (!locks) {
    console.warn('[db] Web Locks API no disponible: no se puede garantizar una sola pestaña.');
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    locks
      .request(LOCK_NAME, { ifAvailable: true }, (lock) => {
        if (!lock) {
          reject(new DbLockedError());
          return;
        }

        resolve();
        // Mantiene el lock durante toda la vida de la pestaña.
        return new Promise<void>((release) => {
          releaseLock = release;
        });
      })
      .catch((error) => {
        if (error instanceof DbLockedError) reject(error);
        else reject(new DbOpenError(String(error)));
      });
  });
}
