import type { IncomingMessage, ServerResponse } from 'node:http';
import { registerRoutes } from './api/routes';
import { handleApi } from './http/router';
import { ensureSeeded } from './seed/seed';

registerRoutes();

let ready: Promise<unknown> | null = null;

/** Framework-agnostic entry: returns false when the request isn't for /api. */
export async function apiMiddleware(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  if (!req.url?.startsWith('/api/')) return false;
  // First request seeds an empty database with the demo world.
  ready ??= ensureSeeded().catch((error: unknown) => {
    ready = null;
    console.error('[partner-up] Could not seed the database:', error instanceof Error ? error.message : error);
  });
  await ready;
  return handleApi(req, res);
}
