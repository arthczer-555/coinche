import { ELO_FLOOR, eloStakes, expectedScore, marginMultiplier, rateGame, teamElo } from '../elo';

const fresh = { elo: 1000, games: 0 };
const veteran = (elo: number) => ({ elo, games: 50 });

describe('expectedScore', () => {
  it('50 % à cote égale, plus pour la meilleure équipe', () => {
    expect(expectedScore(1000, 1000)).toBe(0.5);
    expect(expectedScore(1400, 1000)).toBeCloseTo(0.76, 2);
  });
});

describe('marginMultiplier', () => {
  it('de x0,5 (serré) à x1,5 (raclée), plafonné', () => {
    expect(marginMultiplier(1000, 1000, 1000)).toBe(0.5);
    expect(marginMultiplier(1010, 510, 1000)).toBe(1);
    expect(marginMultiplier(1500, 0, 1000)).toBe(1.5);
  });
});

describe('rateGame', () => {
  it('nouveaux joueurs à 1000 : la raclée rapporte 72, la victoire serrée 24', () => {
    const teams = { A: [fresh, fresh], B: [fresh, fresh] };
    expect(rateGame(teams, { winner: 'A', scoreA: 1520, scoreB: 300, target: 1000 })).toEqual({ A: [1072, 1072], B: [928, 928] });
    expect(rateGame(teams, { winner: 'A', scoreA: 1010, scoreB: 1000, target: 1000 })).toEqual({ A: [1024, 1024], B: [976, 976] });
  });

  it('battre plus fort que soi rapporte plus que battre plus faible', () => {
    const upset = rateGame({ A: [veteran(900), veteran(900)], B: [veteran(1300), veteran(1300)] }, { winner: 'A', scoreA: 1000, scoreB: 500, target: 1000 });
    const expected = rateGame({ A: [veteran(1300), veteran(1300)], B: [veteran(900), veteran(900)] }, { winner: 'A', scoreA: 1000, scoreB: 500, target: 1000 });
    expect(upset.A[0] - 900).toBeGreaterThan(expected.A[0] - 1300);
  });

  it('jamais sous le plancher', () => {
    const result = rateGame({ A: [veteran(120), veteran(120)], B: [veteran(120), veteran(120)] }, { winner: 'B', scoreA: 0, scoreB: 2000, target: 1000 });
    expect(result.A).toEqual([ELO_FLOOR, ELO_FLOOR]);
  });
});

describe('eloStakes', () => {
  it('à cote égale : +48 / -48 pour un nouveau, +32 / -32 ensuite', () => {
    expect(eloStakes({ A: [fresh, veteran(1000)], B: [fresh, veteran(1000)] })).toEqual({
      A: [{ win: 48, loss: -48 }, { win: 32, loss: -32 }],
      B: [{ win: 48, loss: -48 }, { win: 32, loss: -32 }],
    });
  });

  it('le favori gagne peu et perd beaucoup, comme rateGame avec un écart de la moitié de l’objectif', () => {
    const teams = { A: [veteran(1300), veteran(1300)], B: [veteran(900), veteran(900)] };
    const stakes = eloStakes(teams);
    expect(stakes.A[0].win).toBeLessThan(-stakes.A[0].loss);
    expect(stakes.B[0].win).toBe(-stakes.A[0].loss);
    expect(1300 + stakes.A[0].win).toBe(rateGame(teams, { winner: 'A', scoreA: 1000, scoreB: 500, target: 1000 }).A[0]);
  });
});

describe('teamElo', () => {
  const snapshot = { current: { lea: 1300, paul: 900 }, before: { 'g1:lea': 1200 } };
  const lea = { kind: 'user' as const, id: 'lea' };
  const paul = { kind: 'user' as const, id: 'paul' };
  const zoe = { kind: 'user' as const, id: 'zoe' };

  it('cote d’avant la partie si elle a été classée, sinon la cote actuelle (1000 sans cote)', () => {
    expect(teamElo([lea, paul], 'g1', snapshot)).toBe(1050);
    expect(teamElo([lea, paul], 'g2', snapshot)).toBe(1100);
    expect(teamElo([zoe], 'g2', snapshot)).toBe(1000);
  });

  it('pas de cote avec un invité ou sans joueur', () => {
    expect(teamElo([lea, { kind: 'guest', id: 'papi' }], 'g1', snapshot)).toBeNull();
    expect(teamElo([], 'g1', snapshot)).toBeNull();
  });
});
