import { profileToSeat } from '@/features/auth/session';
import type { Game, Seat } from '@/features/coinche/types';
import { ELO_START, type EloSnapshot, type RatedPlayer } from '@/features/stats/elo';
import { FEED_SELECT, GAME_SELECT, rowToGame, type FeedRow, type GameRow } from '@/features/sync/mappers';
import type { Database, Profile } from '@/lib/database.types';
import { requireSupabase } from '@/lib/supabase';

/** Appels serveur du social. Toujours via TanStack Query (voir queries.ts), jamais directement dans un écran. */

type NestedGame = { game: GameRow | null };

function gamesFromNested(rows: NestedGame[] | null): Game[] {
  return (rows ?? []).flatMap((row) => (row.game ? [rowToGame(row.game)] : []));
}

/** Parties du profil d'un joueur : celles où il est tagué (sauf s'il a dit "Pas moi"). */
export async function fetchPlayerGames(profileId: string): Promise<Game[]> {
  const { data, error } = await requireSupabase()
    .from('game_players')
    .select(`game:games(${GAME_SELECT})`)
    .eq('profile_id', profileId)
    .eq('status', 'accepted')
    .limit(500);
  if (error) throw error;
  return gamesFromNested(data as unknown as NestedGame[]);
}

export async function fetchGame(gameId: string): Promise<Game | null> {
  const { data, error } = await requireSupabase().from('games').select(GAME_SELECT).eq('id', gameId).maybeSingle();
  if (error) throw error;
  return data ? rowToGame(data as unknown as GameRow) : null;
}

/** "Pas moi" : je me retire d'une partie où l'on m'a tagué (elle quitte mon profil et mes stats). */
export async function declineGame(gameId: string): Promise<void> {
  const { error } = await requireSupabase().rpc('respond_to_game', { gid: gameId, accept: false });
  if (error) throw error;
}

/** Comptes qui ont dit "Pas moi" dans une partie (vu par l'auteur). */
export async function fetchDeclinedPlayers(gameId: string): Promise<string[]> {
  const { data, error } = await requireSupabase()
    .from('game_players')
    .select('profile_id')
    .eq('game_id', gameId)
    .eq('status', 'declined');
  if (error) throw error;
  return (data ?? []).flatMap((row) => (row.profile_id ? [row.profile_id] : []));
}

export async function fetchProfile(profileId: string): Promise<Profile | null> {
  const { data, error } = await requireSupabase().from('profiles').select('*').eq('id', profileId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(
  profileId: string,
  changes: Partial<Pick<Profile, 'username' | 'display_name' | 'city' | 'bio' | 'avatar_url' | 'onboarded'>>,
): Promise<Profile> {
  const { data, error } = await requireSupabase()
    .from('profiles')
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq('id', profileId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function isUsernameAvailable(username: string, myId: string): Promise<boolean> {
  const { data, error } = await requireSupabase().from('profiles').select('id').eq('username', username).maybeSingle();
  if (error) throw error;
  return !data || data.id === myId;
}

/** Comptes par nom ou pseudo (sans tenir compte des accents), pseudo exact puis amis d'abord. */
export async function searchProfiles(query: string): Promise<Profile[]> {
  const { data, error } = await requireSupabase().rpc('search_profiles', { q: query });
  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Amis (comme Facebook : une demande, acceptée par l'autre)
// ---------------------------------------------------------------------------

/** Où j'en suis avec un joueur : amis, demande envoyée, demande reçue. */
export type FriendStatus = 'friends' | 'sent' | 'received';

export type Friendship = { seat: Seat; status: FriendStatus };

const FRIENDSHIP_SELECT =
  'status, requester:profiles!friendships_requester_id_fkey(id, username, display_name, avatar_url), addressee:profiles!friendships_addressee_id_fkey(id, username, display_name, avatar_url)';

/** Mes amis et mes demandes en cours (reçues et envoyées), du plus récent au plus ancien. */
export async function fetchMyFriendships(myId: string): Promise<Friendship[]> {
  const { data, error } = await requireSupabase()
    .from('friendships')
    .select(FRIENDSHIP_SELECT)
    .or(`requester_id.eq.${myId},addressee_id.eq.${myId}`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).flatMap((row) => {
    const sentByMe = row.requester?.id === myId;
    const other = sentByMe ? row.addressee : row.requester;
    if (!other) return [];
    const status: FriendStatus = row.status === 'accepted' ? 'friends' : sentByMe ? 'sent' : 'received';
    return [{ seat: profileToSeat(other), status }];
  });
}

/** Les amis d'un joueur, du plus récent au plus ancien. */
export async function fetchFriends(profileId: string): Promise<Seat[]> {
  const { data, error } = await requireSupabase()
    .from('friendships')
    .select(FRIENDSHIP_SELECT)
    .eq('status', 'accepted')
    .or(`requester_id.eq.${profileId},addressee_id.eq.${profileId}`)
    .order('accepted_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).flatMap((row) => {
    const other = row.requester?.id === profileId ? row.addressee : row.requester;
    return other ? [profileToSeat(other)] : [];
  });
}

/** Un ami d'amis avec qui je n'ai aucun lien : "Tu les connais peut-être". */
export type FriendSuggestion = {
  seat: Seat;
  city: string | null;
  /** Nombre d'amis en commun. */
  mutual: number;
  /** Quelques-uns de ces amis en commun (noms complets), pour "Ami de Léa et Paul". */
  mutualNames: string[];
};

/** Amis de mes amis (sans lien avec moi ni blocage), du plus d'amis en commun au moins. */
export async function fetchFriendSuggestions(): Promise<FriendSuggestion[]> {
  const { data, error } = await requireSupabase().rpc('friend_suggestions', { lim: 20 });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    seat: profileToSeat(row),
    city: row.city,
    mutual: Number(row.mutual),
    mutualNames: row.mutual_names ?? [],
  }));
}

/** Envoie une demande d'ami, ou l'accepte si ce joueur m'en avait envoyé une. */
export async function addFriend(profileId: string): Promise<FriendStatus> {
  const { data, error } = await requireSupabase().rpc('add_friend', { target: profileId });
  if (error) throw error;
  return data === 'accepted' ? 'friends' : 'sent';
}

/** Refuse une demande, l'annule, ou retire un ami. */
export async function removeFriend(myId: string, profileId: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('friendships')
    .delete()
    .or(`and(requester_id.eq.${myId},addressee_id.eq.${profileId}),and(requester_id.eq.${profileId},addressee_id.eq.${myId})`);
  if (error) throw error;
}

export type GuestInvite = { guestName: string; ownerName: string; ownerUsername: string; games: number; claimed: boolean };

export async function fetchGuestInvite(guestId: string): Promise<GuestInvite | null> {
  const { data, error } = await requireSupabase().rpc('guest_invite', { gid: guestId });
  if (error) throw error;
  const row = data?.[0];
  return row
    ? {
        guestName: row.guest_name,
        ownerName: row.owner_name,
        ownerUsername: row.owner_username,
        games: Number(row.games),
        claimed: row.claimed,
      }
    : null;
}

export async function claimGuest(guestId: string): Promise<number> {
  const { data, error } = await requireSupabase().rpc('claim_guest', { gid: guestId });
  if (error) throw error;
  return data ?? 0;
}

// ---------------------------------------------------------------------------
// Fil, bravos, commentaires
// ---------------------------------------------------------------------------

export type FeedItem = {
  game: Game;
  owner: Seat | null;
  kudos: number;
  comments: number;
  iKudoed: boolean;
};

export const FEED_PAGE_SIZE = 15;

/** Une page du fil (mes parties et celles de mes amis), de la plus récente à la plus ancienne. */
export async function fetchFeed(myId: string, before: string | null): Promise<FeedItem[]> {
  const { data, error } = await requireSupabase().rpc('feed', { before, lim: FEED_PAGE_SIZE }).select(FEED_SELECT);
  if (error) throw error;
  return feedItems((data ?? []) as unknown as FeedRow[], myId);
}

async function feedItems(rows: FeedRow[], myId: string): Promise<FeedItem[]> {
  const mine = await myKudos(myId, rows.map((r) => r.id));
  return rows.map((row) => ({
    game: rowToGame(row),
    owner: row.owner ? profileToSeat(row.owner) : null,
    kudos: row.kudos[0]?.count ?? 0,
    comments: row.comments[0]?.count ?? 0,
    iKudoed: mine.has(row.id),
  }));
}

async function myKudos(myId: string, gameIds: string[]): Promise<Set<string>> {
  if (gameIds.length === 0) return new Set();
  const { data, error } = await requireSupabase()
    .from('kudos')
    .select('game_id')
    .eq('profile_id', myId)
    .in('game_id', gameIds);
  if (error) throw error;
  return new Set((data ?? []).map((k) => k.game_id));
}

export type GameSocial = { kudos: Seat[]; iKudoed: boolean; comments: number };

export async function fetchGameSocial(gameId: string, myId: string): Promise<GameSocial> {
  const sb = requireSupabase();
  const [kudos, comments] = await Promise.all([
    sb
      .from('kudos')
      .select('profile:profiles(id, username, display_name, avatar_url)')
      .eq('game_id', gameId)
      .order('created_at', { ascending: false }),
    sb.from('comments').select('*', { count: 'exact', head: true }).eq('game_id', gameId),
  ]);
  const error = kudos.error ?? comments.error;
  if (error) throw error;
  const seats = (kudos.data ?? []).flatMap((k) => (k.profile ? [profileToSeat(k.profile)] : []));
  return { kudos: seats, iKudoed: seats.some((s) => s.id === myId), comments: comments.count ?? 0 };
}

export async function setKudos(gameId: string, myId: string, on: boolean): Promise<void> {
  const sb = requireSupabase();
  const { error } = on
    ? await sb.from('kudos').upsert({ game_id: gameId, profile_id: myId }, { ignoreDuplicates: true })
    : await sb.from('kudos').delete().eq('game_id', gameId).eq('profile_id', myId);
  if (error) throw error;
}

export type Comment = { id: string; gameId: string; author: Seat; body: string; createdAt: string };

export async function fetchComments(gameId: string): Promise<Comment[]> {
  const { data, error } = await requireSupabase()
    .from('comments')
    .select('id, game_id, body, created_at, author:profiles(id, username, display_name, avatar_url)')
    .eq('game_id', gameId)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) throw error;
  return (data ?? []).flatMap((c) =>
    c.author
      ? [{ id: c.id, gameId: c.game_id, author: profileToSeat(c.author), body: c.body, createdAt: c.created_at }]
      : [],
  );
}

/** Message lisible pour une erreur de contenu refusé par la base (filtre de grossièretés). */
export function contentError(error: unknown): string {
  const message = (error as { message?: string })?.message ?? '';
  if (message.includes('check constraint')) return 'Ce message contient un mot interdit.';
  return message || 'Envoi impossible.';
}

export async function addComment(gameId: string, myId: string, body: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('comments')
    .insert({ game_id: gameId, author_id: myId, body: body.trim() });
  if (error) throw new Error(contentError(error));
}

export async function deleteComment(commentId: string): Promise<void> {
  const { error } = await requireSupabase().from('comments').delete().eq('id', commentId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Modération : signaler, bloquer
// ---------------------------------------------------------------------------

export type ReportTarget = 'profile' | 'game' | 'comment';

export async function report(targetType: ReportTarget, targetId: string, reason: string | null): Promise<void> {
  const { error } = await requireSupabase()
    .from('reports')
    .insert({ target_type: targetType, target_id: targetId, reason });
  if (error) throw error;
}

export async function fetchBlocked(): Promise<Seat[]> {
  const { data, error } = await requireSupabase()
    .from('blocks')
    .select('blocked:profiles!blocks_blocked_id_fkey(id, username, display_name, avatar_url)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).flatMap((b) => (b.blocked ? [profileToSeat(b.blocked)] : []));
}

export async function setBlocked(myId: string, profileId: string, blocked: boolean): Promise<void> {
  const sb = requireSupabase();
  const { error } = blocked
    ? await sb.from('blocks').insert({ blocker_id: myId, blocked_id: profileId })
    : await sb.from('blocks').delete().eq('blocker_id', myId).eq('blocked_id', profileId);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export type NotificationType = 'tag' | 'tag_accepted' | 'kudos' | 'comment' | 'friend_request' | 'friend_accepted';

export type AppNotification = {
  id: string;
  type: NotificationType;
  actor: Seat | null;
  gameId: string | null;
  createdAt: string;
  read: boolean;
};

export async function fetchNotifications(): Promise<AppNotification[]> {
  const { data, error } = await requireSupabase()
    .from('notifications')
    .select('id, type, game_id, created_at, read_at, actor:profiles!notifications_actor_id_fkey(id, username, display_name, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) throw error;
  return (data ?? []).map((n) => ({
    id: n.id,
    type: n.type as NotificationType,
    actor: n.actor ? profileToSeat(n.actor) : null,
    gameId: n.game_id,
    createdAt: n.created_at,
    read: n.read_at !== null,
  }));
}

export async function fetchUnreadCount(): Promise<number> {
  const { count, error } = await requireSupabase()
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationsRead(myId: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', myId)
    .is('read_at', null);
  if (error) throw error;
}

export async function savePushToken(myId: string, token: string, platform: 'ios' | 'android'): Promise<void> {
  const { error } = await requireSupabase()
    .from('push_tokens')
    .upsert({ token, profile_id: myId, platform, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function deletePushToken(token: string): Promise<void> {
  const { error } = await requireSupabase().from('push_tokens').delete().eq('token', token);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

/** Contenu base64 (image picker) vers binaire, sans dépendance : atob est fourni par Hermes. */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Image choisie et préparée par `pickImage` : `uri` pour l'aperçu, `base64` pour l'envoi. */
export type PickedImage = { uri: string; base64: string; mimeType: string };

function extension(mimeType: string): string {
  return mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
}

/** Envoie mon avatar (bucket public) et renvoie son URL. Nom de fichier unique : pas de cache périmé. */
export async function uploadAvatar(myId: string, image: PickedImage): Promise<string> {
  const sb = requireSupabase();
  const path = `${myId}/${Date.now()}.${extension(image.mimeType)}`;
  const { error } = await sb.storage
    .from('avatars')
    .upload(path, base64ToBytes(image.base64), { contentType: image.mimeType, upsert: true });
  if (error) throw error;
  // Les anciens avatars ne servent plus : on ne garde que le nouveau.
  const { data: old } = await sb.storage.from('avatars').list(myId);
  const stale = (old ?? []).map((f) => `${myId}/${f.name}`).filter((p) => p !== path);
  if (stale.length > 0) await sb.storage.from('avatars').remove(stale);
  return sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

/** Envoie la photo d'une partie (bucket privé) et renvoie son chemin. La partie doit déjà être sur le serveur. */
export async function uploadGamePhoto(gameId: string, image: PickedImage): Promise<string> {
  const path = `${gameId}/${Date.now()}.${extension(image.mimeType)}`;
  const { error } = await requireSupabase()
    .storage.from('game-photos')
    .upload(path, base64ToBytes(image.base64), { contentType: image.mimeType, upsert: true });
  if (error) throw error;
  return path;
}

// ---------------------------------------------------------------------------
// Compétition : cote Elo, classements
// ---------------------------------------------------------------------------

export type Rating = { elo: number; games: number; wins: number; bestElo: number; history: number[] };

export const DEFAULT_ELO = ELO_START;

/** Cotes actuelles des joueurs et cotes d'avant chaque partie classée : le niveau des équipes dans le fil. */
export async function fetchEloSnapshot(gameIds: string[], profileIds: string[]): Promise<EloSnapshot> {
  const sb = requireSupabase();
  const [ratings, history] = await Promise.all([
    sb.from('ratings').select('profile_id, elo').in('profile_id', profileIds),
    gameIds.length > 0
      ? sb.from('elo_history').select('game_id, profile_id, elo_before').in('game_id', gameIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const error = ratings.error ?? history.error;
  if (error) throw error;
  return {
    current: Object.fromEntries((ratings.data ?? []).map((r) => [r.profile_id, r.elo])),
    before: Object.fromEntries((history.data ?? []).map((h) => [`${h.game_id}:${h.profile_id}`, h.elo_before])),
  };
}

/** Cotes des joueurs d'une table classée : l'enjeu au lancement, ce que chacun a gagné à la fin. */
export type TableRatings = {
  /** Cote actuelle et parties classées de chaque joueur demandé (1000 et 0 s'il n'a jamais été classé). */
  current: Record<string, RatedPlayer>;
  /** Cote avant et après la partie, par joueur, une fois que la base l'a classée (elo_history). */
  rated: Record<string, { before: number; after: number }>;
};

export async function fetchTableRatings(profileIds: string[], gameId: string | null): Promise<TableRatings> {
  const sb = requireSupabase();
  const [ratings, history] = await Promise.all([
    sb.from('ratings').select('profile_id, elo, games').in('profile_id', profileIds),
    gameId
      ? sb.from('elo_history').select('profile_id, elo_before, elo_after').eq('game_id', gameId)
      : Promise.resolve({ data: [], error: null }),
  ]);
  const error = ratings.error ?? history.error;
  if (error) throw error;
  return {
    current: Object.fromEntries(
      profileIds.map((id) => {
        const row = ratings.data?.find((r) => r.profile_id === id);
        return [id, { elo: row?.elo ?? ELO_START, games: row?.games ?? 0 }];
      }),
    ),
    rated: Object.fromEntries((history.data ?? []).map((h) => [h.profile_id, { before: h.elo_before, after: h.elo_after }])),
  };
}

/** Cote d'un joueur et son évolution (une valeur par partie classée, en partant de 1000). */
export async function fetchRating(profileId: string): Promise<Rating> {
  const sb = requireSupabase();
  const [rating, history] = await Promise.all([
    sb.from('ratings').select('*').eq('profile_id', profileId).maybeSingle(),
    sb.from('elo_history').select('elo_after, created_at').eq('profile_id', profileId).order('created_at').limit(500),
  ]);
  const error = rating.error ?? history.error;
  if (error) throw error;
  return {
    elo: rating.data?.elo ?? DEFAULT_ELO,
    games: rating.data?.games ?? 0,
    wins: rating.data?.wins ?? 0,
    bestElo: rating.data?.best_elo ?? DEFAULT_ELO,
    history: [DEFAULT_ELO, ...(history.data ?? []).map((h) => h.elo_after)],
  };
}

export type LeaderboardScope = 'friends' | 'city' | 'all';

export type LeaderboardRow = {
  seat: Seat;
  city: string | null;
  elo: number;
  ratedGames: number;
  games: number;
  wins: number;
};

export async function fetchLeaderboard(scope: LeaderboardScope, since: string | null): Promise<LeaderboardRow[]> {
  const { data, error } = await requireSupabase().rpc('leaderboard', { scope, since });
  if (error) throw error;
  return (data ?? []).map(leaderboardRow);
}

type LeaderboardDbRow = Database['public']['Functions']['leaderboard']['Returns'][number];

function leaderboardRow(row: LeaderboardDbRow): LeaderboardRow {
  return {
    seat: profileToSeat({
      id: row.profile_id,
      username: row.username,
      display_name: row.display_name,
      avatar_url: row.avatar_url,
    }),
    city: row.city,
    elo: row.elo,
    ratedGames: row.rated_games,
    games: Number(row.games),
    wins: Number(row.wins),
  };
}

// ---------------------------------------------------------------------------
// Bandes
// ---------------------------------------------------------------------------

export type Group = {
  id: string;
  name: string;
  description: string | null;
  city: string | null;
  inviteCode: string;
  members: number;
  isAdmin: boolean;
};

export type GroupMember = { seat: Seat; role: 'admin' | 'member'; joinedAt: string };

/** Mes bandes, de la plus récente à la plus ancienne. */
export async function fetchMyGroups(myId: string): Promise<Group[]> {
  const { data, error } = await requireSupabase()
    .from('group_members')
    .select('role, group:groups(id, name, description, city, invite_code, members:group_members(count))')
    .eq('profile_id', myId)
    .order('joined_at', { ascending: false });
  if (error) throw error;
  type Row = {
    role: string;
    group: {
      id: string;
      name: string;
      description: string | null;
      city: string | null;
      invite_code: string;
      members: { count: number }[];
    } | null;
  };
  return ((data ?? []) as unknown as Row[]).flatMap((row) =>
    row.group
      ? [
          {
            id: row.group.id,
            name: row.group.name,
            description: row.group.description,
            city: row.group.city,
            inviteCode: row.group.invite_code,
            members: row.group.members[0]?.count ?? 0,
            isAdmin: row.role === 'admin',
          },
        ]
      : [],
  );
}

export async function fetchGroupMembers(groupId: string): Promise<GroupMember[]> {
  const { data, error } = await requireSupabase()
    .from('group_members')
    .select('role, joined_at, profile:profiles(id, username, display_name, avatar_url)')
    .eq('group_id', groupId)
    .order('joined_at');
  if (error) throw error;
  return (data ?? []).flatMap((m) =>
    m.profile ? [{ seat: profileToSeat(m.profile), role: m.role === 'admin' ? 'admin' : 'member', joinedAt: m.joined_at } as GroupMember] : [],
  );
}

export async function createGroup(
  myId: string,
  input: { name: string; description?: string | null; city?: string | null },
): Promise<string> {
  const { data, error } = await requireSupabase()
    .from('groups')
    .insert({ name: input.name.trim(), description: input.description ?? null, city: input.city ?? null, created_by: myId })
    .select('id')
    .single();
  if (error) throw new Error(contentError(error));
  return data.id;
}

export type GroupPreview = { id: string; name: string; description: string | null; city: string | null; members: number; alreadyMember: boolean };

export async function fetchGroupPreview(code: string): Promise<GroupPreview | null> {
  const { data, error } = await requireSupabase().rpc('group_preview', { code });
  if (error) throw error;
  const row = data?.[0];
  return row
    ? {
        id: row.id,
        name: row.name,
        description: row.description,
        city: row.city,
        members: Number(row.members),
        alreadyMember: row.already_member,
      }
    : null;
}

export async function joinGroup(code: string): Promise<string> {
  const { data, error } = await requireSupabase().rpc('join_group', { code });
  if (error) throw error;
  return data;
}

export async function leaveGroup(groupId: string, profileId: string): Promise<void> {
  const { error } = await requireSupabase().from('group_members').delete().eq('group_id', groupId).eq('profile_id', profileId);
  if (error) throw error;
}

export async function fetchGroupLeaderboard(groupId: string, since: string | null): Promise<LeaderboardRow[]> {
  const { data, error } = await requireSupabase().rpc('group_leaderboard', { gid: groupId, since });
  if (error) throw error;
  return (data ?? []).map(leaderboardRow);
}

export async function fetchGroupFeed(groupId: string, myId: string, before: string | null): Promise<FeedItem[]> {
  const { data, error } = await requireSupabase()
    .rpc('group_feed', { gid: groupId, before, lim: FEED_PAGE_SIZE })
    .select(FEED_SELECT);
  if (error) throw error;
  return feedItems((data ?? []) as unknown as FeedRow[], myId);
}

/** Supprime les photos d'une partie (à faire avant de supprimer la partie : les droits en dépendent). */
export async function removeGamePhotos(gameId: string, keep: string | null = null): Promise<void> {
  const bucket = requireSupabase().storage.from('game-photos');
  const { data, error } = await bucket.list(gameId);
  if (error) throw error;
  const paths = (data ?? []).map((f) => `${gameId}/${f.name}`).filter((path) => path !== keep);
  if (paths.length > 0) await bucket.remove(paths);
}

/** Supprime tous mes fichiers (avatars, photos de mes parties) avant la suppression du compte. */
export async function removeMyFiles(myId: string): Promise<void> {
  const sb = requireSupabase();
  const avatars = await sb.storage.from('avatars').list(myId);
  if (avatars.data?.length) await sb.storage.from('avatars').remove(avatars.data.map((f) => `${myId}/${f.name}`));
  const { data: games } = await sb.from('games').select('id').eq('owner_id', myId).not('photo_path', 'is', null);
  for (const game of games ?? []) await removeGamePhotos(game.id);
}
