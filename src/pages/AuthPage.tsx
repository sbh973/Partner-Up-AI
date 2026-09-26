import { Lock, Play } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '../components/brand/Logo';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/Field';
import { useAuth } from '../lib/auth';

/** Only allow in-app redirects (no open redirects). */
function safeNext(raw: string | null): string {
  if (!raw) return '/app';
  try {
    const decoded = decodeURIComponent(raw);
    return decoded.startsWith('/') && !decoded.startsWith('//') ? decoded : '/app';
  } catch {
    return '/app';
  }
}

export function AuthPage() {
  const { status, config, configError, signIn, signUp, signInDemo } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNext(params.get('next'));
  const [tab, setTab] = useState<'signin' | 'signup'>(params.get('tab') === 'signup' ? 'signup' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'form' | 'demo' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'signed_in') navigate(next, { replace: true });
  }, [status, next, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Please enter a valid email.');
    if (password.length < 8) return setError('Passwords need at least 8 characters.');
    setBusy('form');
    try {
      if (tab === 'signin') await signIn(email, password);
      else {
        const { needsConfirmation } = await signUp(email, password);
        if (needsConfirmation) setNotice('Check your inbox to confirm your email, then sign in.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const demo = async () => {
    setError(null);
    setBusy('demo');
    try {
      await signInDemo();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The demo is unavailable right now.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex h-20 w-full max-w-6xl items-center px-4 sm:px-6">
        <Logo />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-6 pb-16 sm:pt-12">
        <div className="w-full max-w-md">
          <h1 className="text-center text-3xl font-bold sm:text-4xl">{tab === 'signin' ? 'Welcome back' : 'Find your people'}</h1>
          <p className="mt-2 text-center text-ink-soft">
            {tab === 'signin' ? 'Sign in to see who you could Partner Up with.' : 'Create an account — it takes about a minute.'}
          </p>

          <div className="card mt-8 p-6 sm:p-7">
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-canvas p-1" role="tablist" aria-label="Account">
              {(['signin', 'signup'] as const).map((t) => (
                <button
                  key={t}
                  role="tab"
                  type="button"
                  aria-selected={tab === t}
                  onClick={() => {
                    setTab(t);
                    setError(null);
                  }}
                  className={`rounded-xl py-2 text-sm font-semibold transition ${tab === t ? 'bg-white text-ink shadow-soft' : 'text-muted'}`}
                >
                  {t === 'signin' ? 'Sign in' : 'Create account'}
                </button>
              ))}
            </div>

            <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
              <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <TextField
                label="Password"
                type="password"
                autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                hint={tab === 'signup' ? 'At least 8 characters.' : undefined}
                required
              />
              {error && (
                <p className="rounded-xl bg-blush px-3 py-2 text-sm font-medium text-rose-deep" role="alert">
                  {error}
                </p>
              )}
              {notice && (
                <p className="rounded-xl bg-good-soft px-3 py-2 text-sm font-medium text-good" role="status">
                  {notice}
                </p>
              )}
              <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy === 'form'} disabled={busy !== null || configError}>
                {tab === 'signin' ? 'Sign in' : 'Create account'}
              </Button>
            </form>

            {(config?.demoAvailable ?? true) && (
              <>
                <div className="my-6 flex items-center gap-3 text-xs font-semibold text-muted uppercase">
                  <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
                </div>
                <Button variant="brand" size="lg" className="w-full" onClick={demo} loading={busy === 'demo'} disabled={busy !== null} icon={busy !== 'demo' && <Play className="size-4" aria-hidden />}>
                  Try the live demo account
                </Button>
                <p className="mt-2 text-center text-xs text-muted">A pre-built profile in a world of fictional demo people.</p>
              </>
            )}
            {configError && (
              <p className="mt-4 text-center text-sm text-rose-deep" role="alert">
                We can’t reach the Partner Up server right now. Please try again shortly.
              </p>
            )}
          </div>
          <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted">
            <Lock className="size-4" aria-hidden /> We never show your email publicly.
          </p>
        </div>
      </main>
    </div>
  );
}
