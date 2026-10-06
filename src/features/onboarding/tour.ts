import type { Profile } from '@/lib/database.types';

/**
 * Le tour d'après l'inscription est à montrer : compte créé sur ce téléphone (une simple connexion ne compte pas,
 * voir `auth/sign-in`), pseudo choisi (`onboarded`, sinon l'écran d'accueil du profil passe d'abord).
 */
export function needsTour(profile: Pick<Profile, 'id' | 'onboarded'>, tourPendingFor: string | null): boolean {
  return profile.onboarded && tourPendingFor === profile.id;
}
