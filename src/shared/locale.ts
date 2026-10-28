/** Idiomas soportados por la interfaz. */
export type Locale = 'es' | 'ca';

export const LOCALES: Locale[] = ['es', 'ca'];

export const DEFAULT_LOCALE: Locale = 'es';

/** Nombre del idioma en su propia lengua (para el selector). */
export const LOCALE_LABELS: Record<Locale, string> = {
  es: 'Castellano',
  ca: 'Català',
};

/** Etiqueta BCP 47 para Intl (fechas y números). */
export const LOCALE_TAGS: Record<Locale, string> = {
  es: 'es-ES',
  ca: 'ca-ES',
};

export function isLocale(value: unknown): value is Locale {
  return value === 'es' || value === 'ca';
}

/**
 * Idioma por defecto a partir de los idiomas del navegador: el primero que sea
 * catalán gana; si no hay ninguno soportado, castellano.
 */
export function detectLocale(languages: readonly string[] = []): Locale {
  for (const language of languages) {
    const base = language.toLowerCase().split('-')[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}
