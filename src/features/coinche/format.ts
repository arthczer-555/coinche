import type { Coinche, Suit, Visibility } from './types';

export const COINCHE_LABEL: Record<Coinche, string> = {
  none: '',
  coinche: 'Coinché ×2',
  surcoinche: 'Surcoinché ×4',
};

export const SUIT_LABEL: Record<Suit, string> = {
  hearts: 'Coeur',
  diamonds: 'Carreau',
  spades: 'Pique',
  clubs: 'Trèfle',
  'no-trump': 'Sans atout',
  'all-trump': 'Tout atout',
};

export const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: 'public', label: 'Tout le monde' },
  { value: 'friends', label: 'Amis' },
  { value: 'private', label: 'Joueurs' },
];

/** "ven. 25 sept. · 14:21" */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time}`;
}

export function plural(count: number, word: string): string {
  return `${count} ${word}${count > 1 ? 's' : ''}`;
}

/** "à l'instant", "il y a 5 min", "il y a 3 h", "hier", puis la date. */
export function formatRelative(iso: string, now = Date.now()): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  if (hours < 48) return 'hier';
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
