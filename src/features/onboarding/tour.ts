import type { Profile } from '@/lib/database.types';

/** Un compte reste "tout neuf" un jour : de quoi rattraper une app fermée juste après l'inscription. */
export const FRESH_ACCOUNT_MS = 24 * 60 * 60 * 1000;

/**
 * Le tour d'après l'inscription est à montrer : compte créé il y a moins d'un jour, pseudo choisi
 * (`onboarded`, sinon l'écran d'accueil du profil passe d'abord), pas encore vu sur ce téléphone.
 */
export function needsTour(
  profile: Pick<Profile, 'id' | 'onboarded' | 'created_at'>,
  tourSeenBy: string[],
  now: number = Date.now(),
): boolean {
  if (!profile.onboarded || tourSeenBy.includes(profile.id)) return false;
  const age = now - Date.parse(profile.created_at);
  return age >= 0 && age < FRESH_ACCOUNT_MS;
}
