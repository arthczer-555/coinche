import type { Coinche, Suit } from './types';

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
