import {
  isFinished,
  isStoppedEarly,
  otherTeam,
  roundWinner,
  scoreHistory,
  scoreRound,
  teamOf,
  totalScore,
} from '@/features/coinche/scoring';
import type { Game } from '@/features/coinche/types';

import { playerStats } from './player-stats';

export type GameRecord = { value: number; gameId: string };

export type PlayerRecords = {
  /** Plus gros retard remonté dans une partie gagnée. */
  biggestComeback: GameRecord | null;
  /** Partie gagnée (objectif atteint) avec le moins de mènes. */
  quickestWin: GameRecord | null;
  /** Plus gros gain de son équipe sur une mène. */
  bestRound: GameRecord | null;
  /** Plus gros score final de son équipe. */
  highestScore: GameRecord | null;
  /** Victoires sans que l'adversaire marque un point ("mettre fanny"). */
  fannies: number;
};

function better(current: GameRecord | null, value: number, gameId: string, higherIsBetter = true): GameRecord {
  if (!current) return { value, gameId };
  const wins = higherIsBetter ? value > current.value : value < current.value;
  return wins ? { value, gameId } : current;
}

/** Records d'un joueur sur les parties où il était assis. */
export function playerRecords(games: Game[], playerId: string): PlayerRecords {
  const records: PlayerRecords = { biggestComeback: null, quickestWin: null, bestRound: null, highestScore: null, fannies: 0 };
  for (const game of games) {
    const team = teamOf(game, playerId);
    if (!team) continue;
    const other = otherTeam(team);
    const final = totalScore(game);

    for (const round of game.rounds) {
      const points = scoreRound(round)[team];
      if (points > 0) records.bestRound = better(records.bestRound, points, game.id);
    }
    if (!isFinished(game)) continue;
    records.highestScore = better(records.highestScore, final[team], game.id);
    if (game.winner !== team) continue;

    const deficit = Math.max(0, ...scoreHistory(game).map((s) => s[other] - s[team]));
    if (deficit > 0) records.biggestComeback = better(records.biggestComeback, deficit, game.id);
    if (!isStoppedEarly(game)) records.quickestWin = better(records.quickestWin, game.rounds.length, game.id, false);
    if (final[other] === 0) records.fannies += 1;
  }
  return records;
}

export type Badge = {
  id: string;
  label: string;
  description: string;
  earned: boolean;
  /** Avancement vers le badge (0 à 1), pour les badges à paliers. */
  progress: number;
};

type Facts = {
  games: number;
  wins: number;
  bestWinStreak: number;
  capots: number;
  generales: number;
  surcoinchesWon: number;
  contractsMade: number;
  comeback: number;
  fannies: number;
  places: number;
  bestDuo: number;
};

function facts(games: Game[], playerId: string): Facts {
  const played = games.filter((g) => teamOf(g, playerId) !== null);
  const stats = playerStats(played, playerId);
  const records = playerRecords(played, playerId);
  let generales = 0;
  let surcoinchesWon = 0;
  const places = new Set<string>();
  for (const game of played) {
    const team = teamOf(game, playerId)!;
    if (game.location) places.add(game.location.trim().toLowerCase());
    for (const round of game.rounds) {
      if (round.bidder === team && round.made && round.bid === 'generale') generales += 1;
      if (round.coinche === 'surcoinche' && roundWinner(round) === team) surcoinchesWon += 1;
    }
  }
  return {
    games: stats.games,
    wins: stats.wins,
    bestWinStreak: stats.bestWinStreak,
    capots: stats.capots,
    generales,
    surcoinchesWon,
    contractsMade: stats.contractsMade,
    comeback: records.biggestComeback?.value ?? 0,
    fannies: records.fannies,
    places: places.size,
    bestDuo: stats.partners[0]?.games ?? 0,
  };
}

type BadgeRule = { id: string; label: string; description: string; value: (f: Facts) => number; goal: number };

/** Catalogue des badges, dans l'ordre d'affichage. */
export const BADGES: BadgeRule[] = [
  { id: 'first-game', label: 'Première donne', description: 'Jouer sa première partie', value: (f) => f.games, goal: 1 },
  { id: 'regular', label: 'Habitué', description: 'Jouer 10 parties', value: (f) => f.games, goal: 10 },
  { id: 'pillar', label: 'Pilier de bistrot', description: 'Jouer 50 parties', value: (f) => f.games, goal: 50 },
  { id: 'legend', label: 'Légende', description: 'Jouer 100 parties', value: (f) => f.games, goal: 100 },
  { id: 'capot', label: 'Capot !', description: 'Réussir un capot', value: (f) => f.capots, goal: 1 },
  { id: 'generale', label: 'Générale', description: 'Réussir une générale', value: (f) => f.generales, goal: 1 },
  { id: 'surcoinche', label: 'Sang-froid', description: 'Gagner une mène surcoinchée', value: (f) => f.surcoinchesWon, goal: 1 },
  { id: 'streak-3', label: 'En forme', description: 'Gagner 3 parties d’affilée', value: (f) => f.bestWinStreak, goal: 3 },
  { id: 'streak-5', label: 'Intouchable', description: 'Gagner 5 parties d’affilée', value: (f) => f.bestWinStreak, goal: 5 },
  { id: 'remontada', label: 'Remontada', description: 'Gagner après avoir été mené de 500 points', value: (f) => f.comeback, goal: 500 },
  { id: 'fanny', label: 'Fanny', description: 'Gagner sans que l’adversaire marque un point', value: (f) => f.fannies, goal: 1 },
  { id: 'taker', label: 'Preneur', description: 'Réussir 10 contrats avec son équipe', value: (f) => f.contractsMade, goal: 10 },
  { id: 'globetrotter', label: 'Globe-trotter', description: 'Jouer dans 5 lieux différents', value: (f) => f.places, goal: 5 },
  { id: 'duo', label: 'Binôme de choc', description: 'Jouer 20 parties avec le même partenaire', value: (f) => f.bestDuo, goal: 20 },
];

export function playerBadges(games: Game[], playerId: string): Badge[] {
  const f = facts(games, playerId);
  return BADGES.map((rule) => {
    const value = rule.value(f);
    return {
      id: rule.id,
      label: rule.label,
      description: rule.description,
      earned: value >= rule.goal,
      progress: Math.min(value / rule.goal, 1),
    };
  });
}
