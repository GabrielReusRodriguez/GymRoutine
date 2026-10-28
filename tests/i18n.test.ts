import { beforeEach, describe, expect, it } from 'vitest';
import { allErrorKeys } from '../src/shared/errors';
import { DEFAULT_LOCALE, detectLocale, isLocale } from '../src/shared/locale';
import { ca } from '../src/client/i18n/messages/ca';
import { es } from '../src/client/i18n/messages/es';
import { resolveLocale, writeLocale } from '../src/client/i18n/storage';

function flatten(source: object, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') result[path] = value;
    else if (typeof value === 'object' && value !== null) {
      Object.assign(result, flatten(value, path));
    }
  }
  return result;
}

beforeEach(() => {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    },
  });
});

describe('idiomas de la interfaz', () => {
  it('detecta el catalán entre los idiomas del navegador y cae al castellano', () => {
    expect(detectLocale(['ca-ES', 'es-ES'])).toBe('ca');
    expect(detectLocale(['fr-FR', 'ca'])).toBe('ca');
    expect(detectLocale(['fr-FR', 'en'])).toBe(DEFAULT_LOCALE);
    expect(detectLocale([])).toBe(DEFAULT_LOCALE);
    expect(isLocale('ca')).toBe(true);
    expect(isLocale('fr')).toBe(false);
  });

  it('prioriza el idioma del perfil sobre el global y el del navegador', () => {
    expect(resolveLocale(null, ['ca-ES'])).toBe('ca');

    writeLocale('ca', null);
    expect(resolveLocale(null, ['es-ES'])).toBe('ca');

    writeLocale('es', 1);
    expect(resolveLocale(1, ['ca-ES'])).toBe('es');
    // El último idioma elegido queda también como preferencia global.
    expect(resolveLocale(2, ['ca-ES'])).toBe('es');
  });

  it('mantiene la paridad de claves entre castellano y catalán', () => {
    const spanish = flatten(es);
    const catalan = flatten(ca);
    expect(Object.keys(catalan).sort()).toEqual(Object.keys(spanish).sort());
    for (const [key, value] of Object.entries(catalan)) {
      expect(value, key).not.toBe('');
    }
    expect(spanish['nav.today']).toBe('Hoy');
    expect(catalan['nav.today']).toBe('Avui');
  });

  it('cubre todas las claves de error de dominio en ambos idiomas', () => {
    const spanish = flatten(es);
    const catalan = flatten(ca);
    for (const key of allErrorKeys()) {
      expect(spanish[key], key).toBeTruthy();
      expect(catalan[key], key).toBeTruthy();
    }
  });
});
