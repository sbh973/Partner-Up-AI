import { normalizeText } from '../semantic/similarity';

// Places (schools/neighborhoods) resolve to a city and metro area so that
// "at KSU" is strict while "explore Atlanta" includes every Atlanta campus.

export interface Place {
  place: string | null;
  city: string | null;
  metro: string | null;
  label: string;
}

interface PlaceDef {
  place: string | null;
  city: string;
  metro: string;
  label: string;
  aliases: string[];
}

const PLACES: PlaceDef[] = [
  { place: 'ksu', city: 'kennesaw', metro: 'atlanta', label: 'KSU', aliases: ['ksu', 'kennesaw state', 'kennesaw state university'] },
  { place: 'georgia-tech', city: 'atlanta', metro: 'atlanta', label: 'Georgia Tech', aliases: ['georgia tech', 'gt', 'georgia institute of technology', 'gatech'] },
  { place: 'emory', city: 'atlanta', metro: 'atlanta', label: 'Emory', aliases: ['emory', 'emory university'] },
  { place: 'gsu', city: 'atlanta', metro: 'atlanta', label: 'Georgia State', aliases: ['georgia state', 'gsu', 'georgia state university'] },
  { place: 'morehouse', city: 'atlanta', metro: 'atlanta', label: 'Morehouse', aliases: ['morehouse', 'morehouse college'] },
  { place: 'spelman', city: 'atlanta', metro: 'atlanta', label: 'Spelman', aliases: ['spelman', 'spelman college'] },
  { place: 'scad-atlanta', city: 'atlanta', metro: 'atlanta', label: 'SCAD Atlanta', aliases: ['scad', 'scad atlanta'] },
  { place: 'uga', city: 'athens', metro: 'athens', label: 'UGA', aliases: ['uga', 'university of georgia'] },
  { place: null, city: 'atlanta', metro: 'atlanta', label: 'Atlanta', aliases: ['atlanta', 'atl', 'midtown', 'midtown atlanta', 'downtown atlanta'] },
  { place: null, city: 'kennesaw', metro: 'atlanta', label: 'Kennesaw', aliases: ['kennesaw'] },
  { place: null, city: 'marietta', metro: 'atlanta', label: 'Marietta', aliases: ['marietta'] },
  { place: null, city: 'tokyo', metro: 'tokyo', label: 'Tokyo', aliases: ['tokyo'] },
  { place: null, city: 'new york', metro: 'new york', label: 'New York', aliases: ['new york', 'nyc', 'new york city'] },
  { place: null, city: 'chicago', metro: 'chicago', label: 'Chicago', aliases: ['chicago'] },
  { place: null, city: 'boston', metro: 'boston', label: 'Boston', aliases: ['boston'] },
  { place: null, city: 'san francisco', metro: 'san francisco', label: 'San Francisco', aliases: ['san francisco', 'sf', 'bay area'] },
  { place: null, city: 'london', metro: 'london', label: 'London', aliases: ['london'] },
  { place: null, city: 'paris', metro: 'paris', label: 'Paris', aliases: ['paris'] },
];

const ALIASES = PLACES.flatMap((p) => p.aliases.map((alias) => ({ alias, def: p }))).sort((a, b) => b.alias.length - a.alias.length);

function toPlace(def: PlaceDef): Place {
  return { place: def.place, city: def.city, metro: def.metro, label: def.label };
}

/** Resolve a stored location string ("KSU", "Georgia Tech, Atlanta") to a Place. */
export function resolveLocation(raw: string | null | undefined): Place | null {
  if (!raw) return null;
  const text = ` ${normalizeText(raw)} `;
  for (const { alias, def } of ALIASES) if (text.includes(` ${alias} `)) return toPlace(def);
  const label = raw.trim();
  return label ? { place: null, city: normalizeText(label), metro: normalizeText(label), label } : null;
}

/** Find a known place mentioned anywhere in free text. */
export function findLocationInText(text: string): Place | null {
  const padded = ` ${normalizeText(text)} `;
  for (const { alias, def } of ALIASES) {
    // "gt" / "sf" / "atl" are too short to trust inside a long sentence unless uppercase in the original.
    if (alias.length <= 3 && !new RegExp(`\\b${alias.toUpperCase()}\\b`).test(text) && alias !== 'ksu' && alias !== 'uga' && alias !== 'gsu' && alias !== 'nyc') continue;
    if (padded.includes(` ${alias} `)) return toPlace(def);
  }
  return null;
}

/**
 * How well a candidate's location satisfies a requested one (0..1), or null
 * when either is unknown. A school request is strict; a city request accepts
 * anyone in that city (and partially, the wider metro).
 */
export function locationFit(requested: Place | null, candidate: Place | null): number | null {
  if (!requested || !candidate) return null;
  if (requested.place) {
    if (candidate.place === requested.place) return 1;
    if (candidate.city && candidate.city === requested.city) return 0.6;
    return candidate.metro && candidate.metro === requested.metro ? 0.35 : 0;
  }
  if (candidate.city && candidate.city === requested.city) return 1;
  return candidate.metro && candidate.metro === requested.metro ? 0.8 : 0;
}
