import { z } from 'zod';
import { GENDERS, TIME_SLOTS } from '../../shared/types';

// Server-side validation + sanitisation for every write. The client is never
// trusted: strings are trimmed, control characters stripped, lengths capped.

// Intentionally matches control characters so they can be stripped.
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export const text = (max: number) =>
  z
    .string()
    .transform((s) => s.replace(CONTROL_CHARS, '').replace(/\s+/g, ' ').trim())
    .pipe(z.string().max(max, `must be at most ${max} characters`));

const name = text(40).pipe(
  z
    .string()
    .min(1, 'is required')
    .regex(/^[\p{L}][\p{L}' .-]*$/u, 'can only contain letters, spaces, apostrophes and hyphens'),
);

const optionalContact = (max: number, re: RegExp, message: string) =>
  z
    .union([text(max), z.null()])
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || re.test(v), message);

const phone = optionalContact(24, /^\+?[0-9 ()-]{7,20}$/, 'must be a valid phone number');
const instagram = optionalContact(31, /^@?[A-Za-z0-9._]{1,30}$/, 'must be a valid Instagram handle');

export const CredentialsSchema = z.object({
  email: text(254).pipe(z.string().email('must be a valid email')),
  password: z.string().min(8, 'must be at least 8 characters').max(200),
});

export const ProfileSetupSchema = z
  .object({
    firstName: name,
    lastName: name,
    gender: z.enum(GENDERS),
    age: z.number().int().min(13).max(120),
    phone,
    instagram,
  })
  .refine((p) => p.phone || p.instagram, { message: 'Add a phone number or Instagram so a match can reach you.', path: ['phone'] });

export const ContactSchema = z.object({ phone, instagram }).refine((p) => p.phone || p.instagram, {
  message: 'Keep at least one way for a match to reach you.',
  path: ['phone'],
});

export const MutualSearchSchema = z.object({ firstName: name, lastName: name });
export const MutualTargetSchema = z.object({ targetId: z.string().min(1).max(40) });

const list = (max = 20) =>
  z
    .array(text(40))
    .max(max)
    .transform((items) => {
      const seen = new Set<string>();
      return items.filter((i) => {
        const k = i.toLowerCase();
        if (!i || seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    });

export const DnaSchema = z.object({
  about: text(600).default(''),
  interests: list(),
  skills: list(),
  learning: list(),
  goals: list(),
  needs: list(),
  offers: list(),
  preferences: list(),
  languages: list(10),
  availability: z.array(z.enum(TIME_SLOTS)).max(6),
  location: z
    .union([text(60), z.null()])
    .transform((v) => (v ? v : null)),
});

export const DnaPatchSchema = z.object({
  interests: list().optional(),
  skills: list().optional(),
  learning: list().optional(),
  goals: list().optional(),
  needs: list().optional(),
  offers: list().optional(),
  preferences: list().optional(),
  languages: list(10).optional(),
  availability: z.array(z.enum(TIME_SLOTS)).max(6).optional(),
  location: z.union([text(60), z.null()]).optional(),
});

export const DnaExtractSchema = z.object({
  text: text(1200).pipe(z.string().min(3, 'needs a little more detail')),
  step: z.number().int().min(0).max(10).default(0),
});

export const ScoutSearchSchema = z.object({ text: text(600).pipe(z.string().min(3, 'needs a little more detail')) });
export const ScoutPartnerUpSchema = z.object({
  requestId: z.string().min(1).max(40),
  candidateIds: z.array(z.string().min(1).max(40)).min(1).max(5),
});
export const ScoutRespondSchema = z.object({ accept: z.boolean() });
export const IdSchema = z.string().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/, 'must be a valid id');
