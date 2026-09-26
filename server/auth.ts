import { createClient } from '@supabase/supabase-js';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { config } from './config';
import { getMemoryDb, persistMemoryDb } from './data/memoryStore';
import { DEMO_USER_ID } from './data/seed';
import { getSupabaseAdmin } from './data/supabaseStore';
import { ApiError } from './http/errors';

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string | null;
}

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// ─── Local auth (demo data mode) ───────────────────────────────────────────

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [scheme, salt, hash] = stored.split(':');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === candidate.length && timingSafeEqual(candidate, expected);
}

function createLocalSession(userId: string): SessionTokens {
  const db = getMemoryDb();
  const token = randomBytes(32).toString('base64url');
  db.sessions[token] = { userId, createdAt: new Date().toISOString() };
  persistMemoryDb();
  return { accessToken: token, refreshToken: null };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function localSignUp(email: string, password: string): SessionTokens {
  const db = getMemoryDb();
  const normalized = normalizeEmail(email);
  if (db.users.some((u) => u.email === normalized)) {
    throw new ApiError(409, 'email_taken', 'An account with that email already exists. Try signing in.');
  }
  const user = { id: randomUUID(), email: normalized, passwordHash: hashPassword(password), createdAt: new Date().toISOString() };
  db.users.push(user);
  return createLocalSession(user.id);
}

export function localSignIn(email: string, password: string): SessionTokens {
  const db = getMemoryDb();
  const user = db.users.find((u) => u.email === normalizeEmail(email));
  // Same message either way: don't reveal which emails exist.
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new ApiError(401, 'invalid_credentials', 'That email and password don’t match.');
  }
  return createLocalSession(user.id);
}

export function localSignOut(token: string): void {
  const db = getMemoryDb();
  if (db.sessions[token]) {
    delete db.sessions[token];
    persistMemoryDb();
  }
}

function resolveLocal(token: string): AuthUser | null {
  const db = getMemoryDb();
  const session = db.sessions[token];
  if (!session) return null;
  if (Date.now() - Date.parse(session.createdAt) > SESSION_TTL_MS) {
    delete db.sessions[token];
    persistMemoryDb();
    return null;
  }
  const user = db.users.find((u) => u.id === session.userId);
  return user ? { id: user.id, email: user.email } : null;
}

// ─── Public API ────────────────────────────────────────────────────────────

export function authMode(): 'local' | 'supabase' {
  return config.useSupabase ? 'supabase' : 'local';
}

export async function resolveUser(token: string | null): Promise<AuthUser | null> {
  if (!token || token.length > 4096) return null;
  if (authMode() === 'local') return resolveLocal(token);
  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

/** Sign in to the shared demo account (credentials never leave the server). */
export async function demoSession(): Promise<SessionTokens> {
  if (authMode() === 'local') {
    const db = getMemoryDb();
    if (!db.users.some((u) => u.id === DEMO_USER_ID)) throw new ApiError(404, 'demo_unavailable', 'The demo account isn’t available.');
    return createLocalSession(DEMO_USER_ID);
  }
  if (!config.demoPassword || !config.supabaseUrl || !config.supabaseAnonKey) {
    throw new ApiError(404, 'demo_unavailable', 'The demo account isn’t configured on this server.');
  }
  const anon = createClient(config.supabaseUrl, config.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await anon.auth.signInWithPassword({ email: config.demoEmail, password: config.demoPassword });
  if (error || !data.session) throw new ApiError(503, 'demo_unavailable', 'The demo account couldn’t sign in right now.');
  return { accessToken: data.session.access_token, refreshToken: data.session.refresh_token };
}

export function isDemoUser(user: AuthUser): boolean {
  return authMode() === 'local' ? user.id === DEMO_USER_ID : normalizeEmail(user.email ?? '') === normalizeEmail(config.demoEmail);
}

/** Remove the login itself (after the profile and its data are gone). */
export async function deleteAuthUser(user: AuthUser): Promise<void> {
  if (authMode() === 'local') {
    const db = getMemoryDb();
    db.users = db.users.filter((u) => u.id !== user.id);
    for (const [token, session] of Object.entries(db.sessions)) if (session.userId === user.id) delete db.sessions[token];
    persistMemoryDb();
    return;
  }
  const { error } = await getSupabaseAdmin().auth.admin.deleteUser(user.id);
  if (error && !/not found/i.test(error.message)) {
    throw new ApiError(500, 'delete_failed', 'We couldn’t finish deleting your account. Please try again.');
  }
}
