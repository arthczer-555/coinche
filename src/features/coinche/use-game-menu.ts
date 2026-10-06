import { router } from 'expo-router';

import { confirm, showActions, type Action } from '@/components/confirm';

import { isFinished, isStoppedEarly, leader, totalScore } from './scoring';
import { useGames } from './store';
import type { Game } from './types';

/** Menu "…" d'une partie : joueurs, récit, terminer maintenant, rouvrir, supprimer. */
export function useGameMenu() {
  const finishGame = useGames((s) => s.finishGame);
  const reopenGame = useGames((s) => s.reopenGame);
  const deleteGame = useGames((s) => s.deleteGame);

  function askFinish(game: Game) {
    const score = totalScore(game);
    const lead = leader(game);
    const message = lead
      ? `${game.teams[lead].name} mène ${Math.max(score.A, score.B)} à ${Math.min(score.A, score.B)} et sera déclaré vainqueur.`
      : `Égalité ${score.A} partout : la partie se termine sur un match nul.`;
    confirm(
      'Terminer la partie ?',
      message,
      'Terminer',
      () => {
        finishGame(game.id);
        router.push({ pathname: '/game/[id]/result', params: { id: game.id } });
      },
      false,
    );
  }

  return function openGameMenu(game: Game, options?: { onDeleted?: () => void }) {
    const actions: Action[] = [];
    // Juste les points : personne à taguer, rien à raconter, la partie reste privée.
    if (!game.simple) {
      actions.push({
        label: 'Joueurs et visibilité',
        onPress: () => router.push({ pathname: '/game/[id]/players', params: { id: game.id } }),
      });
    }
    // Le récit (photo, un mot, le lieu) se raconte une fois la partie finie.
    if (game.ownerId && !game.simple && isFinished(game)) {
      actions.push({
        label: 'Raconter la partie',
        onPress: () => router.push({ pathname: '/game/[id]/story', params: { id: game.id } }),
      });
    }
    if (!isFinished(game)) {
      actions.push({ label: 'Terminer maintenant', onPress: () => askFinish(game) });
    } else if (isStoppedEarly(game)) {
      actions.push({ label: 'Reprendre la partie', onPress: () => reopenGame(game.id) });
    }
    actions.push({
      label: 'Supprimer la partie',
      destructive: true,
      onPress: () =>
        confirm('Supprimer la partie ?', 'Les scores seront perdus.', 'Supprimer', () => {
          deleteGame(game.id);
          options?.onDeleted?.();
        }),
    });
    showActions(`${game.teams.A.name} vs ${game.teams.B.name}`, actions);
  };
}
