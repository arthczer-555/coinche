import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { useSession } from '@/features/auth/session';
import { deletePushToken, savePushToken } from '@/features/social/api';
import { queryClient } from '@/features/social/queries';
import { isBackendEnabled } from '@/lib/supabase';

/**
 * Notifications push : jeton Expo enregistré sur le serveur (table push_tokens),
 * envoi par la fonction Edge `push` à chaque nouvelle notification.
 */

// App ouverte : la notification s'affiche quand même en bannière.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type PushStatus = 'unavailable' | 'undetermined' | 'granted' | 'denied';

/** Id du projet EAS : sans lui (pas encore de `eas init`), pas de jeton push possible. */
function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/** Dernier jeton enregistré par ce téléphone (retiré à la déconnexion). */
let registeredToken: string | null = null;

async function registerToken(myId: string) {
  const id = projectId();
  if (!id || Platform.OS === 'web') return;
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
  await savePushToken(myId, token, Platform.OS === 'ios' ? 'ios' : 'android');
  registeredToken = token;
}

/** Déconnexion : ce téléphone ne reçoit plus les notifications du compte. */
export async function unregisterPushToken(): Promise<void> {
  if (!registeredToken) return;
  await deletePushToken(registeredToken).catch(() => undefined);
  registeredToken = null;
}

/** Bouton "Activer les notifications" : on ne demande la permission qu'au bon moment. */
export function usePushRegistration(): { status: PushStatus; enable: () => Promise<void> } {
  const profileId = useSession((s) => s.profile?.id);
  const [status, setStatus] = useState<PushStatus>('unavailable');

  useEffect(() => {
    if (!isBackendEnabled || Platform.OS === 'web' || !projectId()) return;
    Notifications.getPermissionsAsync().then(({ status: s }) => setStatus(s as PushStatus));
  }, []);

  async function enable() {
    const { status: s } = await Notifications.requestPermissionsAsync();
    setStatus(s as PushStatus);
    if (s === 'granted' && profileId) await registerToken(profileId).catch(() => undefined);
  }

  return { status, enable };
}

function openFromNotification(response: Notifications.NotificationResponse | null | undefined) {
  const url = response?.notification.request.content.data?.url;
  if (typeof url === 'string' && url.startsWith('/')) router.push(url as Href);
}

/** À monter dans le layout racine : jeton rafraîchi à la connexion, tap sur une notification -> bon écran. */
export function usePushBootstrap() {
  const profileId = useSession((s) => s.profile?.id);
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (!profileId || !isBackendEnabled || Platform.OS === 'web') return;
    Notifications.getPermissionsAsync().then(({ status }) => {
      if (status === 'granted') registerToken(profileId).catch(() => undefined);
    });
  }, [profileId]);

  useEffect(() => {
    if (!lastResponse) return;
    openFromNotification(lastResponse);
  }, [lastResponse]);

  useEffect(() => {
    // Nouvelle notification reçue app ouverte : la pastille se met à jour.
    const received = Notifications.addNotificationReceivedListener(() => {
      queryClient.invalidateQueries({ queryKey: ['unread'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });
    return () => received.remove();
  }, []);
}
