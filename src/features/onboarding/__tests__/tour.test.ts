import { FRESH_ACCOUNT_MS, needsTour } from '../tour';

const NOW = Date.parse('2026-10-06T12:00:00Z');
const HOUR = 60 * 60 * 1000;
const profile = (ageMs: number, onboarded = true) => ({
  id: 'p1',
  onboarded,
  created_at: new Date(NOW - ageMs).toISOString(),
});

describe('needsTour', () => {
  it('compte tout neuf, pseudo choisi, jamais vu : oui', () => {
    expect(needsTour(profile(5 * 60 * 1000), [], NOW)).toBe(true);
    expect(needsTour(profile(23 * HOUR), [], NOW)).toBe(true);
  });

  it('pas avant le choix du pseudo', () => {
    expect(needsTour(profile(HOUR, false), [], NOW)).toBe(false);
  });

  it('une seule fois par compte sur ce téléphone', () => {
    expect(needsTour(profile(HOUR), ['p1'], NOW)).toBe(false);
    expect(needsTour(profile(HOUR), ['p2'], NOW)).toBe(true);
  });

  it('pas pour un compte existant (connexion sur un nouveau téléphone)', () => {
    expect(needsTour(profile(FRESH_ACCOUNT_MS), [], NOW)).toBe(false);
    expect(needsTour(profile(120 * 24 * HOUR), [], NOW)).toBe(false);
  });

  it('date invalide ou dans le futur : non', () => {
    expect(needsTour({ id: 'p1', onboarded: true, created_at: 'nope' }, [], NOW)).toBe(false);
    expect(needsTour(profile(-HOUR), [], NOW)).toBe(false);
  });
});
