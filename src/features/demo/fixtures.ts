/**
 * Données fictives du mode démo (EXPO_PUBLIC_DEMO=1) : joueurs, parties sur 3 mois, bandes, bravos,
 * commentaires, notifications, cotes. Générées de façon déterministe (même graine = mêmes données).
 */
import { autoTeamName } from '@/features/coinche/players';
import { computeWinner, scoreRound, totalScore } from '@/features/coinche/scoring';
import type { Bid, Coinche, Game, Round, Seat, Suit, TeamId } from '@/features/coinche/types';
import { ELO_START, rateGame } from '@/features/stats/elo';
import type { Profile } from '@/lib/database.types';

/** Générateur pseudo-aléatoire reproductible (mulberry32). */
function seeded(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = seeded(2026);
const pick = <T,>(items: readonly T[]): T => items[Math.floor(rand() * items.length)];
const chance = (p: number) => rand() < p;

export function demoId(n: number): string {
  return `dddddddd-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

const NOW = Date.now();
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const iso = (ms: number) => new Date(ms).toISOString();

// ---------------------------------------------------------------------------
// Joueurs
// ---------------------------------------------------------------------------

const PEOPLE: [string, string, string | null, number | null][] = [
  ['Alex Martin', 'alex.martin', 'Lyon', null],
  ['Léa Dubois', 'lea.d', 'Lyon', 47],
  ['Paul Moreau', 'paulo', 'Lyon', 12],
  ['Zoé Laurent', 'zoe.l', 'Lyon', 45],
  ['Hugo Bernard', 'hugo_b', 'Lyon', null],
  ['Camille Petit', 'camille.p', 'Lyon', 32],
  ['Théo Garnier', 'theo.g', 'Villeurbanne', 15],
  ['Inès Roux', 'ines.roux', 'Lyon', null],
  ['Lucas Fontaine', 'lucasf', 'Paris', 53],
  ['Manon Girard', 'manon.g', 'Paris', 44],
  ['Jules Lefèvre', 'jules.lf', 'Lyon', null],
  ['Chloé Mercier', 'chloe.m', 'Grenoble', 25],
];

/** Amis de mes amis, sans lien avec moi : "Tu les connais peut-être". Ni parties, ni bravos. */
const FRIENDS_OF_FRIENDS: typeof PEOPLE = [
  ['Nathan Faure', 'nathan.f', 'Lyon', 59],
  ['Sarah Lambert', 'sarah.l', 'Lyon', 41],
  ['Maxime Chevalier', 'max.chevalier', 'Villeurbanne', null],
  ['Emma Rousseau', 'emma.r', 'Paris', 23],
];

export const profiles: Profile[] = [...PEOPLE, ...FRIENDS_OF_FRIENDS].map(([name, username, city, avatar], i) => ({
  id: demoId(i + 1),
  username,
  display_name: name,
  avatar_url: avatar ? `https://i.pravatar.cc/200?img=${avatar}` : null,
  city,
  bio: null,
  onboarded: true,
  created_at: iso(NOW - 120 * DAY),
  updated_at: iso(NOW - 120 * DAY),
}));

export const me = profiles[0];

export function seatOf(profile: Profile): Seat {
  return {
    kind: 'user',
    id: profile.id,
    name: profile.display_name,
    username: profile.username,
    avatarUrl: profile.avatar_url,
  };
}

const P = profiles.map(seatOf);
const [ME, LEA, PAUL, ZOE, HUGO, CAMILLE, THEO, INES, LUCAS, MANON, JULES, CHLOE, NATHAN, SARAH, MAXIME, EMMA] = P;
const PAPI: Seat = { kind: 'guest', id: demoId(101), name: 'Papi Jean' };
const TONTON: Seat = { kind: 'guest', id: demoId(102), name: 'Tonton Marc' };

export type DemoFriendship = { requesterId: string; addresseeId: string; status: 'pending' | 'accepted'; daysAgo: number };

const friendship = (requester: Seat, addressee: Seat, status: DemoFriendship['status'], daysAgo: number): DemoFriendship => ({
  requesterId: requester.id,
  addresseeId: addressee.id,
  status,
  daysAgo,
});

/**
 * Amis : j'en ai 8, Lucas et Manon m'ont envoyé une demande, j'en ai envoyé une à Chloé.
 * Nathan, Sarah, Maxime et Emma sont amis de mes amis (suggestions) ; Emma est aussi amie de Lucas et Manon,
 * dont les demandes en attente ne comptent pas comme amis en commun.
 */
export const friendships: DemoFriendship[] = [
  ...[LEA, PAUL, ZOE, HUGO, CAMILLE, INES, JULES].map((p, i) => friendship(ME, p, 'accepted', 100 - i * 6)),
  friendship(ME, THEO, 'accepted', 3),
  friendship(LUCAS, ME, 'pending', 2),
  friendship(MANON, ME, 'pending', 5),
  friendship(ME, CHLOE, 'pending', 1),
  friendship(LEA, ZOE, 'accepted', 110),
  friendship(PAUL, HUGO, 'accepted', 110),
  friendship(LUCAS, MANON, 'accepted', 110),
  friendship(CAMILLE, INES, 'accepted', 80),
  friendship(JULES, THEO, 'accepted', 60),
  ...[LEA, PAUL, ZOE].map((p, i) => friendship(NATHAN, p, 'accepted', 40 + i)),
  friendship(SARAH, HUGO, 'accepted', 30),
  friendship(CAMILLE, SARAH, 'accepted', 25),
  friendship(MAXIME, THEO, 'accepted', 20),
  ...[INES, LUCAS, MANON].map((p, i) => friendship(EMMA, p, 'accepted', 15 + i)),
];

// ---------------------------------------------------------------------------
// Bandes
// ---------------------------------------------------------------------------

export type DemoGroup = {
  id: string;
  name: string;
  description: string | null;
  city: string | null;
  inviteCode: string;
  members: { id: string; role: 'admin' | 'member'; joinedAt: string }[];
};

export const groups: DemoGroup[] = [
  {
    id: demoId(201),
    name: 'Café des Amis',
    description: 'Coinche tous les jeudis soir, perdants payent la tournée.',
    city: 'Lyon',
    inviteCode: 'C4F3A9',
    members: [ME, LEA, PAUL, ZOE, HUGO, THEO, JULES].map((p, i) => ({
      id: p.id,
      role: i === 0 ? 'admin' : 'member',
      joinedAt: iso(NOW - (90 - i) * DAY),
    })),
  },
  {
    id: demoId(202),
    name: 'La famille',
    description: 'Les parties du dimanche chez Mamie.',
    city: null,
    inviteCode: 'FA2B8E',
    members: [CAMILLE, ME, INES].map((p, i) => ({ id: p.id, role: i === 0 ? 'admin' : 'member', joinedAt: iso(NOW - 80 * DAY) })),
  },
];

// ---------------------------------------------------------------------------
// Parties
// ---------------------------------------------------------------------------

const BIDS: Bid[] = [80, 80, 80, 90, 90, 100, 100, 100, 110, 110, 120, 120, 130, 140, 150, 160, 'capot'];
const TRUMPS: (Suit | null)[] = ['hearts', 'diamonds', 'spades', 'clubs', 'no-trump', 'all-trump', null];
const NOTES = [
  'Remontada de fou au dernier pli !',
  'Capot à cœur, la table a applaudi.',
  'On s’est fait coincher trois fois, dur.',
  'Revanche jeudi prochain, on vous attend.',
  'Surcoinche gagnée, Léa en larmes (de joie).',
  'Partie tendue jusqu’au bout.',
  'Belle soirée, belles cartes.',
];

type Blueprint = {
  owner: Seat;
  a: Seat[];
  b: Seat[];
  daysAgo: number;
  location?: string | null;
  groupId?: string | null;
  target?: number;
  ongoingRounds?: number;
  visibility?: Game['visibility'];
};

let gameCount = 0;
let roundCount = 0;

function buildRounds(a: Seat[], b: Seat[], start: number, target: number, limit?: number): Round[] {
  const rounds: Round[] = [];
  const total = { A: 0, B: 0 };
  // L'équipe A a un léger avantage pour des stats réalistes (on gagne un peu plus qu'on ne perd).
  for (let i = 0; i < 40; i += 1) {
    if (limit !== undefined && rounds.length >= limit) break;
    const bidder: TeamId = chance(0.52) ? 'A' : 'B';
    const bid = chance(0.015) ? 'generale' : pick(BIDS);
    const roll = rand();
    const coinche: Coinche = roll < 0.03 ? 'surcoinche' : roll < 0.14 ? 'coinche' : 'none';
    const odds = bid === 'capot' ? 0.6 : bid === 'generale' ? 0.5 : typeof bid === 'number' && bid >= 140 ? 0.6 : 0.74;
    const made = chance(bidder === 'A' ? odds + 0.04 : odds);
    const team = bidder === 'A' ? a : b;
    roundCount += 1;
    const round: Round = {
      id: demoId(10_000 + roundCount),
      bidder,
      takerId: team.length === 2 && chance(0.8) ? pick(team).id : null,
      bid,
      trump: pick(TRUMPS),
      coinche,
      made,
      createdAt: iso(start + (i + 1) * 7 * MINUTE),
    };
    rounds.push(round);
    const s = scoreRound(round);
    total.A += s.A;
    total.B += s.B;
    if (limit === undefined && computeWinner(total, target)) break;
  }
  return rounds;
}

function build(bp: Blueprint): Game {
  gameCount += 1;
  const target = bp.target ?? 1000;
  // Le soir entre 19 h et 23 h.
  const day = new Date(NOW - bp.daysAgo * DAY);
  day.setHours(19 + Math.floor(rand() * 3), Math.floor(rand() * 60), 0, 0);
  const start = Math.min(day.getTime(), NOW - 40 * MINUTE);
  const ongoing = bp.ongoingRounds !== undefined;
  const rounds = buildRounds(bp.a, bp.b, start, target, bp.ongoingRounds);
  const total = rounds.reduce(
    (acc, r) => {
      const s = scoreRound(r);
      return { A: acc.A + s.A, B: acc.B + s.B };
    },
    { A: 0, B: 0 },
  );
  const winner = ongoing ? null : computeWinner(total, target);
  const last = rounds[rounds.length - 1]?.createdAt ?? iso(start);
  return {
    id: demoId(1000 + gameCount),
    ownerId: bp.owner.id,
    teams: {
      A: { name: autoTeamName(bp.a, 'Nous'), players: bp.a },
      B: { name: autoTeamName(bp.b, 'Eux'), players: bp.b },
    },
    targetScore: target,
    rounds,
    visibility: bp.visibility ?? 'friends',
    note: !ongoing && chance(0.3) ? pick(NOTES) : null,
    location: bp.location ?? null,
    photoPath: !ongoing && chance(0.25) ? `demo/${gameCount}` : null,
    groupId: bp.groupId ?? null,
    // Démo : toute table de 4 comptes est classée (pas de contrôle des amitiés, pour des classements fournis).
    ranked: [...bp.a, ...bp.b].length === 4 && [...bp.a, ...bp.b].every((p) => p.kind === 'user'),
    createdAt: iso(start),
    updatedAt: last,
    finishedAt: winner ? last : null,
    winner,
  };
}

const CAFE = 'Café des Amis, Lyon';
const COMPTOIR = 'Le Comptoir, Lyon';
const MAMIE = 'Chez Mamie';
const cafeRegulars = [PAUL, ZOE, HUGO, THEO, JULES];

const blueprints: Blueprint[] = [
  // En cours : ma partie, et une partie de potes en direct.
  { owner: ME, a: [ME, LEA], b: [PAUL, ZOE], daysAgo: 0, location: CAFE, groupId: groups[0].id, ongoingRounds: 6 },
  { owner: HUGO, a: [HUGO, THEO], b: [JULES, INES], daysAgo: 0, location: COMPTOIR, ongoingRounds: 4 },
];

// Mes parties : surtout avec Léa au Café des Amis, parfois en famille avec les invités.
for (let i = 0; i < 34; i += 1) {
  const daysAgo = 1 + i * 2.6 + rand() * 1.5;
  const family = i % 7 === 3;
  if (family) {
    blueprints.push({ owner: ME, a: [ME, CAMILLE], b: [PAPI, i % 2 ? TONTON : INES], daysAgo, location: MAMIE, groupId: groups[1].id });
    continue;
  }
  const partner = chance(0.65) ? LEA : pick([ZOE, PAUL, HUGO]);
  const others = cafeRegulars.filter((p) => p.id !== partner.id);
  const o1 = pick(others);
  const o2 = pick(others.filter((p) => p.id !== o1.id));
  const atCafe = chance(0.6);
  blueprints.push({
    owner: ME,
    a: [ME, partner],
    b: [o1, o2],
    daysAgo,
    location: atCafe ? CAFE : chance(0.5) ? COMPTOIR : null,
    groupId: atCafe ? groups[0].id : null,
    target: chance(0.15) ? 1500 : 1000,
  });
}

// Parties de mes potes (pour le fil) et d'inconnus (classement "Tous").
for (let i = 0; i < 18; i += 1) {
  const daysAgo = 0.5 + i * 4.3 + rand() * 2;
  const crew = i % 3 === 0 ? [LUCAS, MANON, CHLOE, INES] : [LEA, ZOE, PAUL, HUGO, THEO, JULES, CAMILLE].sort(() => rand() - 0.5).slice(0, 4);
  blueprints.push({
    owner: crew[0],
    a: [crew[0], crew[1]],
    b: [crew[2], crew[3]],
    daysAgo,
    location: i % 3 === 0 ? 'Bar du Marché, Paris' : pick([CAFE, COMPTOIR, null]),
  });
}

// Parties d'autres joueurs où l'on m'a tagué (notification 'tag'), déjà sur mon profil.
const taggedBlueprints: Blueprint[] = [
  { owner: LUCAS, a: [LUCAS, ME], b: [MANON, CHLOE], daysAgo: 1.2, location: 'Bar du Marché, Paris' },
  { owner: MANON, a: [MANON, INES], b: [ME, LUCAS], daysAgo: 3.5 },
];

export const games: Game[] = [...blueprints, ...taggedBlueprints].map(build);

/** Statut des joueurs tagués : présents d'office, sauf "Pas moi". */
export const statuses = new Map<string, 'accepted' | 'declined'>();

export function statusOf(gameId: string, profileId: string): 'accepted' | 'declined' {
  return statuses.get(`${gameId}:${profileId}`) ?? 'accepted';
}

// ---------------------------------------------------------------------------
// Bravos, commentaires, notifications
// ---------------------------------------------------------------------------

export const kudos = new Map<string, Set<string>>();
export type DemoComment = { id: string; gameId: string; authorId: string; body: string; createdAt: string };
export const comments: DemoComment[] = [];

const COMMENTS = [
  'Bien joué !',
  'Ce capot 😮',
  'Revanche la semaine pro, vous allez voir.',
  'La surcoinche était osée…',
  'Quelle remontada !',
  'On vous a laissé gagner.',
  'GG, belle partie.',
  'Le 160 à pique, il fallait oser.',
  'Jeudi même heure ?',
];

let commentCount = 0;
for (const game of games) {
  if (!game.finishedAt) continue;
  const players = [...game.teams.A.players, ...game.teams.B.players].filter((p) => p.kind === 'user').map((p) => p.id);
  const candidates = profiles
    .slice(0, PEOPLE.length)
    .map((p) => p.id)
    .filter((id) => id !== game.ownerId);
  const set = new Set<string>();
  const n = Math.floor(rand() * 6);
  for (let i = 0; i < n; i += 1) set.add(pick(candidates));
  if (game.ownerId !== ME.id && chance(0.3)) set.add(ME.id);
  kudos.set(game.id, set);
  const c = chance(0.45) ? 1 + Math.floor(rand() * 3) : 0;
  for (let i = 0; i < c; i += 1) {
    commentCount += 1;
    comments.push({
      id: demoId(50_000 + commentCount),
      gameId: game.id,
      authorId: pick(players.length > 0 ? players : candidates),
      body: pick(COMMENTS),
      createdAt: iso(new Date(game.finishedAt).getTime() + (i + 1) * 17 * MINUTE),
    });
  }
}

export type DemoNotification = {
  id: string;
  type: 'tag' | 'tag_accepted' | 'kudos' | 'comment' | 'friend_request' | 'friend_accepted';
  actorId: string;
  gameId: string | null;
  createdAt: string;
  read: boolean;
};

export const notifications: DemoNotification[] = (() => {
  const list: Omit<DemoNotification, 'id' | 'read'>[] = [];
  const mine = games.filter((g) => g.ownerId === ME.id && g.finishedAt).slice(0, 8);
  for (const game of mine) {
    for (const id of [...(kudos.get(game.id) ?? [])].slice(0, 2)) {
      list.push({ type: 'kudos', actorId: id, gameId: game.id, createdAt: iso(new Date(game.finishedAt!).getTime() + 30 * MINUTE) });
    }
  }
  for (const c of comments.filter((c) => mine.some((g) => g.id === c.gameId) && c.authorId !== ME.id).slice(0, 4)) {
    list.push({ type: 'comment', actorId: c.authorId, gameId: c.gameId, createdAt: c.createdAt });
  }
  for (const game of games.slice(-taggedBlueprints.length)) {
    list.push({ type: 'tag', actorId: game.ownerId!, gameId: game.id, createdAt: game.createdAt });
  }
  list.push({ type: 'friend_request', actorId: LUCAS.id, gameId: null, createdAt: iso(NOW - 2 * DAY) });
  list.push({ type: 'friend_request', actorId: MANON.id, gameId: null, createdAt: iso(NOW - 5 * DAY) });
  list.push({ type: 'friend_accepted', actorId: THEO.id, gameId: null, createdAt: iso(NOW - 3 * DAY) });
  list.push({ type: 'tag_accepted', actorId: LEA.id, gameId: games[2]?.id ?? null, createdAt: iso(NOW - 1 * DAY) });
  return list
    .sort((x, y) => y.createdAt.localeCompare(x.createdAt))
    .slice(0, 18)
    .map((n, i) => ({ ...n, id: demoId(60_000 + i), read: i >= 4 }));
})();

// ---------------------------------------------------------------------------
// Cotes Elo : même formule que la base (features/stats/elo.ts), sur les parties classées. Contrairement
// à la base, la démo ne vérifie pas que l'auteur est ami avec les autres joueurs : les classements restent fournis.
// ---------------------------------------------------------------------------

export type DemoRating = { elo: number; games: number; wins: number; bestElo: number; history: number[] };

export const ratings = new Map<string, DemoRating>();
/** Cote de chaque joueur avant et après chaque partie classée (`<partie>:<joueur>`), comme elo_history. */
export const eloHistory = new Map<string, { before: number; after: number }>();
for (const game of [...games].filter((g) => g.finishedAt && g.ranked).sort((x, y) => x.finishedAt!.localeCompare(y.finishedAt!))) {
  const get = (id: string) => {
    if (!ratings.has(id)) ratings.set(id, { elo: ELO_START, games: 0, wins: 0, bestElo: ELO_START, history: [ELO_START] });
    return ratings.get(id)!;
  };
  const score = totalScore(game);
  const next = rateGame(
    { A: game.teams.A.players.map((p) => get(p.id)), B: game.teams.B.players.map((p) => get(p.id)) },
    { winner: game.winner, scoreA: score.A, scoreB: score.B, target: game.targetScore },
  );
  for (const team of ['A', 'B'] as const) {
    game.teams[team].players.forEach((p, index) => {
      const r = get(p.id);
      eloHistory.set(`${game.id}:${p.id}`, { before: r.elo, after: next[team][index] });
      r.elo = next[team][index];
      r.bestElo = Math.max(r.bestElo, r.elo);
      r.games += 1;
      if (game.winner === team) r.wins += 1;
      r.history.push(r.elo);
    });
  }
}
