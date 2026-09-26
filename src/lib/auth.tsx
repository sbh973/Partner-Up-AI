import type { SupabaseClient } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppConfig } from '../../shared/types';
import { api, configureApi } from './api';

// One auth surface for two backends:
//  • local  — demo data mode; the API issues an opaque session token.
//  • supabase — Supabase Auth in the browser (anon key only); the API
//    verifies the JWT server-side on every request.

const LOCAL_TOKEN_KEY = 'partnerup.session';

type Status = 'loading' | 'signed_out' | 'signed_in';

interface AuthContextValue {
  status: Status;
  config: AppConfig | null;
  configError: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  signInDemo: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readLocalToken(): string | null {
  try {
    return localStorage.getItem(LOCAL_TOKEN_KEY);
  } catch {
    return null;
  }
}

function writeLocalToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(LOCAL_TOKEN_KEY, token);
    else localStorage.removeItem(LOCAL_TOKEN_KEY);
  } catch {
    // Storage unavailable (private mode) — session lasts for this tab only.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [configError, setConfigError] = useState(false);
  const [status, setStatus] = useState<Status>('loading');
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const memoryToken = useRef<string | null>(readLocalToken());

  useEffect(() => {
    configureApi({
      getToken: async () => {
        if (supabaseRef.current) {
          const { data } = await supabaseRef.current.auth.getSession();
          return data.session?.access_token ?? null;
        }
        return memoryToken.current;
      },
      onUnauthorized: () => {
        memoryToken.current = null;
        writeLocalToken(null);
        setStatus('signed_out');
      },
    });

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    api
      .config()
      .then(async (cfg) => {
        if (cancelled) return;
        setConfig(cfg);
        if (cfg.authMode === 'supabase' && cfg.supabaseUrl && cfg.supabaseAnonKey) {
          // Loaded only when this deployment actually uses Supabase Auth.
          const { createClient } = await import('@supabase/supabase-js');
          if (cancelled) return;
          const client = createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
          supabaseRef.current = client;
          const { data } = await client.auth.getSession();
          if (!cancelled) setStatus(data.session ? 'signed_in' : 'signed_out');
          const sub = client.auth.onAuthStateChange((_event, session) => setStatus(session ? 'signed_in' : 'signed_out'));
          unsubscribe = () => sub.data.subscription.unsubscribe();
        } else {
          setStatus(memoryToken.current ? 'signed_in' : 'signed_out');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setConfigError(true);
          setStatus('signed_out');
        }
      });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  const adoptLocal = useCallback((token: string) => {
    memoryToken.current = token;
    writeLocalToken(token);
    setStatus('signed_in');
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const sb = supabaseRef.current;
      if (sb) {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw new Error('That email and password don’t match.');
        return;
      }
      adoptLocal((await api.signIn(email, password)).accessToken);
    },
    [adoptLocal],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      const sb = supabaseRef.current;
      if (sb) {
        const { data, error } = await sb.auth.signUp({ email, password });
        if (error) throw new Error(error.message);
        return { needsConfirmation: !data.session };
      }
      adoptLocal((await api.signUp(email, password)).accessToken);
      return { needsConfirmation: false };
    },
    [adoptLocal],
  );

  const signInDemo = useCallback(async () => {
    const tokens = await api.demo();
    const sb = supabaseRef.current;
    if (sb) {
      const { error } = await sb.auth.setSession({ access_token: tokens.accessToken, refresh_token: tokens.refreshToken ?? '' });
      if (error) throw new Error('The demo account couldn’t sign in right now.');
      return;
    }
    adoptLocal(tokens.accessToken);
  }, [adoptLocal]);

  const signOut = useCallback(async () => {
    const sb = supabaseRef.current;
    if (sb) {
      await sb.auth.signOut();
      return;
    }
    try {
      await api.signOut();
    } catch {
      // Signing out locally is what matters.
    }
    memoryToken.current = null;
    writeLocalToken(null);
    setStatus('signed_out');
  }, []);

  const value = useMemo(
    () => ({ status, config, configError, signIn, signUp, signInDemo, signOut }),
    [status, config, configError, signIn, signUp, signInDemo, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
