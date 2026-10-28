import { DomainError, ERROR_KEYS, isDomainError, type ErrorVars } from '../../shared/errors';

/**
 * Errores de dominio con clave de traducción. La UI resuelve `key` (y `vars`)
 * contra el diccionario del idioma activo; `message` conserva la clave para
 * logs y tests.
 */
export class ValidationError extends DomainError {
  constructor(key: string, vars?: ErrorVars) {
    super(key, vars);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends DomainError {
  constructor(key: string = ERROR_KEYS.common.notFound, vars?: ErrorVars) {
    super(key, vars);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends DomainError {
  constructor(key: string, vars?: ErrorVars) {
    super(key, vars);
    this.name = 'ConflictError';
  }
}

export class AuthError extends DomainError {
  constructor(key: string, vars?: ErrorVars) {
    super(key, vars);
    this.name = 'AuthError';
  }
}

export function messageOf(error: unknown): string {
  if (isDomainError(error)) return error.key;
  if (error instanceof Error) return error.message;
  return String(error);
}
