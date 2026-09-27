import { AtSign, Check, Copy, ExternalLink, Phone } from 'lucide-react';
import { useState } from 'react';

function Row({ kind, value }: { kind: 'phone' | 'instagram'; value: string }) {
  const [copied, setCopied] = useState(false);
  const Icon = kind === 'phone' ? Phone : AtSign;
  const handle = value.replace(/^@/, '');
  const href = kind === 'phone' ? `tel:${value.replace(/[^+0-9]/g, '')}` : /^[A-Za-z0-9._]{1,30}$/.test(handle) ? `https://instagram.com/${handle}` : null;
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-line bg-white p-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-banana-soft">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-bold text-muted uppercase">{kind === 'phone' ? 'Phone' : 'Instagram'}</span>
        <span className="block truncate font-bold">{value}</span>
      </span>
      {href && (
        <a href={href} target={kind === 'instagram' ? '_blank' : undefined} rel="noopener noreferrer" className="flex size-10 items-center justify-center rounded-xl hover:bg-ink/5" aria-label={`Open ${kind}`}>
          <ExternalLink className="size-4" />
        </a>
      )}
      <button
        type="button"
        onClick={() =>
          void navigator.clipboard?.writeText(value).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          })
        }
        className="flex size-10 items-center justify-center rounded-xl hover:bg-ink/5"
        aria-label={copied ? 'Copied' : `Copy ${kind}`}
      >
        {copied ? <Check className="size-4 text-good" /> : <Copy className="size-4" />}
      </button>
    </li>
  );
}

/** Only the contact info the other person chose to provide — shown only after both said yes. */
export function ContactList({ contacts }: { contacts: { phone: string | null; instagram: string | null } }) {
  if (!contacts.phone && !contacts.instagram) return <p className="text-sm text-muted">They haven’t added contact info yet.</p>;
  return (
    <ul className="space-y-2">
      {contacts.instagram && <Row kind="instagram" value={contacts.instagram} />}
      {contacts.phone && <Row kind="phone" value={contacts.phone} />}
    </ul>
  );
}
