import type {
  ContactMethod,
  ExploreRole,
  GroupPreference,
  MeResponse,
  Mode,
  ModeProfileInput,
  ProfileDraft,
  ProfileInput,
  StudyStyle,
} from '../../../shared/types';

export interface SurveyState {
  profile: ProfileInput;
  contacts: ContactMethod[];
  lookingFor: string;
  // Connect
  activities: string[];
  connectSeeks: string[];
  // Learn
  strengths: string[];
  needs: string[];
  courses: string[];
  studyStyles: StudyStyle[];
  groupPreference: GroupPreference;
  // Explore
  role: ExploreRole;
  exploringCity: string;
  origin: string;
  exploreActivities: string[];
  exploreSeeks: string[];
  exploreOffers: string[];
}

export const EMPTY_PROFILE: ProfileInput = {
  displayName: '',
  age: null,
  pronouns: null,
  community: null,
  city: null,
  bio: '',
  interests: [],
  skills: [],
  languages: [],
  availability: [],
  groupSizes: [],
  setting: 'either',
  visibility: { age: true, community: true, pronouns: true },
};

export function initialSurvey(me: MeResponse | null, mode: Mode): SurveyState {
  const p = me?.profile;
  const profile: ProfileInput = p
    ? {
        displayName: p.displayName,
        age: p.age,
        pronouns: p.pronouns,
        community: p.community,
        city: p.city,
        bio: p.bio,
        interests: p.interests,
        skills: p.skills,
        languages: p.languages,
        availability: p.availability,
        groupSizes: p.groupSizes,
        setting: p.setting,
        visibility: p.visibility,
      }
    : { ...EMPTY_PROFILE };
  const mp = me?.modeProfiles.find((m) => m.mode === mode);
  const d = mp?.details;
  return {
    profile,
    contacts: me?.contacts.length ? me.contacts : [],
    lookingFor: mp?.lookingFor ?? '',
    activities: d?.kind === 'connect' ? d.activities : [],
    connectSeeks: mode === 'connect' ? (mp?.seeks ?? []) : [],
    strengths: d?.kind === 'learn' ? d.strengths : [],
    needs: d?.kind === 'learn' ? d.needs : [],
    courses: d?.kind === 'learn' ? d.courses : [],
    studyStyles: d?.kind === 'learn' ? d.studyStyles : [],
    groupPreference: d?.kind === 'learn' ? d.groupPreference : 'either',
    role: d?.kind === 'explore' ? d.role : 'newcomer',
    exploringCity: d?.kind === 'explore' ? (d.exploringCity ?? '') : (p?.city ?? ''),
    origin: d?.kind === 'explore' ? (d.origin ?? '') : '',
    exploreActivities: d?.kind === 'explore' ? d.activities : [],
    exploreSeeks: mode === 'explore' ? (mp?.seeks ?? []) : [],
    exploreOffers: mode === 'explore' ? (mp?.offers ?? []) : [],
  };
}

function unique(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    const k = i.trim().toLowerCase();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function toModeInput(mode: Mode, s: SurveyState): ModeProfileInput {
  if (mode === 'learn') {
    const learningLanguages = s.profile.languages.filter((l) => l.level === 'learning').map((l) => l.language);
    return {
      lookingFor: s.lookingFor,
      seeks: unique([...s.needs, ...learningLanguages]),
      offers: unique(s.strengths),
      details: {
        kind: 'learn',
        strengths: s.strengths,
        needs: s.needs,
        courses: s.courses,
        studyStyles: s.studyStyles,
        groupPreference: s.groupPreference,
      },
    };
  }
  if (mode === 'explore') {
    return {
      lookingFor: s.lookingFor,
      seeks: unique(s.exploreSeeks),
      offers: unique(s.exploreOffers),
      details: {
        kind: 'explore',
        role: s.role,
        exploringCity: s.exploringCity.trim() || null,
        origin: s.origin.trim() || null,
        activities: s.exploreActivities,
      },
    };
  }
  return {
    lookingFor: s.lookingFor,
    seeks: unique(s.connectSeeks),
    offers: [],
    details: { kind: 'connect', activities: s.activities },
  };
}

function mergeList(current: string[], incoming: string[] | undefined): string[] {
  return unique([...current, ...(incoming ?? [])]);
}

/** Merge a Partner AI draft into the form without clobbering what the person typed. */
export function applyDraft(s: SurveyState, draft: ProfileDraft, mode: Mode): { next: SurveyState; filled: number } {
  const p = draft.profile;
  let filled = 0;
  const count = (before: unknown, after: unknown) => {
    if (JSON.stringify(before) !== JSON.stringify(after)) filled++;
  };
  const profile: ProfileInput = { ...s.profile };
  const setIfEmpty = <K extends keyof ProfileInput>(key: K, value: ProfileInput[K] | undefined) => {
    if (value === undefined || value === null || value === '') return;
    const current = profile[key];
    if (current === null || current === '' || (Array.isArray(current) && current.length === 0)) {
      profile[key] = value;
      filled++;
    }
  };
  setIfEmpty('bio', p.bio);
  setIfEmpty('community', p.community ?? null);
  setIfEmpty('city', p.city ?? null);
  setIfEmpty('age', p.age ?? null);
  if (p.setting && s.profile.setting === 'either' && p.setting !== 'either') {
    profile.setting = p.setting;
    filled++;
  }
  const interests = mergeList(profile.interests, p.interests);
  count(profile.interests, interests);
  profile.interests = interests;
  const skills = mergeList(profile.skills, p.skills);
  count(profile.skills, skills);
  profile.skills = skills;
  const availability = [...new Set([...profile.availability, ...(p.availability ?? [])])];
  count(profile.availability, availability);
  profile.availability = availability;
  const languages = [...profile.languages];
  for (const l of p.languages ?? []) {
    if (!languages.some((x) => x.language.toLowerCase() === l.language.toLowerCase())) {
      languages.push(l);
      filled++;
    }
  }
  profile.languages = languages;

  const next: SurveyState = { ...s, profile };
  const m = draft.modeProfile;
  if (m.lookingFor && !s.lookingFor) {
    next.lookingFor = m.lookingFor;
    filled++;
  }
  const d = m.details;
  if (mode === 'connect') {
    const activities = mergeList(s.activities, d?.kind === 'connect' ? d.activities : []);
    count(s.activities, activities);
    next.activities = activities;
    const seeks = mergeList(s.connectSeeks, m.seeks);
    count(s.connectSeeks, seeks);
    next.connectSeeks = seeks;
  } else if (mode === 'learn' && d?.kind === 'learn') {
    const strengths = mergeList(s.strengths, d.strengths);
    const needs = mergeList(s.needs, d.needs).filter((n) => !strengths.some((x) => x.toLowerCase() === n.toLowerCase()));
    count(s.strengths, strengths);
    count(s.needs, needs);
    next.strengths = strengths;
    next.needs = needs;
    next.courses = mergeList(s.courses, d.courses);
    if (d.groupPreference !== 'either' && s.groupPreference === 'either') next.groupPreference = d.groupPreference;
  } else if (mode === 'explore' && d?.kind === 'explore') {
    if (d.exploringCity && !s.exploringCity) {
      next.exploringCity = d.exploringCity;
      filled++;
    }
    if (d.role && d.role !== 'newcomer' && s.role === 'newcomer') {
      next.role = d.role;
      filled++;
    }
    const acts = mergeList(s.exploreActivities, d.activities);
    count(s.exploreActivities, acts);
    next.exploreActivities = acts;
    next.exploreSeeks = mergeList(s.exploreSeeks, m.seeks);
    next.exploreOffers = mergeList(s.exploreOffers, m.offers);
  }
  return { next, filled };
}

export function validateSurvey(mode: Mode, s: SurveyState): string | null {
  if (!s.profile.displayName.trim()) return 'Add your first name so partners know who you are.';
  if (mode === 'learn' && s.strengths.length === 0 && s.needs.length === 0) {
    return 'Add at least one thing you’re strong in or need help with.';
  }
  if (mode === 'explore' && !s.exploringCity.trim()) return 'Tell us which city you’re in (or heading to).';
  if (mode === 'connect' && s.activities.length === 0 && s.profile.interests.length === 0) {
    return 'Add at least one thing you enjoy so we can find your people.';
  }
  return null;
}
