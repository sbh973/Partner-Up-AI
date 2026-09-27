import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type {
  DnaExtractResponse,
  MeResponse,
  MutualOverview,
  MutualPartnerUpResponse,
  MutualSearchResponse,
  ScoutConnectionView,
  ScoutOverview,
  ScoutSearchResponse,
} from '../shared/types';
import { Client, startTestServer } from './helpers';

// Everything here runs fully offline: Muse is disabled, so every AI path
// exercises the deterministic fallback — exactly what happens if the network
// drops during the live demo.
process.env.AI_PROVIDER = 'offline';

let base = '';
let close: () => Promise<void>;

beforeAll(async () => {
  ({ base, close } = await startTestServer('test-app.db'));
}, 60_000);
afterAll(() => close());

const ARNAV_INTRO =
  "I'm a mechanical engineering student at KSU. I like robotics, F1, soccer, startups, and music. I'm good at engineering but I'm still learning programming.";

describe('auth & security', () => {
  it('rejects unauthenticated access and cross-site writes', async () => {
    const c = new Client(base);
    expect((await c.call('GET', '/api/me')).status).toBe(401);
    const res = await fetch(`${base}/api/auth/demo/arnav`, { method: 'POST' });
    expect(res.status).toBe(403); // no X-Partner-Up header → CSRF block
  });

  it('signs up, sets an HttpOnly session cookie, and locks name/gender/age', async () => {
    const res = await fetch(`${base}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Partner-Up': '1' },
      body: JSON.stringify({ email: 'new.person@example.test', password: 'long enough pw' }),
    });
    const cookie = res.headers.get('set-cookie') ?? '';
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);

    const c = new Client(base);
    await c.call('POST', '/api/auth/signup', { email: 'lock.test@example.test', password: 'long enough pw' });
    const young = await c.call('POST', '/api/profile', { firstName: 'Kid', lastName: 'Test', gender: 'man', age: 16, phone: '4045550100', instagram: null });
    expect(young.status).toBe(400);
    const ok = await c.call<MeResponse>('POST', '/api/profile', { firstName: 'Lock', lastName: 'Test', gender: 'woman', age: 22, phone: null, instagram: '@lock.test' });
    expect(ok.data.profile?.firstName).toBe('Lock');
    const again = await c.call('POST', '/api/profile', { firstName: 'Changed', lastName: 'Name', gender: 'man', age: 30, phone: null, instagram: '@x' });
    expect(again.status).toBe(409);
    const contacts = await c.call<MeResponse>('PUT', '/api/profile/contacts', { phone: '(404) 555-0111', instagram: null });
    expect(contacts.data.profile?.phone).toBe('(404) 555-0111');
    expect(contacts.data.profile?.firstName).toBe('Lock');
  });
});

describe('Mutual — no AI, mystery preserved', () => {
  const arnav = () => new Client(base);

  it('full demo: Arnav secretly picks Riya → Riya never sees who → Riya picks Arnav → IT’S MUTUAL + contacts', async () => {
    const a = arnav();
    await a.call('POST', '/api/auth/demo/arnav');
    const before = await a.call<MutualOverview>('GET', '/api/mutual');
    expect(before.data.pulse.searchesThisMonth).toBeGreaterThan(0);
    expect(before.data.limits.remaining).toBe(5);

    const found = await a.call<MutualSearchResponse>('POST', '/api/mutual/search', { firstName: 'riya', lastName: 'SHAH' });
    expect(found.data.results).toHaveLength(1);
    const riya = found.data.results[0];
    expect(JSON.stringify(found.data)).not.toMatch(/555|@riya/); // no contact info pre-match

    const sent = await a.call<MutualPartnerUpResponse>('POST', '/api/mutual/partner-up', { targetId: riya.id });
    expect(sent.data.status).toBe('sent');

    const r = new Client(base);
    await r.call('POST', '/api/auth/demo/riya');
    const riyaView = await r.call<MutualOverview>('GET', '/api/mutual');
    expect(riyaView.data.pulse.privatelyChoseYou).toBe(1);
    expect(JSON.stringify(riyaView.data)).not.toMatch(/Arnav|Desai/); // never who

    const back = await r.call<MutualSearchResponse>('POST', '/api/mutual/search', { firstName: 'Arnav', lastName: 'Desai' });
    const mutual = await r.call<MutualPartnerUpResponse>('POST', '/api/mutual/partner-up', { targetId: back.data.results[0].id });
    expect(mutual.data.status).toBe('mutual');

    const reveal = await r.call<MutualOverview>('GET', '/api/mutual');
    expect(reveal.data.match?.partner.firstName).toBe('Arnav');
    expect(reveal.data.match?.contacts.instagram).toBe('@arnav.builds');
    expect(reveal.data.match?.canEnd).toBe(false); // 24h minimum
    const end = await r.call('POST', `/api/mutual/matches/${reveal.data.match?.id}/end`);
    expect(end.status).toBe(409);

    // Both are now Taken: nobody else can request them.
    const other = new Client(base);
    await other.call('POST', '/api/auth/signup', { email: 'third@example.test', password: 'long enough pw' });
    await other.call('POST', '/api/profile', { firstName: 'Third', lastName: 'Person', gender: 'man', age: 25, phone: '4045550199', instagram: null });
    const seen = await other.call<MutualSearchResponse>('POST', '/api/mutual/search', { firstName: 'Riya', lastName: 'Shah' });
    expect(seen.data.results[0].taken).toBe(true);
    const blocked = await other.call('POST', '/api/mutual/partner-up', { targetId: seen.data.results[0].id });
    expect(blocked.status).toBe(409);
  });

  it('saves a private request for someone who has not joined, and links it when they do', async () => {
    const s = new Client(base);
    await s.call('POST', '/api/auth/signup', { email: 'sender@example.test', password: 'long enough pw' });
    await s.call('POST', '/api/profile', { firstName: 'Sam', lastName: 'Sender', gender: 'man', age: 21, phone: '4045550122', instagram: null });
    const none = await s.call<MutualSearchResponse>('POST', '/api/mutual/search', { firstName: 'Jamie', lastName: 'Lee' });
    expect(none.data.canSaveForJoin).toBe(true);
    const saved = await s.call<MutualPartnerUpResponse>('POST', '/api/mutual/save-for-join', { firstName: 'Jamie', lastName: 'Lee' });
    expect(saved.data.status).toBe('saved_for_join');

    const j = new Client(base);
    await j.call('POST', '/api/auth/signup', { email: 'jamie@example.test', password: 'long enough pw' });
    await j.call('POST', '/api/profile', { firstName: 'Jamie', lastName: 'Lee', gender: 'woman', age: 20, phone: null, instagram: '@jamie' });
    const pulse = await j.call<MutualOverview>('GET', '/api/mutual');
    expect(pulse.data.pulse.privatelyChoseYou).toBe(1);
    const senderView = await s.call<MutualOverview>('GET', '/api/mutual');
    expect(senderView.data.active[0].status).toBe('active');
  });

  it('enforces the 5-requests-per-30-days limit', async () => {
    const c = new Client(base);
    await c.call('POST', '/api/auth/signup', { email: 'limit@example.test', password: 'long enough pw' });
    await c.call('POST', '/api/profile', { firstName: 'Lim', lastName: 'It', gender: 'woman', age: 24, phone: '4045550177', instagram: null });
    for (let i = 0; i < 5; i++) {
      const r = await c.call('POST', '/api/mutual/save-for-join', { firstName: 'Nobody', lastName: `Here${'x'.repeat(i + 1)}` });
      expect(r.status).toBe(200);
    }
    const sixth = await c.call('POST', '/api/mutual/save-for-join', { firstName: 'Nobody', lastName: 'Sixth' });
    expect(sixth.status).toBe(429);
  });
});

describe('Scout — Muse (offline fallback) + deterministic engine', () => {
  let arnav: Client;

  beforeAll(async () => {
    arnav = new Client(base);
    await arnav.call('POST', '/api/auth/demo/arnav');
  });

  it('builds Partner DNA from conversation, visibly and undoably', async () => {
    const res = await arnav.call<DnaExtractResponse>('POST', '/api/scout/dna/extract', { text: ARNAV_INTRO, step: 0 });
    expect(res.data.source).toBe('offline');
    expect(res.data.dna.interests).toEqual(expect.arrayContaining(['Robotics', 'F1', 'Soccer', 'Startups', 'Music']));
    expect(res.data.dna.skills).toEqual(expect.arrayContaining(['Mechanical engineering']));
    expect(res.data.dna.learning).toContain('Programming');
    expect(res.data.dna.location).toBe('KSU');
    const second = await arnav.call<DnaExtractResponse>('POST', '/api/scout/dna/extract', { text: 'I’m usually free evenings and weekends.', step: 1 });
    expect(second.data.dna.availability).toEqual(expect.arrayContaining(['evenings', 'weekends']));
  });

  it('Demo 1: programmer for a sustainability hackathon → a CS student into sustainability', async () => {
    const r = await arnav.call<ScoutSearchResponse>('POST', '/api/scout/search', { text: 'I need a programmer for my sustainability hackathon project.' });
    expect(r.data.kind).toBe('people');
    expect(['Alex', 'Sam']).toContain(r.data.people[0].person.firstName);
    expect(r.data.people[0].score).toBeGreaterThanOrEqual(75);
    expect(r.data.intentTags.neededSkills.map((t) => t.label)).toContain('Programming');
    expect(r.data.people[0].reasons.map((x) => x.text).join(' ')).toMatch(/sustainability/i);
    expect(JSON.stringify(r.data)).not.toMatch(/alex\.rivera\.codes/); // no contacts before consent
  });

  it('Demo 2: roommate at KSU next semester → KSU student looking for a roommate', async () => {
    const r = await arnav.call<ScoutSearchResponse>('POST', '/api/scout/search', { text: 'I need a roommate at KSU next semester.' });
    expect(r.data.kind).toBe('people');
    expect(r.data.people[0].person.firstName).toBe('Marcus');
    expect(r.data.people.every((p) => p.person.location === 'KSU')).toBe(true);
  });

  it('Demo 3: a group to explore Atlanta this weekend → Atlanta people, not Tokyo', async () => {
    const r = await arnav.call<ScoutSearchResponse>('POST', '/api/scout/search', { text: 'I want a group to explore Atlanta with this weekend.' });
    expect(r.data.kind).toBe('group');
    const names = r.data.group?.members.filter((m) => !m.isYou).map((m) => m.person.firstName) ?? [];
    expect(names.length).toBeGreaterThanOrEqual(2);
    expect(names).not.toContain('Yuki');
    expect(r.data.group?.explanation.length).toBeGreaterThan(10);
  });

  it('4-person hackathon team → balanced roles from stored Partner DNA', async () => {
    const r = await arnav.call<ScoutSearchResponse>('POST', '/api/scout/search', { text: 'Find me a 4-person hackathon team for a sustainability project.' });
    expect(r.data.kind).toBe('group');
    const members = r.data.group?.members ?? [];
    expect(members).toHaveLength(4);
    expect(members[0].isYou).toBe(true);
  });

  it('Keep Looking: no match → "I’ll keep looking" → new student joins → Muse found someone → both approve → contacts', async () => {
    const r = await arnav.call<ScoutSearchResponse>('POST', '/api/scout/search', { text: 'I need a robotics teammate at KSU.' });
    expect(r.data.kind).toBe('keep_looking');
    expect(r.data.message).toMatch(/keep looking/i);

    const joined = await arnav.call<{ joined: boolean; found: number }>('POST', '/api/demo/new-student');
    expect(joined.data.found).toBe(1);

    const overview = await arnav.call<ScoutOverview>('GET', '/api/scout');
    const suggestion = overview.data.connections.find((c) => c.origin === 'keep_looking');
    expect(suggestion?.other.firstName).toBe('Tyler');
    expect(suggestion?.status).toBe('suggested');
    expect(suggestion?.contacts).toBeNull();

    const accepted = await arnav.call<ScoutConnectionView>('POST', `/api/scout/connections/${suggestion?.id}/respond`, { accept: true });
    expect(accepted.data.status).toBe('connected');
    expect(accepted.data.contacts?.instagram).toBe('@tyler.bots');
  });

  it('Partner Up from results requires the other side; demo personas decide instantly', async () => {
    const r = await arnav.call<ScoutSearchResponse>('POST', '/api/scout/search', { text: 'I need a programmer for my sustainability hackathon project.' });
    const top = r.data.people[0];
    const [conn] = (await arnav.call<ScoutConnectionView[]>('POST', '/api/scout/partner-up', { requestId: r.data.requestId, candidateIds: [top.person.id] })).data;
    expect(conn.youAccepted).toBe(true);
    expect(conn.status).toBe('connected');
    expect(conn.contacts).not.toBeNull();
  });

  it('a stranger can’t read someone else’s connection', async () => {
    const overview = await arnav.call<ScoutOverview>('GET', '/api/scout');
    const id = overview.data.connections[0].id;
    const s = new Client(base);
    await s.call('POST', '/api/auth/signup', { email: 'snoop@example.test', password: 'long enough pw' });
    expect((await s.call('GET', `/api/scout/connections/${id}`)).status).toBe(404);
  });
});
