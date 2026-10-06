import { needsTour } from '../tour';

const profile = (onboarded = true) => ({ id: 'p1', onboarded });

describe('needsTour', () => {
  it('compte créé sur ce téléphone, pseudo choisi : oui', () => {
    expect(needsTour(profile(), 'p1')).toBe(true);
  });

  it('pas avant le choix du pseudo', () => {
    expect(needsTour(profile(false), 'p1')).toBe(false);
  });

  it('pas pour une simple connexion, ni une fois le tour vu', () => {
    expect(needsTour(profile(), null)).toBe(false);
  });

  it('pas pour un autre compte que celui créé ici', () => {
    expect(needsTour(profile(), 'p2')).toBe(false);
  });
});
