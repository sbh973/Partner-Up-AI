import { Check } from 'lucide-react';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface ChoiceChipsProps<T extends string> {
  label: string;
  options: Option<T>[];
  value: T[];
  onChange: (next: T[]) => void;
  single?: boolean;
  hint?: string;
}

/** Accessible multi/single select rendered as tappable chips. */
export function ChoiceChips<T extends string>({ label, options, value, onChange, single, hint }: ChoiceChipsProps<T>) {
  const toggle = (v: T) => {
    if (single) onChange([v]);
    else onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  };
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-ink">{label}</legend>
      {hint && <p className="-mt-1 text-sm text-muted">{hint}</p>}
      <div className="flex flex-wrap gap-2" role={single ? 'radiogroup' : 'group'} aria-label={label}>
        {options.map((o) => {
          const selected = value.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              role={single ? 'radio' : 'checkbox'}
              aria-checked={selected}
              onClick={() => toggle(o.value)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                selected ? 'border-ink bg-ink text-white' : 'border-line-strong bg-white text-ink-soft hover:border-ink/30'
              }`}
            >
              {selected && <Check className="size-3.5" aria-hidden />}
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
