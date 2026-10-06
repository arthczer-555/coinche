import { game, round, user } from '@/features/coinche/__fixtures__/games';

import { contractRates, headToHead, weeklyActivity } from '../player-stats';
import { playerBadges, playerRecords } from '../records';

const arthur = user('Arthur');
const lea = user('Léa');
const paul = user('Paul');
const zoe = user('Zoé');

const finishedAt = '2026-09-20T22:00:00.000Z';

// Arthur & Léa menés 0-640 (surcoinche chutée), puis capot, générale... et gagnent 1250-640.
const remontada = game({
  a: [arthur, lea],
  b: [paul, zoe],
  targetScore: 1000,
  winner: 'A',
  finishedAt,
  rounds: [
    round('A', 80, false, { coinche: 'surcoinche' }),
    round('A', 'capot', true),
    round('A', 'generale', true),
    round('A', 'capot', true),
    round('A', 'capot', true),
  ],
});

// Victoire éclair sans que l'adversaire marque (fanny).
const fanny = game({
  a: [arthur, lea],
  b: [paul, zoe],
  targetScore: 500,
  winner: 'A',
  finishedAt,
  location: 'Café des Amis',
  rounds: [round('A', 'generale', true)],
});

describe('playerRecords', () => {
  const records = playerRecords([remontada, fanny], arthur.id);

  it('plus grosse remontée, victoire la plus rapide, meilleure mène, plus gros score', () => {
    expect(records.biggestComeback).toEqual({ value: 640, gameId: remontada.id });
    expect(records.quickestWin).toEqual({ value: 1, gameId: fanny.id });
    expect(records.bestRound?.value).toBe(500);
    expect(records.highestScore).toEqual({ value: 1250, gameId: remontada.id });
    expect(records.fannies).toBe(1);
  });

  it('les perdants n’ont ni remontée ni fanny', () => {
    const lost = playerRecords([remontada, fanny], paul.id);
    expect(lost.biggestComeback).toBeNull();
    expect(lost.fannies).toBe(0);
    expect(lost.bestRound?.value).toBe(640);
  });
});

describe('playerBadges', () => {
  const badges = Object.fromEntries(playerBadges([remontada, fanny], arthur.id).map((b) => [b.id, b]));

  it('badges gagnés', () => {
    expect(badges['first-game'].earned).toBe(true);
    expect(badges.capot.earned).toBe(true);
    expect(badges.generale.earned).toBe(true);
    expect(badges.remontada.earned).toBe(true);
    expect(badges.fanny.earned).toBe(true);
  });

  it('badges pas encore gagnés, avec leur progression', () => {
    expect(badges.regular.earned).toBe(false);
    expect(badges.regular.progress).toBeCloseTo(0.2);
    expect(badges.surcoinche.earned).toBe(false);
    // 5 contrats réussis par l'équipe (4 + 1) sur 10.
    expect(badges.taker.progress).toBeCloseTo(0.5);
  });

  it('la défense qui fait chuter une surcoinche gagne "Sang-froid"', () => {
    const paulBadges = playerBadges([remontada], paul.id);
    expect(paulBadges.find((b) => b.id === 'surcoinche')?.earned).toBe(true);
  });
});

describe('weeklyActivity', () => {
  it('compte les parties par semaine, de la plus ancienne à la plus récente', () => {
    const now = new Date('2026-09-30T12:00:00Z'); // mercredi
    const games = [
      game({ a: [arthur], createdAt: '2026-09-29T20:00:00.000Z' }),
      game({ a: [arthur], createdAt: '2026-09-28T09:00:00.000Z' }),
      game({ a: [arthur], createdAt: '2026-09-22T20:00:00.000Z' }),
      game({ a: [paul], createdAt: '2026-09-29T20:00:00.000Z' }),
    ];
    const weeks = weeklyActivity(games, arthur.id, 3, now);
    expect(weeks.map((w) => w.games)).toEqual([0, 1, 2]);
  });
});

describe('contractRates', () => {
  it('réussite par hauteur de contrat pour l’équipe du joueur', () => {
    const rates = Object.fromEntries(contractRates([remontada, fanny], arthur.id).map((b) => [b.label, b]));
    expect(rates['80-90']).toEqual({ label: '80-90', taken: 1, made: 0 });
    expect(rates.Capot).toEqual({ label: 'Capot', taken: 5, made: 5 });
  });
});

describe('headToHead', () => {
  it('bilan avec et contre un joueur', () => {
    expect(headToHead([remontada, fanny], arthur.id, lea.id)).toEqual({
      together: { games: 2, wins: 2 },
      against: { games: 0, wins: 0 },
    });
    expect(headToHead([remontada, fanny], paul.id, arthur.id)).toEqual({
      together: { games: 0, wins: 0 },
      against: { games: 2, wins: 0 },
    });
  });
});
