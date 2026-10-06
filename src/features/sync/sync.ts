import { getMeId, useSession } from '@/features/auth/session';
import { allPlayers } from '@/features/coinche/players';
import { useGames } from '@/features/coinche/store';
import type { Game } from '@/features/coinche/types';
import { removeGamePhotos } from '@/features/social/api';
import { supabase } from '@/lib/supabase';

import { GAME_SELECT, gameToPlayerRows, gameToRow, isUuid, rowToGame, type GameRow } from './mappers';

/**
 * Synchronisation "hors ligne d'abord" :
 * - la saisie écrit toujours dans le store local (useGames), qui garde une file `pendingSync` ;
 * - dès qu'on est connecté et en ligne, `syncNow` envoie la file (une partie à la fois, sans bloquer les autres) ;
 * - l'auteur est le seul écrivain d'une partie : pas de conflit à résoudre, la dernière version locale gagne.
 */

let running: Promise<void> | null = null;
let again = false;

/** Lance une synchro (ou en programme une autre si l'une tourne déjà). */
export function syncNow(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        again = false;
        await pushDeletes();
        await pushPending();
      } while (again);
    } finally {
      running = null;
    }
  })();
  return running;
}

async function pushDeletes() {
  const { session } = useSession.getState();
  const ids = useGames.getState().pendingDeletes.filter(isUuid);
  if (!supabase || !session || ids.length === 0) return;
  // Photos d'abord : le droit de les supprimer dépend de la partie, qui va disparaître.
  for (const id of ids) await removeGamePhotos(id).catch(() => undefined);
  const { error } = await supabase.from('games').delete().in('id', ids);
  if (!error) useGames.getState().markDeleted(ids);
}

async function pushPending() {
  const me = getMeId();
  const { session } = useSession.getState();
  if (!supabase || !session || !isUuid(me)) return;
  const { games, pendingSync } = useGames.getState();
  for (const id of Object.keys(pendingSync)) {
    const game = games[id];
    // Parties d'un autre compte (ou pas encore adoptées) : elles attendent leur propriétaire.
    if (!game || game.ownerId !== me) continue;
    try {
      await pushGame(game, me);
      useGames.getState().markSynced(id, game.updatedAt);
    } catch (error) {
      console.warn(`[sync] partie ${id} non envoyée`, error);
    }
  }
}

async function pushGame(game: Game, ownerId: string) {
  const sb = supabase!;
  const { error: gameError } = await sb.from('games').upsert(gameToRow(game, ownerId));
  if (gameError) throw gameError;

  const guests = allPlayers(game).filter((p) => p.kind === 'guest' && isUuid(p.id));
  if (guests.length > 0) {
    const { error } = await sb
      .from('guest_players')
      .upsert(
        guests.map((g) => ({ id: g.id, owner_id: ownerId, name: g.name })),
        { onConflict: 'id', ignoreDuplicates: true },
      );
    if (error) throw error;
  }

  // Places : on retire celles qui ont changé de joueur (ou sont libérées), puis on écrit les autres.
  // Supprimer avant d'écrire évite les doublons quand deux joueurs échangent leurs places.
  const seats = gameToPlayerRows(game);
  const { data: existing, error: readError } = await sb
    .from('game_players')
    .select('seat, profile_id, guest_id')
    .eq('game_id', game.id);
  if (readError) throw readError;
  const changed = (existing ?? []).filter((row) => {
    const wanted = seats.find((s) => s.seat === row.seat);
    if (!wanted) return true;
    // Invité réclamé entre-temps : le serveur a déjà mis le compte à sa place, on ne touche à rien.
    if (wanted.guest_id && row.profile_id && !row.guest_id) return false;
    return (wanted.profile_id ?? null) !== row.profile_id || (wanted.guest_id ?? null) !== row.guest_id;
  });
  if (changed.length > 0) {
    const { error } = await sb
      .from('game_players')
      .delete()
      .eq('game_id', game.id)
      .in('seat', changed.map((row) => row.seat));
    if (error) throw error;
  }
  const unchanged = new Set((existing ?? []).filter((row) => !changed.includes(row)).map((row) => row.seat));
  const toWrite = seats.filter((s) => !unchanged.has(s.seat));
  if (toWrite.length > 0) {
    const { error } = await sb.from('game_players').upsert(toWrite, { onConflict: 'game_id,seat' });
    if (error) throw error;
  }
}

/** Récupère les parties du compte (autre téléphone, réinstallation, invité réclamé entre-temps). */
export async function pullOwnGames(): Promise<void> {
  const me = getMeId();
  if (!supabase || !isUuid(me)) return;
  const { data, error } = await supabase
    .from('games')
    .select(GAME_SELECT)
    .eq('owner_id', me)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) {
    console.warn('[sync] récupération des parties impossible', error);
    return;
  }
  useGames.getState().mergeRemoteGames((data as unknown as GameRow[]).map(rowToGame));
}
