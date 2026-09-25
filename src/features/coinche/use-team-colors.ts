import { Colors } from '@/constants/theme';

import type { Suit, TeamId } from './types';

/** Chaque équipe a sa couleur de carte : coeur pour l'équipe 1, pique pour l'équipe 2. */
export const TEAM_SUIT: Record<TeamId, Suit> = { A: 'hearts', B: 'spades' };

export function useTeamColors(options?: { onDark?: boolean }): Record<TeamId, string> {
  return options?.onDark ? { A: Colors.teamAOnDark, B: Colors.teamBOnDark } : { A: Colors.teamA, B: Colors.teamB };
}
