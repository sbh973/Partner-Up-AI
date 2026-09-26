// Server-only configuration. Read lazily so dev (Vite) and prod (Node) can
// both populate process.env before first use. Nothing here reaches the browser
// except what /api/config deliberately exposes.

function env(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : undefined;
}

export const config = {
  get anthropicModel(): string {
    return env('ANTHROPIC_MODEL') ?? 'claude-opus-5';
  },
  get aiEnabled(): boolean {
    return Boolean(env('ANTHROPIC_API_KEY') || env('ANTHROPIC_AUTH_TOKEN') || env('AI_PROVIDER') === 'anthropic');
  },
  get aiTimeoutMs(): number {
    const n = Number(env('AI_TIMEOUT_MS'));
    return Number.isFinite(n) && n > 0 ? n : 9000;
  },
  get supabaseUrl(): string | undefined {
    return env('SUPABASE_URL');
  },
  get supabaseAnonKey(): string | undefined {
    return env('SUPABASE_ANON_KEY');
  },
  get supabaseServiceRoleKey(): string | undefined {
    return env('SUPABASE_SERVICE_ROLE_KEY');
  },
  get useSupabase(): boolean {
    return Boolean(env('SUPABASE_URL') && env('SUPABASE_SERVICE_ROLE_KEY') && env('SUPABASE_ANON_KEY'));
  },
  get demoEmail(): string {
    return env('DEMO_EMAIL') ?? 'demo@partnerup.test';
  },
  get demoPassword(): string | undefined {
    return env('DEMO_PASSWORD');
  },
  get persistDemoData(): boolean {
    return env('PERSIST_DEMO_DATA') !== 'false' && !env('VERCEL');
  },
};
