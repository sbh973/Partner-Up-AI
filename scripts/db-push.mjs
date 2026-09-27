// Sync the SQLite schema before dev/start. Loads .env.local / .env the same way
// the app does (Prisma's CLI only reads .env) and defaults DATABASE_URL so a
// fresh clone works with zero configuration.
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

for (const file of ['.env.local', '.env']) {
  if (existsSync(file)) process.loadEnvFile(file);
}
process.env.DATABASE_URL ||= 'file:./dev.db';
execSync('npx prisma db push --skip-generate', { stdio: 'inherit', env: process.env });
