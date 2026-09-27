import { randomBytes } from 'node:crypto';
import { hashPassword } from '../auth';
import { config } from '../config';
import { DAY_MS, db, normName } from '../db';
import { saveDna } from '../scout/dna';
import { DEMO_PASSWORD, MUTUAL_SEEDS, PEOPLE } from './people';

export function emailFor(key: string, demoAccount: boolean): string {
  return demoAccount ? `${key}@demo.partnerup.test` : `${key}@persona.partnerup.test`;
}

/** Wipe every table (children first). */
export async function wipeDatabase(): Promise<void> {
  const p = db();
  await p.$transaction([
    p.notification.deleteMany(),
    p.scoutConnection.deleteMany(),
    p.scoutRequest.deleteMany(),
    p.mutualMatch.deleteMany(),
    p.mutualSearch.deleteMany(),
    p.mutualRequest.deleteMany(),
    p.partnerDNA.deleteMany(),
    p.session.deleteMany(),
    p.profile.deleteMany(),
    p.user.deleteMany(),
  ]);
}

export async function seedDatabase(): Promise<void> {
  const p = db();
  const demoHash = hashPassword(DEMO_PASSWORD);
  const ids = new Map<string, string>();

  for (const person of PEOPLE) {
    const user = await p.user.create({
      data: {
        email: emailFor(person.key, Boolean(person.demoAccount)),
        // Personas can never sign in; demo accounts use the documented demo password.
        passwordHash: person.demoAccount ? demoHash : hashPassword(randomBytes(24).toString('hex')),
        isDemoAccount: Boolean(person.demoAccount),
        isDemoPersona: !person.demoAccount,
        dormant: Boolean(person.dormant),
        profile: {
          create: {
            firstName: person.firstName,
            lastName: person.lastName,
            firstNameNorm: normName(person.firstName),
            lastNameNorm: normName(person.lastName),
            gender: person.gender,
            age: person.age,
            phone: person.phone,
            instagram: person.instagram,
            avatarHue: person.avatarHue,
          },
        },
      },
    });
    ids.set(person.key, user.id);
    if (person.dna) await saveDna(user.id, { ...person.dna, lastSource: 'manual', updatedAt: new Date().toISOString() }, 'manual');
    for (const intent of person.requests) {
      await p.scoutRequest.create({
        data: { userId: user.id, rawText: intent.summary, intentJson: JSON.stringify(intent), lens: intent.lens, source: 'offline' },
      });
    }
  }

  const now = Date.now();
  for (const [targetKey, searchers] of Object.entries(MUTUAL_SEEDS.searchesOf)) {
    const target = PEOPLE.find((x) => x.key === targetKey);
    const targetId = ids.get(targetKey);
    if (!target || !targetId) continue;
    for (const [i, searcherKey] of searchers.entries()) {
      const searcherId = ids.get(searcherKey);
      if (!searcherId) continue;
      await p.mutualSearch.create({
        data: {
          searcherId,
          searchedName: `${target.firstName} ${target.lastName}`,
          firstNorm: normName(target.firstName),
          lastNorm: normName(target.lastName),
          matchedUserId: targetId,
          createdAt: new Date(now - (i + 1) * 2 * DAY_MS),
        },
      });
    }
  }
  for (const { from, to } of MUTUAL_SEEDS.incoming) {
    const senderId = ids.get(from);
    const target = PEOPLE.find((x) => x.key === to);
    const targetId = ids.get(to);
    if (!senderId || !target || !targetId) continue;
    await p.mutualRequest.create({
      data: {
        senderId,
        targetId,
        targetFirstNorm: normName(target.firstName),
        targetLastNorm: normName(target.lastName),
        targetDisplay: `${target.firstName} ${target.lastName}`,
        createdAt: new Date(now - 3 * DAY_MS),
        expiresAt: new Date(now - 3 * DAY_MS + config.mutualRequestTtlDays * DAY_MS),
      },
    });
  }
}

/** Seed only if the database is empty (safe to call on every server start). */
export async function ensureSeeded(): Promise<boolean> {
  const count = await db().user.count();
  if (count > 0) return false;
  await seedDatabase();
  return true;
}

export async function resetDemo(): Promise<void> {
  await wipeDatabase();
  await seedDatabase();
}
