import type { Seat } from '@/features/coinche/types';

import { fold, matchesSeat, searchTerm } from '../search';

const lea: Seat = { kind: 'user', id: 'lea', name: 'Léa Martin', username: 'lea.m' };
const zoe: Seat = { kind: 'guest', id: 'zoe', name: 'Zoé' };

describe('fold', () => {
  it('minuscules sans accents', () => {
    expect(fold('Léa')).toBe('lea');
    expect(fold('ÉLOÏSE Çà')).toBe('eloise ca');
    expect(fold('Cœur Æsir')).toBe('coeur aesir');
  });
});

describe('searchTerm', () => {
  it('ignore les espaces autour et le "@" du pseudo', () => {
    expect(searchTerm('  @Lea.M ')).toBe('lea.m');
    expect(searchTerm('@@ zoé')).toBe('zoe');
    expect(searchTerm('@')).toBe('');
  });
});

describe('matchesSeat', () => {
  it('par le nom, sans accents, ou par le pseudo', () => {
    expect(matchesSeat(lea, searchTerm('lea'))).toBe(true);
    expect(matchesSeat(lea, searchTerm('mart'))).toBe(true);
    expect(matchesSeat(lea, searchTerm('@lea.m'))).toBe(true);
    expect(matchesSeat(zoe, searchTerm('Zoe'))).toBe(true);
    expect(matchesSeat(lea, searchTerm('paul'))).toBe(false);
  });

  it('un invité n’a pas de pseudo', () => {
    expect(matchesSeat(zoe, searchTerm('@lea.m'))).toBe(false);
  });

  it('recherche vide : tout le monde', () => {
    expect(matchesSeat(zoe, '')).toBe(true);
  });
});
