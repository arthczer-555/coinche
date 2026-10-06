import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { migrateGamesState, STORE_VERSION } from './migrations';
import { autoTeamName, LOCAL_PLAYER_ID, replacePlayer } from './players';
import { computeWinner, isStoppedEarly, leader, totalScore } from './scoring';
import type { Game, Round, Seat, TeamId, Visibility } from './types';

type NewRound = Omit<Round, 'id' | 'createdAt'>;

export type NewTeam = {
  /** Vide : nom généré à partir des joueurs ("Arthur & Léa"), sinon "Nous" / "Eux". */
  name: string;
  players: Seat[];
};

type NewGame = {
  teamA: NewTeam;
  teamB: NewTeam;
  targetScore: number;
  /** Compte connecté qui compte les points, null en mode hors compte. */
  ownerId: string | null;
  visibility?: Visibility;
  groupId?: string | null;
  ranked?: boolean;
  /** "Juste les points" : force une partie privée, hors bande et amicale (voir Game.simple). */
  simple?: boolean;
};

type GamesState = {
  /** Parties comptées sur ce téléphone (et, une fois connecté, toutes celles du compte). */
  games: Record<string, Game>;
  /** File d'attente de synchronisation : parties modifiées pas encore envoyées au serveur. */
  pendingSync: Record<string, true>;
  /** Parties supprimées localement, à supprimer sur le serveur. */
  pendingDeletes: string[];

  createGame: (input: NewGame) => string;
  /** Nouvelle partie avec les mêmes équipes, les mêmes joueurs et le même objectif. */
  rematch: (gameId: string) => string | null;
  addRound: (gameId: string, round: NewRound) => void;
  undoLastRound: (gameId: string) => void;
  /** Arrête la partie tout de suite : l'équipe en tête gagne (match nul en cas d'égalité). */
  finishGame: (gameId: string) => void;
  /** Rouvre une partie arrêtée à la main (sans toucher aux mènes). */
  reopenGame: (gameId: string) => void;
  deleteGame: (gameId: string) => void;
  /** Change les joueurs d'une équipe (le nom suit s'il était généré automatiquement). */
  setTeamPlayers: (gameId: string, team: TeamId, players: Seat[]) => void;
  setVisibility: (gameId: string, visibility: Visibility) => void;
  /** Récit de la partie : note, lieu, photo. */
  setStory: (gameId: string, story: Partial<Pick<Game, 'note' | 'location' | 'photoPath' | 'groupId'>>) => void;

  /** Connexion : les parties hors compte deviennent celles du compte, la place "Moi" devient le joueur. */
  adoptLocalGames: (me: Seat & { kind: 'user' }) => void;
  /** Nom ou avatar d'un joueur modifié : mis à jour dans toutes les parties (et les noms d'équipe générés). */
  refreshPlayer: (seat: Seat) => void;
  /** Parties du compte venues du serveur (autre téléphone, réinstallation). Les modifs locales en attente gagnent. */
  mergeRemoteGames: (games: Game[]) => void;
  /** Déconnexion : retire du téléphone les parties du compte (elles restent sur le serveur). */
  forgetAccountGames: (ownerId: string) => void;
  markSynced: (gameId: string, updatedAt: string) => void;
  markDeleted: (gameIds: string[]) => void;
};

export function newId(): string {
  return randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

/**
 * Remplace un joueur par une nouvelle version (autre identité, nouveau nom).
 * Un nom d'équipe généré automatiquement ("Moi & Léa") suit ; un nom choisi à la main ne bouge pas.
 */
function swapPlayer(game: Game, fromId: string, to: Seat): Game {
  const next = replacePlayer(game, fromId, to);
  for (const team of ['A', 'B'] as const) {
    const fallback = team === 'A' ? 'Nous' : 'Eux';
    const before = game.teams[team];
    if (before.players.length > 0 && before.name === autoTeamName(before.players, fallback)) {
      next.teams[team] = { ...next.teams[team], name: autoTeamName(next.teams[team].players, fallback) };
    }
  }
  return next;
}

/** Recalcule l'état de fin de partie à partir des mènes. */
function withResult(game: Game): Game {
  const winner: TeamId | null = computeWinner(totalScore(game), game.targetScore);
  return {
    ...game,
    winner,
    finishedAt: winner ? (game.finishedAt ?? now()) : null,
  };
}

function buildGame({
  teamA,
  teamB,
  targetScore,
  ownerId,
  visibility = 'friends',
  groupId = null,
  ranked = false,
  simple = false,
}: NewGame): Game {
  const createdAt = now();
  // "Juste les points" : noms de la v1.0 ("Nous" / "Eux") plutôt que le prénom de l'auteur.
  const name = (team: NewTeam, fallback: string) => team.name.trim() || (simple ? fallback : autoTeamName(team.players, fallback));
  return {
    id: newId(),
    ownerId,
    teams: {
      A: { name: name(teamA, 'Nous'), players: teamA.players },
      B: { name: name(teamB, 'Eux'), players: teamB.players },
    },
    targetScore,
    rounds: [],
    visibility: simple ? 'private' : visibility,
    groupId: simple ? null : groupId,
    ranked: simple ? false : ranked,
    ...(simple ? { simple } : {}),
    createdAt,
    updatedAt: createdAt,
    finishedAt: null,
    winner: null,
  };
}

export const useGames = create<GamesState>()(
  persist(
    (set, get) => {
      /** Applique une modification à une partie : date de modif à jour et partie mise en file de synchro. */
      function update(gameId: string, change: (game: Game) => Game | null) {
        set((s) => {
          const game = s.games[gameId];
          if (!game) return s;
          const next = change(game);
          if (!next) return s;
          return {
            games: { ...s.games, [gameId]: { ...next, updatedAt: now() } },
            pendingSync: { ...s.pendingSync, [gameId]: true },
          };
        });
      }

      return {
        games: {},
        pendingSync: {},
        pendingDeletes: [],

        createGame: (input) => {
          const game = buildGame(input);
          set((s) => ({
            games: { ...s.games, [game.id]: game },
            pendingSync: { ...s.pendingSync, [game.id]: true },
          }));
          return game.id;
        },

        rematch: (gameId) => {
          const previous = get().games[gameId];
          if (!previous) return null;
          return get().createGame({
            teamA: previous.teams.A,
            teamB: previous.teams.B,
            targetScore: previous.targetScore,
            ownerId: previous.ownerId,
            visibility: previous.visibility,
            groupId: previous.groupId,
            ranked: previous.ranked,
            simple: previous.simple,
          });
        },

        addRound: (gameId, round) =>
          update(gameId, (game) => {
            if (game.finishedAt) return null;
            const rounds = [...game.rounds, { ...round, id: newId(), createdAt: now() }];
            return withResult({ ...game, rounds });
          }),

        undoLastRound: (gameId) =>
          update(gameId, (game) => {
            if (game.rounds.length === 0) return null;
            return withResult({ ...game, rounds: game.rounds.slice(0, -1), finishedAt: null });
          }),

        finishGame: (gameId) =>
          update(gameId, (game) => {
            if (game.finishedAt) return null;
            return { ...game, winner: leader(game), finishedAt: now() };
          }),

        reopenGame: (gameId) =>
          update(gameId, (game) => {
            if (!isStoppedEarly(game)) return null;
            return { ...game, winner: null, finishedAt: null };
          }),

        deleteGame: (gameId) =>
          set((s) => {
            const game = s.games[gameId];
            const { [gameId]: _removed, ...games } = s.games;
            const { [gameId]: _pending, ...pendingSync } = s.pendingSync;
            // Une partie jamais rattachée à un compte n'existe pas sur le serveur.
            const pendingDeletes = game?.ownerId ? [...s.pendingDeletes, gameId] : s.pendingDeletes;
            return { games, pendingSync, pendingDeletes };
          }),

        setTeamPlayers: (gameId, team, players) =>
          update(gameId, (game) => {
            const current = game.teams[team];
            const fallback = team === 'A' ? 'Nous' : 'Eux';
            const wasAuto = current.name === autoTeamName(current.players, fallback);
            const kept = new Set(players.map((p) => p.id));
            return {
              ...game,
              teams: {
                ...game.teams,
                [team]: { name: wasAuto ? autoTeamName(players, fallback) : current.name, players },
              },
              // Un preneur qui n'est plus à la table redevient anonyme.
              rounds: game.rounds.map((r) =>
                r.bidder === team && r.takerId && !kept.has(r.takerId) ? { ...r, takerId: null } : r,
              ),
            };
          }),

        setVisibility: (gameId, visibility) => update(gameId, (game) => ({ ...game, visibility })),

        setStory: (gameId, story) => update(gameId, (game) => ({ ...game, ...story })),

        adoptLocalGames: (me) =>
          set((s) => {
            const games = { ...s.games };
            const pendingSync = { ...s.pendingSync };
            for (const game of Object.values(s.games)) {
              if (game.ownerId !== null) continue;
              games[game.id] = swapPlayer({ ...game, ownerId: me.id }, LOCAL_PLAYER_ID, me);
              pendingSync[game.id] = true;
            }
            return { games, pendingSync };
          }),

        refreshPlayer: (seat) =>
          set((s) => {
            const games = { ...s.games };
            const pendingSync = { ...s.pendingSync };
            for (const game of Object.values(s.games)) {
              const updated = swapPlayer(game, seat.id, seat);
              if (JSON.stringify(updated.teams) === JSON.stringify(game.teams)) continue;
              games[game.id] = { ...updated, updatedAt: now() };
              pendingSync[game.id] = true;
            }
            return { games, pendingSync };
          }),

        mergeRemoteGames: (remote) =>
          set((s) => {
            const games = { ...s.games };
            for (const game of remote) {
              const local = games[game.id];
              if (s.pendingDeletes.includes(game.id)) continue;
              if (local && (s.pendingSync[game.id] || local.updatedAt >= game.updatedAt)) continue;
              games[game.id] = game;
            }
            return { games };
          }),

        forgetAccountGames: (ownerId) =>
          set((s) => {
            const games: Record<string, Game> = {};
            const pendingSync: Record<string, true> = {};
            for (const game of Object.values(s.games)) {
              if (game.ownerId === ownerId) continue;
              games[game.id] = game;
              if (s.pendingSync[game.id]) pendingSync[game.id] = true;
            }
            return { games, pendingSync, pendingDeletes: [] };
          }),

        markSynced: (gameId, updatedAt) =>
          set((s) => {
            // Modifiée pendant l'envoi : elle reste en file pour le prochain passage.
            if (!s.pendingSync[gameId] || s.games[gameId]?.updatedAt !== updatedAt) return s;
            const { [gameId]: _synced, ...pendingSync } = s.pendingSync;
            return { pendingSync };
          }),

        markDeleted: (gameIds) =>
          set((s) => ({ pendingDeletes: s.pendingDeletes.filter((id) => !gameIds.includes(id)) })),
      };
    },
    {
      name: 'coinche-games',
      storage: createJSONStorage(() => AsyncStorage),
      version: STORE_VERSION,
      migrate: (persisted, version) => migrateGamesState(persisted, version, newId) as GamesState,
    },
  ),
);

export function useGame(gameId: string | undefined): Game | undefined {
  return useGames((s) => (gameId ? s.games[gameId] : undefined));
}

/** Parties triées de la plus récente à la plus ancienne. */
export function sortGames(games: Record<string, Game> | Game[]): Game[] {
  return Object.values(games).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
