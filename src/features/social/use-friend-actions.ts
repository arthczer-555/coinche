import { confirm, notify } from '@/components/confirm';

import { useAddFriend, useRemoveFriend } from './queries';

/** Ajouter, accepter, refuser, annuler une demande, retirer un ami. Défaire un lien demande confirmation. */
export function useFriendActions() {
  const add = useAddFriend();
  const remove = useRemoveFriend();

  /** Envoie une demande, ou accepte celle de ce joueur. */
  function addFriend(profileId: string) {
    add.mutate(profileId, {
      onError: (error) => notify('Impossible d’ajouter ce joueur', error.message),
    });
  }

  function decline(profileId: string) {
    remove.mutate(profileId);
  }

  function cancelRequest(profileId: string, name: string) {
    confirm('Retirer ta demande ?', `${name} ne la verra plus.`, 'Retirer', () => remove.mutate(profileId));
  }

  function unfriend(profileId: string, name: string) {
    confirm(
      `Retirer ${name} de tes amis ?`,
      'Vous ne verrez plus les parties l’un de l’autre, sauf celles jouées ensemble. Pas de notification.',
      'Retirer',
      () => remove.mutate(profileId),
    );
  }

  return { addFriend, decline, cancelRequest, unfriend, busy: add.isPending || remove.isPending };
}
