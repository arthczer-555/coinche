import type { Bid, Game, Round, Seat, TeamId } from '../types';

let counter = 0;

export function uuid(): string {
  counter += 1;
  return `00000000-0000-4000-8000-${String(counter).padStart(12, '0')}`;
}

export function user(name: string, id = uuid()): Seat {
  return { kind: 'user', id, name, username: name.toLowerCase() };
}

export function guest(name: string, id = uuid()): Seat {
  return { kind: 'guest', id, name };
}

export function round(bidder: TeamId, bid: Bid, made = true, extra: Partial<Round> = {}): Round {
  return {
    id: uuid(),
    bidder,
    bid,
    trump: null,
    coinche: 'none',
    made,
    createdAt: '2026-09-27T20:00:00.000Z',
    ...extra,
  };
}

export function game(overrides: Partial<Game> & { a?: Seat[]; b?: Seat[] } = {}): Game {
  const { a = [], b = [], ...rest } = overrides;
  return {
    id: uuid(),
    ownerId: null,
    teams: { A: { name: 'Nous', players: a }, B: { name: 'Eux', players: b } },
    targetScore: 1000,
    rounds: [],
    visibility: 'public',
    createdAt: '2026-09-27T20:00:00.000Z',
    updatedAt: '2026-09-27T20:00:00.000Z',
    finishedAt: null,
    winner: null,
    ...rest,
  };
}
