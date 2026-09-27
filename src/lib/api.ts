import type {
  AppConfig,
  AppNotification,
  ContactUpdateInput,
  DnaExtractResponse,
  DnaPatch,
  MeResponse,
  MutualOverview,
  MutualPartnerUpResponse,
  MutualSearchResponse,
  PartnerDNA,
  ProfileSetupInput,
  ScoutConnectionView,
  ScoutOverview,
  ScoutSearchResponse,
} from '../../shared/types';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

let onUnauthorized: () => void = () => {};
export function setUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn;
}

// Auth is an HttpOnly session cookie (JS can't read it). Every write carries
// X-Partner-Up, which the server requires as CSRF protection.
async function request<T>(method: string, path: string, body?: unknown, opts: { silent401?: boolean } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Partner-Up': '1' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'offline', 'We couldn’t reach Partner Up. Check your connection and try again.');
  }
  let payload: unknown = null;
  try {
    payload = await res.json();
  } catch {
    // non-JSON (proxy error page) — handled below
  }
  if (!res.ok) {
    const err = (payload as { error?: { code?: string; message?: string } } | null)?.error;
    if (res.status === 401 && !opts.silent401) onUnauthorized();
    throw new ApiError(res.status, err?.code ?? 'error', err?.message ?? 'Something went wrong. Please try again.');
  }
  return payload as T;
}

type Ok = { ok: true };

export const api = {
  config: () => request<AppConfig>('GET', '/api/config'),
  me: () => request<MeResponse>('GET', '/api/me', undefined, { silent401: true }),
  signUp: (email: string, password: string) => request<Ok>('POST', '/api/auth/signup', { email, password }),
  signIn: (email: string, password: string) => request<Ok>('POST', '/api/auth/login', { email, password }),
  demo: (key: string) => request<Ok>('POST', `/api/auth/demo/${encodeURIComponent(key)}`),
  signOut: () => request<Ok>('POST', '/api/auth/logout'),
  setupProfile: (input: ProfileSetupInput) => request<MeResponse>('POST', '/api/profile', input),
  updateContacts: (input: ContactUpdateInput) => request<MeResponse>('PUT', '/api/profile/contacts', input),
  deleteAccount: () => request<Ok>('DELETE', '/api/account'),

  mutual: () => request<MutualOverview>('GET', '/api/mutual'),
  mutualSearch: (firstName: string, lastName: string) => request<MutualSearchResponse>('POST', '/api/mutual/search', { firstName, lastName }),
  mutualPartnerUp: (targetId: string) => request<MutualPartnerUpResponse>('POST', '/api/mutual/partner-up', { targetId }),
  mutualSaveForJoin: (firstName: string, lastName: string) => request<MutualPartnerUpResponse>('POST', '/api/mutual/save-for-join', { firstName, lastName }),
  mutualWithdraw: (id: string) => request<Ok>('POST', `/api/mutual/requests/${id}/withdraw`),
  mutualEnd: (id: string) => request<Ok>('POST', `/api/mutual/matches/${id}/end`),

  scout: () => request<ScoutOverview>('GET', '/api/scout'),
  scoutSearch: (text: string) => request<ScoutSearchResponse>('POST', '/api/scout/search', { text }),
  dnaExtract: (text: string, step: number) => request<DnaExtractResponse>('POST', '/api/scout/dna/extract', { text, step }),
  dnaUndo: (patch: DnaPatch) => request<PartnerDNA>('POST', '/api/scout/dna/undo', patch),
  dnaSave: (dna: Omit<PartnerDNA, 'lastSource' | 'updatedAt'>) => request<MeResponse>('PUT', '/api/scout/dna', dna),
  scoutPartnerUp: (requestId: string, candidateIds: string[]) => request<ScoutConnectionView[]>('POST', '/api/scout/partner-up', { requestId, candidateIds }),
  scoutConnection: (id: string) => request<ScoutConnectionView>('GET', `/api/scout/connections/${id}`),
  scoutRespond: (id: string, accept: boolean) => request<ScoutConnectionView>('POST', `/api/scout/connections/${id}/respond`, { accept }),
  scoutStop: (id: string) => request<Ok>('POST', `/api/scout/requests/${id}/stop`),

  notifications: () => request<{ notifications: AppNotification[] }>('GET', '/api/notifications'),
  markRead: () => request<Ok>('POST', '/api/notifications/read'),

  demoReset: () => request<Ok>('POST', '/api/demo/reset'),
  demoNewStudent: () => request<{ joined: boolean; found: number }>('POST', '/api/demo/new-student'),
};

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Something went wrong. Please try again.';
}
