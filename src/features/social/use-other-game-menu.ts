import { confirm, notify, showActions, type Action } from '@/components/confirm';
import { findPlayer, firstName } from '@/features/coinche/players';
import { teamOf } from '@/features/coinche/scoring';
import type { Game } from '@/features/coinche/types';

import { useDeclineGame } from './queries';
import { useModeration } from './use-moderation';

/**
 * Menu "…" d'une partie comptée par quelqu'un d'autre : "Pas moi" si l'on m'y a tagué, et signaler.
 * Les parties arrivent sur le profil sans validation : "Pas moi" est la porte de sortie.
 */
export function useOtherGameMenu() {
  const { reportContent } = useModeration();
  const decline = useDeclineGame();

  function askDecline(game: Game, onDeclined?: () => void) {
    const owner = game.ownerId ? findPlayer(game, game.ownerId) : undefined;
    confirm(
      'Tu n’étais pas à cette partie ?',
      `Elle disparaît de ton profil et de tes stats. ${owner ? firstName(owner.name) : 'Son auteur'} verra que tu as dit « Pas moi ».`,
      'Pas moi',
      () =>
        decline.mutate(game.id, {
          onSuccess: onDeclined,
          onError: () => notify('Impossible de te retirer', 'Vérifie ta connexion et réessaie.'),
        }),
    );
  }

  return function openOtherGameMenu(game: Game, viewerId: string, options?: { onDeclined?: () => void }) {
    const actions: Action[] = [];
    if (teamOf(game, viewerId) !== null) {
      actions.push({ label: 'Pas moi, retirer de mon profil', destructive: true, onPress: () => askDecline(game, options?.onDeclined) });
    }
    actions.push({ label: 'Signaler la partie', destructive: true, onPress: () => reportContent('game', game.id) });
    showActions('Partie', actions);
  };
}
