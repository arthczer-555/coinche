import type { Seat } from '@/features/coinche/types';

// Même table que public.fold() côté base (migration tag_search) : l'app et le serveur trouvent les mêmes joueurs.
const ACCENTED = 'àáâãäåçèéêëìíîïñòóôõöùúûüýÿ';
const PLAIN = 'aaaaaaceeeeiiiinooooouuuuyy';

/** Minuscules sans accents : "Léa" et "lea" se valent. */
export function fold(text: string): string {
  let result = '';
  for (const char of text.toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae')) {
    const index = ACCENTED.indexOf(char);
    result += index >= 0 ? PLAIN[index] : char;
  }
  return result;
}

/** Ce que l'on cherche, prêt à comparer : sans espaces autour ni "@" devant ("@lea.m" cherche le pseudo lea.m). */
export function searchTerm(query: string): string {
  return fold(query.trim().replace(/^@+/, '').trim());
}

/** Le joueur correspond-il à la recherche (`term` vient de searchTerm) : par son nom ou son pseudo. */
export function matchesSeat(seat: Seat, term: string): boolean {
  if (!term) return true;
  if (fold(seat.name).includes(term)) return true;
  return seat.kind === 'user' && !!seat.username && seat.username.includes(term);
}
