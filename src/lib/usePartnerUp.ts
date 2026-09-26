import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Mode, PartnerIntent, PublicProfile } from '../../shared/types';
import { useToast } from '../components/ui/Toast';
import { api, errorMessage } from './api';

/**
 * Partner Up: a private "yes". If they already chose you (or do later), you
 * both find out. If not, nobody is ever told you asked.
 */
export function usePartnerUp(onPending?: (profileId: string) => void) {
  const toast = useToast();
  const navigate = useNavigate();
  const [busyId, setBusyId] = useState<string | null>(null);

  const partnerUp = useCallback(
    async (profile: PublicProfile, mode: Mode, intent: PartnerIntent | null) => {
      setBusyId(profile.id);
      try {
        const res = await api.partnerUp(profile.id, mode, intent);
        if (res.status === 'mutual' && res.partnershipId) {
          navigate(`/app/partnership/${res.partnershipId}`, { state: { celebrate: true } });
        } else {
          onPending?.(profile.id);
          toast(`Sent privately. If ${profile.displayName.split(' ')[0]} chooses you too, you'll both find out.`, 'success');
        }
      } catch (e) {
        toast(errorMessage(e), 'error');
      } finally {
        setBusyId(null);
      }
    },
    [navigate, onPending, toast],
  );

  return { partnerUp, busyId };
}
