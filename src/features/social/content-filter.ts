/**
 * Même liste que la fonction SQL `is_clean` (supabase/migrations/20260928000000_social_feed.sql) :
 * on refuse avant d'enregistrer, pour qu'une note refusée par le serveur ne bloque jamais la synchro.
 * Les deux listes doivent rester identiques.
 */
const BANNED = [
  'connard',
  'connasse',
  'encul[eé]',
  'enfoir[eé]',
  'salope',
  'pute',
  'p[eé]d[eé]',
  'tapette',
  'n[eè]gre',
  'bougnoule',
  'youpin',
  'nique ta',
  'ntm',
  'fdp',
  'fils de pute',
  'batard',
  'bâtard',
  'pd',
  'fuck',
  'motherfucker',
  'faggot',
  'nigger',
];

const LETTER = 'a-zA-ZÀ-ÖØ-öø-ÿ';
const PATTERN = new RegExp(`(^|[^${LETTER}])(${BANNED.join('|')})(e?s)?([^${LETTER}]|$)`, 'i');

export function isClean(content: string | null | undefined): boolean {
  return !content || !PATTERN.test(content);
}

export const UNCLEAN_MESSAGE = 'Ce texte contient un mot interdit.';
