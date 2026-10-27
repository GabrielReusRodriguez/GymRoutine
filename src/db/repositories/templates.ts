import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { withTransaction, type DbHandle } from '..';
import type { Exercise } from '../schema';
import { exerciseLogs, exercises, series, sessions, templateItems, templates } from '../schema';
import type {
  SetEntry,
  TemplateApplication,
  TemplateDetail,
  TemplateInput,
  TemplateItemDetail,
  TemplateItemInput,
  TemplateItemPrefill,
  TemplateSummary,
} from '../../shared/types';
import { exerciseTypesById } from './exercises';
import { NotFoundError, ValidationError } from './errors';

/** Tope defensivo: una plantilla no precrea una lista absurda de series. */
const MAX_SERIES = 20;

interface NormalizedTemplate {
  name: string;
  notes: string | null;
  items: TemplateItemInput[];
}

/** Comprueba existencia y propiedad de los ejercicios referenciados. */
async function exercisesForItems(
  h: DbHandle,
  userId: number,
  items: TemplateItemInput[],
): Promise<Map<number, Exercise>> {
  const ids = [...new Set(items.map((item) => item.exerciseId))];
  const map = await exerciseTypesById(h, ids);
  for (const id of ids) {
    const exercise = map.get(id);
    if (!exercise || (exercise.userId !== null && exercise.userId !== userId)) {
      throw new ValidationError('Hay un ejercicio que no existe o no es tuyo.');
    }
  }
  return map;
}

/** Normaliza y valida: la plantilla respeta las mismas reglas cardio/pesas que una sesión. */
function normalizeTemplate(input: TemplateInput, exerciseMap: Map<number, Exercise>): NormalizedTemplate {
  const name = input.name.trim();
  if (name.length < 2) throw new ValidationError('El nombre de la plantilla es demasiado corto.');
  if (input.items.length === 0) throw new ValidationError('Añade al menos un ejercicio a la plantilla.');

  const seen = new Set<number>();
  const items = input.items.map((item) => {
    const exercise = exerciseMap.get(item.exerciseId);
    if (!exercise) throw new ValidationError('Hay un ejercicio que no existe o no es tuyo.');
    if (seen.has(item.exerciseId)) {
      throw new ValidationError(`"${exercise.name}" está repetido en la plantilla.`);
    }
    seen.add(item.exerciseId);

    if (exercise.type === 'cardio') {
      if (item.seriesCount !== null) {
        throw new ValidationError(`"${exercise.name}": el cardio no lleva series en la plantilla.`);
      }
      if (item.defaultWeightKg !== null || item.defaultReps !== null) {
        throw new ValidationError(`"${exercise.name}": el cardio no lleva peso ni repeticiones.`);
      }
      if (item.durationMin !== null && !(item.durationMin > 0)) {
        throw new ValidationError(`"${exercise.name}": los minutos deben ser mayores que 0.`);
      }
      if (item.distanceKm !== null && item.distanceKm < 0) {
        throw new ValidationError(`"${exercise.name}": la distancia no puede ser negativa.`);
      }
      return {
        exerciseId: item.exerciseId,
        seriesCount: null,
        defaultWeightKg: null,
        defaultReps: null,
        durationMin: item.durationMin,
        distanceKm: item.distanceKm,
      };
    }

    if (item.durationMin !== null || item.distanceKm !== null) {
      throw new ValidationError(`"${exercise.name}": un ejercicio de pesas no lleva duración.`);
    }
    const count = item.seriesCount ?? 1;
    if (!Number.isInteger(count) || count < 1 || count > MAX_SERIES) {
      throw new ValidationError(`"${exercise.name}": las series deben estar entre 1 y ${MAX_SERIES}.`);
    }
    if (item.defaultWeightKg !== null && (!Number.isFinite(item.defaultWeightKg) || item.defaultWeightKg < 0)) {
      throw new ValidationError(`"${exercise.name}": peso por defecto inválido.`);
    }
    if (item.defaultReps !== null && (!Number.isInteger(item.defaultReps) || item.defaultReps <= 0)) {
      throw new ValidationError(`"${exercise.name}": repeticiones por defecto inválidas.`);
    }
    return {
      exerciseId: item.exerciseId,
      seriesCount: count,
      defaultWeightKg: item.defaultWeightKg,
      defaultReps: item.defaultReps,
      durationMin: null,
      distanceKm: null,
    };
  });

  return { name, notes: input.notes?.trim() || null, items };
}

async function assertNameFree(
  h: DbHandle,
  userId: number,
  name: string,
  exceptId = 0,
): Promise<void> {
  const rows = await h.db
    .select({ id: templates.id })
    .from(templates)
    .where(and(eq(templates.userId, userId), eq(templates.name, name)));
  if (rows.some((row) => row.id !== exceptId)) {
    throw new ValidationError('Ya tienes una plantilla con ese nombre.');
  }
}

async function writeItems(
  h: DbHandle,
  templateId: number,
  items: TemplateItemInput[],
): Promise<void> {
  if (items.length === 0) return;
  await h.db.insert(templateItems).values(
    items.map((item, index) => ({
      templateId,
      exerciseId: item.exerciseId,
      order: index,
      seriesCount: item.seriesCount,
      defaultWeightKg: item.defaultWeightKg,
      defaultReps: item.defaultReps,
      durationMin: item.durationMin,
      distanceKm: item.distanceKm,
    })),
  );
}

export async function listTemplates(h: DbHandle, userId: number): Promise<TemplateSummary[]> {
  const rows = await h.db
    .select()
    .from(templates)
    .where(eq(templates.userId, userId))
    .orderBy(asc(templates.name));

  if (rows.length === 0) return [];

  const itemRows = await h.db
    .select({ templateId: templateItems.templateId })
    .from(templateItems)
    .where(
      inArray(
        templateItems.templateId,
        rows.map((row) => row.id),
      ),
    );

  const counts = new Map<number, number>();
  for (const item of itemRows) {
    counts.set(item.templateId, (counts.get(item.templateId) ?? 0) + 1);
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    notes: row.notes,
    itemCount: counts.get(row.id) ?? 0,
    createdAt: row.createdAt,
  }));
}

export async function getTemplate(
  h: DbHandle,
  userId: number,
  templateId: number,
): Promise<TemplateDetail> {
  const rows = await h.db
    .select()
    .from(templates)
    .where(and(eq(templates.id, templateId), eq(templates.userId, userId)));
  const template = rows[0];
  if (!template) throw new NotFoundError('Plantilla no encontrada.');

  const itemRows = await h.db
    .select({
      id: templateItems.id,
      exerciseId: templateItems.exerciseId,
      order: templateItems.order,
      seriesCount: templateItems.seriesCount,
      defaultWeightKg: templateItems.defaultWeightKg,
      defaultReps: templateItems.defaultReps,
      durationMin: templateItems.durationMin,
      distanceKm: templateItems.distanceKm,
      exerciseName: exercises.name,
      exerciseType: exercises.type,
      libraryId: exercises.libraryId,
      exerciseUserId: exercises.userId,
    })
    .from(templateItems)
    .innerJoin(exercises, eq(templateItems.exerciseId, exercises.id))
    .where(eq(templateItems.templateId, templateId))
    .orderBy(asc(templateItems.order));

  const items: TemplateItemDetail[] = itemRows.map((row) => ({
    id: row.id,
    exerciseId: row.exerciseId,
    order: row.order,
    seriesCount: row.seriesCount,
    defaultWeightKg: row.defaultWeightKg,
    defaultReps: row.defaultReps,
    durationMin: row.durationMin,
    distanceKm: row.distanceKm,
    exerciseName: row.exerciseName,
    exerciseType: row.exerciseType,
    libraryId: row.libraryId,
    available: row.exerciseUserId === null || row.exerciseUserId === userId,
  }));

  return { id: template.id, name: template.name, notes: template.notes, items };
}

export async function createTemplate(
  h: DbHandle,
  userId: number,
  input: TemplateInput,
): Promise<number> {
  let templateId = 0;
  await withTransaction(h.exec, async () => {
    templateId = await writeTemplate(h, userId, input);
  });
  return templateId;
}

/**
 * Valida e inserta una plantilla sin abrir transacción propia: lo usan
 * createTemplate y la importación de backups (que ya está en una).
 */
export async function writeTemplate(
  h: DbHandle,
  userId: number,
  input: TemplateInput,
): Promise<number> {
  const data = normalizeTemplate(input, await exercisesForItems(h, userId, input.items));
  await assertNameFree(h, userId, data.name);

  const inserted = await h.db
    .insert(templates)
    .values({
      userId,
      name: data.name,
      notes: data.notes,
      createdAt: new Date().toISOString(),
    })
    .returning({ id: templates.id });
  const row = inserted[0];
  if (!row) throw new Error('No se pudo crear la plantilla.');

  await writeItems(h, row.id, data.items);
  return row.id;
}

export async function updateTemplate(
  h: DbHandle,
  userId: number,
  templateId: number,
  input: TemplateInput,
): Promise<void> {
  const existing = await h.db
    .select({ id: templates.id })
    .from(templates)
    .where(and(eq(templates.id, templateId), eq(templates.userId, userId)));
  if (existing.length === 0) throw new NotFoundError('Plantilla no encontrada.');

  const data = normalizeTemplate(input, await exercisesForItems(h, userId, input.items));
  await assertNameFree(h, userId, data.name, templateId);

  await withTransaction(h.exec, async () => {
    await h.db
      .update(templates)
      .set({ name: data.name, notes: data.notes })
      .where(and(eq(templates.id, templateId), eq(templates.userId, userId)));
    await h.db.delete(templateItems).where(eq(templateItems.templateId, templateId));
    await writeItems(h, templateId, data.items);
  });
}

export async function deleteTemplate(
  h: DbHandle,
  userId: number,
  templateId: number,
): Promise<void> {
  const existing = await h.db
    .select({ id: templates.id })
    .from(templates)
    .where(and(eq(templates.id, templateId), eq(templates.userId, userId)));
  if (existing.length === 0) throw new NotFoundError('Plantilla no encontrada.');

  await withTransaction(h.exec, async () => {
    await h.db.delete(templateItems).where(eq(templateItems.templateId, templateId));
    await h.db
      .delete(templates)
      .where(and(eq(templates.id, templateId), eq(templates.userId, userId)));
  });
}

/** Copia una plantilla con un nombre libre (por defecto "Nombre (copia)"). */
export async function duplicateTemplate(
  h: DbHandle,
  userId: number,
  templateId: number,
): Promise<number> {
  const detail = await getTemplate(h, userId, templateId);
  const base = `${detail.name} (copia)`;

  const existing = await h.db
    .select({ name: templates.name })
    .from(templates)
    .where(eq(templates.userId, userId));
  const taken = new Set(existing.map((row) => row.name));
  let name = base;
  for (let index = 2; taken.has(name); index += 1) name = `${base} ${index}`;

  return createTemplate(h, userId, {
    name,
    notes: detail.notes,
    items: detail.items.map((item) => ({
      exerciseId: item.exerciseId,
      seriesCount: item.seriesCount,
      defaultWeightKg: item.defaultWeightKg,
      defaultReps: item.defaultReps,
      durationMin: item.durationMin,
      distanceKm: item.distanceKm,
    })),
  });
}

export interface LastEntry {
  date: string;
  durationMin: number | null;
  distanceKm: number | null;
  sets: SetEntry[];
}

/**
 * Último registro de cada ejercicio (sesión más reciente del usuario). Es lo
 * que prellena la plantilla al aplicarla: el usuario solo ajusta los números.
 */
export async function getLastEntriesByExercise(
  h: DbHandle,
  userId: number,
  exerciseIds: number[],
): Promise<Map<number, LastEntry>> {
  const result = new Map<number, LastEntry>();
  if (exerciseIds.length === 0) return result;

  const logRows = await h.db
    .select({
      id: exerciseLogs.id,
      exerciseId: exerciseLogs.exerciseId,
      date: sessions.date,
      durationMin: exerciseLogs.durationMin,
      distanceKm: exerciseLogs.distanceKm,
    })
    .from(exerciseLogs)
    .innerJoin(sessions, eq(exerciseLogs.sessionId, sessions.id))
    .where(and(eq(sessions.userId, userId), inArray(exerciseLogs.exerciseId, exerciseIds)))
    .orderBy(desc(sessions.date), asc(exerciseLogs.order));

  const chosen = new Map<number, (typeof logRows)[number]>();
  for (const log of logRows) {
    if (!chosen.has(log.exerciseId)) chosen.set(log.exerciseId, log);
  }
  if (chosen.size === 0) return result;

  const setRows = await h.db
    .select()
    .from(series)
    .where(
      inArray(
        series.exerciseLogId,
        [...chosen.values()].map((log) => log.id),
      ),
    )
    .orderBy(asc(series.setNumber));

  const setsByLog = new Map<number, SetEntry[]>();
  for (const set of setRows) {
    const list = setsByLog.get(set.exerciseLogId) ?? [];
    list.push({ weightKg: set.weightKg, reps: set.reps });
    setsByLog.set(set.exerciseLogId, list);
  }

  for (const [exerciseId, log] of chosen) {
    result.set(exerciseId, {
      date: log.date,
      durationMin: log.durationMin,
      distanceKm: log.distanceKm,
      sets: setsByLog.get(log.id) ?? [],
    });
  }

  return result;
}

/**
 * Resuelve una plantilla a los ejercicios que hay que cargar en la sesión,
 * con el prellenado del último registro y reserva en los valores por defecto.
 */
export async function applyTemplate(
  h: DbHandle,
  userId: number,
  templateId: number,
): Promise<TemplateApplication> {
  const detail = await getTemplate(h, userId, templateId);
  const usable = detail.items.filter((item) => item.available);
  const lastEntries = await getLastEntriesByExercise(
    h,
    userId,
    usable.map((item) => item.exerciseId),
  );

  const items: TemplateItemPrefill[] = [];
  const skipped: string[] = [];

  for (const item of detail.items) {
    if (!item.available) {
      skipped.push(item.exerciseName);
      continue;
    }
    const previous = lastEntries.get(item.exerciseId);

    if (item.exerciseType === 'cardio') {
      items.push({
        exerciseId: item.exerciseId,
        name: item.exerciseName,
        type: 'cardio',
        libraryId: item.libraryId,
        durationMin: previous?.durationMin ?? item.durationMin,
        distanceKm: previous?.distanceKm ?? item.distanceKm,
        sets: [],
      });
      continue;
    }

    const count = item.seriesCount ?? 1;
    const sets: SetEntry[] = [];
    for (let index = 0; index < count; index += 1) {
      const source = previous?.sets[index] ?? previous?.sets[previous.sets.length - 1];
      sets.push(
        source
          ? { weightKg: source.weightKg, reps: source.reps }
          : { weightKg: item.defaultWeightKg, reps: item.defaultReps },
      );
    }

    items.push({
      exerciseId: item.exerciseId,
      name: item.exerciseName,
      type: 'weights',
      libraryId: item.libraryId,
      durationMin: null,
      distanceKm: null,
      sets,
    });
  }

  return { id: detail.id, name: detail.name, items, skipped };
}
