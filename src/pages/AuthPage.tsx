import { Lock, Play } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '../components/brand/Logo';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/Field';
import { errorMessage } from '../lib/api';
import { useSession } from '../lib/session';

/** Only allow in-app redirects (no open redirects). */
function safeNext(raw: string | null): string {
  if (!raw) return '/app';
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : '/app';
}

export function AuthPage() {
  const { status, config, signIn, signUp, signInDemo } = useSession();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNext(params.get('next'));
  const [tab, setTab] = useState<'signin' | 'signup'>(params.get('tab') === 'signup' ? 'signup' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'signed_in') navigate(next, { replace: true });
  }, [status, next, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError('Please enter a valid email.');
    if (password.length < 8) return setError('Passwords need at least 8 characters.');
    setBusy('form');
    try {
      if (tab === 'signin') await signIn(email, password);
      else await signUp(email, password);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const demo = async (key: string) => {
    setError(null);
    setBusy(key);
    try {
      await signInDemo(key);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const demos = config?.demoAccounts ?? [];

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="mx-auto flex h-20 w-full max-w-6xl items-center px-4 sm:px-6">
        <Logo badge />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pt-4 pb-16 sm:pt-10">
        <div className="w-full max-w-md">
          <h1 className="text-center text-4xl">{tab === 'signin' ? 'Welcome back' : 'Get started'}</h1>
          <p className="mt-2 text-center font-medium text-muted">
            {tab === 'signin' ? 'Sign in to Partner Up.' : 'Create your account — it takes a minute.'}
          </p>

          <div className="card mt-8 p-6 sm:p-7">
            <div className="grid grid-cols-2 gap-1 rounded-full bg-canvas p-1" role="tablist" aria-label="Account">
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
                  className={`min-h-10 rounded-full text-sm font-bold transition ${tab === t ? 'bg-white text-ink shadow-soft' : 'text-muted'}`}
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
                <p className="rounded-2xl bg-danger-soft px-4 py-2.5 text-sm font-semibold text-danger" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" size="lg" className="w-full" loading={busy === 'form'} disabled={busy !== null}>
                {tab === 'signin' ? 'Sign in' : 'Create account'}
              </Button>
            </form>

            {demos.length > 0 && (
              <div className="mt-7 border-t border-line pt-6">
                <p className="eyebrow flex items-center gap-1.5">
                  <Play className="size-3.5" aria-hidden /> Live demo accounts
                </p>
                <p className="mt-1 text-sm text-muted">Switch between them to see a Mutual match happen from both sides.</p>
                <div className="mt-3 grid gap-2">
                  {demos.map((d, i) => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => void demo(d.key)}
                      disabled={busy !== null}
                      className="flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-white px-4 text-left transition hover:border-ink/40 disabled:opacity-60"
                    >
                      <Avatar name={d.name} hue={i === 0 ? 38 : 330} size="sm" />
                      <span className="flex-1">
                        <span className="block font-bold">{d.name}</span>
                        <span className="block text-xs text-muted">Demo account</span>
                      </span>
                      <span className="text-sm font-bold">{busy === d.key ? 'Signing in…' : 'Continue →'}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted">
            <Lock className="size-4" aria-hidden /> Your email is never shown to anyone.
          </p>
        </div>
      </main>
    </div>
  );
}
