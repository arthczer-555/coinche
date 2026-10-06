import { confirm, notify, showActions } from '@/components/confirm';

import type { ReportTarget } from './api';
import { useReport, useSetBlocked } from './queries';

const REASONS: Record<ReportTarget, string[]> = {
  profile: ['Nom ou photo inappropriés', 'Harcèlement', 'Faux compte'],
  game: ['Contenu inapproprié', 'Faux score, triche', 'Je n’étais pas à cette partie'],
  comment: ['Insulte ou harcèlement', 'Spam', 'Contenu inapproprié'],
};

function thanks() {
  notify('Signalement envoyé', 'Merci, on regarde ça rapidement.');
}

/** Signaler un contenu, bloquer / débloquer un joueur (exigence App Store pour les contenus des utilisateurs). */
export function useModeration() {
  const reportMutation = useReport();
  const blockMutation = useSetBlocked();

  function reportContent(type: ReportTarget, id: string) {
    showActions(
      'Pourquoi signaler ?',
      REASONS[type].map((reason) => ({
        label: reason,
        onPress: () => reportMutation.mutate({ type, id, reason }, { onSuccess: thanks }),
      })),
    );
  }

  function toggleBlock(profileId: string, name: string, blocked: boolean) {
    if (blocked) {
      blockMutation.mutate({ profileId, blocked: false });
      return;
    }
    confirm(
      `Bloquer ${name} ?`,
      'Vous ne serez plus amis, et vous ne verrez plus ses parties ni ses commentaires (sauf les parties où vous jouez ensemble). Il n’est pas prévenu.',
      'Bloquer',
      () => blockMutation.mutate({ profileId, blocked: true }),
    );
  }

  return { reportContent, toggleBlock };
}
