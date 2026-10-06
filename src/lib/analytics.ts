import { randomUUID } from 'expo-crypto';

import { useSession } from '@/features/auth/session';
import { usePrefs } from '@/features/onboarding/prefs';

/**
 * Mesure d'usage anonyme (PostHog, hébergement UE), pour suivre l'entonnoir :
 * partie lancée -> joueurs tagués -> invité converti -> bravos / commentaires.
 * Désactivée tant que EXPO_PUBLIC_POSTHOG_KEY n'est pas défini. Aucun contenu (noms, notes) n'est envoyé.
 */
const KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

export type AnalyticsEvent =
  | 'game_created'
  | 'game_finished'
  | 'onboarding_completed'
  | 'onboarding_tour_finished'
  | 'guest_invited'
  | 'guest_claimed'
  | 'kudos_given'
  | 'comment_posted'
  | 'friend_request'
  | 'friend_accepted'
  | 'group_created'
  | 'group_joined'
  | 'share_image';

type Properties = Record<string, string | number | boolean | null>;

function distinctId(): string {
  const profileId = useSession.getState().profile?.id;
  if (profileId) return profileId;
  const prefs = usePrefs.getState();
  if (prefs.installId) return prefs.installId;
  const id = randomUUID();
  prefs.setInstallId(id);
  return id;
}

export function track(event: AnalyticsEvent, properties: Properties = {}): void {
  if (!KEY) return;
  fetch(`${HOST}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: KEY,
      event,
      distinct_id: distinctId(),
      properties: { ...properties, signed_in: useSession.getState().profile !== null },
    }),
  }).catch(() => undefined);
}
