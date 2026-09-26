import { Plus, X } from 'lucide-react';
import { useId, useState, type KeyboardEvent } from 'react';

interface TagInputProps {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  hint?: string;
  max?: number;
  optional?: boolean;
}

/** Free-text tags with one-tap suggestions. Enter or comma adds a tag. */
export function TagInput({ label, value, onChange, suggestions = [], placeholder = 'Type and press Enter', hint, max = 12, optional }: TagInputProps) {
  const id = useId();
  const [draft, setDraft] = useState('');
  const lower = value.map((v) => v.toLowerCase());

  const add = (raw: string) => {
    const tag = raw.replace(/,/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 48);
    if (!tag || lower.includes(tag.toLowerCase()) || value.length >= max) return;
    onChange([...value, tag]);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
      setDraft('');
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const remaining = suggestions.filter((s) => !lower.includes(s.toLowerCase())).slice(0, 10);

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="flex items-baseline gap-2 text-sm font-semibold text-ink">
        {label}
        {optional && <span className="text-xs font-normal text-muted">Optional</span>}
      </label>
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line-strong bg-white p-2 focus-within:border-rose/60 focus-within:ring-4 focus-within:ring-rose/15">
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-cream py-1 pr-1 pl-3 text-sm font-medium text-ink">
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter((v) => v !== tag))}
              className="rounded-full p-1 text-muted hover:bg-ink/10 hover:text-ink"
              aria-label={`Remove ${tag}`}
            >
              <X className="size-3.5" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (draft.trim()) {
              add(draft);
              setDraft('');
            }
          }}
          placeholder={value.length ? '' : placeholder}
          className="min-w-[8rem] flex-1 bg-transparent px-2 py-1.5 text-[15px] placeholder:text-muted/70 focus:outline-none"
        />
      </div>
      {hint && <p className="text-sm text-muted">{hint}</p>}
      {remaining.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label={`Suggestions for ${label}`}>
          {remaining.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="inline-flex items-center gap-1 rounded-full border border-dashed border-line-strong px-2.5 py-1 text-xs font-medium text-ink-soft hover:border-ink/30 hover:bg-white"
            >
              <Plus className="size-3" aria-hidden />
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
