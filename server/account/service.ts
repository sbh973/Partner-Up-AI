import type { ContactUpdateInput, MeResponse, MyProfile, PartnerDNA, ProfileSetupInput } from '../../shared/types';
import { GENDERS, type Gender } from '../../shared/types';
import type { AuthUser } from '../auth';
import { deleteUser } from '../auth';
import { config } from '../config';
import { db, normName } from '../db';
import { ApiError } from '../http/errors';
import { onProfileCreated } from '../mutual/service';
import { unreadCount } from '../notify';
import { loadDna, saveDna } from '../scout/dna';
import { matchWatchersAgainst } from '../scout/service';

function toMyProfile(p: {
  id: string;
  firstName: string;
  lastName: string;
  gender: string;
  age: number;
  phone: string | null;
  instagram: string | null;
  avatarHue: number;
  taken: boolean;
}): MyProfile {
  return {
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    gender: (GENDERS as readonly string[]).includes(p.gender) ? (p.gender as Gender) : 'prefer_not',
    age: p.age,
    phone: p.phone,
    instagram: p.instagram,
    avatarHue: p.avatarHue,
    taken: p.taken,
  };
}

export async function getMe(user: AuthUser): Promise<MeResponse> {
  const [profile, dna, unread] = await Promise.all([db().profile.findUnique({ where: { userId: user.id } }), loadDna(user.id), unreadCount(user.id)]);
  return { email: user.email, profile: profile ? toMyProfile(profile) : null, dna, isDemoAccount: user.isDemoAccount, unreadNotifications: unread };
}

function normalizeInstagram(handle: string | null): string | null {
  return handle ? `@${handle.replace(/^@/, '')}` : null;
}

/** Name, gender and age are set once — they can't be casually edited afterwards. */
export async function setupProfile(user: AuthUser, input: ProfileSetupInput): Promise<MeResponse> {
  if (input.age < config.minAge) throw new ApiError(400, 'too_young', `Partner Up is for people ${config.minAge} and older.`);
  const existing = await db().profile.findUnique({ where: { userId: user.id } });
  if (existing) throw new ApiError(409, 'profile_locked', 'Your name, gender and age are already set and can’t be changed here.');
  const firstNameNorm = normName(input.firstName);
  const lastNameNorm = normName(input.lastName);
  await db().profile.create({
    data: {
      userId: user.id,
      firstName: input.firstName,
      lastName: input.lastName,
      firstNameNorm,
      lastNameNorm,
      gender: input.gender,
      age: input.age,
      phone: input.phone,
      instagram: normalizeInstagram(input.instagram),
      avatarHue: Math.floor(Math.random() * 360),
    },
  });
  await onProfileCreated(user.id, firstNameNorm, lastNameNorm);
  return getMe(user);
}

export async function updateContacts(user: AuthUser, input: ContactUpdateInput): Promise<MeResponse> {
  const existing = await db().profile.findUnique({ where: { userId: user.id } });
  if (!existing) throw new ApiError(409, 'profile_required', 'Set up your profile first.');
  await db().profile.update({ where: { userId: user.id }, data: { phone: input.phone, instagram: normalizeInstagram(input.instagram) } });
  return getMe(user);
}

/** Manual Partner DNA edit — the person is always in control of what Muse knows. */
export async function updateDna(user: AuthUser, dna: Omit<PartnerDNA, 'lastSource' | 'updatedAt'>): Promise<MeResponse> {
  const existing = await db().profile.findUnique({ where: { userId: user.id } });
  if (!existing) throw new ApiError(409, 'profile_required', 'Set up your profile first.');
  await saveDna(user.id, { ...dna, lastSource: 'manual', updatedAt: new Date().toISOString() }, 'manual');
  await matchWatchersAgainst(user.id);
  return getMe(user);
}

export async function deleteAccount(user: AuthUser): Promise<void> {
  if (user.isDemoAccount) throw new ApiError(403, 'demo_account', 'Demo accounts can’t be deleted — use Reset demo instead.');
  // Free up an active Mutual partner before the cascade removes the match.
  const matches = await db().mutualMatch.findMany({ where: { active: true, OR: [{ userAId: user.id }, { userBId: user.id }] } });
  for (const m of matches) {
    const other = m.userAId === user.id ? m.userBId : m.userAId;
    await db().profile.updateMany({ where: { userId: other }, data: { taken: false } });
  }
  await deleteUser(user.id);
}
