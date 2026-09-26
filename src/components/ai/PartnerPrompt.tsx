import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useEffect, useId, useState, type FormEvent } from 'react';
import { PROMPT_EXAMPLES } from '../../lib/modes';
import { Button } from '../ui/Button';

const PLACEHOLDERS = [
  'I want someone to play Valorant with at night…',
  "I'm good at calculus but struggling with chemistry…",
  'I just moved to Atlanta and want someone to explore with…',
  'I want someone to practice Spanish with…',
  "I'm visiting Tokyo and want to meet a local…",
];

interface PartnerPromptProps {
  initialValue?: string;
  onSubmit: (text: string) => void;
  busy?: boolean;
  showExamples?: boolean;
  submitLabel?: string;
  autoFocus?: boolean;
}

/** The universal "just tell Partner AI" input. */
export function PartnerPrompt({ initialValue = '', onSubmit, busy, showExamples = true, submitLabel = 'Find my partner', autoFocus }: PartnerPromptProps) {
  const id = useId();
  const [text, setText] = useState(initialValue);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    if (text) return;
    const timer = window.setInterval(() => setPlaceholderIndex((i) => (i + 1) % PLACEHOLDERS.length), 3200);
    return () => window.clearInterval(timer);
  }, [text]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (value.length >= 3 && !busy) onSubmit(value);
  };

  return (
    <form onSubmit={submit} className="w-full">
      <div className="relative rounded-[1.75rem] bg-gradient-to-br from-sun via-[#ff9a5a] to-rose p-[2px] shadow-glow">
        <div className="rounded-[1.65rem] bg-white p-4 sm:p-5">
          <label htmlFor={id} className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
            <Sparkles className="size-4 text-rose" aria-hidden />
            Just tell Partner AI what you need
          </label>
          <div className="relative">
            <textarea
              id={id}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  submit(e);
                }
              }}
              rows={2}
              maxLength={600}
              autoFocus={autoFocus}
              className="peer w-full resize-none bg-transparent text-lg font-semibold leading-snug text-ink placeholder:text-transparent focus:outline-none sm:text-xl"
              placeholder={PLACEHOLDERS[placeholderIndex]}
              aria-describedby={`${id}-help`}
            />
            {!text && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={placeholderIndex}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    className="block text-lg font-semibold leading-snug text-muted/70 sm:text-xl"
                  >
                    {PLACEHOLDERS[placeholderIndex]}
                  </motion.span>
                </AnimatePresence>
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p id={`${id}-help`} className="hidden text-xs text-muted sm:block">
              Partner AI figures out the mode, what you need, and what you can offer.
            </p>
            <Button type="submit" variant="brand" loading={busy} disabled={text.trim().length < 3} className="ml-auto" icon={!busy && <ArrowRight className="size-4" aria-hidden />}>
              {submitLabel}
            </Button>
          </div>
        </div>
      </div>
      {showExamples && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="py-1.5 text-xs font-medium text-muted">Try:</span>
          {PROMPT_EXAMPLES.slice(0, 3).map((ex) => (
            <button
              key={ex.text}
              type="button"
              onClick={() => setText(ex.text)}
              className="max-w-full truncate rounded-full border border-line bg-white px-3 py-1.5 text-left text-xs font-medium text-ink-soft hover:border-ink/25"
            >
              {ex.text}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
