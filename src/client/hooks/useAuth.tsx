import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { UserSummary } from '../../shared/types';
import { authenticate, createUser, getUser } from '../../db/repositories/users';
import { useDb } from './useDb';

const SESSION_KEY = 'gym-tracker.session';

interface AuthContextValue {
  user: UserSummary | null;
  /** true cuando ya sabemos si hay sesión restaurada. */
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { email: string; name: string; password: string }) => Promise<void>;
  logout: () => void;
  updateUser: (user: UserSummary) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUserId(): number | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { handle } = useDb();
  const [user, setUser] = useState<UserSummary | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!handle) return;
    const storedId = readStoredUserId();

    if (!storedId) {
      setReady(true);
      return;
    }

    let active = true;
    getUser(handle, storedId)
      .then((found) => {
        if (!active) return;
        if (found) setUser(found);
        else localStorage.removeItem(SESSION_KEY);
      })
      .catch(() => {
        localStorage.removeItem(SESSION_KEY);
      })
      .finally(() => {
        if (active) setReady(true);
      });

    return () => {
      active = false;
    };
  }, [handle]);

  const persist = useCallback((next: UserSummary | null) => {
    setUser(next);
    try {
      if (next) localStorage.setItem(SESSION_KEY, String(next.id));
      else localStorage.removeItem(SESSION_KEY);
    } catch {
      // localStorage puede estar bloqueado; la sesión vive en memoria.
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      if (!handle) throw new Error('La base de datos no está lista');
      const authenticated = await authenticate(handle, email, password);
      persist(authenticated);
    },
    [handle, persist],
  );

  const register = useCallback(
    async (input: { email: string; name: string; password: string }) => {
      if (!handle) throw new Error('La base de datos no está lista');
      const created = await createUser(handle, input);
      persist(created);
    },
    [handle, persist],
  );

  const logout = useCallback(() => persist(null), [persist]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, ready, login, register, logout, updateUser: persist }),
    [user, ready, login, register, logout, persist],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return context;
}
