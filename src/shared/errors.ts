/**
 * Errores de dominio. El mensaje es una clave de traducción: la UI la resuelve
 * con el diccionario del idioma activo (nunca se muestra la clave en bruto).
 */
export type ErrorVars = Record<string, string | number>;

export class DomainError extends Error {
  readonly key: string;
  readonly vars?: ErrorVars;

  constructor(key: string, vars?: ErrorVars) {
    super(key);
    this.key = key;
    this.vars = vars;
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

/** Claves de error compartidas entre repositorios y diccionarios de la UI. */
export const ERROR_KEYS = {
  common: {
    notFound: 'error.common.notFound',
  },
  db: {
    notReady: 'error.db.notReady',
    createUser: 'error.db.createUser',
    createExercise: 'error.db.createExercise',
    createSession: 'error.db.createSession',
    saveLog: 'error.db.saveLog',
    createTemplate: 'error.db.createTemplate',
  },
  users: {
    emailInvalid: 'error.users.emailInvalid',
    nameTooShort: 'error.users.nameTooShort',
    passwordTooShort: 'error.users.passwordTooShort',
    emailTaken: 'error.users.emailTaken',
    badCredentials: 'error.users.badCredentials',
    notFound: 'error.users.notFound',
    wrongPassword: 'error.users.wrongPassword',
    newPasswordTooShort: 'error.users.newPasswordTooShort',
  },
  exercises: {
    nameTooShort: 'error.exercises.nameTooShort',
    typeInvalid: 'error.exercises.typeInvalid',
    muscleInvalid: 'error.exercises.muscleInvalid',
    cardioGroup: 'error.exercises.cardioGroup',
    weightsGroup: 'error.exercises.weightsGroup',
    notFound: 'error.exercises.notFound',
    duplicateName: 'error.exercises.duplicateName',
    ownEditOnly: 'error.exercises.ownEditOnly',
    ownDeleteOnly: 'error.exercises.ownDeleteOnly',
  },
  sessions: {
    invalidDate: 'error.sessions.invalidDate',
    exerciseUnavailable: 'error.sessions.exerciseUnavailable',
    cardioNeedsDuration: 'error.sessions.cardioNeedsDuration',
    cardioNoSets: 'error.sessions.cardioNoSets',
    negativeDistance: 'error.sessions.negativeDistance',
    weightsNoDuration: 'error.sessions.weightsNoDuration',
    weightsNeedSet: 'error.sessions.weightsNeedSet',
    setNeedsData: 'error.sessions.setNeedsData',
    invalidWeight: 'error.sessions.invalidWeight',
    invalidReps: 'error.sessions.invalidReps',
    notFound: 'error.sessions.notFound',
  },
  templates: {
    exerciseUnavailable: 'error.templates.exerciseUnavailable',
    nameTooShort: 'error.templates.nameTooShort',
    empty: 'error.templates.empty',
    exerciseDuplicated: 'error.templates.exerciseDuplicated',
    cardioNoSeries: 'error.templates.cardioNoSeries',
    cardioNoWeight: 'error.templates.cardioNoWeight',
    durationPositive: 'error.templates.durationPositive',
    negativeDistance: 'error.templates.negativeDistance',
    weightsNoDuration: 'error.templates.weightsNoDuration',
    seriesRange: 'error.templates.seriesRange',
    invalidDefaultWeight: 'error.templates.invalidDefaultWeight',
    invalidDefaultReps: 'error.templates.invalidDefaultReps',
    duplicateName: 'error.templates.duplicateName',
    notFound: 'error.templates.notFound',
  },
  backup: {
    userNotFound: 'error.backup.userNotFound',
    notJson: 'error.backup.notJson',
    notObject: 'error.backup.notObject',
    notGymTracker: 'error.backup.notGymTracker',
    unsupportedVersion: 'error.backup.unsupportedVersion',
    noExercises: 'error.backup.noExercises',
    noSessions: 'error.backup.noSessions',
    noUser: 'error.backup.noUser',
    badTemplates: 'error.backup.badTemplates',
    exerciseNotObject: 'error.backup.exerciseNotObject',
    exerciseNoName: 'error.backup.exerciseNoName',
    exerciseBadType: 'error.backup.exerciseBadType',
    exerciseNoMuscle: 'error.backup.exerciseNoMuscle',
    logNotObject: 'error.backup.logNotObject',
    logNoExercise: 'error.backup.logNoExercise',
    logNoSets: 'error.backup.logNoSets',
    setInvalid: 'error.backup.setInvalid',
    setBadWeight: 'error.backup.setBadWeight',
    setBadReps: 'error.backup.setBadReps',
    sessionNotObject: 'error.backup.sessionNotObject',
    sessionBadDate: 'error.backup.sessionBadDate',
    sessionNoLogs: 'error.backup.sessionNoLogs',
    itemNotObject: 'error.backup.itemNotObject',
    itemNoExercise: 'error.backup.itemNoExercise',
    templateNotObject: 'error.backup.templateNotObject',
    templateNoName: 'error.backup.templateNoName',
    templateNoItems: 'error.backup.templateNoItems',
  },
} as const;

/** Aplana el árbol de claves de error (para comprobar la cobertura de los diccionarios). */
export function allErrorKeys(): string[] {
  const keys: string[] = [];
  for (const group of Object.values(ERROR_KEYS)) {
    keys.push(...Object.values(group));
  }
  return keys;
}
