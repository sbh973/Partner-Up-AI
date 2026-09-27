// Server-only configuration. Nothing here reaches the browser except what
// GET /api/config deliberately exposes. Read lazily so dev (Vite) and prod
// (Node) can both populate process.env first.

function env(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim()) return value.trim();
  }
  return undefined;
}

function num(name: string, fallback: number): number {
  const n = Number(env(name));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

let warnedSecret = false;

export const config = {
  // ── Muse (Meta) — accepts both MUSE_* and META_MUSE_* names ──
  get museApiKey(): string | undefined {
    return env('MUSE_API_KEY', 'META_MUSE_API_KEY');
  },
  get museBaseUrl(): string {
    return (env('MUSE_BASE_URL', 'META_MUSE_BASE_URL') ?? 'https://api.meta.ai/v1').replace(/\/+$/, '');
  },
  get museModel(): string {
    // Meta's API ids have no "meta/" prefix (e.g. "muse-spark-1.1").
    return (env('MUSE_MODEL', 'META_MUSE_MODEL') ?? 'muse-spark-1.1').replace(/^meta\//, '');
  },
  get museReasoningEffort(): string {
    return env('MUSE_REASONING_EFFORT') ?? 'minimal';
  },
  get museTimeoutMs(): number {
    return num('MUSE_TIMEOUT_MS', 5000);
  },
  get museEnabled(): boolean {
    const provider = env('AI_PROVIDER') ?? 'muse';
    return provider === 'muse' && Boolean(this.museApiKey);
  },

  // ── Sessions ──
  get sessionSecret(): string {
    const secret = env('SESSION_SECRET');
    if (secret) return secret;
    if (process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET must be set in production');
    if (!warnedSecret) {
      warnedSecret = true;
      console.warn('[partner-up] SESSION_SECRET not set — using an insecure development default.');
    }
    return 'partner-up-dev-session-secret-change-me';
  },

  // ── Demo ──
  get demoMode(): boolean {
    return env('DEMO_MODE') !== 'false';
  },

  // ── Mutual rules (configurable for the demo) ──
  get mutualRequestLimit(): number {
    return num('MUTUAL_REQUEST_LIMIT', 5);
  },
  get mutualWindowDays(): number {
    return num('MUTUAL_WINDOW_DAYS', 30);
  },
  get mutualRequestTtlDays(): number {
    return num('MUTUAL_REQUEST_TTL_DAYS', 30);
  },
  get mutualEndAfterHours(): number {
    return num('MUTUAL_END_AFTER_HOURS', 24);
  },
  get minAge(): number {
    return num('MIN_AGE', 18);
  },
};
