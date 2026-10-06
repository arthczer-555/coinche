import { isClean } from '../content-filter';

describe('isClean (miroir de la fonction SQL is_clean)', () => {
  it('refuse les insultes, au singulier comme au pluriel', () => {
    expect(isClean('bande de connards')).toBe(false);
    expect(isClean('FDP')).toBe(false);
    expect(isClean('quelle salope cette dame de pique')).toBe(false);
  });

  it('accepte les mots qui contiennent une insulte sans en être une', () => {
    expect(isClean('computer, pédagogue, en retard, député')).toBe(true);
    expect(isClean('Remontada de fou au Café des Amis !')).toBe(true);
    expect(isClean(null)).toBe(true);
  });
});
