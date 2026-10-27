import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { DbLockedError, openDb } from '../../db/client';
import type { DbHandle } from '../../db';

type DbStatus = 'loading' | 'ready' | 'locked' | 'error';

interface DbContextValue {
  handle: DbHandle | null;
  status: DbStatus;
  error: string | null;
  retry: () => void;
}

const DbContext = createContext<DbContextValue | null>(null);

export function DbProvider({ children }: { children: ReactNode }) {
  const [handle, setHandle] = useState<DbHandle | null>(null);
  const [status, setStatus] = useState<DbStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setError(null);

    openDb()
      .then((opened) => {
        if (!active) return;
        setHandle(opened);
        setStatus('ready');
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof DbLockedError) {
          setStatus('locked');
          setError(cause.message);
        } else {
          setStatus('error');
          setError(cause instanceof Error ? cause.message : String(cause));
        }
      });

    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  const value = useMemo<DbContextValue>(
    () => ({ handle, status, error, retry }),
    [handle, status, error, retry],
  );

  return <DbContext.Provider value={value}>{children}</DbContext.Provider>;
}

export function useDb(): DbContextValue {
  const context = useContext(DbContext);
  if (!context) throw new Error('useDb debe usarse dentro de <DbProvider>');
  return context;
}

/** Handle obligatorio para páginas que solo se montan con la BD lista. */
export function useDbHandle(): DbHandle {
  const { handle } = useDb();
  if (!handle) throw new Error('La base de datos aún no está lista');
  return handle;
}
