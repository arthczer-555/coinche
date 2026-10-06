import {
  keepPreviousData,
  QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useMemo } from 'react';

import { useMe, useSession } from '@/features/auth/session';
import { teamOf } from '@/features/coinche/scoring';
import { sortGames, useGames } from '@/features/coinche/store';
import type { Game, Seat, TeamId } from '@/features/coinche/types';
import { searchTerm } from '@/features/players/search';
import { teamElo } from '@/features/stats/elo';
import { isUuid } from '@/features/sync/mappers';
import { track } from '@/lib/analytics';
import { isBackendEnabled } from '@/lib/supabase';

import { demoApi } from '@/features/demo/demo-api';
import { isDemo } from '@/features/demo/is-demo';

import * as realApi from './api';
import {
  FEED_PAGE_SIZE,
  type FeedItem,
  type FriendStatus,
  type GameSocial,
  type LeaderboardScope,
  type ReportTarget,
} from './api';

/** Appels serveur : Supabase, ou les données fictives en mode démo. */
const api = isDemo ? demoApi : realApi;

/** Appels directs des écrans (photos, pseudo), avec le même aiguillage. */
export const { isUsernameAvailable, removeGamePhotos, uploadAvatar, uploadGamePhoto } = api;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

export const queryKeys = {
  playerGames: (profileId: string) => ['player-games', profileId] as const,
  declinedPlayers: (gameId: string) => ['declined-players', gameId] as const,
  eloSnapshot: (gameIds: string[], profileIds: string[]) => ['elo-snapshot', gameIds, profileIds] as const,
  game: (gameId: string) => ['game', gameId] as const,
  profile: (profileId: string) => ['profile', profileId] as const,
  search: (query: string) => ['search', query] as const,
  feed: (profileId: string) => ['feed', profileId] as const,
  gameSocial: (gameId: string) => ['game-social', gameId] as const,
  comments: (gameId: string) => ['comments', gameId] as const,
  notifications: (profileId: string) => ['notifications', profileId] as const,
  unread: (profileId: string) => ['unread', profileId] as const,
  blocked: (profileId: string) => ['blocked', profileId] as const,
  friendships: (profileId: string) => ['friendships', profileId] as const,
  friends: (profileId: string) => ['friends', profileId] as const,
  friendSuggestions: (profileId: string) => ['friend-suggestions', profileId] as const,
  rating: (profileId: string) => ['rating', profileId] as const,
  tableRatings: (profileIds: string[], gameId: string | null) => ['table-ratings', profileIds, gameId] as const,
  leaderboard: (scope: string, since: string | null) => ['leaderboard', scope, since] as const,
  groups: (profileId: string) => ['groups', profileId] as const,
  groupMembers: (groupId: string) => ['group-members', groupId] as const,
  groupLeaderboard: (groupId: string, since: string | null) => ['group-leaderboard', groupId, since] as const,
  groupFeed: (groupId: string) => ['group-feed', groupId] as const,
  groupPreview: (code: string) => ['group-preview', code] as const,
};

function useSignedIn(): boolean {
  return useSession((s) => s.session !== null) && (isBackendEnabled || isDemo);
}

export function usePlayerGames(profileId: string | undefined) {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: queryKeys.playerGames(profileId ?? ''),
    queryFn: () => api.fetchPlayerGames(profileId!),
    enabled: signedIn && !!profileId,
  });
}

/** Partie absente du téléphone (partie d'un ami) : lue sur le serveur. */
export function useRemoteGame(gameId: string | undefined, enabled: boolean) {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: queryKeys.game(gameId ?? ''),
    queryFn: () => api.fetchGame(gameId!),
    enabled: signedIn && enabled && !!gameId,
  });
}

export function useProfile(profileId: string | undefined) {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: queryKeys.profile(profileId ?? ''),
    queryFn: () => api.fetchProfile(profileId!),
    enabled: signedIn && !!profileId,
  });
}

/** Comptes par nom ou pseudo ("@lea.m" marche aussi), à partir de 2 caractères. */
export function useSearchProfiles(query: string) {
  const signedIn = useSignedIn();
  const term = searchTerm(query);
  return useQuery({
    queryKey: queryKeys.search(term),
    queryFn: () => api.searchProfiles(term),
    enabled: signedIn && term.length >= 2,
  });
}

/** "Pas moi" : la partie quitte mon profil, mes stats et mon fil. */
export function useDeclineGame() {
  const client = useQueryClient();
  const me = useMe();
  return useMutation({
    mutationFn: (gameId: string) => api.declineGame(gameId),
    onSuccess: (_data, gameId) => {
      client.invalidateQueries({ queryKey: queryKeys.playerGames(me.id) });
      client.invalidateQueries({ queryKey: queryKeys.game(gameId) });
      client.invalidateQueries({ queryKey: queryKeys.feed(me.id) });
    },
  });
}

/** Comptes qui ont dit "Pas moi" dans une de mes parties (rien tant qu'elle n'est pas envoyée). */
export function useDeclinedPlayers(gameId: string | undefined) {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: queryKeys.declinedPlayers(gameId ?? ''),
    queryFn: () => api.fetchDeclinedPlayers(gameId!),
    enabled: signedIn && !!gameId,
  });
}

/**
 * Toutes mes parties : celles comptées sur ce téléphone et celles où d'autres m'ont tagué.
 * Sans compte, seulement les parties locales.
 */
export function useMyGames(): { games: Game[]; isLoading: boolean } {
  const me = useMe();
  const local = useGames((s) => s.games);
  const remote = usePlayerGames(me.signedIn ? me.id : undefined);
  const games = useMemo(() => {
    const merged: Record<string, Game> = { ...local };
    for (const game of remote.data ?? []) {
      if (!merged[game.id]) merged[game.id] = game;
    }
    return sortGames(merged);
  }, [local, remote.data]);
  return { games, isLoading: remote.isLoading };
}

/** Parties où un joueur était assis (pour ses stats). */
export function gamesPlayedBy(games: Game[], playerId: string): Game[] {
  return games.filter((g) => teamOf(g, playerId) !== null);
}

// ---------------------------------------------------------------------------
// Fil, bravos, commentaires
// ---------------------------------------------------------------------------

/** Fil paginé : mes parties et celles de mes amis. */
export function useFeed() {
  const me = useMe();
  return useInfiniteQuery({
    queryKey: queryKeys.feed(me.id),
    queryFn: ({ pageParam }) => api.fetchFeed(me.id, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.length < FEED_PAGE_SIZE ? null : last[last.length - 1].game.createdAt),
    enabled: me.signedIn,
  });
}

export function useGameSocial(gameId: string | undefined, enabled = true) {
  const me = useMe();
  return useQuery({
    queryKey: queryKeys.gameSocial(gameId ?? ''),
    queryFn: () => api.fetchGameSocial(gameId!, me.id),
    enabled: me.signedIn && enabled && !!gameId,
  });
}

/** Bravo / retrait du bravo, mis à jour tout de suite à l'écran (le fil et la partie). */
export function useToggleKudos(gameId: string) {
  const client = useQueryClient();
  const me = useMe();
  return useMutation({
    mutationFn: (on: boolean) => api.setKudos(gameId, me.id, on),
    onMutate: (on) => {
      client.setQueryData<InfiniteData<FeedItem[]>>(queryKeys.feed(me.id), (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page) =>
                page.map((item) =>
                  item.game.id === gameId && item.iKudoed !== on
                    ? { ...item, iKudoed: on, kudos: item.kudos + (on ? 1 : -1) }
                    : item,
                ),
              ),
            }
          : data,
      );
      client.setQueryData<GameSocial>(queryKeys.gameSocial(gameId), (data) =>
        data
          ? {
              ...data,
              iKudoed: on,
              kudos: on ? [me.seat, ...data.kudos.filter((s) => s.id !== me.id)] : data.kudos.filter((s) => s.id !== me.id),
            }
          : data,
      );
    },
    onSuccess: (_data, on) => {
      if (on) track('kudos_given');
    },
    onSettled: () => {
      client.invalidateQueries({ queryKey: queryKeys.gameSocial(gameId) });
    },
  });
}

export function useComments(gameId: string | undefined, enabled = true) {
  const me = useMe();
  return useQuery({
    queryKey: queryKeys.comments(gameId ?? ''),
    queryFn: () => api.fetchComments(gameId!),
    enabled: me.signedIn && enabled && !!gameId,
  });
}

export function useAddComment(gameId: string) {
  const client = useQueryClient();
  const me = useMe();
  return useMutation({
    mutationFn: (body: string) => api.addComment(gameId, me.id, body),
    onSuccess: () => {
      track('comment_posted');
      client.invalidateQueries({ queryKey: queryKeys.comments(gameId) });
      client.invalidateQueries({ queryKey: queryKeys.gameSocial(gameId) });
      client.invalidateQueries({ queryKey: queryKeys.feed(me.id) });
    },
  });
}

export function useDeleteComment(gameId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) => api.deleteComment(commentId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.comments(gameId) });
      client.invalidateQueries({ queryKey: queryKeys.gameSocial(gameId) });
    },
  });
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export function useNotifications() {
  const me = useMe();
  return useQuery({
    queryKey: queryKeys.notifications(me.id),
    queryFn: api.fetchNotifications,
    enabled: me.signedIn,
  });
}

/** Pastille des notifications non lues (rafraîchie chaque minute). */
export function useUnreadCount() {
  const me = useMe();
  return useQuery({
    queryKey: queryKeys.unread(me.id),
    queryFn: api.fetchUnreadCount,
    enabled: me.signedIn,
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationsRead() {
  const client = useQueryClient();
  const me = useMe();
  return useMutation({
    mutationFn: () => api.markNotificationsRead(me.id),
    onSuccess: () => client.setQueryData(queryKeys.unread(me.id), 0),
  });
}

// ---------------------------------------------------------------------------
// Amis
// ---------------------------------------------------------------------------

/**
 * Mes amis et mes demandes en cours (reçues et envoyées).
 * `live` : tant qu'une demande envoyée attend, on revérifie toutes les 4 s (partie classée : l'autre accepte
 * sur son téléphone, à la même table).
 */
export function useMyFriendships({ live = false }: { live?: boolean } = {}) {
  const me = useMe();
  return useQuery({
    queryKey: queryKeys.friendships(me.id),
    queryFn: () => api.fetchMyFriendships(me.id),
    enabled: me.signedIn,
    refetchInterval: live ? (query) => (query.state.data?.some((f) => f.status === 'sent') ? 4000 : false) : false,
  });
}

/** Où j'en suis avec ce joueur (null : aucun lien). */
export function useFriendStatus(profileId: string | undefined): { status: FriendStatus | null; isLoading: boolean } {
  const friendships = useMyFriendships();
  return {
    status: friendships.data?.find((f) => f.seat.id === profileId)?.status ?? null,
    isLoading: friendships.isLoading,
  };
}

/** Les amis d'un joueur (moi compris). */
export function useFriends(profileId: string | undefined) {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: queryKeys.friends(profileId ?? ''),
    queryFn: () => api.fetchFriends(profileId!),
    enabled: signedIn && !!profileId,
  });
}

/**
 * Les amis que j'ai en commun avec ce joueur (vide pour moi-même), dans l'ordre de sa liste d'amis.
 * Les amitiés acceptées sont lisibles de tous : l'intersection se fait ici, sans appel de plus.
 */
export function useMutualFriends(profileId: string | undefined): Seat[] {
  const me = useMe();
  const friendships = useMyFriendships();
  const theirs = useFriends(profileId);
  return useMemo(() => {
    if (!profileId || profileId === me.id) return [];
    const mine = new Set((friendships.data ?? []).filter((f) => f.status === 'friends').map((f) => f.seat.id));
    return (theirs.data ?? []).filter((seat) => mine.has(seat.id));
  }, [profileId, me.id, friendships.data, theirs.data]);
}

/**
 * "Tu les connais peut-être" : amis de mes amis, du plus d'amis en commun au moins.
 * Pas rafraîchi à l'ajout d'un ami : la carte reste, avec "Envoyée", jusqu'au prochain passage.
 */
export function useFriendSuggestions() {
  const me = useMe();
  return useQuery({
    queryKey: queryKeys.friendSuggestions(me.id),
    queryFn: api.fetchFriendSuggestions,
    enabled: me.signedIn,
  });
}

/**
 * Un lien d'amitié change : listes d'amis, fil, parties visibles du joueur, classement entre amis.
 * Renvoie la promesse du rafraîchissement de mes amis : la mutation reste "en cours" jusque-là (pas de bouton qui clignote).
 */
function refreshFriends(client: QueryClient, myId: string, profileId: string) {
  client.invalidateQueries({ queryKey: ['friends'] });
  client.invalidateQueries({ queryKey: queryKeys.feed(myId) });
  client.invalidateQueries({ queryKey: queryKeys.playerGames(profileId) });
  client.invalidateQueries({ queryKey: ['leaderboard'] });
  return client.invalidateQueries({ queryKey: queryKeys.friendships(myId) });
}

/** Demande d'ami, ou acceptation si ce joueur m'en a envoyé une. */
export function useAddFriend() {
  const client = useQueryClient();
  const me = useMe();
  return useMutation({
    mutationFn: (profileId: string) => api.addFriend(profileId),
    onSuccess: (status, profileId) => {
      track(status === 'friends' ? 'friend_accepted' : 'friend_request');
      return refreshFriends(client, me.id, profileId);
    },
  });
}

/** Refuse une demande, l'annule, ou retire un ami. */
export function useRemoveFriend() {
  const client = useQueryClient();
  const me = useMe();
  return useMutation({
    mutationFn: (profileId: string) => api.removeFriend(me.id, profileId),
    onSuccess: (_data, profileId) => refreshFriends(client, me.id, profileId),
  });
}

// ---------------------------------------------------------------------------
// Modération
// ---------------------------------------------------------------------------

export function useBlocked() {
  const me = useMe();
  return useQuery({ queryKey: queryKeys.blocked(me.id), queryFn: api.fetchBlocked, enabled: me.signedIn });
}

export function useSetBlocked() {
  const client = useQueryClient();
  const me = useMe();
  return useMutation({
    mutationFn: ({ profileId, blocked }: { profileId: string; blocked: boolean }) => api.setBlocked(me.id, profileId, blocked),
    onSuccess: (_data, { profileId }) => {
      client.invalidateQueries({ queryKey: queryKeys.blocked(me.id) });
      client.invalidateQueries({ queryKey: queryKeys.friendSuggestions(me.id) });
      refreshFriends(client, me.id, profileId);
    },
  });
}

export function useReport() {
  return useMutation({
    mutationFn: ({ type, id, reason }: { type: ReportTarget; id: string; reason?: string | null }) =>
      api.report(type, id, reason ?? null),
  });
}

// ---------------------------------------------------------------------------
// Compétition
// ---------------------------------------------------------------------------

/**
 * Cote moyenne de chaque équipe d'une liste de parties (fil) : celle d'avant la partie si elle a été classée,
 * sinon la cote actuelle des joueurs. Null pour une équipe avec un invité.
 */
export function useTeamElo(games: Game[]): (game: Game, team: TeamId) => number | null {
  const signedIn = useSignedIn();
  const { gameIds, profileIds } = useMemo(() => {
    const players = games.flatMap((g) => [...g.teams.A.players, ...g.teams.B.players]);
    return {
      gameIds: games.filter((g) => g.ranked).map((g) => g.id).sort(),
      profileIds: [...new Set(players.filter((p) => p.kind === 'user' && isUuid(p.id)).map((p) => p.id))].sort(),
    };
  }, [games]);
  const snapshot = useQuery({
    queryKey: queryKeys.eloSnapshot(gameIds, profileIds),
    queryFn: () => api.fetchEloSnapshot(gameIds, profileIds),
    enabled: signedIn && profileIds.length > 0,
    // Nouvelle page du fil : on garde les cotes déjà affichées pendant le chargement.
    placeholderData: keepPreviousData,
  });
  return (game, team) => (snapshot.data ? teamElo(game.teams[team].players, game.id, snapshot.data) : null);
}

export function useRating(profileId: string | undefined) {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: queryKeys.rating(profileId ?? ''),
    queryFn: () => api.fetchRating(profileId!),
    enabled: signedIn && !!profileId,
  });
}

/** Relectures max (toutes les 4 s) en attendant que la base classe une partie terminée. */
const RATED_POLLS = 15;

/**
 * Cotes des comptes d'une table classée : l'enjeu au lancement, ce que chacun a gagné à la fin.
 * Avec `gameId`, on relit toutes les 4 s tant que la base n'a pas classé la partie (la synchro prend quelques secondes).
 */
export function useTableRatings(players: Seat[], gameId: string | null = null) {
  const signedIn = useSignedIn();
  const profileIds = [...new Set(players.filter((p) => p.kind === 'user' && isUuid(p.id)).map((p) => p.id))].sort();
  return useQuery({
    queryKey: queryKeys.tableRatings(profileIds, gameId),
    queryFn: () => api.fetchTableRatings(profileIds, gameId),
    enabled: signedIn && profileIds.length > 0,
    refetchInterval: (query) =>
      gameId && query.state.data && Object.keys(query.state.data.rated).length === 0 && query.state.dataUpdateCount < RATED_POLLS
        ? 4000
        : false,
  });
}

export function useLeaderboard(scope: LeaderboardScope, since: string | null) {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: queryKeys.leaderboard(scope, since),
    queryFn: () => api.fetchLeaderboard(scope, since),
    enabled: signedIn,
  });
}

// ---------------------------------------------------------------------------
// Bandes
// ---------------------------------------------------------------------------

export function useMyGroups() {
  const me = useMe();
  return useQuery({ queryKey: queryKeys.groups(me.id), queryFn: () => api.fetchMyGroups(me.id), enabled: me.signedIn });
}

export function useGroupMembers(groupId: string | undefined) {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: queryKeys.groupMembers(groupId ?? ''),
    queryFn: () => api.fetchGroupMembers(groupId!),
    enabled: signedIn && !!groupId,
  });
}

export function useGroupLeaderboard(groupId: string | undefined, since: string | null) {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: queryKeys.groupLeaderboard(groupId ?? '', since),
    queryFn: () => api.fetchGroupLeaderboard(groupId!, since),
    enabled: signedIn && !!groupId,
  });
}

export function useGroupFeed(groupId: string | undefined) {
  const me = useMe();
  return useInfiniteQuery({
    queryKey: queryKeys.groupFeed(groupId ?? ''),
    queryFn: ({ pageParam }) => api.fetchGroupFeed(groupId!, me.id, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.length < FEED_PAGE_SIZE ? null : last[last.length - 1].game.createdAt),
    enabled: me.signedIn && !!groupId,
  });
}

export function useGroupPreview(code: string | undefined) {
  const signedIn = useSignedIn();
  return useQuery({
    queryKey: queryKeys.groupPreview(code ?? ''),
    queryFn: () => api.fetchGroupPreview(code!),
    enabled: signedIn && !!code,
  });
}

export function useCreateGroup() {
  const client = useQueryClient();
  const me = useMe();
  return useMutation({
    mutationFn: (input: { name: string; description?: string | null; city?: string | null }) => api.createGroup(me.id, input),
    onSuccess: () => {
      track('group_created');
      client.invalidateQueries({ queryKey: queryKeys.groups(me.id) });
    },
  });
}

export function useJoinGroup() {
  const client = useQueryClient();
  const me = useMe();
  return useMutation({
    mutationFn: (code: string) => api.joinGroup(code),
    onSuccess: () => {
      track('group_joined');
      client.invalidateQueries({ queryKey: queryKeys.groups(me.id) });
    },
  });
}

export function useLeaveGroup(groupId: string) {
  const client = useQueryClient();
  const me = useMe();
  return useMutation({
    mutationFn: (profileId: string) => api.leaveGroup(groupId, profileId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: queryKeys.groups(me.id) });
      client.invalidateQueries({ queryKey: queryKeys.groupMembers(groupId) });
    },
  });
}
