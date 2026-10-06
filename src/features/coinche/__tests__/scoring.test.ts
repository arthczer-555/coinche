import { computeWinner, gameStats, scoreRound, teamOf, totalScore } from '../scoring';
import { game, round, user } from '../__fixtures__/games';

describe('scoreRound', () => {
  it('contrat fait : le preneur marque son annonce', () => {
    expect(scoreRound(round('A', 100))).toEqual({ A: 100, B: 0 });
  });

  it('contrat chuté : la défense marque 160, x2 coinché, x4 surcoinché', () => {
    expect(scoreRound(round('A', 100, false))).toEqual({ A: 0, B: 160 });
    expect(scoreRound(round('A', 100, false, { coinche: 'coinche' }))).toEqual({ A: 0, B: 320 });
    expect(scoreRound(round('B', 80, false, { coinche: 'surcoinche' }))).toEqual({ A: 640, B: 0 });
  });

  it('capot 250 et générale 500', () => {
    expect(scoreRound(round('B', 'capot'))).toEqual({ A: 0, B: 250 });
    expect(scoreRound(round('A', 'generale', true, { coinche: 'coinche' }))).toEqual({ A: 1000, B: 0 });
  });
});

describe('computeWinner', () => {
  it('première équipe à l’objectif, égalité au-dessus : on continue', () => {
    expect(computeWinner({ A: 1000, B: 500 }, 1000)).toBe('A');
    expect(computeWinner({ A: 1020, B: 1100 }, 1000)).toBe('B');
    expect(computeWinner({ A: 1100, B: 1100 }, 1000)).toBeNull();
    expect(computeWinner({ A: 900, B: 990 }, 1000)).toBeNull();
  });
});

describe('teamOf et perspective des stats', () => {
  const arthur = user('Arthur');
  const lea = user('Léa');
  const paul = user('Paul');
  const g = game({
    a: [arthur, lea],
    b: [paul],
    rounds: [round('A', 'capot'), round('B', 'capot'), round('B', 80, true, { coinche: 'coinche' })],
  });

  it('retrouve l’équipe d’un joueur', () => {
    expect(teamOf(g, lea.id)).toBe('A');
    expect(teamOf(g, paul.id)).toBe('B');
    expect(teamOf(g, 'inconnu')).toBeNull();
  });

  it('les capots sont comptés pour l’équipe du joueur, ou pour tout le monde', () => {
    expect(gameStats(g, 'A').capots).toBe(1);
    expect(gameStats(g, 'B').capots).toBe(1);
    expect(gameStats(g).capots).toBe(2);
    expect(gameStats(g).coinches).toBe(1);
    expect(totalScore(g)).toEqual({ A: 250, B: 410 });
  });
});
