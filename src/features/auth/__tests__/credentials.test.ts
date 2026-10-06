import { fullName, normalizeUsername, signUpError, suggestUsername } from '../credentials';

const valid = { firstName: 'Arthur', lastName: 'Czernichow', username: 'arthur.c', password: 'belote-rebelote' };

describe('credentials', () => {
  it('normalise le pseudo tapé', () => {
    expect(normalizeUsername('  @Arthur.C ')).toBe('arthur.c');
  });

  it('suggère un pseudo sans accents ni espaces', () => {
    expect(suggestUsername('Léa Dupré-Martin')).toBe('lea.dupremartin');
  });

  it('assemble le nom affiché, 40 caractères au plus', () => {
    expect(fullName(' Arthur ', '  Czernichow')).toBe('Arthur Czernichow');
    expect(fullName('A'.repeat(30), 'B'.repeat(30))).toHaveLength(40);
  });

  it('accepte un formulaire complet', () => {
    expect(signUpError(valid)).toBeNull();
    expect(signUpError({ ...valid, username: '@Arthur.C' })).toBeNull();
  });

  it('refuse un nom manquant, un pseudo invalide, un mot de passe trop court', () => {
    expect(signUpError({ ...valid, lastName: ' ' })).toMatch(/prénom et ton nom/);
    expect(signUpError({ ...valid, username: 'ab' })).toMatch(/Pseudo/);
    expect(signUpError({ ...valid, username: 'arthur c' })).toMatch(/Pseudo/);
    expect(signUpError({ ...valid, password: '1234' })).toMatch(/8 caractères/);
  });
});
