import { LogOut, Lock, RefreshCcw, Trash2, UsersRound } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { GENDER_LABELS } from '../../shared/labels';
import { MuseBadge } from '../components/brand/Logo';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/Field';
import { useToast } from '../components/ui/Toast';
import { api, errorMessage } from '../lib/api';
import { useSession } from '../lib/session';

export function AccountPage() {
  const { me, config, setMe, signOut, signInDemo } = useSession();
  const toast = useToast();
  const navigate = useNavigate();
  const profile = me?.profile;
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [instagram, setInstagram] = useState(profile?.instagram ?? '');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!me || !profile) return null;

  async function saveContacts(e: FormEvent) {
    e.preventDefault();
    if (!phone.trim() && !instagram.trim()) return toast('Keep at least a phone number or Instagram so a match can reach you.', 'info');
    setSaving(true);
    try {
      const next = await api.updateContacts({ phone: phone.trim() || null, instagram: instagram.trim() || null });
      setMe(next);
      setPhone(next.profile?.phone ?? '');
      setInstagram(next.profile?.instagram ?? '');
      toast('Contact info saved.', 'success');
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function run(key: string, fn: () => Promise<void>) {
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  }

  const switchTo = (key: string) =>
    run(key, async () => {
      await signInDemo(key);
      navigate('/app', { replace: true });
    });

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="flex items-center gap-4">
        <Avatar name={`${profile.firstName} ${profile.lastName}`} hue={profile.avatarHue} size="xl" />
        <div className="min-w-0">
          <h1 className="text-3xl sm:text-4xl">
            {profile.firstName} {profile.lastName}
          </h1>
          <p className="truncate text-sm font-medium text-muted">{me.email}</p>
        </div>
      </header>

      <section className="card p-6">
        <h2 className="flex items-center gap-2 text-lg">
          <Lock className="size-4" aria-hidden /> Identity
        </h2>
        <p className="mt-1 text-sm text-muted">Name, gender and age are locked so people you know can trust who they’re choosing.</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['First name', profile.firstName],
            ['Last name', profile.lastName],
            ['Gender', GENDER_LABELS[profile.gender]],
            ['Age', String(profile.age)],
          ].map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-ink/[0.03] p-3">
              <dt className="text-xs font-bold text-muted uppercase">{k}</dt>
              <dd className="mt-0.5 truncate font-bold">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <form onSubmit={saveContacts} className="card space-y-4 p-6">
        <div>
          <h2 className="text-lg">Contact info</h2>
          <p className="mt-1 text-sm text-muted">Only shared after a mutual match or when both people say yes in Scout. Never before.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} optional />
          <TextField label="Instagram" value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@handle" maxLength={31} optional />
        </div>
        <Button type="submit" loading={saving}>
          Save contact info
        </Button>
      </form>

      {config?.demoMode && me.isDemoAccount && (
        <section className="card p-6">
          <h2 className="flex items-center gap-2 text-lg">
            <UsersRound className="size-4" aria-hidden /> Demo
          </h2>
          <p className="mt-1 text-sm text-muted">Switch accounts to show both sides of a match, or reset everything to the starting state.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {config.demoAccounts
              .filter((a) => !me.email.startsWith(`${a.key}@`))
              .map((a) => (
                <Button key={a.key} variant="secondary" loading={busy === a.key} disabled={busy !== null} onClick={() => void switchTo(a.key)}>
                  Switch to {a.name}
                </Button>
              ))}
            <Button
              variant="ghost"
              icon={<RefreshCcw className="size-4" aria-hidden />}
              loading={busy === 'reset'}
              disabled={busy !== null}
              onClick={() =>
                void run('reset', async () => {
                  await api.demoReset();
                  window.location.assign('/auth');
                })
              }
            >
              Reset demo
            </Button>
          </div>
        </section>
      )}

      <section className="card p-6">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            icon={<LogOut className="size-4" aria-hidden />}
            loading={busy === 'out'}
            onClick={() =>
              void run('out', async () => {
                await signOut();
                navigate('/', { replace: true });
              })
            }
          >
            Sign out
          </Button>
          {!me.isDemoAccount &&
            (confirmDelete ? (
              <Button
                variant="danger"
                icon={<Trash2 className="size-4" aria-hidden />}
                loading={busy === 'delete'}
                onClick={() =>
                  void run('delete', async () => {
                    await api.deleteAccount();
                    await signOut().catch(() => {});
                    navigate('/', { replace: true });
                  })
                }
              >
                Yes, permanently delete my account
              </Button>
            ) : (
              <Button variant="ghost" className="text-danger" onClick={() => setConfirmDelete(true)}>
                Delete account
              </Button>
            ))}
        </div>
        {confirmDelete && <p className="mt-3 text-sm text-danger">This removes your profile, requests, Partner DNA and connections. It can’t be undone.</p>}
      </section>

      <div className="flex justify-center pt-2">
        <MuseBadge />
      </div>
    </div>
  );
}
