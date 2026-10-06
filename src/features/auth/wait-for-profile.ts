import type { Profile } from '@/lib/database.types';

import { useSession } from './session';

/** Attend que le bootstrap ait chargé le profil après une connexion. */
export function waitForProfile(timeoutMs = 10_000): Promise<Profile | null> {
  const current = useSession.getState().profile;
  if (current) return Promise.resolve(current);
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      unsubscribe();
      resolve(null);
    }, timeoutMs);
    const unsubscribe = useSession.subscribe((state) => {
      if (!state.profile) return;
      clearTimeout(timer);
      unsubscribe();
      resolve(state.profile);
    });
  });
}
