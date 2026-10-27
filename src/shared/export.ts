import type { BackupExercise, BackupFile, BackupLog, BackupSession } from './types';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNumberOrNull(value: unknown): value is number | null {
  return value === null || isNumber(value);
}

function fail(message: string): never {
  throw new Error(`Copia de seguridad inválida: ${message}`);
}

function parseExercise(value: unknown, index: number): BackupExercise {
  if (!isObject(value)) fail(`ejercicio #${index + 1} no es un objeto`);
  const { name, type, muscleGroup, libraryId, notes } = value as Record<string, unknown>;
  if (typeof name !== 'string' || name.trim() === '') fail(`ejercicio #${index + 1} sin nombre`);
  if (type !== 'cardio' && type !== 'weights') fail(`ejercicio "${name}" con tipo inválido`);
  if (typeof muscleGroup !== 'string') fail(`ejercicio "${name}" sin grupo muscular`);
  return {
    name: name.trim(),
    type,
    muscleGroup,
    libraryId: typeof libraryId === 'string' ? libraryId : null,
    notes: typeof notes === 'string' ? notes : null,
  };
}

function parseLog(value: unknown, index: number): BackupLog {
  if (!isObject(value)) fail(`log #${index + 1} no es un objeto`);
  const { exercise, durationMin, distanceKm, sets } = value as Record<string, unknown>;
  if (typeof exercise !== 'string' || exercise.trim() === '') fail(`log #${index + 1} sin ejercicio`);
  if (!Array.isArray(sets)) fail(`log "${exercise}" sin series`);
  const parsedSets = sets.map((set, setIndex) => {
    if (!isObject(set)) fail(`serie #${setIndex + 1} de "${exercise}" inválida`);
    const { weightKg, reps } = set as Record<string, unknown>;
    if (!isNumberOrNull(weightKg)) fail(`serie #${setIndex + 1} de "${exercise}" con peso inválido`);
    if (!isNumberOrNull(reps)) fail(`serie #${setIndex + 1} de "${exercise}" con reps inválidas`);
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
  if (!isObject(value)) fail(`sesión #${index + 1} no es un objeto`);
  const { date, notes, logs } = value as Record<string, unknown>;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    fail(`sesión #${index + 1} con fecha inválida`);
  }
  if (!Array.isArray(logs)) fail(`sesión ${date} sin logs`);
  return {
    date,
    notes: typeof notes === 'string' ? notes : null,
    logs: logs.map(parseLog),
  };
}

/** Valida y tipa un JSON de copia de seguridad. Lanza Error con mensaje legible. */
export function parseBackup(raw: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    fail('el archivo no es JSON');
  }
  if (!isObject(data)) fail('el contenido no es un objeto');
  if (data.format !== 'gym-tracker') fail('no es un archivo de Gym Tracker');
  if (data.version !== 1) {
    fail(`versión no soportada (${String(data.version)})`);
  }
  if (!Array.isArray(data.exercises)) fail('falta la lista de ejercicios');
  if (!Array.isArray(data.sessions)) fail('falta la lista de sesiones');
  if (!isObject(data.user)) fail('falta el usuario');

  return {
    format: 'gym-tracker',
    version: 1,
    exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString(),
    user: {
      email: typeof data.user.email === 'string' ? data.user.email : '',
      name: typeof data.user.name === 'string' ? data.user.name : '',
    },
    exercises: data.exercises.map(parseExercise),
    sessions: data.sessions.map(parseSession),
  };
}

/** Nombre de archivo sugerido para la descarga. */
export function backupFileName(date = new Date()): string {
  return `gym-tracker-backup-${date.toISOString().slice(0, 10)}.json`;
}
