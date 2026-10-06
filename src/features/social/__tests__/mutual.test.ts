import { mutualFriendsLabel } from '../mutual';

describe('mutualFriendsLabel', () => {
  it('cite les prénoms quand il y en a trois ou moins', () => {
    expect(mutualFriendsLabel(['Léa Dubois'], 1)).toBe('En commun : Léa');
    expect(mutualFriendsLabel(['Léa Dubois', 'Paul Moreau'], 2)).toBe('En commun : Léa et Paul');
    expect(mutualFriendsLabel(['Léa Dubois', 'Paul Moreau', 'Zoé Laurent'], 3)).toBe('En commun : Léa, Paul et Zoé');
  });

  it('résume au-delà de trois (le serveur ne renvoie que trois noms)', () => {
    expect(mutualFriendsLabel(['Léa Dubois', 'Paul Moreau', 'Zoé Laurent'], 5)).toBe('En commun : Léa, Paul et 3 autres');
    expect(mutualFriendsLabel(['Léa Dubois', 'Paul Moreau', 'Zoé Laurent'], 4)).toBe('En commun : Léa, Paul et 2 autres');
  });

  it('retombe sur le nombre sans noms, et rien sans ami en commun', () => {
    expect(mutualFriendsLabel([], 2)).toBe('2 amis en commun');
    expect(mutualFriendsLabel([], 0)).toBe('');
  });
});
