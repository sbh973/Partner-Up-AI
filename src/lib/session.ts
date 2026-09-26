// Small sessionStorage helpers. Used for UI conveniences only (handing a typed
// prompt from the landing page to Discover, keeping results when you go back).
// Never used for anything that must persist or be trusted.

import type { DiscoverResponse } from '../../shared/types';

const PENDING_PROMPT = 'partnerup.pendingPrompt';
const LAST_DISCOVER = 'partnerup.lastDiscover';

function read<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable — fine, it's only a convenience.
  }
}

export function setPendingPrompt(text: string): void {
  write(PENDING_PROMPT, { text });
}

/** Read without consuming (safe inside React state initialisers). */
export function peekPendingPrompt(): string | null {
  return read<{ text: string }>(PENDING_PROMPT)?.text ?? null;
}

export function clearPendingPrompt(): void {
  write(PENDING_PROMPT, null);
}

export interface SavedDiscover {
  text: string;
  response: DiscoverResponse;
}

export function saveLastDiscover(value: SavedDiscover | null): void {
  write(LAST_DISCOVER, value);
}

export function loadLastDiscover(): SavedDiscover | null {
  return read<SavedDiscover>(LAST_DISCOVER);
}
