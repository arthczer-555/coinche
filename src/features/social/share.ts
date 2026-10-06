import * as Sharing from 'expo-sharing';
import type { RefObject } from 'react';
import { Platform, Share, type View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

import { notify } from '@/components/confirm';
import { track } from '@/lib/analytics';

const isAbort = (e: unknown) => e instanceof Error && e.name === 'AbortError';

/**
 * Partage d'un message (invitation, lien de profil) : feuille de partage du téléphone.
 * Sur le web : partage du navigateur s'il existe (mobile), sinon le message est copié.
 */
export async function shareText(message: string): Promise<void> {
  try {
    if (Platform.OS !== 'web') {
      await Share.share({ message });
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({ text: message });
        return;
      } catch (e) {
        if (isAbort(e)) return;
      }
    }
    await navigator.clipboard.writeText(message);
    notify('Copié', 'Le message est dans le presse-papiers, colle-le où tu veux.');
  } catch {
    // Partage annulé ou indisponible : rien à faire.
  }
}

/**
 * Web : partage de l'image si le navigateur sait le faire, sinon (ou s'il refuse) téléchargement.
 * Capture avec html-to-image (la version web de view-shot, html2canvas, mange des espaces).
 */
async function shareImageOnWeb(ref: RefObject<View | null>) {
  const { toPng } = await import('html-to-image');
  // Sur le web, la ref d'une View est l'élément du DOM.
  const dataUri = await toPng(ref.current as unknown as HTMLElement, { pixelRatio: 2 });
  const blob = await (await fetch(dataUri)).blob();
  const file = new File([blob], 'coinche.png', { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (e) {
      if (isAbort(e)) throw e;
    }
  }
  const link = document.createElement('a');
  link.href = dataUri;
  link.download = 'coinche.png';
  link.click();
}

/**
 * Partage d'une carte en image (stories, WhatsApp) : capture de la vue puis feuille de partage.
 * Si l'image est impossible (erreur, partage indisponible), on partage le texte de secours.
 */
export async function shareAsImage(ref: RefObject<View | null>, fallbackText: string): Promise<void> {
  try {
    if (!ref.current) throw new Error('indisponible');
    if (Platform.OS === 'web') {
      await shareImageOnWeb(ref);
    } else {
      if (!(await Sharing.isAvailableAsync())) throw new Error('indisponible');
      const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Partager' });
    }
    track('share_image');
  } catch (e) {
    if (!isAbort(e)) await shareText(fallbackText);
  }
}
