// Seeds a Supabase project with the fictional demo world.
// Usage: fill SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_EMAIL, DEMO_PASSWORD
// in .env, apply supabase/migrations/0001_partner_up.sql, then:
//   npm run seed:supabase
// Idempotent: safe to run again (it upserts by id).

import { createClient } from '@supabase/supabase-js';
import { DEMO_PERSON, PERSONAS, SEEDED_INCOMING_REQUESTS, SEEDED_PARTNERSHIPS, type SeedPerson } from '../server/data/seed';

try {
  process.loadEnvFile?.('.env');
} catch {
  // Use the real environment.
}

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const demoEmail = process.env.DEMO_EMAIL || 'demo@partnerup.test';
const demoPassword = process.env.DEMO_PASSWORD;
if (!url || !serviceKey || !demoPassword) {
  console.error('Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DEMO_PASSWORD first.');
  process.exit(1);
}

const sb = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

async function must<T>(label: string, p: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function ensureDemoUser(): Promise<string> {
  const { data: list, error } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const existing = list.users.find((u) => u.email?.toLowerCase() === demoEmail.toLowerCase());
  if (existing) {
    await sb.auth.admin.updateUserById(existing.id, { password: demoPassword });
    return existing.id;
  }
  const { data, error: createError } = await sb.auth.admin.createUser({ email: demoEmail, password: demoPassword, email_confirm: true });
  if (createError || !data.user) throw createError ?? new Error('Could not create demo user');
  return data.user.id;
}

function profileRow(p: SeedPerson, userId: string | null) {
  return {
    id: p.id,
    user_id: userId,
    display_name: p.displayName,
    age: p.age,
    pronouns: p.pronouns,
    community: p.community,
    city: p.city,
    bio: p.bio,
    interests: p.interests,
    skills: p.skills,
    languages: p.languages,
    availability: p.availability,
    group_sizes: p.groupSizes,
    setting: p.setting,
    avatar_hue: p.avatarHue,
    is_demo_persona: userId === null,
  };
}

async function seedPerson(p: SeedPerson, userId: string | null) {
  await must(`profile ${p.displayName}`, sb.from('profiles').upsert(profileRow(p, userId), { onConflict: 'id' }));
  for (const [mode, mp] of Object.entries(p.modes)) {
    if (!mp) continue;
    await must(
      `mode ${p.displayName}/${mode}`,
      sb.from('mode_profiles').upsert(
        { profile_id: p.id, mode, looking_for: mp.lookingFor, seeks: mp.seeks, offers: mp.offers, details: mp.details, active: true },
        { onConflict: 'profile_id,mode' },
      ),
    );
  }
  await must(`contacts ${p.displayName}`, sb.from('contact_methods').delete().eq('profile_id', p.id));
  await must(
    `contacts ${p.displayName}`,
    sb.from('contact_methods').insert(p.contacts.map((c) => ({ profile_id: p.id, kind: c.kind, value: c.value, share_on_match: c.shareOnMatch }))),
  );
}

async function main() {
  const demoUserId = await ensureDemoUser();
  await seedPerson(DEMO_PERSON, demoUserId);
  for (const persona of PERSONAS) await seedPerson(persona, null);

  // Reset and re-create the demo account's starting interactions.
  await must('clear requests', sb.from('partner_requests').delete().or(`requester_id.eq.${DEMO_PERSON.id},target_id.eq.${DEMO_PERSON.id}`));
  await must('clear matches', sb.from('matches').delete().or(`user_a.eq.${DEMO_PERSON.id},user_b.eq.${DEMO_PERSON.id}`));
  for (const r of SEEDED_INCOMING_REQUESTS) {
    await must('incoming request', sb.from('partner_requests').insert({ requester_id: r.from, target_id: DEMO_PERSON.id, mode: r.mode, score: r.score }));
  }
  for (const m of SEEDED_PARTNERSHIPS) {
    const [a, b] = DEMO_PERSON.id < m.with ? [DEMO_PERSON.id, m.with] : [m.with, DEMO_PERSON.id];
    await must(
      'partnership',
      sb.from('matches').insert({
        user_a: a,
        user_b: b,
        mode: m.mode,
        compatibility_score: m.score,
        matched_at: new Date(Date.now() - m.daysAgo * 86_400_000).toISOString(),
      }),
    );
  }
  console.log(`Seeded ${PERSONAS.length} personas + demo account (${demoEmail}).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
