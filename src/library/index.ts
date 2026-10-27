import { CARDIO_SEED } from './data/cardio';
import { STRENGTH_BY_ID, STRENGTH_LIBRARY } from './data/strength';
import type {
  Equipment,
  LibraryExercise,
  MovementPattern,
  Muscle,
} from './types';

export * from './types';
export { STRENGTH_LIBRARY, STRENGTH_BY_ID, CARDIO_SEED };

/** Normaliza para comparar sin acentos ni mayúsculas. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
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
}

/** Puntúa una coincidencia (mayor = mejor). 0 = no coincide. */
function scoreExercise(exercise: LibraryExercise, query: string): number {
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

  if (normalize(exercise.primaryMuscles.join(' ')).includes(q)) return 25;
  if (normalize(exercise.equipment).includes(q)) return 20;

  // Coincidencia por palabras sueltas: "press banca" => "banca".
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length > 1 && words.every((w) => name.includes(w) || exercise.aliases.some((al) => normalize(al).includes(w)))) {
    return 30;
  }

  return 0;
}

export function searchLibrary(options: SearchOptions = {}): LibraryExercise[] {
  const { query = '', filters = {}, limit } = options;
  const results: Array<{ exercise: LibraryExercise; score: number }> = [];

  for (const exercise of STRENGTH_LIBRARY) {
    if (filters.pattern && exercise.pattern !== filters.pattern) continue;
    if (filters.equipment && exercise.equipment !== filters.equipment) continue;
    if (
      filters.muscle &&
      !exercise.primaryMuscles.includes(filters.muscle) &&
      !exercise.secondaryMuscles.includes(filters.muscle)
    ) {
      continue;
    }
    const score = scoreExercise(exercise, query);
    if (score > 0) results.push({ exercise, score });
  }

  const byName = (a: LibraryExercise, b: LibraryExercise) =>
    a.name.localeCompare(b.name, 'es');

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

export function getLibraryExercise(id: string): LibraryExercise | undefined {
  return STRENGTH_BY_ID.get(id);
}
