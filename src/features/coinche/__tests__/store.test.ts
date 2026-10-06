import { LOCAL_PLAYER_ID } from '../players';
import { useGames } from '../store';
import { round, user } from '../__fixtures__/games';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-crypto', () => ({ randomUUID: () => globalThis.crypto.randomUUID() }));

const me = { kind: 'user' as const, id: LOCAL_PLAYER_ID, name: 'Moi' };
const lea = user('Léa');

beforeEach(() => {
  useGames.setState({ games: {}, pendingSync: {}, pendingDeletes: [] });
});

describe('store des parties', () => {
  it('nomme les équipes à partir des joueurs, et met la partie en file de synchro', () => {
    const id = useGames.getState().createGame({
      teamA: { name: '', players: [me, lea] },
      teamB: { name: '', players: [] },
      targetScore: 1000,
      ownerId: null,
    });
    const game = useGames.getState().games[id];
    expect(game.teams.A.name).toBe('Moi & Léa');
    expect(game.teams.B.name).toBe('Eux');
    expect(useGames.getState().pendingSync[id]).toBe(true);
  });

  it('à la connexion, "Moi" devient le compte, les noms générés suivent, pas les noms choisis', () => {
    const auto = useGames.getState().createGame({
      teamA: { name: '', players: [me, lea] },
      teamB: { name: '', players: [] },
      targetScore: 1000,
      ownerId: null,
    });
    const custom = useGames.getState().createGame({
      teamA: { name: 'Les Rois', players: [me] },
      teamB: { name: '', players: [] },
      targetScore: 1000,
      ownerId: null,
    });
    useGames.getState().addRound(auto, { ...round('A', 80), takerId: LOCAL_PLAYER_ID });

    const account = { kind: 'user' as const, id: '11111111-1111-4111-8111-111111111111', name: 'Arthur C' };
    useGames.getState().adoptLocalGames(account);

    const { games } = useGames.getState();
    expect(games[auto].ownerId).toBe(account.id);
    expect(games[auto].teams.A.players[0]).toEqual(account);
    expect(games[auto].teams.A.name).toBe('Arthur & Léa');
    expect(games[auto].rounds[0].takerId).toBe(account.id);
    expect(games[custom].teams.A.name).toBe('Les Rois');
  });

  it('une partie terminée pendant l’envoi reste en file (modifiée entre-temps)', () => {
    const id = useGames.getState().createGame({
      teamA: { name: '', players: [] },
      teamB: { name: '', players: [] },
      targetScore: 1000,
      ownerId: 'x',
    });
    const sentVersion = useGames.getState().games[id].updatedAt;
    useGames.setState((s) => ({ games: { ...s.games, [id]: { ...s.games[id], updatedAt: '2099-01-01T00:00:00.000Z' } } }));
    useGames.getState().markSynced(id, sentVersion);
    expect(useGames.getState().pendingSync[id]).toBe(true);
    useGames.getState().markSynced(id, '2099-01-01T00:00:00.000Z');
    expect(useGames.getState().pendingSync[id]).toBeUndefined();
  });

  it('supprimer une partie d’un compte la met en file de suppression serveur, pas une partie locale', () => {
    const local = useGames.getState().createGame({ teamA: { name: '', players: [] }, teamB: { name: '', players: [] }, targetScore: 1000, ownerId: null });
    const synced = useGames.getState().createGame({ teamA: { name: '', players: [] }, teamB: { name: '', players: [] }, targetScore: 1000, ownerId: 'x' });
    useGames.getState().deleteGame(local);
    useGames.getState().deleteGame(synced);
    expect(useGames.getState().pendingDeletes).toEqual([synced]);
    expect(useGames.getState().pendingSync).toEqual({});
  });

  it('les parties venues du serveur ne remplacent pas une modif locale en attente', () => {
    const id = useGames.getState().createGame({ teamA: { name: 'Local', players: [] }, teamB: { name: '', players: [] }, targetScore: 1000, ownerId: 'x' });
    const remote = { ...useGames.getState().games[id], teams: { A: { name: 'Serveur', players: [] }, B: { name: 'Eux', players: [] } }, updatedAt: '2099-01-01T00:00:00.000Z' };
    useGames.getState().mergeRemoteGames([remote]);
    expect(useGames.getState().games[id].teams.A.name).toBe('Local');
    useGames.getState().markSynced(id, useGames.getState().games[id].updatedAt);
    useGames.getState().mergeRemoteGames([remote]);
    expect(useGames.getState().games[id].teams.A.name).toBe('Serveur');
  });

  it('juste les points : privée, hors bande, amicale, noms "Nous" / "Eux", et la revanche aussi', () => {
    const arthur = user('Arthur');
    const id = useGames.getState().createGame({
      teamA: { name: '', players: [arthur] },
      teamB: { name: '', players: [] },
      targetScore: 1000,
      ownerId: arthur.id,
      visibility: 'public',
      groupId: 'bande',
      ranked: true,
      simple: true,
    });
    const game = useGames.getState().games[id];
    expect(game).toMatchObject({ simple: true, visibility: 'private', groupId: null, ranked: false });
    expect(game.teams.A.name).toBe('Nous');
    expect(game.teams.B.name).toBe('Eux');
    const rematch = useGames.getState().rematch(id)!;
    expect(useGames.getState().games[rematch]).toMatchObject({ simple: true, visibility: 'private' });
  });
});
