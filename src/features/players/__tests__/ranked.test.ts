import type { Seat } from '@/features/coinche/types';

import { rankedCheck } from '../ranked';

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const user = (n: number, name: string): Seat => ({ kind: 'user', id: uuid(n), name });
const me = user(1, 'Moi');
const lea = user(2, 'Léa');
const paul = user(3, 'Paul');
const zoe = user(4, 'Zoé');
const guest: Seat = { kind: 'guest', id: uuid(9), name: 'Papi' };

describe('rankedCheck', () => {
  it('4 comptes, tous mes amis : classée possible', () => {
    const check = rankedCheck({ A: [me, lea], B: [paul, zoe] }, me.id, new Set([lea.id, paul.id, zoe.id]));
    expect(check).toEqual({ missingAccounts: 0, notFriends: [], ok: true });
  });

  it('un joueur pas encore ami : à ajouter', () => {
    const check = rankedCheck({ A: [me, lea], B: [paul, zoe] }, me.id, new Set([lea.id, paul.id]));
    expect(check.ok).toBe(false);
    expect(check.notFriends).toEqual([zoe]);
  });

  it('un invité ou une place vide : il manque des comptes', () => {
    const friends = new Set([lea.id, paul.id]);
    expect(rankedCheck({ A: [me, lea], B: [paul, guest] }, me.id, friends).missingAccounts).toBe(1);
    expect(rankedCheck({ A: [me], B: [paul] }, me.id, friends).missingAccounts).toBe(2);
  });

  it('je peux compter sans jouer : les 4 doivent être mes amis', () => {
    const check = rankedCheck({ A: [lea, paul], B: [zoe, user(5, 'Hugo')] }, me.id, new Set([lea.id, paul.id, zoe.id]));
    expect(check.notFriends.map((s) => s.name)).toEqual(['Hugo']);
  });
});
