import { game, round, user } from '@/features/coinche/__fixtures__/games';

import { monthlyChallenges, recapHeadline, yearRecap } from '../season';

const arthur = user('Arthur');
const lea = user('Léa');
const paul = user('Paul');

function won(createdAt: string, extra = {}) {
  return game({
    a: [arthur, lea],
    b: [paul],
    winner: 'A',
    createdAt,
    finishedAt: createdAt,
    rounds: [round('A', 'capot', true, { coinche: 'coinche' })],
    ...extra,
  });
}

describe('monthlyChallenges', () => {
  const now = new Date('2026-09-15T12:00:00Z');
  const games = [
    won('2026-09-10T20:00:00.000Z'),
    won('2026-09-03T20:00:00.000Z'),
    won('2026-08-30T20:00:00.000Z'), // mois précédent : ne compte pas
  ];
  const byId = Object.fromEntries(monthlyChallenges(games, arthur.id, now).map((c) => [c.id, c]));

  it('compte seulement le mois en cours', () => {
    expect(byId.games).toMatchObject({ value: 2, goal: 20, done: false });
    expect(byId.wins.value).toBe(2);
    expect(byId.capots.value).toBe(2);
    expect(byId.coinches.value).toBe(2);
    expect(byId.partners.value).toBe(1);
  });

  it('plafonne la progression à l’objectif', () => {
    const many = Array.from({ length: 4 }, (_, i) => won(`2026-09-0${i + 1}T20:00:00.000Z`));
    const capots = monthlyChallenges(many, arthur.id, now).find((c) => c.id === 'capots');
    expect(capots).toMatchObject({ value: 3, done: true });
  });
});

describe('yearRecap', () => {
  const games = [
    won('2026-09-10T20:00:00.000Z', { location: 'Café des Amis' }),
    won('2026-09-03T20:00:00.000Z', { location: 'Café des Amis' }),
    won('2026-03-01T20:00:00.000Z', { location: 'Chez Mamie' }),
    won('2025-12-31T20:00:00.000Z'),
  ];
  const recap = yearRecap(games, arthur.id, 2026);

  it('bilan de l’année', () => {
    expect(recap.games).toBe(3);
    expect(recap.wins).toBe(3);
    expect(recap.capots).toBe(3);
    expect(recap.favoritePlace).toBe('Café des Amis');
    expect(recap.busiestMonth).toEqual({ name: 'septembre', games: 2 });
    expect(recap.bestPartner?.seat.name).toBe('Léa');
    expect(recap.bestWinStreak).toBe(3);
  });

  it('phrase d’accroche', () => {
    expect(recapHeadline(recap)).toBe('Une saison de patron.');
    expect(recapHeadline(yearRecap([], arthur.id, 2026))).toBe('Ta saison commence maintenant.');
  });
});
