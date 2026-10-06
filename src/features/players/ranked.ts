import type { Seat, TeamId } from '@/features/coinche/types';
import { isUuid } from '@/features/sync/mappers';

/** Comptes par équipe pour une partie classée (les invités ne comptent pas). */
export const RANKED_ACCOUNTS_PER_TEAM = 2;

export type RankedCheck = {
  /** Places à remplir par un compte (vides ou tenues par un invité). */
  missingAccounts: number;
  /** Comptes de la table qui ne sont pas (encore) mes amis. */
  notFriends: Seat[];
  ok: boolean;
};

/**
 * Une partie peut-elle être classée ? 4 comptes (2 par équipe), tous amis avec celui qui compte les points.
 * Même règle que try_rate_game côté base, qui la revérifie à la fin de la partie.
 */
export function rankedCheck(teams: Record<TeamId, Seat[]>, meId: string, friendIds: ReadonlySet<string>): RankedCheck {
  const isAccount = (seat: Seat) => seat.kind === 'user' && isUuid(seat.id);
  const missingAccounts = (['A', 'B'] as const).reduce(
    (sum, team) => sum + Math.max(0, RANKED_ACCOUNTS_PER_TEAM - teams[team].filter(isAccount).length),
    0,
  );
  const notFriends = [...teams.A, ...teams.B].filter((s) => isAccount(s) && s.id !== meId && !friendIds.has(s.id));
  return { missingAccounts, notFriends, ok: missingAccounts === 0 && notFriends.length === 0 };
}
