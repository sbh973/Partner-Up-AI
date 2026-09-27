import type { IncomingMessage, ServerResponse } from 'node:http';
import { ZodError, type z } from 'zod';
import { SESSION_COOKIE, resolveSession, type AuthUser } from '../auth';
import { ApiError } from './errors';

export interface CookieOptions {
  maxAgeSeconds: number;
}

export interface RequestContext {
  method: string;
  params: Record<string, string>;
  query: URLSearchParams;
  body: unknown;
  cookies: Record<string, string>;
  ip: string;
  setCookie: (name: string, value: string, options: CookieOptions) => void;
}

export interface AuthedContext extends RequestContext {
  user: AuthUser;
}

type Handler = (ctx: RequestContext) => Promise<unknown>;
type AuthedHandler = (ctx: AuthedContext) => Promise<unknown>;

interface Route {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: Handler;
}

const routes: Route[] = [];

function compile(path: string): { pattern: RegExp; keys: string[] } {
  const keys: string[] = [];
  const source = path.replace(/:([a-zA-Z]+)/g, (_m, key: string) => {
    keys.push(key);
    return '([^/]+)';
  });
  return { pattern: new RegExp(`^${source}/?$`), keys };
}

export function publicRoute(method: string, path: string, handler: Handler): void {
  routes.push({ method, ...compile(path), handler });
}

export function authedRoute(method: string, path: string, handler: AuthedHandler): void {
  routes.push({
    method,
    ...compile(path),
    handler: async (ctx) => {
      const user = await resolveSession(ctx.cookies[SESSION_COOKIE]);
      if (!user) throw new ApiError(401, 'unauthorized', 'Please sign in to continue.');
      return handler({ ...ctx, user });
    },
  });
}

export function parseBody<S extends z.ZodType>(schema: S, body: unknown): z.infer<S> {
  const result = schema.safeParse(body ?? {});
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue?.path.join('.') || 'request';
    throw new ApiError(400, 'invalid_input', `Please check ${field}: ${issue?.message ?? 'invalid value'}.`);
  }
  return result.data;
}

const MAX_BODY_BYTES = 64 * 1024;

async function readBody(req: IncomingMessage & { body?: unknown }): Promise<unknown> {
  if (req.body !== undefined) return req.body;
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer);
    size += buf.length;
    if (size > MAX_BODY_BYTES) throw new ApiError(413, 'too_large', 'That request is too large.');
    chunks.push(buf);
  }
  if (size === 0) return undefined;
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new ApiError(400, 'invalid_json', 'The request body must be valid JSON.');
  }
}

function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const key = part.slice(0, i).trim();
    try {
      out[key] = decodeURIComponent(part.slice(i + 1).trim());
    } catch {
      // ignore malformed cookie
    }
  }
  return out;
}

function send(res: ServerResponse, status: number, payload: unknown, cookies: string[]): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  if (cookies.length) res.setHeader('Set-Cookie', cookies);
  res.end(payload === undefined ? '{}' : JSON.stringify(payload));
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Handle /api/* requests. Returns false if the URL isn't an API route. */
export async function handleApi(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (!url.pathname.startsWith('/api/')) return false;
  const method = (req.method ?? 'GET').toUpperCase();
  const outgoingCookies: string[] = [];

  const candidates = routes.filter((r) => r.pattern.test(url.pathname));
  const route = candidates.find((r) => r.method === method);
  if (!route) {
    send(res, candidates.length ? 405 : 404, { error: { code: 'not_found', message: 'Not found.' } }, outgoingCookies);
    return true;
  }

  try {
    // CSRF: cookies are SameSite=Lax, and every state change must also carry a
    // custom header — which a cross-site form or image can't set.
    if (MUTATING.has(method) && req.headers['x-partner-up'] !== '1') {
      throw new ApiError(403, 'csrf', 'Request blocked.');
    }
    const match = url.pathname.match(route.pattern);
    const params: Record<string, string> = {};
    route.keys.forEach((key, i) => {
      params[key] = decodeURIComponent(match?.[i + 1] ?? '');
    });
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const secure = req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
    const body = await readBody(req);
    const result = await route.handler({
      method,
      params,
      query: url.searchParams,
      body,
      cookies: parseCookies(req.headers.cookie),
      ip,
      setCookie: (name, value, { maxAgeSeconds }) => {
        outgoingCookies.push(
          `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure ? '; Secure' : ''}`,
        );
      },
    });
    send(res, 200, result, outgoingCookies);
  } catch (error) {
    if (error instanceof ApiError) {
      send(res, error.status, { error: { code: error.code, message: error.message } }, outgoingCookies);
    } else if (error instanceof ZodError) {
      send(res, 400, { error: { code: 'invalid_input', message: 'Some of that input wasn’t valid.' } }, outgoingCookies);
    } else {
      // Never leak stack traces, secrets or provider errors to the client.
      console.error('[partner-up] Unhandled API error:', error instanceof Error ? error.message : error);
      send(res, 500, { error: { code: 'server_error', message: 'Something went wrong on our side. Try again in a moment.' } }, outgoingCookies);
    }
  }
  return true;
}
