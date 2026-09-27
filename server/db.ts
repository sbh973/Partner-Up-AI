import { PrismaClient } from '@prisma/client';

type Global = typeof globalThis & { __partnerUpPrisma?: PrismaClient };

/** One Prisma client per process (survives Vite's server-module hot reloads). */
export function db(): PrismaClient {
  const g = globalThis as Global;
  if (!g.__partnerUpPrisma) {
    process.env.DATABASE_URL ||= 'file:./dev.db';
    g.__partnerUpPrisma = new PrismaClient();
  }
  return g.__partnerUpPrisma;
}

/** Parse a JSON string column that should hold a string array; never throws. */
export function parseList(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const value: unknown = JSON.parse(json);
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function parseJson<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

export function normName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z' -]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const DAY_MS = 86_400_000;
