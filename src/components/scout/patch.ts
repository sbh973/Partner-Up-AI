import { DNA_FIELD_LABELS, TIME_SLOT_LABELS } from '../../../shared/labels';
import type { DnaPatch, TimeSlot } from '../../../shared/types';

export interface PatchItem {
  field: string;
  label: string;
}

/** Flatten a DnaPatch into display chips, e.g. { field: 'Skills', label: 'Python' }. */
export function patchItems(patch: DnaPatch | null | undefined): PatchItem[] {
  if (!patch) return [];
  const out: PatchItem[] = [];
  for (const [key, value] of Object.entries(patch)) {
    const field = DNA_FIELD_LABELS[key as keyof typeof DNA_FIELD_LABELS] ?? key;
    if (Array.isArray(value)) {
      for (const v of value) out.push({ field, label: key === 'availability' ? TIME_SLOT_LABELS[v as TimeSlot] : String(v) });
    } else if (typeof value === 'string' && value) {
      out.push({ field, label: value });
    }
  }
  return out;
}
