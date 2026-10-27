import { isNull } from 'drizzle-orm';
import type { DbHandle } from '..';
import { CARDIO_SEED, STRENGTH_LIBRARY } from '../../library';
import { exercises } from '../schema';

/**
 * Siembra el catálogo global (user_id NULL) de forma idempotente: inserta
 * solo los ejercicios de la biblioteca que aún no estén y los de cardio que
 * falten por nombre. Añadir ejercicios a la biblioteca los incorpora en el
 * siguiente arranque.
 */
export async function seedGlobalExercises(h: DbHandle): Promise<void> {
  const rows = await h.db
    .select({ name: exercises.name, libraryId: exercises.libraryId })
    .from(exercises)
    .where(isNull(exercises.userId));

  const existingNames = new Set(rows.map((row) => row.name));
  const existingLibraryIds = new Set(
    rows.map((row) => row.libraryId).filter((id): id is string => id !== null),
  );

  const now = new Date().toISOString();
  const values: Array<typeof exercises.$inferInsert> = [];

  for (const entry of STRENGTH_LIBRARY) {
    if (existingLibraryIds.has(entry.id) || existingNames.has(entry.name)) continue;
    values.push({
      userId: null,
      name: entry.name,
      type: 'weights',
      muscleGroup: entry.primaryMuscles[0] ?? 'pectorales',
      libraryId: entry.id,
      notes: null,
      hidden: false,
      createdAt: now,
    });
  }

  for (const entry of CARDIO_SEED) {
    if (existingNames.has(entry.name)) continue;
    values.push({
      userId: null,
      name: entry.name,
      type: 'cardio',
      muscleGroup: 'cardio',
      libraryId: null,
      notes: entry.notes ?? null,
      hidden: false,
      createdAt: now,
    });
  }

  if (values.length === 0) return;

  // SQLite admite hasta 32k parámetros; 61 filas × 8 columnas es seguro.
  await h.db.insert(exercises).values(values);
}
