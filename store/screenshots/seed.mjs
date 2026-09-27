// Génère l'état persisté zustand ("coinche-games", version 6) pour les captures.
const MULT = { none: 1, coinche: 2, surcoinche: 4 };
const pts = (b) => (b === 'capot' ? 250 : b === 'generale' ? 500 : b);
function score(rounds) {
  const s = { A: 0, B: 0 };
  for (const r of rounds) {
    const m = MULT[r.coinche];
    if (r.made) s[r.bidder] += pts(r.bid) * m;
    else s[r.bidder === 'A' ? 'B' : 'A'] += 160 * m;
  }
  return s;
}
function game(id, teamB, target, start, spec, { ongoing = false } = {}) {
  const t0 = new Date(start).getTime();
  const rounds = spec.map(([bidder, bid, trump, coinche, made], i) => ({
    id: `${id}-r${i + 1}`, bidder, bid, trump, coinche, made,
    createdAt: new Date(t0 + (i + 1) * 6 * 60000).toISOString(),
  }));
  const s = score(rounds);
  const winner = ongoing ? null : s.A > s.B ? 'A' : 'B';
  if (!ongoing && Math.max(s.A, s.B) < target) throw new Error(`${id}: objectif non atteint ${JSON.stringify(s)}`);
  if (ongoing && Math.max(s.A, s.B) >= target) throw new Error(`${id}: déjà fini`);
  console.error(id, JSON.stringify(s), winner);
  return {
    id,
    teams: { A: { name: 'Nous', playerIds: [] }, B: { name: teamB, playerIds: [] } },
    targetScore: target, rounds,
    createdAt: new Date(t0).toISOString(),
    finishedAt: ongoing ? null : rounds[rounds.length - 1].createdAt,
    winner,
  };
}
const games = [
  // Revanche en cours (écran de partie)
  game('g-revanche', 'Eux', 1000, '2026-09-25T20:52:00+02:00', [
    ['A', 80, 'hearts', 'none', true],
    ['B', 100, 'spades', 'none', true],
    ['A', 110, 'diamonds', 'coinche', true],
    ['B', 90, 'clubs', 'none', false],
    ['B', 120, 'no-trump', 'none', true],
    ['A', 100, 'hearts', 'none', false],
  ], { ongoing: true }),
  // Partie terminée juste avant (écran de fin)
  game('g-cousins', 'Eux', 1000, '2026-09-25T19:44:00+02:00', [
    ['B', 90, 'spades', 'none', true],
    ['A', 100, 'hearts', 'coinche', false],
    ['A', 120, 'diamonds', 'none', true],
    ['B', 80, 'clubs', 'none', true],
    ['A', 'capot', 'hearts', 'none', true],
    ['A', 110, 'all-trump', 'coinche', true],
    ['B', 100, 'spades', 'none', false],
    ['B', 130, 'no-trump', 'none', true],
    ['A', 140, 'diamonds', 'none', true],
    ['A', 120, 'hearts', 'none', true],
  ]),
  game('g-voisins', 'Les voisins', 1000, '2026-09-20T21:05:00+02:00', [
    ['A', 100, 'hearts', 'none', true], ['B', 110, 'clubs', 'none', true],
    ['A', 130, 'spades', 'coinche', true], ['B', 90, 'diamonds', 'none', false],
    ['A', 'capot', 'no-trump', 'none', true], ['B', 120, 'hearts', 'none', true],
    ['A', 140, 'clubs', 'none', true], ['A', 100, 'diamonds', 'none', true],
  ]),
  game('g-papi', 'Papi & Mamie', 1000, '2026-09-14T15:30:00+02:00', [
    ['B', 120, 'hearts', 'none', true], ['A', 100, 'spades', 'none', true],
    ['B', 140, 'diamonds', 'coinche', true], ['A', 110, 'clubs', 'coinche', false],
    ['A', 130, 'hearts', 'none', true], ['A', 'capot', 'all-trump', 'none', true],
    ['B', 100, 'spades', 'none', true], ['A', 90, 'no-trump', 'none', true],
    ['B', 160, 'clubs', 'none', true], ['B', 80, 'diamonds', 'none', true],
  ]),
  game('g-cousins-old', 'Eux', 1000, '2026-09-06T20:40:00+02:00', [
    ['A', 120, 'hearts', 'none', true], ['B', 80, 'spades', 'none', false],
    ['A', 100, 'diamonds', 'coinche', true], ['B', 130, 'clubs', 'none', true],
    ['A', 150, 'no-trump', 'none', true], ['A', 110, 'hearts', 'none', true],
    ['B', 120, 'spades', 'none', true], ['A', 130, 'diamonds', 'none', true], ['A', 140, 'clubs', 'none', true],
  ]),
];
const state = { state: { games: Object.fromEntries(games.map((g) => [g.id, g])) }, version: 6 };
process.stdout.write(JSON.stringify({ 'coinche-games': JSON.stringify(state) }));
