import { Lock, Plus, Trash2 } from 'lucide-react';
import { CONTACT_KINDS, type ContactKind, type ContactMethod } from '../../../shared/types';
import { CONTACT_KIND_LABELS } from '../../../shared/labels';
import { controlClass } from '../ui/styles';

const PLACEHOLDERS: Record<ContactKind, string> = {
  email: 'you@example.com',
  instagram: '@yourhandle',
  discord: 'discord username',
  discord_invite: 'https://discord.gg/…',
  phone: '+1 555 0100',
  other: 'How people can reach you',
};

export function ContactsEditor({ value, onChange }: { value: ContactMethod[]; onChange: (next: ContactMethod[]) => void }) {
  const update = (i: number, patch: Partial<ContactMethod>) => onChange(value.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  return (
    <div className="space-y-3">
      <p className="flex items-start gap-2 rounded-2xl bg-cream px-4 py-3 text-sm text-ink-soft">
        <Lock className="mt-0.5 size-4 shrink-0 text-rose-deep" aria-hidden />
        Hidden from everyone. A method is revealed only to people you mutually Partner Up with — and only if you switch “Share on match” on.
      </p>
      {value.map((c, i) => (
        <div key={i} className="grid grid-cols-[1fr_auto] gap-2 rounded-2xl border border-line bg-white p-3 sm:grid-cols-[10rem_1fr_auto_auto] sm:items-center">
          <label className="sr-only" htmlFor={`contact-kind-${i}`}>
            Contact type
          </label>
          <select
            id={`contact-kind-${i}`}
            value={c.kind}
            onChange={(e) => update(i, { kind: e.target.value as ContactKind })}
            className={`${controlClass} py-2.5`}
          >
            {CONTACT_KINDS.map((k) => (
              <option key={k} value={k}>
                {CONTACT_KIND_LABELS[k]}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => onChange(value.filter((_, idx) => idx !== i))} className="rounded-xl p-2 text-muted hover:bg-blush hover:text-rose-deep sm:order-last" aria-label="Remove contact method">
            <Trash2 className="size-4" />
          </button>
          <label className="sr-only" htmlFor={`contact-value-${i}`}>
            {CONTACT_KIND_LABELS[c.kind]}
          </label>
          <input
            id={`contact-value-${i}`}
            value={c.value}
            onChange={(e) => update(i, { value: e.target.value })}
            placeholder={PLACEHOLDERS[c.kind]}
            maxLength={200}
            className={`${controlClass} col-span-2 py-2.5 sm:col-span-1`}
          />
          <label className="col-span-2 inline-flex items-center gap-2 text-sm font-medium text-ink-soft sm:col-span-1">
            <input type="checkbox" checked={c.shareOnMatch} onChange={(e) => update(i, { shareOnMatch: e.target.checked })} className="size-4 accent-[#ff4d8d]" />
            Share on match
          </label>
        </div>
      ))}
      {value.length < 6 && (
        <button
          type="button"
          onClick={() => onChange([...value, { kind: value.some((c) => c.kind === 'instagram') ? 'discord' : 'instagram', value: '', shareOnMatch: true }])}
          className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-line-strong px-3 py-2 text-sm font-semibold text-ink-soft hover:border-ink/30"
        >
          <Plus className="size-4" aria-hidden /> Add a way to connect
        </button>
      )}
    </div>
  );
}
