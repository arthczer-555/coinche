import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';

import { queryClient, queryKeys } from './queries';

/**
 * Partie en direct : quand l'auteur saisit une mène (et que son téléphone synchronise),
 * le serveur diffuse la modification (Supabase Realtime, filtré par les règles d'accès) et on recharge.
 */
export function useLiveGame(gameId: string | undefined, enabled: boolean) {
  useEffect(() => {
    if (!supabase || !gameId || !enabled) return;
    const sb = supabase;
    const channel = sb
      .channel(`game:${gameId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }, () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.game(gameId) });
      })
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [gameId, enabled]);
}
