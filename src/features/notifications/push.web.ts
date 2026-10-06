/**
 * Version web de `push.ts` : pas de notifications push dans le navigateur (expo-notifications n'y est pas
 * supporté). Mêmes exports, sans effet. La pastille et l'écran Notifications marchent quand même.
 */

type PushStatus = 'unavailable' | 'undetermined' | 'granted' | 'denied';

export async function unregisterPushToken(): Promise<void> {}

export function usePushRegistration(): { status: PushStatus; enable: () => Promise<void> } {
  return { status: 'unavailable', enable: async () => undefined };
}

export function usePushBootstrap() {}
