import type { TeamId } from '@/features/coinche/types';

/**
 * Cote Elo de la coinche. Même formule que try_rate_game côté base (migration ranked_games) :
 * toute modification se reporte des deux côtés.
 *
 * - Chacun part de 1000. Une équipe vaut la moyenne de ses deux joueurs.
 * - Échelle de 800 points (400 aux échecs) : la coinche laisse beaucoup de place à la chance, une échelle
 *   standard tasse tout le monde autour de 1000. Simulé : l'écart type des cotes double à peu près.
 * - K = 96 sur les 10 premières parties classées (on trouve vite son niveau), puis 64.
 * - L'écart de score compte : x0,5 pour une partie serrée, jusqu'à x1,5 pour une raclée (écart >= objectif).
 * - Plancher à 100 : personne ne descend plus bas.
 */
export const ELO_START = 1000;
export const ELO_SCALE = 800;
export const ELO_K_NEW = 96;
export const ELO_K = 64;
export const ELO_NEW_GAMES = 10;
export const ELO_FLOOR = 100;

/** Probabilité de victoire attendue d'une équipe cotée `team` contre `opponents`. */
export function expectedScore(team: number, opponents: number): number {
  return 1 / (1 + 10 ** ((opponents - team) / ELO_SCALE));
}

/** Poids de l'écart de score : 0,5 (égalité) à 1,5 (écart égal ou supérieur au score à atteindre). */
export function marginMultiplier(scoreA: number, scoreB: number, target: number): number {
  return 0.5 + Math.min(Math.abs(scoreA - scoreB) / Math.max(target, 1), 1);
}

export type RatedPlayer = { elo: number; games: number };

/** Nouvelle cote de chaque joueur d'une partie classée (même ordre que les équipes reçues). */
export function rateGame(
  teams: Record<TeamId, RatedPlayer[]>,
  result: { winner: TeamId | null; scoreA: number; scoreB: number; target: number },
): Record<TeamId, number[]> {
  const average = (players: RatedPlayer[]) => players.reduce((sum, p) => sum + p.elo, 0) / players.length;
  const expectedA = expectedScore(average(teams.A), average(teams.B));
  const scoreA = result.winner === 'A' ? 1 : result.winner === 'B' ? 0 : 0.5;
  const multiplier = marginMultiplier(result.scoreA, result.scoreB, result.target);
  const next = (team: TeamId) =>
    teams[team].map((p) => {
      const k = p.games < ELO_NEW_GAMES ? ELO_K_NEW : ELO_K;
      const gain = team === 'A' ? scoreA - expectedA : expectedA - scoreA;
      return Math.max(ELO_FLOOR, p.elo + Math.round(k * multiplier * gain));
    });
  return { A: next('A'), B: next('B') };
}

/** Cotes utiles pour afficher le niveau des équipes d'une liste de parties. */
export type EloSnapshot = {
  /** Cote actuelle de chaque joueur (absent : jamais classé, donc ELO_START). */
  current: Record<string, number>;
  /** Cote d'un joueur juste avant une partie classée, par `<partie>:<joueur>` (elo_history.elo_before). */
  before: Record<string, number>;
};

/**
 * Cote moyenne d'une équipe : celle d'avant la partie si elle a été classée, sinon la cote actuelle des joueurs.
 * Null si l'équipe est vide ou compte un invité (pas de cote).
 */
export function teamElo(players: { kind: 'user' | 'guest'; id: string }[], gameId: string, snapshot: EloSnapshot): number | null {
  if (players.length === 0 || players.some((p) => p.kind !== 'user')) return null;
  const elos = players.map((p) => snapshot.before[`${gameId}:${p.id}`] ?? snapshot.current[p.id] ?? ELO_START);
  return Math.round(elos.reduce((sum, elo) => sum + elo, 0) / elos.length);
}
