import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { Button, IconButton } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { formatRelative } from '@/features/coinche/format';
import { firstName } from '@/features/coinche/players';
import { usePushRegistration } from '@/features/notifications/push';
import { Avatar } from '@/features/players/components/avatar';
import type { AppNotification } from '@/features/social/api';
import { useMarkNotificationsRead, useNotifications } from '@/features/social/queries';

const TEXT: Record<AppNotification['type'], string> = {
  tag: 't’a ajouté à une partie',
  tag_accepted: 'a confirmé votre partie',
  kudos: 'dit bravo pour ta partie',
  comment: 'a commenté une partie',
  friend_request: 'veut t’ajouter à ses amis',
  friend_accepted: 'a accepté ta demande d’ami',
};

/** Où mène une notification. */
export function notificationUrl(n: Pick<AppNotification, 'type' | 'gameId' | 'actor'>) {
  if ((n.type === 'friend_request' || n.type === 'friend_accepted') && n.actor) {
    return { pathname: '/u/[id]' as const, params: { id: n.actor.id } };
  }
  if (n.type === 'comment' && n.gameId) return { pathname: '/game/[id]/comments' as const, params: { id: n.gameId } };
  // Tag : la partie, déjà sur mon profil ("Pas moi" dans son menu "…" si je n'y étais pas).
  if (n.type === 'tag' && !n.gameId) return { pathname: '/profile' as const };
  if (n.gameId) return { pathname: '/game/[id]' as const, params: { id: n.gameId } };
  return null;
}

/** Notifications : tags, confirmations, bravos, commentaires, demandes d'amis. */
export default function NotificationsScreen() {
  const notifications = useNotifications();
  const markRead = useMarkNotificationsRead();
  const push = usePushRegistration();

  // À l'ouverture : tout est lu (la pastille disparaît), la liste garde le surlignage des nouvelles.
  useFocusEffect(
    useCallback(() => {
      markRead.mutate();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  function open(n: AppNotification) {
    const url = notificationUrl(n);
    if (url) router.push(url);
  }

  return (
    <Screen
      edges={['top', 'bottom']}
      refreshControl={
        <RefreshControl refreshing={notifications.isRefetching} onRefresh={() => notifications.refetch()} />
      }
      header={
        <View style={styles.header}>
          <IconButton name="chevron-left" accessibilityLabel="Retour" onPress={router.back} />
          <ThemedText type="heading">Notifications</ThemedText>
          <View style={styles.spacer} />
        </View>
      }>
      {push.status === 'undetermined' ? (
        <Card style={styles.push}>
          <ThemedText type="smallBold">Sois prévenu quand on te tague ou qu’on commente tes parties.</ThemedText>
          <Button label="Activer les notifications" icon="bell" onPress={push.enable} />
        </Card>
      ) : null}

      {notifications.isLoading ? (
        <ActivityIndicator color={Colors.primary} />
      ) : (notifications.data ?? []).length === 0 ? (
        <ThemedText themeColor="textSecondary" style={styles.center}>
          Rien pour l’instant. Tague tes potes dans une partie pour lancer la machine !
        </ThemedText>
      ) : (
        <View style={styles.list}>
          {(notifications.data ?? []).map((n) => (
            <Pressable
              key={n.id}
              accessibilityRole="button"
              onPress={() => open(n)}
              style={({ pressed }) => [styles.row, !n.read && styles.unread, pressed && styles.pressed]}>
              {n.actor ? <Avatar seat={n.actor} size={40} /> : null}
              <View style={styles.text}>
                <ThemedText>
                  <ThemedText style={styles.bold}>{n.actor ? firstName(n.actor.name) : 'Quelqu’un'}</ThemedText>{' '}
                  {TEXT[n.type]}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatRelative(n.createdAt)}
                </ThemedText>
              </View>
              {!n.read ? <View style={styles.dot} /> : null}
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spacer: {
    width: 40,
  },
  push: {
    gap: Spacing.three,
  },
  center: {
    textAlign: 'center',
  },
  list: {
    gap: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two + Spacing.one,
    borderRadius: Radius.medium,
  },
  unread: {
    backgroundColor: Colors.surface,
  },
  pressed: {
    opacity: 0.75,
  },
  text: {
    flex: 1,
  },
  bold: {
    fontWeight: 800,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: Radius.pill,
    backgroundColor: Colors.teamA,
  },
});
