import { firstName } from '@/features/coinche/players';
import { roundWinner, teamOf } from '@/features/coinche/scoring';
import type { Game, Seat } from '@/features/coinche/types';

import { playerStats } from './player-stats';
import { playerRecords } from './records';

export type Challenge = { id: string; label: string; value: number; goal: number; done: boolean };

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function monthName(date: Date): string {
  return MONTHS[date.getMonth()];
}

function inMonth(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

/** Défis du mois en cours (remis à zéro chaque 1er du mois). */
export function monthlyChallenges(games: Game[], playerId: string, now = new Date()): Challenge[] {
  const month = games.filter((g) => teamOf(g, playerId) !== null && inMonth(g.createdAt, now));
  const stats = playerStats(month, playerId);
  const partners = new Set(stats.partners.map((p) => p.seat.id)).size;
  let coinchesWon = 0;
  for (const game of month) {
    const team = teamOf(game, playerId)!;
    coinchesWon += game.rounds.filter((r) => r.coinche !== 'none' && roundWinner(r) === team).length;
  }
  const list: Omit<Challenge, 'done'>[] = [
    { id: 'games', label: 'Jouer 20 parties', value: stats.games, goal: 20 },
    { id: 'wins', label: 'Gagner 10 parties', value: stats.wins, goal: 10 },
    { id: 'capots', label: 'Réussir 3 capots', value: stats.capots, goal: 3 },
    { id: 'partners', label: 'Jouer avec 5 partenaires différents', value: partners, goal: 5 },
    { id: 'coinches', label: 'Gagner 5 mènes coinchées', value: coinchesWon, goal: 5 },
  ];
  return list.map((c) => ({ ...c, value: Math.min(c.value, c.goal), done: c.value >= c.goal }));
}

export type YearRecap = {
  year: number;
  games: number;
  wins: number;
  rounds: number;
  capots: number;
  coinches: number;
  bestPartner: { seat: Seat; games: number; wins: number } | null;
  favoritePlace: string | null;
  busiestMonth: { name: string; games: number } | null;
  biggestComeback: number | null;
  bestWinStreak: number;
};

/** "Ma saison de coinche" : le bilan d'une année. `games` triées de la plus récente à la plus ancienne. */
export function yearRecap(games: Game[], playerId: string, year: number): YearRecap {
  const played = games.filter((g) => teamOf(g, playerId) !== null && new Date(g.createdAt).getFullYear() === year);
  const stats = playerStats(played, playerId);
  const records = playerRecords(played, playerId);

  const places = new Map<string, number>();
  const months = new Array<number>(12).fill(0);
  for (const game of played) {
    months[new Date(game.createdAt).getMonth()] += 1;
    if (game.location) places.set(game.location, (places.get(game.location) ?? 0) + 1);
  }
  const favoritePlace = [...places.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const busiestIndex = months.indexOf(Math.max(...months));

  return {
    year,
    games: stats.games,
    wins: stats.wins,
    rounds: stats.rounds,
    capots: stats.capots,
    coinches: stats.coinches,
    bestPartner: stats.partners[0] ?? null,
    favoritePlace,
    busiestMonth: months[busiestIndex] > 0 ? { name: MONTHS[busiestIndex], games: months[busiestIndex] } : null,
    biggestComeback: records.biggestComeback?.value ?? null,
    bestWinStreak: stats.bestWinStreak,
  };
}

/** Phrase d'accroche du récap. */
export function recapHeadline(recap: YearRecap): string {
  if (recap.games === 0) return 'Ta saison commence maintenant.';
  const rate = recap.games ? recap.wins / recap.games : 0;
  if (rate >= 0.6) return 'Une saison de patron.';
  if (recap.games >= 50) return 'Un vrai pilier de bistrot.';
  if (recap.bestPartner && recap.bestPartner.games >= 10) return `Toi et ${firstName(recap.bestPartner.seat.name)}, c’est sérieux.`;
  return 'Une belle saison de coinche.';
}

