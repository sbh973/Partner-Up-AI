import { AnimatePresence } from 'framer-motion';
import { ArrowLeft, AtSign, Check, Copy, ExternalLink, Lock, Mail, MessageSquare, Phone, Send } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import type { ContactKind, ContactMethod } from '../../shared/types';
import { CONTACT_KIND_LABELS } from '../../shared/labels';
import { PersonaBadge } from '../components/match/MatchCard';
import { Celebration } from '../components/partnership/Celebration';
import { ConnectionBridgeCard } from '../components/partnership/ConnectionBridge';
import { Avatar } from '../components/ui/Avatar';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { ErrorNote, PageLoader } from '../components/ui/Feedback';
import { useToast } from '../components/ui/Toast';
import { api, errorMessage } from '../lib/api';
import { useMe } from '../lib/me';
import { MODE_THEMES } from '../lib/modes';
import { useLoad } from '../lib/useLoad';

const ICONS: Record<ContactKind, typeof AtSign> = {
  email: Mail,
  instagram: AtSign,
  discord: MessageSquare,
  discord_invite: MessageSquare,
  phone: Phone,
  other: Send,
};

/** Only build links for well-formed, expected destinations. */
function contactHref(c: Omit<ContactMethod, 'shareOnMatch'>): string | null {
  const v = c.value.trim();
  if (c.kind === 'email' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return `mailto:${v}`;
  if (c.kind === 'instagram') {
    const handle = v.replace(/^@/, '');
    return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? `https://instagram.com/${handle}` : null;
  }
  if (c.kind === 'discord_invite' && /^https:\/\/(discord\.gg|discord\.com\/invite)\/[A-Za-z0-9-]+$/.test(v)) return v;
  return null;
}

function ContactRow({ contact }: { contact: Omit<ContactMethod, 'shareOnMatch'> }) {
  const [copied, setCopied] = useState(false);
  const Icon = ICONS[contact.kind];
  const href = contactHref(contact);
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3.5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cream text-ink">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-muted uppercase">{CONTACT_KIND_LABELS[contact.kind]}</span>
        <span className="block truncate font-semibold text-ink">{contact.value}</span>
      </span>
      {href && (
        <a href={href} target="_blank" rel="noopener noreferrer" className="rounded-xl p-2 text-muted hover:bg-ink/5 hover:text-ink" aria-label={`Open ${CONTACT_KIND_LABELS[contact.kind]}`}>
          <ExternalLink className="size-4" />
        </a>
      )}
      <button
        type="button"
        onClick={() =>
          void navigator.clipboard?.writeText(contact.value).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          })
        }
        className="rounded-xl p-2 text-muted hover:bg-ink/5 hover:text-ink"
        aria-label={copied ? 'Copied' : `Copy ${CONTACT_KIND_LABELS[contact.kind]}`}
      >
        {copied ? <Check className="size-4 text-good" /> : <Copy className="size-4" />}
      </button>
    </li>
  );
}

export function PartnershipPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const { me } = useMe();
  const { data, error, reload } = useLoad(() => api.partnership(id), [id]);
  const [celebrate, setCelebrate] = useState(Boolean((location.state as { celebrate?: boolean } | null)?.celebrate));
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState(false);

  const closeCelebration = useCallback(() => {
    setCelebrate(false);
    navigate(location.pathname, { replace: true, state: null });
  }, [navigate, location.pathname]);

  const end = async () => {
    setEnding(true);
    try {
      await api.endPartnership(id);
      toast('Partnership ended. Contact details are no longer shared.', 'info');
      navigate('/app/matches');
    } catch (e) {
      toast(errorMessage(e), 'error');
      setEnding(false);
    }
  };

  if (error) return <ErrorNote message={error} onRetry={reload} />;
  if (!data || !me?.profile) return <PageLoader label="Building your Connection Bridge…" />;

  const theme = MODE_THEMES[data.mode];
  const first = data.partner.displayName.split(' ')[0];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <AnimatePresence>
        {celebrate && (
          <Celebration
            me={{ name: me.profile.displayName, hue: me.profile.avatarHue }}
            partner={{ name: data.partner.displayName, hue: data.partner.avatarHue }}
            onContinue={closeCelebration}
          />
        )}
      </AnimatePresence>

      <Link to="/app/matches" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> All matches
      </Link>

      <section className="card relative overflow-hidden p-6 sm:p-8">
        <div className="brand-gradient pointer-events-none absolute -top-24 -right-16 size-64 rounded-full opacity-25 blur-3xl" aria-hidden />
        <p className="eyebrow relative">{data.active ? 'It’s a partnership 🤝' : 'Partnership ended'}</p>
        <div className="relative mt-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center">
            <Avatar name={me.profile.displayName} hue={me.profile.avatarHue} size="lg" />
            <Avatar name={data.partner.displayName} hue={data.partner.avatarHue} size="lg" className="-ml-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold sm:text-3xl">
              You + {data.partner.displayName} {data.partner.isDemoPersona && <PersonaBadge />}
            </h1>
            <p className="text-sm text-muted">
              You both chose to Partner Up · {new Date(data.matchedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </p>
          </div>
          <Chip tone={data.mode} emoji={theme.emoji}>
            {theme.name} · {data.score}%
          </Chip>
        </div>
        {data.active && (
          <Button
            variant="brand"
            size="lg"
            className="relative mt-6 w-full sm:w-auto"
            onClick={() => document.getElementById('contacts')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            Start connecting
          </Button>
        )}
      </section>

      {data.active && data.bridge && <ConnectionBridgeCard bridge={data.bridge} partnerName={first} />}

      {data.active && (
        <section id="contacts" className="card scroll-mt-24 p-5 sm:p-6" aria-labelledby="contacts-title">
          <h2 id="contacts-title" className="text-xl font-bold">
            How to reach {first}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
            <Lock className="size-3.5" aria-hidden /> Shared only because you both said yes — and only what {first} chose to share.
          </p>
          {data.partnerContacts.length ? (
            <ul className="mt-4 space-y-2">
              {data.partnerContacts.map((c) => (
                <ContactRow key={`${c.kind}-${c.value}`} contact={c} />
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-2xl bg-canvas p-4 text-sm text-ink-soft">{first} hasn’t added a shareable contact yet. We’ll show it here as soon as they do.</p>
          )}
          {me.contacts.every((c) => !c.shareOnMatch) && (
            <p className="mt-4 text-sm text-ink-soft">
              You haven’t shared a contact method yet.{' '}
              <Link to="/app/profile" className="font-semibold text-rose-deep underline underline-offset-4">
                Add one
              </Link>{' '}
              so {first} can reach you too.
            </p>
          )}
        </section>
      )}

      {data.active && (
        <div className="flex justify-center pt-2">
          {confirmEnd ? (
            <div className="card flex flex-col items-center gap-3 p-4 text-center sm:flex-row sm:text-left">
              <p className="text-sm text-ink-soft">End this partnership? Contact details stop being shared for both of you.</p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setConfirmEnd(false)}>
                  Keep
                </Button>
                <Button variant="danger" size="sm" onClick={() => void end()} loading={ending}>
                  End
                </Button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmEnd(true)} className="text-sm font-medium text-muted underline underline-offset-4 hover:text-ink">
              End partnership
            </button>
          )}
        </div>
      )}
    </div>
  );
}
