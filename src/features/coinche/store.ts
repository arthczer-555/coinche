import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { computeWinner, isStoppedEarly, leader, totalScore } from './scoring';
import type { Game, Round, TeamId } from './types';

type NewRound = Omit<Round, 'id' | 'createdAt'>;

type NewGame = {
  teamA: string;
  teamB: string;
  targetScore: number;
};

type GamesState = {
  games: Record<string, Game>;
  createGame: (input: NewGame) => string;
  /** Nouvelle partie avec les mêmes équipes et le même objectif. */
  rematch: (gameId: string) => string | null;
  addRound: (gameId: string, round: NewRound) => void;
  undoLastRound: (gameId: string) => void;
  /** Arrête la partie tout de suite : l'équipe en tête gagne (match nul en cas d'égalité). */
  finishGame: (gameId: string) => void;
  /** Rouvre une partie arrêtée à la main (sans toucher aux mènes). */
  reopenGame: (gameId: string) => void;
  deleteGame: (gameId: string) => void;
};

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Recalcule l'état de fin de partie à partir des mènes. */
function withResult(game: Game): Game {
  const winner: TeamId | null = computeWinner(totalScore(game), game.targetScore);
  return {
    ...game,
    winner,
    finishedAt: winner ? (game.finishedAt ?? new Date().toISOString()) : null,
  };
}

function buildGame({ teamA, teamB, targetScore }: NewGame): Game {
  return {
    id: newId(),
    teams: {
      A: { name: teamA.trim() || 'Nous', playerIds: [] },
      B: { name: teamB.trim() || 'Eux', playerIds: [] },
    },
    targetScore,
    rounds: [],
    createdAt: new Date().toISOString(),
    finishedAt: null,
    winner: null,
  };
}

export const useGames = create<GamesState>()(
  persist(
    (set, get) => ({
      games: {},

      createGame: (input) => {
        const game = buildGame(input);
        set((s) => ({ games: { ...s.games, [game.id]: game } }));
        return game.id;
      },

      rematch: (gameId) => {
        const previous = get().games[gameId];
        if (!previous) return null;
        return get().createGame({
          teamA: previous.teams.A.name,
          teamB: previous.teams.B.name,
          targetScore: previous.targetScore,
        });
      },

      addRound: (gameId, round) =>
        set((s) => {
          const game = s.games[gameId];
          if (!game || game.finishedAt) return s;
          const rounds = [...game.rounds, { ...round, id: newId(), createdAt: new Date().toISOString() }];
          return { games: { ...s.games, [gameId]: withResult({ ...game, rounds }) } };
        }),

      undoLastRound: (gameId) =>
        set((s) => {
          const game = s.games[gameId];
          if (!game || game.rounds.length === 0) return s;
          const rounds = game.rounds.slice(0, -1);
          return { games: { ...s.games, [gameId]: withResult({ ...game, rounds, finishedAt: null }) } };
        }),

      finishGame: (gameId) =>
        set((s) => {
          const game = s.games[gameId];
          if (!game || game.finishedAt) return s;
          const finished: Game = { ...game, winner: leader(game), finishedAt: new Date().toISOString() };
          return { games: { ...s.games, [gameId]: finished } };
        }),

      reopenGame: (gameId) =>
        set((s) => {
          const game = s.games[gameId];
          if (!game || !isStoppedEarly(game)) return s;
          return { games: { ...s.games, [gameId]: { ...game, winner: null, finishedAt: null } } };
        }),

      deleteGame: (gameId) =>
        set((s) => {
          const { [gameId]: _removed, ...games } = s.games;
          return { games };
        }),
    }),
    {
      name: 'coinche-games',
      storage: createJSONStorage(() => AsyncStorage),
      version: 5,
      migrate: (persisted, version) => {
        const state = persisted as { games: Record<string, Game> };
        if (version < 2) {
          // v1 : pas d'atout ni de belote.
          for (const game of Object.values(state.games ?? {})) {
            game.rounds = game.rounds.map((round) => ({ ...round, belote: null }));
          }
        }
        if (version < 3) {
          // v2 : règles activables (belote, annonces) et premier donneur. La belote compte toujours désormais,
          // les annonces et la donne disparaissent. Belote ignorée si la règle était désactivée.
          for (const game of Object.values(state.games ?? {})) {
            const legacy = game as Game & { rules?: { belote: boolean }; firstDealer?: TeamId };
            const beloteCounted = legacy.rules?.belote ?? false;
            delete legacy.rules;
            delete legacy.firstDealer;
            game.rounds = game.rounds.map(({ announcements: _announcements, ...round }: Round & { announcements?: unknown }) => ({
              ...round,
              belote: beloteCounted ? round.belote : null,
            }));
          }
        }
        if (version < 5) {
          // v3 : atout saisi, v4 : atout retiré. Il revient en saisie facultative, on repart de zéro.
          for (const game of Object.values(state.games ?? {})) {
            game.rounds = game.rounds.map((round) => ({ ...round, trump: null }));
          }
        }
        return state as GamesState;
      },
    },
  ),
);

export function useGame(gameId: string | undefined): Game | undefined {
  return useGames((s) => (gameId ? s.games[gameId] : undefined));
}

/** Parties triées de la plus récente à la plus ancienne. */
export function sortGames(games: Record<string, Game>): Game[] {
  return Object.values(games).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
