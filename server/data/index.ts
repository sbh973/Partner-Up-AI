import { config } from '../config';
import { MemoryStore } from './memoryStore';
import type { DataStore } from './store';
import { SupabaseStore } from './supabaseStore';

let store: DataStore | null = null;

export function getStore(): DataStore {
  if (!store) store = config.useSupabase ? new SupabaseStore() : new MemoryStore();
  return store;
}
