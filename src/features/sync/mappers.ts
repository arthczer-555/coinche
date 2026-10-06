import { totalScore } from '@/features/coinche/scoring';
import type { Game, Round, Seat, TeamId, Visibility } from '@/features/coinche/types';
import type { Database } from '@/lib/database.types';

type Tables = Database['public']['Tables'];

/** Colonnes lues pour afficher une partie avec ses joueurs. */
export const GAME_SELECT =
  '*, players:game_players(seat, team, profile_id, guest_id, guest_name, status, profile:profiles(id, username, display_name, avatar_url))';

/** Une partie du fil : joueurs, auteur, nombre de bravos et de commentaires. */
export const FEED_SELECT = `${GAME_SELECT}, owner:profiles!games_owner_id_fkey(id, username, display_name, avatar_url), kudos(count), comments(count)`;

export type PlayerRow = Pick<
  Tables['game_players']['Row'],
  'seat' | 'team' | 'profile_id' | 'guest_id' | 'guest_name' | 'status'
> & {
  profile: Pick<Tables['profiles']['Row'], 'id' | 'username' | 'display_name' | 'avatar_url'> | null;
};

export type GameRow = Tables['games']['Row'] & { players: PlayerRow[] };

export type FeedRow = GameRow & {
  owner: PlayerRow['profile'];
  kudos: { count: number }[];
  comments: { count: number }[];
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

/** Place en base : 0-1 pour l'équipe A, 2-3 pour l'équipe B. */
export function seatNumber(team: TeamId, index: number): number {
  return (team === 'A' ? 0 : 2) + index;
}

export function gameToRow(game: Game, ownerId: string): Tables['games']['Insert'] {
  const score = totalScore(game);
  return {
    id: game.id,
    owner_id: ownerId,
    team_a_name: game.teams.A.name,
    team_b_name: game.teams.B.name,
    target_score: game.targetScore,
    rounds: game.rounds,
    score_a: score.A,
    score_b: score.B,
    winner: game.winner,
    visibility: game.visibility,
    note: game.note ?? null,
    location_name: game.location ?? null,
    photo_path: game.photoPath ?? null,
    group_id: game.groupId ?? null,
    ranked: game.ranked ?? false,
    // Envoyé seulement s'il est vrai : une base sans la migration `simple_games` accepte toujours les autres parties.
    ...(game.simple ? { simple: true } : {}),
    created_at: game.createdAt,
    updated_at: game.updatedAt,
    finished_at: game.finishedAt,
  };
}

/** Places à envoyer. Les identités locales ("me" hors connexion) ne partent jamais. */
export function gameToPlayerRows(game: Game): Tables['game_players']['Insert'][] {
  return (['A', 'B'] as const).flatMap((team) =>
    game.teams[team].players.flatMap((player, index): Tables['game_players']['Insert'][] => {
      if (!isUuid(player.id)) return [];
      const base = { game_id: game.id, seat: seatNumber(team, index), team };
      return player.kind === 'user'
        ? [{ ...base, profile_id: player.id, guest_id: null, guest_name: null }]
        : [{ ...base, profile_id: null, guest_id: player.id, guest_name: player.name }];
    }),
  );
}

function rowToSeat(row: PlayerRow): Seat | null {
  if (row.profile) {
    return {
      kind: 'user',
      id: row.profile.id,
      name: row.profile.display_name,
      username: row.profile.username,
      avatarUrl: row.profile.avatar_url,
    };
  }
  if (row.guest_id) return { kind: 'guest', id: row.guest_id, name: row.guest_name ?? 'Invité' };
  return null;
}

/** Postgres renvoie "…+00:00" : on revient au format de l'app ("…Z") pour comparer les dates en texte. */
function iso(value: string): string {
  return new Date(value).toISOString();
}

function parseRounds(value: unknown): Round[] {
  return Array.isArray(value) ? (value as Round[]) : [];
}

/** Partie serveur vers le modèle de l'app. Les joueurs qui ont refusé la partie n'y figurent plus. */
export function rowToGame(row: GameRow): Game {
  const players = [...(row.players ?? [])].sort((a, b) => a.seat - b.seat).filter((p) => p.status !== 'declined');
  const team = (id: TeamId) => players.filter((p) => p.team === id).flatMap((p) => rowToSeat(p) ?? []);
  return {
    id: row.id,
    ownerId: row.owner_id,
    teams: {
      A: { name: row.team_a_name, players: team('A') },
      B: { name: row.team_b_name, players: team('B') },
    },
    targetScore: row.target_score,
    rounds: parseRounds(row.rounds),
    visibility: row.visibility as Visibility,
    note: row.note,
    location: row.location_name,
    photoPath: row.photo_path,
    groupId: row.group_id,
    ranked: row.ranked,
    ...(row.simple ? { simple: true } : {}),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    finishedAt: row.finished_at ? iso(row.finished_at) : null,
    winner: row.winner === 'A' || row.winner === 'B' ? row.winner : null,
  };
}
