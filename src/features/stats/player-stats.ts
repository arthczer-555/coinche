import { gameStats, isFinished, teamOf } from '@/features/coinche/scoring';
import type { Game, Round, Seat } from '@/features/coinche/types';

export type PartnerStats = { seat: Seat; games: number; wins: number };

export type PlayerStats = {
  games: number;
  finished: number;
  wins: number;
  rounds: number;
  roundsWon: number;
  coinches: number;
  /** Capots et générales réussis par l'équipe du joueur. */
  capots: number;
  /** Contrats pris par l'équipe du joueur, et ceux qu'elle a réussis. */
  contractsTaken: number;
  contractsMade: number;
  /** Victoires (>0) ou défaites (<0) d'affilée sur les dernières parties terminées. */
  streak: number;
  bestWinStreak: number;
  /** Résultats des 5 dernières parties terminées, de la plus récente à la plus ancienne. */
  form: ('W' | 'L' | 'D')[];
  /** Partenaires, du plus fréquent au plus rare. */
  partners: PartnerStats[];
};

/** Stats d'un joueur sur les parties où il était assis. `games` doit être triées de la plus récente à la plus ancienne. */
export function playerStats(games: Game[], playerId: string): PlayerStats {
  const played = games.filter((g) => teamOf(g, playerId) !== null);
  const finished = played.filter(isFinished);
  const partners = new Map<string, PartnerStats>();

  let rounds = 0;
  let roundsWon = 0;
  let coinches = 0;
  let capots = 0;
  let contractsTaken = 0;
  let contractsMade = 0;

  for (const game of played) {
    const team = teamOf(game, playerId)!;
    const stats = gameStats(game, team);
    rounds += stats.rounds;
    roundsWon += stats.roundsWon[team];
    coinches += stats.coinches;
    capots += stats.capots;
    for (const round of game.rounds) {
      if (round.bidder !== team) continue;
      contractsTaken += 1;
      if (round.made) contractsMade += 1;
    }
    for (const partner of game.teams[team].players) {
      if (partner.id === playerId) continue;
      const known = partners.get(partner.id) ?? { seat: partner, games: 0, wins: 0 };
      known.games += 1;
      if (game.winner === team) known.wins += 1;
      partners.set(partner.id, known);
    }
  }

  const results = finished.map((g): 'W' | 'L' | 'D' => {
    if (!g.winner) return 'D';
    return g.winner === teamOf(g, playerId) ? 'W' : 'L';
  });

  let streak = 0;
  for (const result of results) {
    if (result === 'D') break;
    const sign = result === 'W' ? 1 : -1;
    if (streak !== 0 && Math.sign(streak) !== sign) break;
    streak += sign;
  }

  let bestWinStreak = 0;
  let current = 0;
  for (const result of results) {
    current = result === 'W' ? current + 1 : 0;
    bestWinStreak = Math.max(bestWinStreak, current);
  }

  return {
    games: played.length,
    finished: finished.length,
    wins: results.filter((r) => r === 'W').length,
    rounds,
    roundsWon,
    coinches,
    capots,
    contractsTaken,
    contractsMade,
    streak,
    bestWinStreak,
    form: results.slice(0, 5),
    partners: [...partners.values()].sort((a, b) => b.games - a.games || b.wins - a.wins),
  };
}

/** Bilan d'une partie pour un joueur : "Victoire", "Défaite", "Nul", ou null s'il n'y jouait pas. */
export function resultFor(game: Game, playerId: string): 'W' | 'L' | 'D' | null {
  const team = teamOf(game, playerId);
  if (!team || !isFinished(game)) return null;
  if (!game.winner) return 'D';
  return game.winner === team ? 'W' : 'L';
}

export type WeekActivity = { weekStart: string; games: number };

/** Parties par semaine (lundi), sur les `weeks` dernières semaines, de la plus ancienne à la plus récente. */
export function weeklyActivity(games: Game[], playerId: string, weeks = 12, now = new Date()): WeekActivity[] {
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const starts = Array.from({ length: weeks }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() - (weeks - 1 - i) * 7);
    return d;
  });
  const counts = starts.map(() => 0);
  for (const game of games) {
    if (teamOf(game, playerId) === null) continue;
    const at = new Date(game.createdAt).getTime();
    for (let i = starts.length - 1; i >= 0; i -= 1) {
      if (at >= starts[i].getTime()) {
        const end = starts[i].getTime() + 7 * 24 * 3600 * 1000;
        if (at < end) counts[i] += 1;
        break;
      }
    }
  }
  return starts.map((d, i) => ({ weekStart: d.toISOString(), games: counts[i] }));
}

export type ContractBucket = { label: string; taken: number; made: number };

const BUCKETS: { label: string; match: (bid: Round['bid']) => boolean }[] = [
  { label: '80-90', match: (b) => typeof b === 'number' && b <= 90 },
  { label: '100-110', match: (b) => typeof b === 'number' && b >= 100 && b <= 110 },
  { label: '120-130', match: (b) => typeof b === 'number' && b >= 120 && b <= 130 },
  { label: '140-160', match: (b) => typeof b === 'number' && b >= 140 },
  { label: 'Capot', match: (b) => b === 'capot' || b === 'generale' },
];

/** Réussite des contrats pris par l'équipe du joueur, par hauteur d'annonce. */
export function contractRates(games: Game[], playerId: string): ContractBucket[] {
  const buckets = BUCKETS.map((b) => ({ label: b.label, taken: 0, made: 0 }));
  for (const game of games) {
    const team = teamOf(game, playerId);
    if (!team) continue;
    for (const round of game.rounds) {
      if (round.bidder !== team) continue;
      const index = BUCKETS.findIndex((b) => b.match(round.bid));
      if (index < 0) continue;
      buckets[index].taken += 1;
      if (round.made) buckets[index].made += 1;
    }
  }
  return buckets;
}

export type HeadToHead = { together: { games: number; wins: number }; against: { games: number; wins: number } };

/** Bilan de `playerId` avec et contre `otherId`, sur les parties terminées où les deux jouaient. */
export function headToHead(games: Game[], playerId: string, otherId: string): HeadToHead {
  const result: HeadToHead = { together: { games: 0, wins: 0 }, against: { games: 0, wins: 0 } };
  for (const game of games) {
    const mine = teamOf(game, playerId);
    const theirs = teamOf(game, otherId);
    if (!mine || !theirs || !isFinished(game)) continue;
    const bucket = mine === theirs ? result.together : result.against;
    bucket.games += 1;
    if (game.winner === mine) bucket.wins += 1;
  }
  return result;
}
