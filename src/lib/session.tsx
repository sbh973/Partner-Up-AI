import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppConfig, MeResponse } from '../../shared/types';
import { api, setUnauthorizedHandler } from './api';

type Status = 'loading' | 'signed_out' | 'signed_in';

interface SessionValue {
  status: Status;
  me: MeResponse | null;
  config: AppConfig | null;
  refresh: () => Promise<MeResponse | null>;
  setMe: (me: MeResponse) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInDemo: (key: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

/** One source of truth for "who is signed in" (the session itself is an HttpOnly cookie). */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [me, setMeState] = useState<MeResponse | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.me();
      setMeState(data);
      setStatus('signed_in');
      return data;
    } catch {
      setMeState(null);
      setStatus('signed_out');
      return null;
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setMeState(null);
      setStatus('signed_out');
    });
    let active = true;
    api.config().then(
      (c) => active && setConfig(c),
      () => undefined,
    );
    api.me().then(
      (data) => {
        if (!active) return;
        setMeState(data);
        setStatus('signed_in');
      },
      () => active && setStatus('signed_out'),
    );
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      await api.signIn(email, password);
      await refresh();
    },
    [refresh],
  );
  const signUp = useCallback(
    async (email: string, password: string) => {
      await api.signUp(email, password);
      await refresh();
    },
    [refresh],
  );
  const signInDemo = useCallback(
    async (key: string) => {
      await api.demo(key);
      await refresh();
    },
    [refresh],
  );
  const signOut = useCallback(async () => {
    try {
      await api.signOut();
    } finally {
      setMeState(null);
      setStatus('signed_out');
    }
  }, []);

  const value = useMemo(
    () => ({ status, me, config, refresh, setMe: setMeState, signIn, signUp, signInDemo, signOut }),
    [status, me, config, refresh, signIn, signUp, signInDemo, signOut],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
