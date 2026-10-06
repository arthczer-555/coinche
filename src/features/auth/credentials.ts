import { isClean, UNCLEAN_MESSAGE } from '@/features/social/content-filter';

/** Pseudo : 3 à 20 caractères, minuscules, chiffres, point ou tiret bas (même règle que la base). */
export const USERNAME = /^[a-z0-9_.]{3,20}$/;

export const MIN_PASSWORD_LENGTH = 8;

/**
 * Supabase Auth exige un e-mail : les comptes pseudo + mot de passe reçoivent une adresse interne,
 * jamais montrée ni utilisée. Domaine réservé (RFC 2606) : aucun e-mail ne peut y partir.
 * Le même domaine est écrit en dur dans la fonction SQL login_email().
 */
export const LOGIN_EMAIL_DOMAIN = 'coinche.invalid';

/** Pseudo tel que tapé ("@Arthur.C ") vers tel que stocké ("arthur.c"). */
export function normalizeUsername(input: string): string {
  return input.trim().replace(/^@/, '').toLowerCase();
}

/** Suggestion de pseudo à partir du nom : "Arthur Czernichow" -> "arthur.czernichow". */
export function suggestUsername(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9_.]/g, '')
    .slice(0, 20);
}

/** Nom affiché : "Prénom Nom", 40 caractères au plus (limite de la base). */
export function fullName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`.trim().replace(/\s+/g, ' ').slice(0, 40);
}

export type SignUpForm = { firstName: string; lastName: string; username: string; password: string };

/** Ce qui empêche de créer le compte (message à afficher), ou null si tout est bon. */
export function signUpError({ firstName, lastName, username, password }: SignUpForm): string | null {
  if (!firstName.trim() || !lastName.trim()) return 'Indique ton prénom et ton nom.';
  if (!USERNAME.test(normalizeUsername(username))) {
    return 'Pseudo : 3 à 20 caractères, lettres minuscules, chiffres, point ou tiret bas.';
  }
  if (password.length < MIN_PASSWORD_LENGTH) return `Mot de passe : ${MIN_PASSWORD_LENGTH} caractères minimum.`;
  if (!isClean(firstName) || !isClean(lastName) || !isClean(username)) return UNCLEAN_MESSAGE;
  return null;
}
