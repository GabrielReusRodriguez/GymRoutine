import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { isDomainError } from '../../shared/errors';
import { localeFromSearch, type Locale } from '../../shared/locale';
import { useAuth } from '../hooks/useAuth';
import {
  formatDateLong,
  formatDateShort,
  formatNumber,
  formatWeight,
  plural as formatPlural,
} from '../lib/format';
import { ca } from './messages/ca';
import { es, type MessageKey } from './messages/es';
import { resolveLocale, writeLocale } from './storage';

export type { MessageKey };

interface Vars {
  [name: string]: string | number;
}

const MESSAGES: Record<Locale, object> = { es, ca };

/** Resuelve una clave con puntos (`grupo.clave`) sobre el diccionario anidado. */
function lookup(dictionary: object, key: string): string | undefined {
  let current: unknown = dictionary;
  for (const part of key.split('.')) {
    if (typeof current !== 'object' || current === null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Traduce una clave; si falta, devuelve la propia clave (nunca rompe la UI). */
  t: (key: MessageKey | string, vars?: Vars) => string;
  /** Traduce un error de dominio y deja intacto cualquier otro mensaje. */
  tError: (error: unknown) => string;
  dateLong: (iso: string) => string;
  dateShort: (iso: string) => string;
  number: (value: number, digits?: number) => string;
  weight: (value: number) => string;
  plural: (count: number, singular: string, pluralForm: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [locale, setLocaleState] = useState<Locale>(() =>
    resolveLocale(null, undefined, localeFromSearch(window.location.search)),
  );

  // Al entrar o salir de un perfil se aplica su idioma guardado.
  useEffect(() => {
    setLocaleState(resolveLocale(userId));
  }, [userId]);

  // Un `?lang=es|ca` válido en la URL gana sobre cualquier preferencia guardada,
  // se persiste como idioma del perfil y se retira de la barra de direcciones.
  useEffect(() => {
    const applyUrlLocale = () => {
      const fromUrl = localeFromSearch(window.location.search);
      if (!fromUrl) return;
      setLocaleState(fromUrl);
      writeLocale(fromUrl, userId);
      const url = new URL(window.location.href);
      url.searchParams.delete('lang');
      window.history.replaceState(null, '', url.toString());
    };
    applyUrlLocale();
    window.addEventListener('popstate', applyUrlLocale);
    return () => window.removeEventListener('popstate', applyUrlLocale);
  }, [userId]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      writeLocale(next, userId);
    },
    [userId],
  );

  const value = useMemo<I18nValue>(() => {
    const dictionary = MESSAGES[locale];
    const t = (key: string, vars?: Vars): string => {
      const template = lookup(dictionary, key);
      return template === undefined ? key : interpolate(template, vars);
    };
    return {
      locale,
      setLocale,
      t,
      tError: (error: unknown) => {
        if (isDomainError(error)) return t(error.key, error.vars);
        if (error instanceof Error) return error.message;
        return String(error);
      },
      dateLong: (iso: string) => formatDateLong(iso, locale),
      dateShort: (iso: string) => formatDateShort(iso, locale),
      number: (value: number, digits = 0) => formatNumber(value, digits, locale),
      weight: (value: number) => formatWeight(value, locale),
      plural: (count: number, singular: string, pluralForm: string) =>
        formatPlural(count, singular, pluralForm),
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within <I18nProvider>');
  return context;
}
