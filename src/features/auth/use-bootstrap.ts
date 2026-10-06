import type { Session } from '@supabase/supabase-js';
import { addNetworkStateListener } from 'expo-network';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useGames } from '@/features/coinche/store';
import { fetchProfile } from '@/features/social/api';
import { queryClient } from '@/features/social/queries';
import { pullOwnGames, syncNow } from '@/features/sync/sync';
import { startDemo } from '@/features/demo/bootstrap';
import { isDemo } from '@/features/demo/is-demo';
import { supabase } from '@/lib/supabase';

import { profileToSeat, useSession } from './session';

const SYNC_DEBOUNCE_MS = 1500;

async function loadProfile(userId: string) {
  // Le profil est créé par un trigger à l'inscription : on retente une fois s'il n'est pas encore là.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const profile = await fetchProfile(userId).catch(() => null);
    if (profile) return profile;
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
  return null;
}

async function onSession(session: Session | null) {
  const previous = useSession.getState();
  if (!session) {
    useSession.setState({ session: null, profile: null });
    return;
  }
  useSession.setState({ session });
  // Simple rafraîchissement du jeton : rien d'autre à faire.
  if (previous.session?.user.id === session.user.id && previous.profile) return;

  const profile = await loadProfile(session.user.id);
  useSession.setState({ profile });
  if (!profile) return;
  useGames.getState().adoptLocalGames(profileToSeat(profile));
  await pullOwnGames();
  await syncNow();
}

/**
 * À monter une fois dans le layout racine : restaure la session, charge le profil,
 * et déclenche la synchro (modif locale, retour au premier plan, retour du réseau).
 */
export function useAuthBootstrap() {
  useEffect(() => {
    if (isDemo) {
      startDemo();
      return;
    }
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => onSession(data.session));
    // Pas d'appel Supabase directement dans le callback (verrou interne) : on repasse par la file d'événements.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => onSession(session), 0);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useGames.subscribe((state, previous) => {
      if (state.pendingSync === previous.pendingSync && state.pendingDeletes === previous.pendingDeletes) return;
      clearTimeout(timer);
      timer = setTimeout(() => syncNow(), SYNC_DEBOUNCE_MS);
    });

    const appState = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !useSession.getState().profile) return;
      pullOwnGames().then(() => syncNow());
      queryClient.invalidateQueries({ queryKey: ['player-games'] });
    });

    const network = addNetworkStateListener((state) => {
      if (state.isConnected) syncNow();
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
      appState.remove();
      network.remove();
    };
  }, []);
}
