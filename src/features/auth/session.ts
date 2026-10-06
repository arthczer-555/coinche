import type { Session } from '@supabase/supabase-js';
import { useMemo } from 'react';
import { create } from 'zustand';

import { LOCAL_PLAYER_ID, LOCAL_PLAYER_NAME } from '@/features/coinche/players';
import type { Seat } from '@/features/coinche/types';
import type { Profile } from '@/lib/database.types';

type SessionState = {
  session: Session | null;
  /** Profil du compte connecté (null pendant son chargement ou hors connexion). */
  profile: Profile | null;
};

export const useSession = create<SessionState>(() => ({
  session: null,
  profile: null,
}));

export type UserSeat = Seat & { kind: 'user' };

export function profileToSeat(profile: Pick<Profile, 'id' | 'display_name' | 'username' | 'avatar_url'>): UserSeat {
  return {
    kind: 'user',
    id: profile.id,
    name: profile.display_name,
    username: profile.username,
    avatarUrl: profile.avatar_url,
  };
}

export const LOCAL_SEAT: UserSeat = { kind: 'user', id: LOCAL_PLAYER_ID, name: LOCAL_PLAYER_NAME };

/** Le joueur qui tient le téléphone : son compte, ou l'identité locale hors connexion. */
export function useMe(): { id: string; seat: UserSeat; profile: Profile | null; signedIn: boolean } {
  const profile = useSession((s) => s.profile);
  return useMemo(() => {
    const seat = profile ? profileToSeat(profile) : LOCAL_SEAT;
    return { id: seat.id, seat, profile, signedIn: profile !== null };
  }, [profile]);
}

/** Version hors React (sync, actions). */
export function getMeId(): string {
  return useSession.getState().profile?.id ?? LOCAL_PLAYER_ID;
}
