import { CARDIO_SEED } from './data/cardio';
import { STRENGTH_BY_ID, STRENGTH_LIBRARY } from './data/strength';
import { STRENGTH_LIBRARY_CA } from './data/strength.ca';
import type { Locale } from '../shared/locale';
import {
  equipmentLabel,
  muscleLabel,
  type Equipment,
  type LibraryExercise,
  type MovementPattern,
  type Muscle,
} from './types';

export * from './types';
export { STRENGTH_LIBRARY, STRENGTH_BY_ID, CARDIO_SEED, STRENGTH_LIBRARY_CA };

/** Normaliza para comparar sin acentos ni mayúsculas. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Sustituye el contenido textual (nombre, alias, descripción y consejos) por
 * su versión catalana conservando los metadatos tipados del dataset base.
 * En castellano devuelve el propio objeto sin copiar.
 */
export function localizeExercise(exercise: LibraryExercise, locale: Locale): LibraryExercise {
  if (locale === 'es') return exercise;
  const translation = STRENGTH_LIBRARY_CA[exercise.id];
  if (!translation) return exercise;
  return {
    ...exercise,
    name: translation.name,
    // Los alias de ambos idiomas alimentan el buscador.
    aliases: [...translation.aliases, ...exercise.aliases],
    description: translation.description,
    media: { ...exercise.media, tips: translation.tips },
  };
}

const libraryCache = new Map<Locale, LibraryExercise[]>();

/** Biblioteca completa en el idioma activo (memoizada por idioma). */
export function libraryFor(locale: Locale): LibraryExercise[] {
  const cached = libraryCache.get(locale);
  if (cached) return cached;
  const localized = STRENGTH_LIBRARY.map((exercise) => localizeExercise(exercise, locale));
  libraryCache.set(locale, localized);
  return localized;
}

export interface LibraryFilters {
  pattern?: MovementPattern;
  equipment?: Equipment;
  muscle?: Muscle;
}

export interface SearchOptions {
  query?: string;
  filters?: LibraryFilters;
  limit?: number;
  locale?: Locale;
}

/** Puntúa una coincidencia (mayor = mejor). 0 = no coincide. */
function scoreExercise(exercise: LibraryExercise, query: string, locale: Locale): number {
  const q = normalize(query);
  if (!q) return 1;

  const name = normalize(exercise.name);
  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  if (name.includes(q)) return 60;

  for (const alias of exercise.aliases) {
    const a = normalize(alias);
    if (a === q) return 70;
    if (a.startsWith(q)) return 55;
    if (a.includes(q)) return 40;
  }

  // También se busca por las etiquetas visibles de músculo y material.
  const muscles = normalize(
    [...exercise.primaryMuscles, ...exercise.secondaryMuscles]
      .map((muscle) => muscleLabel(muscle, locale))
      .join(' '),
  );
  if (muscles.includes(q)) return 25;
  if (normalize(equipmentLabel(exercise.equipment, locale)).includes(q)) return 20;

  // Coincidencia por palabras sueltas: "press banca" => "banca".
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length > 1 && words.every((w) => name.includes(w) || exercise.aliases.some((al) => normalize(al).includes(w)))) {
    return 30;
  }

  return 0;
}

export function searchLibrary(options: SearchOptions = {}): LibraryExercise[] {
  const { query = '', filters = {}, limit, locale = 'es' } = options;
  const exercises = libraryFor(locale);
  const results: Array<{ exercise: LibraryExercise; score: number }> = [];

  for (const exercise of exercises) {
    if (filters.pattern && exercise.pattern !== filters.pattern) continue;
    if (filters.equipment && exercise.equipment !== filters.equipment) continue;
    if (
      filters.muscle &&
      !exercise.primaryMuscles.includes(filters.muscle) &&
      !exercise.secondaryMuscles.includes(filters.muscle)
    ) {
      continue;
    }
    const score = scoreExercise(exercise, query, locale);
    if (score > 0) results.push({ exercise, score });
  }

  const byName = (a: LibraryExercise, b: LibraryExercise) => a.name.localeCompare(b.name, locale);

  // Sin búsqueda el orden relevante es el alfabético; con búsqueda, la
  // puntuación manda y los empates se resuelven por nombre más corto.
  if (!normalize(query)) {
    results.sort((a, b) => byName(a.exercise, b.exercise));
  } else {
    results.sort(
      (a, b) =>
        b.score - a.score ||
        a.exercise.name.length - b.exercise.name.length ||
        byName(a.exercise, b.exercise),
    );
  }

  const sorted = results.map((r) => r.exercise);
  return typeof limit === 'number' ? sorted.slice(0, limit) : sorted;
}

export function getLibraryExercise(id: string, locale: Locale = 'es'): LibraryExercise | undefined {
  const exercise = STRENGTH_BY_ID.get(id);
  return exercise ? localizeExercise(exercise, locale) : undefined;
}
