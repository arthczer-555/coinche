import { game, guest, round, user } from '@/features/coinche/__fixtures__/games';
import { LOCAL_PLAYER_ID } from '@/features/coinche/players';

import { gameToPlayerRows, gameToRow, rowToGame, type GameRow } from '../mappers';

const owner = user('Arthur');
const lea = user('Léa');
const dede = guest('Dédé');

describe('app -> serveur', () => {
  const g = game({
    ownerId: owner.id,
    a: [owner, lea],
    b: [{ kind: 'user', id: LOCAL_PLAYER_ID, name: 'Moi' }, dede],
    rounds: [round('A', 100), round('B', 80, false)],
  });

  it('places 0-1 équipe A, 2-3 équipe B ; l’identité locale ne part jamais', () => {
    expect(gameToPlayerRows(g)).toEqual([
      { game_id: g.id, seat: 0, team: 'A', profile_id: owner.id, guest_id: null, guest_name: null },
      { game_id: g.id, seat: 1, team: 'A', profile_id: lea.id, guest_id: null, guest_name: null },
      { game_id: g.id, seat: 3, team: 'B', profile_id: null, guest_id: dede.id, guest_name: 'Dédé' },
    ]);
  });

  it('score final dénormalisé', () => {
    const row = gameToRow(g, owner.id);
    expect(row.score_a).toBe(260);
    expect(row.score_b).toBe(0);
    expect(row.owner_id).toBe(owner.id);
  });
});

describe('serveur -> app', () => {
  const g = game({ ownerId: owner.id, rounds: [round('A', 100)] });
  const row: GameRow = {
    ...(gameToRow(g, owner.id) as GameRow),
    rounds: g.rounds,
    created_at: '2026-09-27T20:00:00+00:00',
    updated_at: '2026-09-27T21:00:00.5+00:00',
    finished_at: null,
    players: [
      { seat: 2, team: 'B', profile_id: null, guest_id: dede.id, guest_name: 'Dédé', status: 'accepted', profile: null },
      {
        seat: 0,
        team: 'A',
        profile_id: owner.id,
        guest_id: null,
        guest_name: null,
        status: 'accepted',
        profile: { id: owner.id, username: 'arthur', display_name: 'Arthur', avatar_url: null },
      },
      {
        seat: 1,
        team: 'A',
        profile_id: lea.id,
        guest_id: null,
        guest_name: null,
        status: 'declined',
        profile: { id: lea.id, username: 'lea', display_name: 'Léa', avatar_url: null },
      },
    ],
  };
  const back = rowToGame(row);

  it('reconstruit les équipes (sans les joueurs qui ont refusé)', () => {
    expect(back.teams.A.players).toEqual([
      { kind: 'user', id: owner.id, name: 'Arthur', username: 'arthur', avatarUrl: null },
    ]);
    expect(back.teams.B.players).toEqual([{ kind: 'guest', id: dede.id, name: 'Dédé' }]);
  });

  it('dates remises au format de l’app', () => {
    expect(back.createdAt).toBe('2026-09-27T20:00:00.000Z');
    expect(back.updatedAt).toBe('2026-09-27T21:00:00.500Z');
  });
});

describe('juste les points', () => {
  it('le choix part au serveur et en revient ; les autres parties n’envoient pas la colonne', () => {
    const simple = game({ ownerId: owner.id, a: [owner], visibility: 'private', simple: true });
    const row = gameToRow(simple, owner.id);
    expect(row.simple).toBe(true);
    expect(rowToGame({ ...(row as GameRow), players: [] }).simple).toBe(true);
    expect('simple' in gameToRow(game({ ownerId: owner.id }), owner.id)).toBe(false);
  });
});
