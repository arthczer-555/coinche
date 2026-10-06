import type { AuthError } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import { randomUUID } from 'expo-crypto';
import { Platform } from 'react-native';

import { useGames } from '@/features/coinche/store';
import { isDemo } from '@/features/demo/is-demo';
import { unregisterPushToken } from '@/features/notifications/push';
import { removeMyFiles, updateProfile } from '@/features/social/api';
import { queryClient } from '@/features/social/queries';
import { syncNow } from '@/features/sync/sync';
import type { Profile } from '@/lib/database.types';
import { requireSupabase, supabase } from '@/lib/supabase';

import {
  fullName,
  LOGIN_EMAIL_DOMAIN,
  MIN_PASSWORD_LENGTH,
  normalizeUsername,
  type SignUpForm,
} from './credentials';
import { profileToSeat, useSession } from './session';

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios' || !supabase) return false;
  return AppleAuthentication.isAvailableAsync();
}

/** Connexion Apple native. Renvoie false si l'utilisateur a annulé. */
export async function signInWithApple(): Promise<boolean> {
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (error) {
    if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') return false;
    throw error;
  }
  if (!credential.identityToken) throw new Error('Apple n’a pas renvoyé de jeton.');

  const { data, error } = await requireSupabase().auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
  });
  if (error) throw error;

  // Apple ne donne le nom qu'à la toute première connexion : on le garde tout de suite.
  const fullName = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(' ');
  if (fullName && data.user) {
    await requireSupabase().auth.updateUser({ data: { full_name: fullName } });
    await updateProfile(data.user.id, { display_name: fullName.slice(0, 40) }).catch(() => undefined);
  }
  return true;
}

const WRONG_CREDENTIALS = 'Pseudo ou mot de passe incorrect.';

/** Erreur de Supabase Auth en message lisible. */
function authMessage(error: AuthError): string {
  switch (error.code) {
    case 'invalid_credentials':
      return WRONG_CREDENTIALS;
    case 'over_request_rate_limit':
      return 'Trop d’essais : réessaie dans quelques minutes.';
    case 'weak_password':
      return `Mot de passe trop faible : ${MIN_PASSWORD_LENGTH} caractères minimum.`;
    default:
      return 'Ça n’a pas marché : vérifie ta connexion et réessaie.';
  }
}

/**
 * Création d'un compte : prénom, nom, pseudo, mot de passe. Pas d'e-mail : Supabase en exige un,
 * l'app en invente un interne (voir credentials.ts). Le profil est créé avec le nom et le pseudo,
 * sans passer par l'écran d'accueil (sauf si le pseudo a été pris entre-temps).
 */
export async function signUpWithPassword(form: SignUpForm): Promise<void> {
  const sb = requireSupabase();
  const username = normalizeUsername(form.username);
  const { data: free, error: checkError } = await sb.rpc('is_username_free', { name: username });
  if (checkError) throw new Error('Ça n’a pas marché : vérifie ta connexion et réessaie.');
  if (!free) throw new Error(`@${username} est déjà pris.`);
  const { error } = await sb.auth.signUp({
    email: `${randomUUID()}@${LOGIN_EMAIL_DOMAIN}`,
    password: form.password,
    options: { data: { full_name: fullName(form.firstName, form.lastName), username } },
  });
  if (error) throw new Error(authMessage(error));
}

/** Connexion avec le pseudo (actuel) et le mot de passe. */
export async function signInWithPassword(login: string, password: string): Promise<void> {
  const sb = requireSupabase();
  const { data: email, error } = await sb.rpc('login_email', { login: normalizeUsername(login) });
  if (error) throw new Error('Ça n’a pas marché : vérifie ta connexion et réessaie.');
  if (!email) throw new Error(WRONG_CREDENTIALS);
  const { error: signInError } = await sb.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(authMessage(signInError));
}

/** Parties du compte encore sur le téléphone mais pas envoyées au serveur. */
export function unsyncedGamesCount(): number {
  const me = useSession.getState().profile?.id;
  const { games, pendingSync } = useGames.getState();
  return Object.keys(pendingSync).filter((id) => games[id]?.ownerId === me).length;
}

export async function signOut(): Promise<void> {
  if (isDemo) throw new Error('Indisponible en mode démo.');
  const me = useSession.getState().profile?.id;
  // Dernière chance d'envoyer ce qui attend.
  await syncNow().catch(() => undefined);
  await unregisterPushToken();
  await requireSupabase().auth.signOut();
  if (me) useGames.getState().forgetAccountGames(me);
  queryClient.clear();
}

/** Suppression définitive du compte et de toutes ses parties (exigence App Store). */
export async function deleteAccount(): Promise<void> {
  if (isDemo) throw new Error('Indisponible en mode démo.');
  const me = useSession.getState().profile?.id;
  // Les fichiers ne partent pas en cascade avec la base : on les supprime d'abord.
  if (me) await removeMyFiles(me);
  const { error } = await requireSupabase().rpc('delete_my_account');
  if (error) throw error;
  await requireSupabase().auth.signOut().catch(() => undefined);
  if (me) useGames.getState().forgetAccountGames(me);
  queryClient.clear();
}

/** Met à jour mon profil, et mon nom dans toutes les parties du téléphone. */
export async function saveMyProfile(
  changes: Partial<Pick<Profile, 'username' | 'display_name' | 'city' | 'bio' | 'onboarded' | 'avatar_url'>>,
): Promise<Profile> {
  const me = useSession.getState().profile;
  if (!me) throw new Error('Pas connecté.');
  const profile = isDemo ? { ...me, ...changes } : await updateProfile(me.id, changes);
  useSession.setState({ profile });
  useGames.getState().refreshPlayer(profileToSeat(profile));
  queryClient.setQueryData(['profile', profile.id], profile);
  return profile;
}
