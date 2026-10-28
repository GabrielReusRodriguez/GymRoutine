import type {
  BackupExercise,
  BackupFile,
  BackupLog,
  BackupSession,
  BackupTemplate,
  BackupTemplateItem,
} from './types';
import { DomainError, ERROR_KEYS, type ErrorVars } from './errors';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || isNumber(value);
}

function fail(key: string, vars?: ErrorVars): never {
  throw new DomainError(key, vars);
}

function parseExercise(value: unknown, index: number): BackupExercise {
  if (!isObject(value)) fail(ERROR_KEYS.backup.exerciseNotObject, { index: index + 1 });
  const { name, type, muscleGroup, libraryId, notes } = value as Record<string, unknown>;
  if (typeof name !== 'string' || name.trim() === '') {
    fail(ERROR_KEYS.backup.exerciseNoName, { index: index + 1 });
  }
  if (type !== 'cardio' && type !== 'weights') {
    fail(ERROR_KEYS.backup.exerciseBadType, { name });
  }
  if (typeof muscleGroup !== 'string') {
    fail(ERROR_KEYS.backup.exerciseNoMuscle, { name });
  }
  return {
    name: name.trim(),
    type,
    muscleGroup,
    libraryId: typeof libraryId === 'string' ? libraryId : null,
    notes: typeof notes === 'string' ? notes : null,
  };
}

function parseLog(value: unknown, index: number): BackupLog {
  if (!isObject(value)) fail(ERROR_KEYS.backup.logNotObject, { index: index + 1 });
  const { exercise, durationMin, distanceKm, sets } = value as Record<string, unknown>;
  if (typeof exercise !== 'string' || exercise.trim() === '') {
    fail(ERROR_KEYS.backup.logNoExercise, { index: index + 1 });
  }
  if (!Array.isArray(sets)) fail(ERROR_KEYS.backup.logNoSets, { exercise });
  const parsedSets = sets.map((set, setIndex) => {
    if (!isObject(set)) {
      fail(ERROR_KEYS.backup.setInvalid, { index: setIndex + 1, exercise });
    }
    const { weightKg, reps } = set as Record<string, unknown>;
    if (!isNumberOrNull(weightKg)) {
      fail(ERROR_KEYS.backup.setBadWeight, { index: setIndex + 1, exercise });
    }
    if (!isNumberOrNull(reps)) {
      fail(ERROR_KEYS.backup.setBadReps, { index: setIndex + 1, exercise });
    }
    return { weightKg, reps };
  });
  return {
    exercise: exercise.trim(),
    durationMin: isNumberOrNull(durationMin) ? durationMin : null,
    distanceKm: isNumberOrNull(distanceKm) ? distanceKm : null,
    sets: parsedSets,
  };
}

function parseSession(value: unknown, index: number): BackupSession {
  if (!isObject(value)) fail(ERROR_KEYS.backup.sessionNotObject, { index: index + 1 });
  const { date, notes, logs } = value as Record<string, unknown>;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    fail(ERROR_KEYS.backup.sessionBadDate, { index: index + 1 });
  }
  if (!Array.isArray(logs)) fail(ERROR_KEYS.backup.sessionNoLogs, { date });
  return {
    date,
    notes: typeof notes === 'string' ? notes : null,
    logs: logs.map(parseLog),
  };
}

function parseTemplateItem(value: unknown, index: number, template: string): BackupTemplateItem {
  if (!isObject(value)) {
    fail(ERROR_KEYS.backup.itemNotObject, { index: index + 1, template });
  }
  const { exercise, seriesCount, defaultWeightKg, defaultReps, durationMin, distanceKm } =
    value as Record<string, unknown>;
  if (typeof exercise !== 'string' || exercise.trim() === '') {
    fail(ERROR_KEYS.backup.itemNoExercise, { index: index + 1, template });
  }
  return {
    exercise: exercise.trim(),
    seriesCount: isNumberOrNull(seriesCount) ? seriesCount : null,
    defaultWeightKg: isNumberOrNull(defaultWeightKg) ? defaultWeightKg : null,
    defaultReps: isNumberOrNull(defaultReps) ? defaultReps : null,
    durationMin: isNumberOrNull(durationMin) ? durationMin : null,
    distanceKm: isNumberOrNull(distanceKm) ? distanceKm : null,
  };
}

function parseTemplate(value: unknown, index: number): BackupTemplate {
  if (!isObject(value)) fail(ERROR_KEYS.backup.templateNotObject, { index: index + 1 });
  const { name, notes, items } = value as Record<string, unknown>;
  if (typeof name !== 'string' || name.trim() === '') {
    fail(ERROR_KEYS.backup.templateNoName, { index: index + 1 });
  }
  if (!Array.isArray(items)) fail(ERROR_KEYS.backup.templateNoItems, { name });
  const trimmed = name.trim();
  return {
    name: trimmed,
    notes: typeof notes === 'string' ? notes : null,
    items: items.map((item, itemIndex) => parseTemplateItem(item, itemIndex, trimmed)),
  };
}

/** Valida y tipa un JSON de copia de seguridad. Lanza DomainError con clave traducible. */
export function parseBackup(raw: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    fail(ERROR_KEYS.backup.notJson);
  }
  if (!isObject(data)) fail(ERROR_KEYS.backup.notObject);
  if (data.format !== 'gym-tracker') fail(ERROR_KEYS.backup.notGymTracker);
  if (data.version !== 1 && data.version !== 2) {
    fail(ERROR_KEYS.backup.unsupportedVersion, { version: String(data.version) });
  }
  if (!Array.isArray(data.exercises)) fail(ERROR_KEYS.backup.noExercises);
  if (!Array.isArray(data.sessions)) fail(ERROR_KEYS.backup.noSessions);
  if (!isObject(data.user)) fail(ERROR_KEYS.backup.noUser);
  if (data.templates !== undefined && !Array.isArray(data.templates)) {
    fail(ERROR_KEYS.backup.badTemplates);
  }

  return {
    format: 'gym-tracker',
    version: data.version,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString(),
    user: {
      email: typeof data.user.email === 'string' ? data.user.email : '',
      name: typeof data.user.name === 'string' ? data.user.name : '',
    },
    exercises: data.exercises.map(parseExercise),
    sessions: data.sessions.map(parseSession),
    templates: Array.isArray(data.templates) ? data.templates.map(parseTemplate) : [],
  };
}

/** Nombre de archivo sugerido para la descarga. */
export function backupFileName(date = new Date()): string {
  return `gym-tracker-backup-${date.toISOString().slice(0, 10)}.json`;
}
