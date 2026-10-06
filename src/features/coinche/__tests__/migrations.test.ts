import { migrateGamesState } from '../migrations';
import { LOCAL_PLAYER_ID } from '../players';
import { game as makeGame, uuid } from '../__fixtures__/games';

/** Une partie telle qu'elle était stockée en v6 (App Store v1.0). */
const v6Game = {
  id: 'lx2k9a-abc123',
  teams: { A: { name: 'Nous', playerIds: [] }, B: { name: 'Les voisins', playerIds: [] } },
  targetScore: 1000,
  rounds: [
    { id: 'r1-x', bidder: 'A', bid: 80, trump: 'hearts', coinche: 'none', made: true, createdAt: '2026-09-25T20:00:00.000Z' },
    { id: 'r2-y', bidder: 'B', bid: 'capot', trump: null, coinche: 'coinche', made: false, createdAt: '2026-09-25T20:10:00.000Z' },
  ],
  createdAt: '2026-09-25T19:55:00.000Z',
  finishedAt: null,
  winner: null,
};

describe('migration v6 -> v7', () => {
  const state = migrateGamesState({ games: { [v6Game.id]: structuredClone(v6Game) } }, 6, uuid);
  const [game] = Object.values(state.games);

  it('garde les parties et leurs mènes, avec de nouveaux ids UUID', () => {
    expect(Object.keys(state.games)).toHaveLength(1);
    expect(game.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(state.games[game.id]).toBe(game);
    expect(game.rounds).toHaveLength(2);
    expect(game.rounds[0].id).not.toBe('r1-x');
    expect(game.rounds[0].trump).toBe('hearts');
    expect(game.rounds[1].takerId).toBeNull();
  });

  it('met "Moi" dans l’équipe 1 (hypothèse de la v1.0) et ne rattache la partie à aucun compte', () => {
    expect(game.teams.A).toEqual({ name: 'Nous', players: [{ kind: 'user', id: LOCAL_PLAYER_ID, name: 'Moi' }] });
    expect(game.teams.B).toEqual({ name: 'Les voisins', players: [] });
    expect(game.ownerId).toBeNull();
    expect(game.visibility).toBe('friends');
    expect(game.updatedAt).toBe('2026-09-25T20:10:00.000Z');
  });

  it('démarre avec une file de synchro vide', () => {
    expect(state.pendingSync).toEqual({});
    expect(state.pendingDeletes).toEqual([]);
  });
});

describe('migration v7 -> v8', () => {
  it('remplace la visibilité "abonnés" par "amis" et garde les autres', () => {
    const followers = { ...makeGame(), visibility: 'followers' } as unknown as ReturnType<typeof makeGame>;
    const open = makeGame({ visibility: 'public' });
    const state = migrateGamesState({ games: { [followers.id]: followers, [open.id]: open } }, 7, uuid);
    expect(state.games[followers.id].visibility).toBe('friends');
    expect(state.games[open.id].visibility).toBe('public');
  });
});
