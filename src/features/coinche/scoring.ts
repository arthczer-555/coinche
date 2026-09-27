import type { Bid, Coinche, Game, Round, Score, TeamId } from './types';

/** Annonces proposées à la saisie. La générale est un capot réalisé par un seul joueur. */
export const BID_VALUES: Bid[] = [80, 90, 100, 110, 120, 130, 140, 150, 160, 'capot', 'generale'];
export const CAPOT_POINTS = 250;
export const GENERALE_POINTS = 500;
export const CHUTE_POINTS = 160;
export const TARGET_PRESETS = [1000, 1500, 2000];

export const COINCHE_MULTIPLIER: Record<Coinche, number> = {
  none: 1,
  coinche: 2,
  surcoinche: 4,
};

/** Équipe du joueur : l'équipe 1 (« Nous ») tant qu'il n'y a pas de comptes. */
export const MY_TEAM: TeamId = 'A';

export function otherTeam(team: TeamId): TeamId {
  return team === 'A' ? 'B' : 'A';
}

export function bidPoints(bid: Bid): number {
  if (bid === 'capot') return CAPOT_POINTS;
  if (bid === 'generale') return GENERALE_POINTS;
  return bid;
}

export function formatBid(bid: Bid): string {
  if (bid === 'capot') return 'Capot';
  if (bid === 'generale') return 'Générale';
  return String(bid);
}

export type RoundInput = Pick<Round, 'bidder' | 'bid' | 'coinche' | 'made'>;

/**
 * Points marqués par chaque équipe sur une mène.
 * - Contrat fait : l'équipe preneuse marque son annonce (x2 coinché, x4 surcoinché).
 * - Contrat chuté : la défense marque 160 (320 coinché, 640 surcoinché).
 * - Pas de belote-rebelote.
 */
export function scoreRound(round: RoundInput): Score {
  const score: Score = { A: 0, B: 0 };
  const multiplier = COINCHE_MULTIPLIER[round.coinche];

  if (round.made) {
    score[round.bidder] += bidPoints(round.bid) * multiplier;
  } else {
    score[otherTeam(round.bidder)] += CHUTE_POINTS * multiplier;
  }

  return score;
}

/** Score cumulé après chaque mène, en commençant à 0-0 (utile pour le graphique). */
export function scoreHistory(game: Game): Score[] {
  const history: Score[] = [{ A: 0, B: 0 }];
  for (const round of game.rounds) {
    const previous = history[history.length - 1];
    const s = scoreRound(round);
    history.push({ A: previous.A + s.A, B: previous.B + s.B });
  }
  return history;
}

export function totalScore(game: Game): Score {
  const history = scoreHistory(game);
  return history[history.length - 1];
}

/**
 * Gagnant de la partie : la première équipe à atteindre l'objectif.
 * Si les deux le dépassent sur la même mène, le plus gros score gagne.
 * En cas d'égalité au-dessus de l'objectif, on continue à jouer.
 */
export function computeWinner(score: Score, targetScore: number): TeamId | null {
  const aReached = score.A >= targetScore;
  const bReached = score.B >= targetScore;
  if (!aReached && !bReached) return null;
  if (score.A === score.B) return null;
  return score.A > score.B ? 'A' : 'B';
}

/** Une partie est terminée dès qu'elle a une date de fin (objectif atteint ou arrêtée à la main). */
export function isFinished(game: Game): boolean {
  return game.finishedAt !== null;
}

/** Partie arrêtée avant qu'une équipe n'atteigne l'objectif. */
export function isStoppedEarly(game: Game): boolean {
  return isFinished(game) && computeWinner(totalScore(game), game.targetScore) === null;
}

/** Équipe en tête, ou null en cas d'égalité. */
export function leader(game: Game): TeamId | null {
  const score = totalScore(game);
  if (score.A === score.B) return null;
  return score.A > score.B ? 'A' : 'B';
}

/** Équipe qui remporte la mène : le preneur s'il fait son contrat, la défense sinon. */
export function roundWinner(round: Pick<Round, 'bidder' | 'made'>): TeamId {
  return round.made ? round.bidder : otherTeam(round.bidder);
}

export function percent(part: number, total: number): string {
  return `${total ? Math.round((part / total) * 100) : 0}%`;
}

export type GameStats = {
  rounds: number;
  /** Mènes remportées par chaque équipe. */
  roundsWon: Score;
  contractsMade: number;
  coinches: number;
  /** Capots et générales réussis par mon équipe (MY_TEAM). */
  capots: number;
  /** Plus gros gain d'une équipe sur une seule mène. */
  bestRound: number;
};

export function gameStats(game: Game): GameStats {
  return {
    rounds: game.rounds.length,
    roundsWon: {
      A: game.rounds.filter((r) => roundWinner(r) === 'A').length,
      B: game.rounds.filter((r) => roundWinner(r) === 'B').length,
    },
    contractsMade: game.rounds.filter((r) => r.made).length,
    coinches: game.rounds.filter((r) => r.coinche !== 'none').length,
    capots: game.rounds.filter(
      (r) => r.bidder === MY_TEAM && r.made && (r.bid === 'capot' || r.bid === 'generale'),
    ).length,
    bestRound: game.rounds.reduce((best, r) => {
      const s = scoreRound(r);
      return Math.max(best, s.A, s.B);
    }, 0),
  };
}
