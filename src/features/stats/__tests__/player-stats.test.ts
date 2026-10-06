import { game, round, user } from '@/features/coinche/__fixtures__/games';

import { playerStats, resultFor } from '../player-stats';

const arthur = user('Arthur');
const lea = user('Léa');
const paul = user('Paul');
const zoe = user('Zoé');

function finished(winner: 'A' | 'B' | null, a = [arthur, lea], b = [paul, zoe], createdAt = '2026-09-01T00:00:00.000Z') {
  return game({ a, b, winner, finishedAt: createdAt, createdAt });
}

describe('playerStats', () => {
  // Du plus récent au plus ancien : V, V, D, V (avec Zoé comme partenaire), partie en cours.
  const games = [
    game({ a: [arthur, lea], b: [paul], createdAt: '2026-09-10T00:00:00.000Z' }),
    finished('A', [arthur, lea], [paul, zoe], '2026-09-09T00:00:00.000Z'),
    finished('A', [arthur, lea], [paul, zoe], '2026-09-08T00:00:00.000Z'),
    finished('B', [arthur, lea], [paul, zoe], '2026-09-07T00:00:00.000Z'),
    finished('B', [paul, lea], [arthur, zoe], '2026-09-06T00:00:00.000Z'),
    finished('A', [paul, lea], [zoe], '2026-09-05T00:00:00.000Z'),
  ];

  const stats = playerStats(games, arthur.id);

  it('ne compte que les parties où le joueur était assis', () => {
    expect(stats.games).toBe(5);
    expect(stats.finished).toBe(4);
    expect(stats.wins).toBe(3);
  });

  it('forme et séries', () => {
    expect(stats.form).toEqual(['W', 'W', 'L', 'W']);
    expect(stats.streak).toBe(2);
    expect(stats.bestWinStreak).toBe(2);
  });

  it('partenaires, du plus fréquent au plus rare', () => {
    expect(stats.partners.map((p) => [p.seat.name, p.games, p.wins])).toEqual([
      ['Léa', 4, 2],
      ['Zoé', 1, 1],
    ]);
  });

  it("contrats pris par l'équipe du joueur", () => {
    const g = game({
      a: [arthur, lea],
      rounds: [round('A', 80, true), round('A', 120, false), round('A', 90, true), round('B', 100, true)],
    });
    const s = playerStats([g], arthur.id);
    expect(s.contractsTaken).toBe(3);
    expect(s.contractsMade).toBe(2);
  });
});

describe('resultFor', () => {
  it('victoire, défaite, nul, ou rien si pas à la table', () => {
    expect(resultFor(finished('A'), arthur.id)).toBe('W');
    expect(resultFor(finished('A'), paul.id)).toBe('L');
    expect(resultFor(finished(null), paul.id)).toBe('D');
    expect(resultFor(finished('A'), 'inconnu')).toBeNull();
    expect(resultFor(game({ a: [arthur] }), arthur.id)).toBeNull();
  });
});
