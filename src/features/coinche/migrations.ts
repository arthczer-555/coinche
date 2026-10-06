import { LOCAL_PLAYER_ID, LOCAL_PLAYER_NAME } from './players';
import type { Game, Round, TeamId } from './types';

/** Version courante du store persisté `coinche-games`. */
export const STORE_VERSION = 8;

type PersistedState = {
  games: Record<string, Game>;
  pendingSync?: Record<string, true>;
  pendingDeletes?: string[];
};

/**
 * Migre l'état persisté vers la version courante. Fonction pure (le générateur d'ids est injecté)
 * pour pouvoir être testée sans module natif.
 */
export function migrateGamesState(persisted: unknown, version: number, newId: () => string): PersistedState {
  const state = persisted as PersistedState;
  state.games ??= {};

  if (version < 3) {
    // v2 : règles activables et premier donneur, annonces par mène. Tout disparaît.
    for (const game of Object.values(state.games)) {
      const legacy = game as Game & { rules?: unknown; firstDealer?: TeamId };
      delete legacy.rules;
      delete legacy.firstDealer;
      game.rounds = game.rounds.map(({ announcements: _announcements, ...round }: Round & { announcements?: unknown }) => round);
    }
  }
  if (version < 5) {
    // v3 : atout saisi, v4 : atout retiré. Il revient en saisie facultative, on repart de zéro.
    for (const game of Object.values(state.games)) {
      game.rounds = game.rounds.map((round) => ({ ...round, trump: null }));
    }
  }
  if (version < 6) {
    // v5 : belote-rebelote supprimée, ses 20 points ne comptent plus.
    for (const game of Object.values(state.games)) {
      game.rounds = game.rounds.map(({ belote: _belote, ...round }: Round & { belote?: unknown }) => round);
    }
  }
  if (version < 7) {
    // v6 : ids maison, `playerIds` toujours vides, l'équipe 1 était celle du propriétaire du téléphone.
    // v7 : ids UUID (clés primaires Supabase), joueurs identifiés, propriétaire et visibilité.
    const games: Record<string, Game> = {};
    for (const legacy of Object.values(state.games) as (Game & { teams: Record<TeamId, { playerIds?: string[] }> })[]) {
      const id = newId();
      games[id] = {
        id,
        ownerId: null,
        teams: {
          A: { name: legacy.teams.A.name, players: [{ kind: 'user', id: LOCAL_PLAYER_ID, name: LOCAL_PLAYER_NAME }] },
          B: { name: legacy.teams.B.name, players: [] },
        },
        targetScore: legacy.targetScore,
        rounds: legacy.rounds.map((round) => ({ ...round, id: newId(), takerId: null })),
        visibility: 'friends',
        createdAt: legacy.createdAt,
        updatedAt: legacy.finishedAt ?? legacy.rounds.at(-1)?.createdAt ?? legacy.createdAt,
        finishedAt: legacy.finishedAt,
        winner: legacy.winner,
      };
    }
    state.games = games;
    state.pendingSync = {};
    state.pendingDeletes = [];
  }
  if (version < 8) {
    // v7 : visibilité "abonnés" ('followers'), remplacée par "amis" ('friends') quand les abonnements sont devenus des amis.
    for (const game of Object.values(state.games)) {
      if ((game.visibility as string) === 'followers') game.visibility = 'friends';
    }
  }
  return state;
}
