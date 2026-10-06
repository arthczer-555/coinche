/**
 * API du mode démo : mêmes signatures que src/features/social/api.ts, servie par les données fictives
 * (fixtures.ts) et les parties locales. Les règles reprennent celles de la base (visibilité, fil, classements).
 */
import { useGames } from '@/features/coinche/store';
import { teamOf } from '@/features/coinche/scoring';
import type { Game, Seat } from '@/features/coinche/types';
import { fold, searchTerm } from '@/features/players/search';
import * as social from '@/features/social/api';
import type { Profile } from '@/lib/database.types';

import {
  comments,
  demoId,
  eloBefore,
  friendships,
  games as fixtureGames,
  groups,
  kudos,
  me,
  notifications,
  profiles,
  ratings,
  seatOf,
  statuses,
  statusOf,
} from './fixtures';

/** Petite latence pour que les écrans de chargement existent aussi en démo. */
const wait = <T,>(value: T, ms = 180): Promise<T> => new Promise((resolve) => setTimeout(() => resolve(value), ms));

const blocked = new Set<string>();

/** Photos choisies en démo (chemin -> image locale), le temps de la session. */
const photos = new Map<string, string>();

/** Image locale d'une photo envoyée en démo (null : photo des fixtures, ou session redémarrée). */
export const demoPhotoUri = (path: string) => photos.get(path) ?? null;

/** Toutes les parties : les miennes vivent dans le store local (modifiables), les autres dans les fixtures. */
function allGames(): Game[] {
  const local = Object.values(useGames.getState().games).filter((g) => g.ownerId === me.id);
  const localIds = new Set(local.map((g) => g.id));
  return [...local, ...fixtureGames.filter((g) => !localIds.has(g.id) && g.ownerId !== me.id)].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

/** Le lien entre deux joueurs, quel que soit celui qui a demandé. */
const linkBetween = (a: string, b: string) =>
  friendships.find((f) => (f.requesterId === a && f.addresseeId === b) || (f.requesterId === b && f.addresseeId === a));
const areFriends = (a: string, b: string) => linkBetween(a, b)?.status === 'accepted';
const friendIds = (id: string) =>
  friendships
    .filter((f) => f.status === 'accepted' && (f.requesterId === id || f.addresseeId === id))
    .sort((x, y) => x.daysAgo - y.daysAgo)
    .map((f) => (f.requesterId === id ? f.addresseeId : f.requesterId));
const unlink = (a: string, b: string) => {
  const link = linkBetween(a, b);
  if (link) friendships.splice(friendships.indexOf(link), 1);
};
const seats = (g: Game) => [...g.teams.A.players, ...g.teams.B.players];
const plays = (g: Game, id: string) => seats(g).some((s) => s.id === id) && statusOf(g.id, id) !== 'declined';

function canView(g: Game, viewer: string): boolean {
  if (g.ownerId === viewer || plays(g, viewer)) return true;
  if (g.ownerId && blocked.has(g.ownerId)) return false;
  if (g.visibility === 'public') return true;
  if (g.visibility === 'friends') return !!g.ownerId && areFriends(viewer, g.ownerId);
  return false;
}

/** Joueurs ayant refusé : retirés de la partie, comme le fait le serveur. */
function visibleGame(g: Game): Game {
  const keep = (list: Seat[]) => list.filter((s) => statusOf(g.id, s.id) !== 'declined');
  return { ...g, teams: { A: { ...g.teams.A, players: keep(g.teams.A.players) }, B: { ...g.teams.B, players: keep(g.teams.B.players) } } };
}

const profileById = (id: string) => profiles.find((p) => p.id === id) ?? null;

function feedItem(g: Game, myId: string): social.FeedItem {
  const owner = g.ownerId ? profileById(g.ownerId) : null;
  const set = kudos.get(g.id) ?? new Set<string>();
  return {
    game: visibleGame(g),
    owner: owner ? seatOf(owner) : null,
    kudos: set.size,
    comments: comments.filter((c) => c.gameId === g.id).length,
    iKudoed: set.has(myId),
  };
}

function page(list: Game[], before: string | null): Game[] {
  return list.filter((g) => !before || g.createdAt < before).slice(0, social.FEED_PAGE_SIZE);
}

/** Parties qui comptent pour les classements : terminées sur la période, hors "juste les points" (comme le serveur). */
function inPeriod(g: Game, since: string | null) {
  return !!g.finishedAt && !g.simple && (!since || g.finishedAt >= since);
}

function leaderboardFor(pool: Profile[], since: string | null, gamesPool: Game[]): social.LeaderboardRow[] {
  return pool
    .map((p) => {
      const played = gamesPool.filter((g) => inPeriod(g, since) && plays(g, p.id) && statusOf(g.id, p.id) === 'accepted');
      const wins = played.filter((g) => g.winner === teamOf(g, p.id)).length;
      const r = ratings.get(p.id);
      return {
        seat: seatOf(p),
        city: p.city,
        elo: r?.elo ?? 1000,
        ratedGames: r?.games ?? 0,
        games: played.length,
        wins,
      };
    })
    .filter((row) => row.games > 0 || row.ratedGames > 0)
    .sort((a, b) => b.elo - a.elo);
}

function toGroup(group: (typeof groups)[number], myId: string): social.Group {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    city: group.city,
    inviteCode: group.inviteCode,
    members: group.members.length,
    isAdmin: group.members.some((m) => m.id === myId && m.role === 'admin'),
  };
}

type SocialApi = Pick<
  typeof social,
  | 'addComment'
  | 'addFriend'
  | 'createGroup'
  | 'declineGame'
  | 'deleteComment'
  | 'fetchBlocked'
  | 'fetchComments'
  | 'fetchDeclinedPlayers'
  | 'fetchEloSnapshot'
  | 'fetchFeed'
  | 'fetchFriends'
  | 'fetchFriendSuggestions'
  | 'fetchGame'
  | 'fetchGameSocial'
  | 'fetchGroupFeed'
  | 'fetchGroupLeaderboard'
  | 'fetchGroupMembers'
  | 'fetchGroupPreview'
  | 'fetchLeaderboard'
  | 'fetchMyFriendships'
  | 'fetchMyGroups'
  | 'fetchNotifications'
  | 'fetchPlayerGames'
  | 'fetchProfile'
  | 'fetchRating'
  | 'fetchUnreadCount'
  | 'isUsernameAvailable'
  | 'joinGroup'
  | 'leaveGroup'
  | 'markNotificationsRead'
  | 'removeFriend'
  | 'removeGamePhotos'
  | 'report'
  | 'searchProfiles'
  | 'setBlocked'
  | 'setKudos'
  | 'uploadAvatar'
  | 'uploadGamePhoto'
>;

export const demoApi: SocialApi = {
  // Fil
  fetchFeed: (myId, before) => {
    const circle = new Set([myId, ...friendIds(myId)]);
    const list = allGames().filter(
      (g) =>
        canView(g, myId) &&
        ((g.ownerId && circle.has(g.ownerId)) || seats(g).some((s) => circle.has(s.id) && statusOf(g.id, s.id) === 'accepted')),
    );
    return wait(page(list, before).map((g) => feedItem(g, myId)));
  },
  fetchGame: (gameId) => {
    const g = allGames().find((x) => x.id === gameId);
    return wait(g && canView(g, me.id) ? visibleGame(g) : null);
  },
  fetchPlayerGames: (profileId) =>
    wait(allGames().filter((g) => plays(g, profileId) && statusOf(g.id, profileId) === 'accepted' && canView(g, me.id)).map(visibleGame)),
  declineGame: (gameId) => {
    statuses.set(`${gameId}:${me.id}`, 'declined');
    return wait(undefined);
  },
  fetchDeclinedPlayers: (gameId) => {
    const g = allGames().find((x) => x.id === gameId);
    return wait(g ? seats(g).filter((s) => statusOf(gameId, s.id) === 'declined').map((s) => s.id) : []);
  },

  // Bravos, commentaires
  fetchGameSocial: (gameId, myId): Promise<social.GameSocial> => {
    const set = kudos.get(gameId) ?? new Set<string>();
    const seatsList = [...set].flatMap((id) => {
      const p = profileById(id);
      return p ? [seatOf(p)] : [];
    });
    return wait({ kudos: seatsList, iKudoed: set.has(myId), comments: comments.filter((c) => c.gameId === gameId).length });
  },
  setKudos: (gameId, myId, on) => {
    const set = kudos.get(gameId) ?? new Set<string>();
    if (on) set.add(myId);
    else set.delete(myId);
    kudos.set(gameId, set);
    return wait(undefined, 80);
  },
  fetchComments: (gameId): Promise<social.Comment[]> =>
    wait(
      comments
        .filter((c) => c.gameId === gameId && !blocked.has(c.authorId))
        .flatMap((c) => {
          const author = profileById(c.authorId);
          return author ? [{ id: c.id, gameId, author: seatOf(author), body: c.body, createdAt: c.createdAt }] : [];
        }),
    ),
  addComment: (gameId, myId, body) => {
    comments.push({ id: demoId(70_000 + comments.length), gameId, authorId: myId, body: body.trim(), createdAt: new Date().toISOString() });
    return wait(undefined);
  },
  deleteComment: (commentId) => {
    const index = comments.findIndex((c) => c.id === commentId);
    if (index >= 0) comments.splice(index, 1);
    return wait(undefined);
  },

  // Profils, amis, modération
  fetchProfile: (profileId) => wait(profileById(profileId)),
  // Mêmes règles que search_profiles : sans accents, "@" accepté, pseudo exact puis amis d'abord.
  searchProfiles: (query) => {
    const q = searchTerm(query);
    if (q.length < 2) return wait([]);
    const rank = (p: Profile) => (p.username === q ? 0 : areFriends(me.id, p.id) ? 1 : 2);
    return wait(
      profiles
        .filter((p) => p.id !== me.id && !blocked.has(p.id) && (p.username.includes(q) || fold(p.display_name).includes(q)))
        .sort((a, b) => rank(a) - rank(b) || a.display_name.localeCompare(b.display_name)),
    );
  },
  isUsernameAvailable: (username, myId) => wait(!profiles.some((p) => p.username === username && p.id !== myId)),
  // Photos : gardées en mémoire, affichées depuis le téléphone (ou le navigateur).
  uploadAvatar: (_myId, image) => wait(image.uri),
  uploadGamePhoto: (gameId, image) => {
    const path = `${gameId}/${Date.now()}.jpg`;
    photos.set(path, image.uri);
    return wait(path);
  },
  removeGamePhotos: (gameId, keep = null) => {
    for (const path of photos.keys()) if (path.startsWith(`${gameId}/`) && path !== keep) photos.delete(path);
    return wait(undefined);
  },
  fetchMyFriendships: (myId): Promise<social.Friendship[]> =>
    wait(
      friendships
        .filter((f) => f.requesterId === myId || f.addresseeId === myId)
        .sort((x, y) => x.daysAgo - y.daysAgo)
        .flatMap((f) => {
          const sentByMe = f.requesterId === myId;
          const other = profileById(sentByMe ? f.addresseeId : f.requesterId);
          if (!other || blocked.has(other.id)) return [];
          const status: social.FriendStatus = f.status === 'accepted' ? 'friends' : sentByMe ? 'sent' : 'received';
          return [{ seat: seatOf(other), status }];
        }),
    ),
  fetchFriends: (profileId) =>
    wait(
      friendIds(profileId).flatMap((id) => {
        const p = profileById(id);
        return p && !blocked.has(id) ? [seatOf(p)] : [];
      }),
    ),
  // Mêmes règles que friend_suggestions : amis de mes amis, sans lien avec moi ni blocage.
  fetchFriendSuggestions: (): Promise<social.FriendSuggestion[]> => {
    const via = new Map<string, Profile[]>();
    for (const friendId of friendIds(me.id)) {
      const friend = profileById(friendId);
      if (!friend) continue;
      for (const id of friendIds(friendId)) {
        if (id === me.id || linkBetween(me.id, id) || blocked.has(id)) continue;
        via.set(id, [...(via.get(id) ?? []), friend]);
      }
    }
    return wait(
      [...via.entries()]
        .flatMap(([id, mutual]) => {
          const p = profileById(id);
          if (!p) return [];
          const names = mutual.map((f) => f.display_name).sort((a, b) => a.localeCompare(b));
          return [{ seat: seatOf(p), city: p.city, mutual: mutual.length, mutualNames: names.slice(0, 3) }];
        })
        .sort((a, b) => b.mutual - a.mutual || a.seat.name.localeCompare(b.seat.name))
        .slice(0, 20),
    );
  },
  addFriend: (profileId): Promise<social.FriendStatus> => {
    if (blocked.has(profileId)) return Promise.reject(new Error('Impossible d’ajouter ce joueur'));
    const link = linkBetween(me.id, profileId);
    if (link?.status === 'pending' && link.requesterId === profileId) {
      link.status = 'accepted';
      link.daysAgo = 0;
    } else if (!link) {
      friendships.push({ requesterId: me.id, addresseeId: profileId, status: 'pending', daysAgo: 0 });
    }
    return wait(linkBetween(me.id, profileId)?.status === 'accepted' ? 'friends' : 'sent', 80);
  },
  removeFriend: (myId, profileId) => {
    unlink(myId, profileId);
    return wait(undefined, 80);
  },
  report: () => wait(undefined),
  fetchBlocked: () =>
    wait(
      [...blocked].flatMap((id) => {
        const p = profileById(id);
        return p ? [seatOf(p)] : [];
      }),
    ),
  setBlocked: (_myId, profileId, isBlocked) => {
    if (isBlocked) {
      blocked.add(profileId);
      unlink(me.id, profileId);
    } else {
      blocked.delete(profileId);
    }
    return wait(undefined);
  },

  // Notifications
  fetchNotifications: (): Promise<social.AppNotification[]> =>
    wait(
      notifications.map((n) => {
        const actor = profileById(n.actorId);
        return { id: n.id, type: n.type, actor: actor ? seatOf(actor) : null, gameId: n.gameId, createdAt: n.createdAt, read: n.read };
      }),
    ),
  fetchUnreadCount: () => wait(notifications.filter((n) => !n.read).length),
  markNotificationsRead: () => {
    for (const n of notifications) n.read = true;
    return wait(undefined);
  },

  // Compétition
  fetchEloSnapshot: (gameIds, profileIds) =>
    wait({
      current: Object.fromEntries(profileIds.flatMap((id) => (ratings.has(id) ? [[id, ratings.get(id)!.elo]] : []))),
      before: Object.fromEntries(
        gameIds.flatMap((g) => profileIds.flatMap((p) => (eloBefore.has(`${g}:${p}`) ? [[`${g}:${p}`, eloBefore.get(`${g}:${p}`)!]] : []))),
      ),
    }),
  fetchRating: (profileId): Promise<social.Rating> => {
    const r = ratings.get(profileId);
    return wait(r ? { ...r } : { elo: 1000, games: 0, wins: 0, bestElo: 1000, history: [1000] });
  },
  fetchLeaderboard: (scope: social.LeaderboardScope, since) => {
    const pool = profiles.filter((p) => {
      if (blocked.has(p.id)) return false;
      if (scope === 'friends') return p.id === me.id || areFriends(me.id, p.id);
      if (scope === 'city') return !!me.city && p.city === me.city;
      return true;
    });
    return wait(leaderboardFor(pool, since, allGames()));
  },

  // Bandes
  fetchMyGroups: (myId) => wait(groups.filter((g) => g.members.some((m) => m.id === myId)).map((g) => toGroup(g, myId))),
  fetchGroupMembers: (groupId): Promise<social.GroupMember[]> =>
    wait(
      (groups.find((g) => g.id === groupId)?.members ?? []).flatMap((m) => {
        const p = profileById(m.id);
        return p ? [{ seat: seatOf(p), role: m.role, joinedAt: m.joinedAt }] : [];
      }),
    ),
  createGroup: (myId, input) => {
    const id = demoId(300 + groups.length);
    groups.unshift({
      id,
      name: input.name,
      description: input.description ?? null,
      city: input.city ?? null,
      inviteCode: `D${String(groups.length).padStart(5, '0')}`.slice(0, 6),
      members: [{ id: myId, role: 'admin', joinedAt: new Date().toISOString() }],
    });
    return wait(id);
  },
  fetchGroupPreview: (code): Promise<social.GroupPreview | null> => {
    const g = groups.find((x) => x.inviteCode === code.toUpperCase());
    return wait(
      g
        ? {
            id: g.id,
            name: g.name,
            description: g.description,
            city: g.city,
            members: g.members.length,
            alreadyMember: g.members.some((m) => m.id === me.id),
          }
        : null,
    );
  },
  joinGroup: (code) => {
    const g = groups.find((x) => x.inviteCode === code.toUpperCase());
    if (!g) return Promise.reject(new Error('Code inconnu'));
    if (!g.members.some((m) => m.id === me.id)) g.members.push({ id: me.id, role: 'member', joinedAt: new Date().toISOString() });
    return wait(g.id);
  },
  leaveGroup: (groupId, profileId) => {
    const g = groups.find((x) => x.id === groupId);
    if (g) g.members = g.members.filter((m) => m.id !== profileId);
    return wait(undefined);
  },
  fetchGroupLeaderboard: (groupId, since) => {
    const g = groups.find((x) => x.id === groupId);
    const pool = profiles.filter((p) => g?.members.some((m) => m.id === p.id));
    const rows = leaderboardFor(pool, since, allGames().filter((x) => x.groupId === groupId));
    return wait(rows.sort((a, b) => b.wins - a.wins || b.elo - a.elo));
  },
  fetchGroupFeed: (groupId, myId, before) =>
    wait(page(allGames().filter((g) => g.groupId === groupId), before).map((g) => feedItem(g, myId))),
};

export const demoProfile: Profile = me;
