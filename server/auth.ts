import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { config } from './config';
import { DAY_MS, db } from './db';
import { ApiError } from './http/errors';

export const SESSION_COOKIE = 'pu_session';
const SESSION_TTL_DAYS = 7;
export const SESSION_MAX_AGE_SECONDS = SESSION_TTL_DAYS * 24 * 60 * 60;

export interface AuthUser {
  id: string;
  email: string;
  isDemoAccount: boolean;
}

// ─── Passwords (scrypt, per-user salt) ─────────────────────────────────────

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split(':');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === candidate.length && timingSafeEqual(candidate, expected);
}

// ─── Sessions (opaque token in an HttpOnly cookie; only its HMAC is stored) ─

function sessionId(token: string): string {
  return createHmac('sha256', config.sessionSecret).update(token).digest('hex');
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  await db().session.create({ data: { id: sessionId(token), userId, expiresAt: new Date(Date.now() + SESSION_TTL_DAYS * DAY_MS) } });
  return token;
}

export async function resolveSession(token: string | undefined): Promise<AuthUser | null> {
  if (!token || token.length > 200) return null;
  const session = await db().session.findUnique({ where: { id: sessionId(token) }, include: { user: true } });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await db().session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return { id: session.user.id, email: session.user.email, isDemoAccount: session.user.isDemoAccount };
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return;
  await db().session.deleteMany({ where: { id: sessionId(token) } });
}

// ─── Accounts ──────────────────────────────────────────────────────────────

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function signUp(email: string, password: string): Promise<string> {
  const normalized = normalizeEmail(email);
  const existing = await db().user.findUnique({ where: { email: normalized } });
  if (existing) throw new ApiError(409, 'email_taken', 'An account with that email already exists. Try signing in.');
  const user = await db().user.create({ data: { email: normalized, passwordHash: hashPassword(password) } });
  return createSession(user.id);
}

export async function signIn(email: string, password: string): Promise<string> {
  const user = await db().user.findUnique({ where: { email: normalizeEmail(email) } });
  // Same message either way — don't reveal which emails exist.
  if (!user || user.isDemoPersona || !verifyPassword(password, user.passwordHash)) {
    throw new ApiError(401, 'invalid_credentials', 'That email and password don’t match.');
  }
  return createSession(user.id);
}

/** One-click login for the seeded demo accounts (demo mode only). */
export async function demoSignIn(key: string): Promise<string> {
  if (!config.demoMode) throw new ApiError(404, 'not_found', 'Not found.');
  const user = await db().user.findFirst({ where: { isDemoAccount: true, email: `${key}@demo.partnerup.test` } });
  if (!user) throw new ApiError(404, 'demo_unavailable', 'That demo account isn’t available.');
  return createSession(user.id);
}

export async function deleteUser(userId: string): Promise<void> {
  // Every table references User with onDelete: Cascade.
  await db().user.delete({ where: { id: userId } });
}
