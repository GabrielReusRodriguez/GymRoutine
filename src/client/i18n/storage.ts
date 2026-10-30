import { DEFAULT_LOCALE, detectLocale, isLocale, type Locale } from '../../shared/locale';

const GLOBAL_KEY = 'gym-tracker.locale';
const USERS_KEY = 'gym-tracker.locales';

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage puede estar bloqueado; el idioma vive en memoria.
  }
}

function readUsers(): Record<string, string> {
  const raw = safeGet(USERS_KEY);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/** Idioma elegido antes de entrar (pantalla de login) o por defecto del navegador. */
export function readGlobalLocale(): Locale {
  const stored = safeGet(GLOBAL_KEY);
  return isLocale(stored) ? stored : DEFAULT_LOCALE;
}

export function readUserLocale(userId: number): Locale | null {
  const value = readUsers()[String(userId)];
  return isLocale(value) ? value : null;
}

/**
 * Idioma preferido para un perfil: el parámetro `?lang=` de la URL si está y es
 * válido, si no el del perfil, si no el global, si no el del navegador.
 */
export function resolveLocale(
  userId: number | null,
  languages?: readonly string[],
  urlLocale: Locale | null = null,
): Locale {
  if (urlLocale) return urlLocale;

  const fromUser = userId === null ? null : readUserLocale(userId);
  if (fromUser) return fromUser;

  const stored = safeGet(GLOBAL_KEY);
  if (isLocale(stored)) return stored;

  return detectLocale(languages ?? navigatorLanguages());
}

export function writeLocale(locale: Locale, userId: number | null): void {
  safeSet(GLOBAL_KEY, locale);
  if (userId === null) return;
  const users = readUsers();
  users[String(userId)] = locale;
  safeSet(USERS_KEY, JSON.stringify(users));
}

/** Idiomas del navegador, tolerando entornos sin `navigator`. */
export function navigatorLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
    return navigator.languages;
  }
  return navigator.language ? [navigator.language] : [];
}
