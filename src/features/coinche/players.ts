import type { Game, Seat, Team, TeamId } from './types';

/**
 * Identité du propriétaire du téléphone tant qu'il n'est pas connecté.
 * À la connexion, toutes les places `LOCAL_PLAYER_ID` deviennent son compte (voir `adoptLocalGames`).
 */
export const LOCAL_PLAYER_ID = 'me';

export const LOCAL_PLAYER_NAME = 'Moi';

/** Deux joueurs par équipe à la coinche. */
export const PLAYERS_PER_TEAM = 2;

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

/** "Arthur & Léa", "Arthur", ou le nom par défaut quand personne n'est identifié. */
export function autoTeamName(players: Seat[], fallback: string): string {
  // "Moi" tout seul (hors connexion) : "Nous" se lit mieux.
  if (players.length === 1 && players[0].id === LOCAL_PLAYER_ID) return fallback;
  const names = players.map((p) => firstName(p.name)).filter(Boolean);
  return names.length > 0 ? names.join(' & ') : fallback;
}

/**
 * Nom d'équipe pour les cartes de partie : un nom généré ("Arthur & Léa") passe aux noms complets
 * ("Arthur Martin & Léa Dubois"), un nom choisi à la main reste tel quel.
 */
export function teamFullName(team: Team, id: TeamId): string {
  const fallback = id === 'A' ? 'Nous' : 'Eux';
  const auto = autoTeamName(team.players, fallback);
  if (team.name !== auto || auto === fallback) return team.name;
  return team.players.map((p) => p.name.trim()).filter(Boolean).join(' & ');
}

export function allPlayers(game: Game): (Seat & { team: TeamId })[] {
  return (['A', 'B'] as const).flatMap((team) => game.teams[team].players.map((p) => ({ ...p, team })));
}

export function findPlayer(game: Game, playerId: string): Seat | undefined {
  return game.teams.A.players.find((p) => p.id === playerId) ?? game.teams.B.players.find((p) => p.id === playerId);
}

/** Remplace un joueur par un autre dans les deux équipes (et dans les preneurs des mènes). */
export function replacePlayer(game: Game, fromId: string, to: Seat): Game {
  const swap = (team: Team): Team => ({ ...team, players: team.players.map((p) => (p.id === fromId ? to : p)) });
  return {
    ...game,
    teams: { A: swap(game.teams.A), B: swap(game.teams.B) },
    rounds: game.rounds.map((r) => (r.takerId === fromId ? { ...r, takerId: to.id } : r)),
  };
}

export type RecentPlayer = { seat: Seat; games: number; lastPlayedAt: string };

/**
 * Joueurs déjà croisés, du plus fréquent au plus rare : le raccourci "habitués" du choix des joueurs.
 * Un invité et un compte ne sont jamais fusionnés, même s'ils ont le même prénom.
 */
export function recentPlayers(games: Game[], excludeIds: string[] = []): RecentPlayer[] {
  const byId = new Map<string, RecentPlayer>();
  for (const game of games) {
    for (const seat of [...game.teams.A.players, ...game.teams.B.players]) {
      if (excludeIds.includes(seat.id)) continue;
      const known = byId.get(seat.id);
      if (!known) {
        byId.set(seat.id, { seat, games: 1, lastPlayedAt: game.createdAt });
      } else {
        known.games += 1;
        // Garde le nom / l'avatar le plus récent.
        if (game.createdAt > known.lastPlayedAt) {
          known.seat = seat;
          known.lastPlayedAt = game.createdAt;
        }
      }
    }
  }
  return [...byId.values()].sort((a, b) => b.games - a.games || b.lastPlayedAt.localeCompare(a.lastPlayedAt));
}

export type TeamPlayers = Record<TeamId, Seat[]>;

/**
 * Assoit un joueur (ou libère la place avec null). Un joueur déjà assis ailleurs change de place :
 * on ne peut pas être deux fois à la même table.
 */
export function placePlayer(teams: TeamPlayers, team: TeamId, slot: number, seat: Seat | null): TeamPlayers {
  const without = (players: Seat[]) => (seat ? players.filter((p) => p.id !== seat.id) : players);
  const next: TeamPlayers = { A: [...teams.A], B: [...teams.B] };
  const current = next[team][slot];
  next.A = without(next.A);
  next.B = without(next.B);
  const target = next[team];
  // L'ancien occupant de la place (s'il n'est pas le joueur déplacé) est retiré.
  const index = current ? target.findIndex((p) => p.id === current.id) : -1;
  if (seat === null) {
    if (index >= 0) target.splice(index, 1);
  } else if (index >= 0) {
    target[index] = seat;
  } else if (target.length < PLAYERS_PER_TEAM) {
    target.splice(Math.min(slot, target.length), 0, seat);
  } else {
    target[Math.min(slot, PLAYERS_PER_TEAM - 1)] = seat;
  }
  return next;
}
