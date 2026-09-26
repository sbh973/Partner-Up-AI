import { motion } from 'framer-motion';
import { Pencil, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { PartnerDNA } from '../../../shared/types';

const SECTION_EMOJI: Record<string, string> = {
  interests: '✨',
  strengths: '💪',
  learningNeeds: '🌱',
  languages: '🗣️',
  socialStyle: '💬',
  availability: '🕐',
  lookingFor: '🎯',
};

interface PartnerDnaCardProps {
  dna: PartnerDNA;
  name: string;
  compact?: boolean;
  editable?: boolean;
}

export function PartnerDnaCard({ dna, name, compact, editable = true }: PartnerDnaCardProps) {
  const first = name.split(' ')[0];
  const sections = compact ? dna.sections.slice(0, 4) : dna.sections;
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="card relative overflow-hidden"
      aria-labelledby="dna-title"
    >
      <div className="brand-gradient relative px-5 pt-5 pb-6 sm:px-6">
        <div className="absolute -right-8 -bottom-10 size-40 rounded-full bg-white/25 blur-2xl" aria-hidden />
        <p className="relative flex items-center gap-1.5 text-xs font-bold tracking-[0.14em] text-ink/70 uppercase">
          <Sparkles className="size-3.5" aria-hidden /> {first}’s Partner DNA
        </p>
        <h2 id="dna-title" className="relative mt-2 text-2xl font-extrabold text-ink sm:text-3xl">
          {dna.headline}
        </h2>
        {!compact && <p className="relative mt-2 max-w-xl text-sm leading-relaxed text-ink/80">{dna.summary}</p>}
      </div>
      <dl className={`grid gap-x-6 gap-y-4 p-5 sm:p-6 ${compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
        {sections.map((s) => (
          <div key={s.key}>
            <dt className="eyebrow flex items-center gap-1.5">
              <span aria-hidden>{SECTION_EMOJI[s.key]}</span> {s.label}
            </dt>
            <dd className="mt-1.5 text-[15px] font-medium text-ink">{s.items.slice(0, compact ? 4 : 8).join(' • ')}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3 text-xs text-muted sm:px-6">
        <span>Built only from what you shared — not a personality verdict.</span>
        {editable && (
          <Link to="/app/profile" className="inline-flex items-center gap-1 font-semibold text-ink hover:underline">
            <Pencil className="size-3.5" aria-hidden /> Edit
          </Link>
        )}
      </div>
    </motion.section>
  );
}
