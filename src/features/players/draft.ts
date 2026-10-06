import { router } from 'expo-router';
import { create } from 'zustand';

import { LOCAL_SEAT } from '@/features/auth/session';
import { LOCAL_PLAYER_ID, placePlayer, type TeamPlayers } from '@/features/coinche/players';
import { useGames } from '@/features/coinche/store';
import type { Seat, TeamId } from '@/features/coinche/types';

/**
 * Joueurs de la nouvelle partie en préparation (écran Jouer), partagés avec l'écran de choix d'un joueur.
 * "Moi" y est toujours stocké sous l'identité locale : il devient le compte connecté au lancement.
 */
type DraftState = {
  teams: TeamPlayers;
  setTeams: (teams: TeamPlayers) => void;
  reset: () => void;
};

const INITIAL: TeamPlayers = { A: [LOCAL_SEAT], B: [] };

export const useDraftPlayers = create<DraftState>((set) => ({
  teams: INITIAL,
  setTeams: (teams) => set({ teams }),
  reset: () => set({ teams: INITIAL }),
}));

/** Remplace la place "Moi" par le joueur connecté (ou l'identité locale). */
export function resolveMe(seat: Seat, me: Seat): Seat {
  return seat.id === LOCAL_PLAYER_ID ? me : seat;
}

/** Où va le joueur choisi : la partie en préparation, ou une partie existante. */
export type PickTarget = { team: TeamId; slot: number; gameId?: string };

export function currentTeams(target: PickTarget): TeamPlayers {
  if (!target.gameId) return useDraftPlayers.getState().teams;
  const game = useGames.getState().games[target.gameId];
  return game ? { A: game.teams.A.players, B: game.teams.B.players } : { A: [], B: [] };
}

export function applyPick(target: PickTarget, seat: Seat | null) {
  const teams = placePlayer(currentTeams(target), target.team, target.slot, seat);
  if (!target.gameId) {
    useDraftPlayers.getState().setTeams(teams);
    return;
  }
  const { setTeamPlayers } = useGames.getState();
  setTeamPlayers(target.gameId, 'A', teams.A);
  setTeamPlayers(target.gameId, 'B', teams.B);
}

export function openPicker(target: PickTarget) {
  router.push({
    pathname: '/players/pick',
    params: { team: target.team, slot: String(target.slot), ...(target.gameId ? { gameId: target.gameId } : {}) },
  });
}

export function parsePickTarget(params: { team?: string; slot?: string; gameId?: string }): PickTarget {
  return {
    team: params.team === 'B' ? 'B' : 'A',
    slot: Number.parseInt(params.slot ?? '0', 10) || 0,
    gameId: params.gameId || undefined,
  };
}
