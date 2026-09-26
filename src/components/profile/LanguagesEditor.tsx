import type { LanguageSkill } from '../../../shared/types';
import { TagInput } from '../ui/TagInput';

const COMMON = ['English', 'Spanish', 'Hindi', 'Mandarin', 'French', 'Portuguese', 'Japanese', 'Korean', 'Arabic', 'German'];

/** Two simple lists instead of a proficiency matrix: what you speak, what you're learning. */
export function LanguagesEditor({ value, onChange }: { value: LanguageSkill[]; onChange: (next: LanguageSkill[]) => void }) {
  const spoken = value.filter((l) => l.level !== 'learning').map((l) => l.language);
  const learning = value.filter((l) => l.level === 'learning').map((l) => l.language);

  const setSpoken = (names: string[]) => {
    const kept = value.filter((l) => l.level !== 'learning' && names.includes(l.language));
    const added = names.filter((n) => !kept.some((l) => l.language === n)).map((language) => ({ language, level: 'fluent' as const }));
    onChange([...kept, ...added, ...value.filter((l) => l.level === 'learning' && !names.includes(l.language))]);
  };
  const setLearning = (names: string[]) => {
    onChange([
      ...value.filter((l) => l.level !== 'learning' && !names.includes(l.language)),
      ...names.map((language) => ({ language, level: 'learning' as const })),
    ]);
  };

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <TagInput label="Languages I speak" value={spoken} onChange={setSpoken} suggestions={COMMON.filter((l) => !learning.includes(l))} max={8} />
      <TagInput
        label="Languages I’m learning"
        value={learning}
        onChange={setLearning}
        suggestions={COMMON.filter((l) => !spoken.includes(l))}
        max={6}
        optional
      />
    </div>
  );
}
