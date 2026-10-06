import type { Session } from '@supabase/supabase-js';

import { profileToSeat, useSession } from '@/features/auth/session';
import { useGames } from '@/features/coinche/store';
import type { Game } from '@/features/coinche/types';

import { games, me } from './fixtures';

/**
 * Démarrage du mode démo : session fictive, et mes parties (fictives) dans le store local
 * pour qu'elles s'ouvrent et se modifient comme de vraies parties. Les parties déjà là sont remplacées.
 */
export function startDemo() {
  useSession.setState({
    session: { access_token: 'demo', user: { id: me.id } } as unknown as Session,
    profile: me,
  });

  function seed() {
    const current = Object.values(useGames.getState().games);
    if (current.some((g) => g.ownerId === me.id)) return;
    const mine: Record<string, Game> = {};
    for (const game of games) if (game.ownerId === me.id) mine[game.id] = game;
    useGames.setState({ games: mine, pendingSync: {}, pendingDeletes: [] });
  }

  if (useGames.persist.hasHydrated()) seed();
  else useGames.persist.onFinishHydration(seed);
}

export const demoSeat = profileToSeat(me);
