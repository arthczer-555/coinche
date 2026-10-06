import { autoTeamName, placePlayer, recentPlayers, replacePlayer, teamFullName } from '../players';
import { game, guest, round, user } from '../__fixtures__/games';

const arthur = user('Arthur Czernichow');
const lea = user('Léa');
const paul = guest('Paul');
const zoe = user('Zoé');

describe('autoTeamName', () => {
  it('prénoms joints, sinon nom par défaut', () => {
    expect(autoTeamName([arthur, lea], 'Nous')).toBe('Arthur & Léa');
    expect(autoTeamName([paul], 'Eux')).toBe('Paul');
    expect(autoTeamName([], 'Eux')).toBe('Eux');
  });
});

describe('teamFullName', () => {
  it('nom généré : noms complets ; nom choisi ou par défaut : inchangé', () => {
    expect(teamFullName({ name: 'Arthur & Léa', players: [arthur, lea] }, 'A')).toBe('Arthur Czernichow & Léa');
    expect(teamFullName({ name: 'Les Boss', players: [arthur, lea] }, 'A')).toBe('Les Boss');
    expect(teamFullName({ name: 'Eux', players: [] }, 'B')).toBe('Eux');
  });
});

describe('placePlayer', () => {
  it('ajoute dans une place vide', () => {
    expect(placePlayer({ A: [arthur], B: [] }, 'A', 1, lea)).toEqual({ A: [arthur, lea], B: [] });
  });

  it('remplace l’occupant d’une place', () => {
    expect(placePlayer({ A: [arthur, lea], B: [] }, 'A', 1, paul)).toEqual({ A: [arthur, paul], B: [] });
  });

  it('déplace un joueur déjà assis ailleurs (jamais deux fois à la table)', () => {
    expect(placePlayer({ A: [arthur, lea], B: [paul] }, 'B', 1, lea)).toEqual({ A: [arthur], B: [paul, lea] });
  });

  it('libère une place', () => {
    expect(placePlayer({ A: [arthur, lea], B: [] }, 'A', 0, null)).toEqual({ A: [lea], B: [] });
  });

  it('ne dépasse jamais deux joueurs par équipe', () => {
    const teams = placePlayer({ A: [arthur, lea], B: [] }, 'A', 5, zoe);
    expect(teams.A).toHaveLength(2);
    expect(teams.A).toContainEqual(zoe);
  });
});

describe('replacePlayer', () => {
  it('remplace aussi le preneur des mènes', () => {
    const g = game({ a: [arthur], rounds: [round('A', 80, true, { takerId: arthur.id })] });
    const next = replacePlayer(g, arthur.id, zoe);
    expect(next.teams.A.players).toEqual([zoe]);
    expect(next.rounds[0].takerId).toBe(zoe.id);
  });
});

describe('recentPlayers', () => {
  it('du plus fréquent au plus rare, sans les exclus', () => {
    const games = [
      game({ a: [arthur, lea], b: [paul], createdAt: '2026-09-03T00:00:00.000Z' }),
      game({ a: [arthur, lea], createdAt: '2026-09-02T00:00:00.000Z' }),
      game({ a: [arthur], b: [zoe], createdAt: '2026-09-01T00:00:00.000Z' }),
    ];
    const recent = recentPlayers(games, [arthur.id]);
    expect(recent.map((r) => r.seat.name)).toEqual(['Léa', 'Paul', 'Zoé']);
    expect(recent[0].games).toBe(2);
  });
});
