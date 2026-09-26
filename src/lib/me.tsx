import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { MeResponse } from '../../shared/types';
import { api, errorMessage } from './api';
import { useAuth } from './auth';

interface MeContextValue {
  me: MeResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<MeResponse | null>;
  setMe: (me: MeResponse) => void;
}

const MeContext = createContext<MeContextValue | null>(null);

/**
 * The signed-in person's profile. Mounted with key={auth status} (see
 * MeBoundary) so signing out and in again always starts from a clean slate.
 */
function MeProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (status !== 'signed_in') return;
    let active = true;
    api.me().then(
      (data) => {
        if (!active) return;
        setMe(data);
        setError(null);
      },
      (e: unknown) => {
        if (active) setError(errorMessage(e));
      },
    );
    return () => {
      active = false;
    };
  }, [status]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const data = await api.me();
      setMe(data);
      return data;
    } catch (e) {
      setError(errorMessage(e));
      return null;
    } finally {
      setRefreshing(false);
    }
  }, []);

  const loading = status === 'loading' || (status === 'signed_in' && !me && !error) || refreshing;
  const value = useMemo(
    () => ({ me: status === 'signed_in' ? me : null, loading, error, refresh, setMe }),
    [status, me, loading, error, refresh],
  );
  return <MeContext.Provider value={value}>{children}</MeContext.Provider>;
}

export function MeBoundary({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  return <MeProvider key={status}>{children}</MeProvider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMe(): MeContextValue {
  const ctx = useContext(MeContext);
  if (!ctx) throw new Error('useMe must be used inside MeBoundary');
  return ctx;
}
