import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

/** Boot the real API against a fresh SQLite file. Call before importing server code. */
export async function startTestServer(dbFile: string): Promise<{ base: string; close: () => Promise<void> }> {
  process.env.DATABASE_URL = `file:./${dbFile}`;
  process.env.SESSION_SECRET = 'test-secret';
  process.env.DEMO_MODE = 'true';
  // Throwaway test database (relative to prisma/schema.prisma): recreate it from scratch.
  for (const suffix of ['', '-journal']) rmSync(join('prisma', dbFile + suffix), { force: true });
  execSync('npx prisma db push --skip-generate', { stdio: 'ignore', env: { ...process.env } });
  const { apiMiddleware } = await import('../server/app');
  const server: Server = createServer((req, res) => {
    void apiMiddleware(req, res).then((handled) => {
      if (!handled) {
        res.statusCode = 404;
        res.end();
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return {
    base,
    close: async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      const { db } = await import('../server/db');
      await db().$disconnect();
    },
  };
}

/** A tiny cookie-jar client, like a browser tab. */
export class Client {
  private cookie = '';
  constructor(private readonly base: string) {}

  async call<T>(method: string, path: string, body?: unknown): Promise<{ status: number; data: T }> {
    const res = await fetch(this.base + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Partner-Up': '1',
        ...(this.cookie ? { Cookie: this.cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const set = res.headers.get('set-cookie');
    if (set) this.cookie = set.split(';')[0];
    return { status: res.status, data: (await res.json()) as T };
  }
}
