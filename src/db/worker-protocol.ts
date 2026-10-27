import type { QueryMethod } from './executor';

/**
 * Protocolo entre el hilo principal y el worker que posee SQLite.
 *
 * SQLite (VFS opfs-sahpool) necesita `FileSystemFileHandle.createSyncAccessHandle`,
 * que solo está disponible en contextos de worker. Por eso la BD vive en un
 * dedicated worker y el hilo principal solo le pasa SQL.
 */

export interface ExecRequest {
  type: 'exec';
  id: number;
  sql: string;
  params: unknown[];
  method: QueryMethod;
}

export type WorkerRequest = ExecRequest;

export type WorkerResponse =
  | { type: 'ready' }
  | { type: 'init-error'; message: string }
  | { type: 'result'; id: number; rows: unknown[][] }
  | { type: 'error'; id: number; message: string };

/** Nombres del VFS y del fichero dentro del pool de OPFS. */
export const VFS_NAME = 'opfs-sahpool';
export const VFS_DIRECTORY = 'gym-tracker';
export const DB_FILENAME = '/gym.sqlite3';
