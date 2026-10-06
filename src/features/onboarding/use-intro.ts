import { router, useIsFocused } from 'expo-router';
import { useEffect } from 'react';

import { useSession } from '@/features/auth/session';
import { useGames } from '@/features/coinche/store';

import { usePrefs } from './prefs';
import { needsTour } from './tour';

/** Appelle `run` une fois les préférences et les parties lues depuis le stockage. Renvoie de quoi annuler. */
function afterHydration(run: () => void): () => void {
  const hydrated = () => usePrefs.persist.hasHydrated() && useGames.persist.hasHydrated();
  if (hydrated()) {
    run();
    return () => undefined;
  }
  const check = () => {
    if (hydrated()) run();
  };
  const unsubscribes = [usePrefs.persist.onFinishHydration(check), useGames.persist.onFinishHydration(check)];
  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
}

/** Premier lancement (rien de sauvegardé) : l'accueil en trois cartes n'a pas encore été vu. */
function welcomePending(): boolean {
  return !usePrefs.getState().seenWelcome && Object.keys(useGames.getState().games).length === 0;
}

/**
 * À monter dans le layout des onglets. Ouvre :
 * - au premier lancement, l'accueil en trois cartes ;
 * - avec un compte créé sur ce téléphone, le tour d'après l'inscription (`/onboarding`), dès qu'on revient sur les onglets :
 *   après la connexion, l'écran d'accueil du profil ou la récupération des parties d'invité, sans les couper.
 */
export function useIntroScreens() {
  const focused = useIsFocused();
  const profile = useSession((s) => s.profile);

  useEffect(
    () =>
      afterHydration(() => {
        if (welcomePending()) router.push('/welcome');
      }),
    [],
  );

  useEffect(() => {
    if (!focused || !profile) return;
    return afterHydration(() => {
      const prefs = usePrefs.getState();
      // L'accueil passe d'abord : le tour suivra au retour sur les onglets.
      if (welcomePending() || !needsTour(profile, prefs.tourPendingFor)) return;
      prefs.setTourPending(null);
      router.push('/onboarding');
    });
  }, [focused, profile]);
}
