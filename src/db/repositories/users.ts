import { eq, inArray } from 'drizzle-orm';
import type { DbHandle } from '..';
import type { UserSummary } from '../../shared/types';
import { hashPassword, verifyPassword } from '../../auth/password';
import { exerciseLogs, exercises, series, sessions, templateItems, templates, users } from '../schema';
import { ERROR_KEYS } from '../../shared/errors';
import { AuthError, ConflictError, NotFoundError, ValidationError } from './errors';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function summary(row: { id: number; email: string; name: string }): UserSummary {
  return { id: row.id, email: row.email, name: row.name };
}

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
}

export async function createUser(h: DbHandle, input: CreateUserInput): Promise<UserSummary> {
  const email = normalizeEmail(input.email);
  const name = input.name.trim();

  if (!EMAIL_RE.test(email)) throw new ValidationError(ERROR_KEYS.users.emailInvalid);
  if (name.length < 2) throw new ValidationError(ERROR_KEYS.users.nameTooShort);
  if (input.password.length < 8) {
    throw new ValidationError(ERROR_KEYS.users.passwordTooShort);
  }

  const existing = await h.db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing.length > 0) throw new ConflictError(ERROR_KEYS.users.emailTaken);

  const passwordHash = await hashPassword(input.password);
  const inserted = await h.db
    .insert(users)
    .values({ email, name, passwordHash, createdAt: new Date().toISOString() })
    .returning({ id: users.id, email: users.email, name: users.name });

  const created = inserted[0];
  if (!created) throw new Error(ERROR_KEYS.db.createUser);
  return summary(created);
}

export async function authenticate(
  h: DbHandle,
  email: string,
  password: string,
): Promise<UserSummary> {
  const rows = await h.db.select().from(users).where(eq(users.email, normalizeEmail(email)));

  const row = rows[0];
  if (!row) throw new AuthError(ERROR_KEYS.users.badCredentials);

  const valid = await verifyPassword(password, row.passwordHash);
  if (!valid) throw new AuthError(ERROR_KEYS.users.badCredentials);

  return summary(row);
}

export async function getUser(h: DbHandle, userId: number): Promise<UserSummary | null> {
  const rows = await h.db.select().from(users).where(eq(users.id, userId));
  const row = rows[0];
  return row ? summary(row) : null;
}

export async function changePassword(
  h: DbHandle,
  userId: number,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const rows = await h.db.select().from(users).where(eq(users.id, userId));
  const row = rows[0];
  if (!row) throw new NotFoundError(ERROR_KEYS.users.notFound);

  const valid = await verifyPassword(currentPassword, row.passwordHash);
  if (!valid) throw new AuthError(ERROR_KEYS.users.wrongPassword);
  if (newPassword.length < 8) {
    throw new ValidationError(ERROR_KEYS.users.newPasswordTooShort);
  }

  const passwordHash = await hashPassword(newPassword);
  await h.db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

/**
 * Borra el perfil y todos sus datos. Los ejercicios globales (user_id NULL)
 * se conservan. Las dependencias se borran de forma explícita para no
 * depender de que PRAGMA foreign_keys esté activo.
 */
export async function deleteUser(h: DbHandle, userId: number): Promise<void> {
  const sessionRows = await h.db
    .select({ id: sessions.id })
    .from(sessions)
    .where(eq(sessions.userId, userId));
  const sessionIds = sessionRows.map((row) => row.id);

  if (sessionIds.length > 0) {
    const logRows = await h.db
      .select({ id: exerciseLogs.id })
      .from(exerciseLogs)
      .where(inArray(exerciseLogs.sessionId, sessionIds));
    const logIds = logRows.map((row) => row.id);

    if (logIds.length > 0) {
      await h.db.delete(series).where(inArray(series.exerciseLogId, logIds));
    }
    await h.db.delete(exerciseLogs).where(inArray(exerciseLogs.sessionId, sessionIds));
    await h.db.delete(sessions).where(inArray(sessions.id, sessionIds));
  }

  // Las plantillas referencian ejercicios: se borran antes que ellos.
  const templateRows = await h.db
    .select({ id: templates.id })
    .from(templates)
    .where(eq(templates.userId, userId));
  if (templateRows.length > 0) {
    await h.db.delete(templateItems).where(
      inArray(
        templateItems.templateId,
        templateRows.map((row) => row.id),
      ),
    );
    await h.db.delete(templates).where(eq(templates.userId, userId));
  }

  await h.db.delete(exercises).where(eq(exercises.userId, userId));
  await h.db.delete(users).where(eq(users.id, userId));
}

export async function userExists(h: DbHandle, userId: number): Promise<boolean> {
  const rows = await h.db.select({ id: users.id }).from(users).where(eq(users.id, userId));
  return rows.length > 0;
}
