import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { Button, IconButton } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useMe } from '@/features/auth/session';
import { FinishedGameCard, OngoingGameCard } from '@/features/coinche/components/game-card';
import { plural } from '@/features/coinche/format';
import { SuitIcon } from '@/features/coinche/components/suit-icon';
import { isFinished, percent } from '@/features/coinche/scoring';
import { FeedCard } from '@/features/social/components/feed-card';
import { useFeed, useMyFriendships, useMyGames, useTeamElo, useUnreadCount } from '@/features/social/queries';
import { resultFor } from '@/features/stats/player-stats';

const FINISHED_PREVIEW = 3;

/**
 * Fil d'activité façon Strava.
 * - Connecté : mes parties et celles de mes amis, avec bravos et commentaires (paginé).
 * - Sans compte : les parties de ce téléphone, comme la v1.0.
 */
export default function FeedScreen() {
  const me = useMe();
  const { games } = useMyGames();
  const unread = useUnreadCount();
  const feed = useFeed();
  const friendships = useMyFriendships();
  const requests = friendships.data?.filter((f) => f.status === 'received').length ?? 0;
  const ongoing = games.filter((g) => !isFinished(g));
  const finished = games.filter(isFinished);
  const [showAll, setShowAll] = useState(false);

  // Les parties en cours ont déjà leur grande carte en haut du fil.
  const ongoingIds = new Set(ongoing.map((g) => g.id));
  const items = (feed.data?.pages.flat() ?? []).filter((item) => !ongoingIds.has(item.game.id));
  const teamElo = useTeamElo(useMemo(() => (feed.data?.pages.flat() ?? []).map((item) => item.game), [feed.data]));

  function onScroll({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const nearEnd = layoutMeasurement.height + contentOffset.y >= contentSize.height - 600;
    if (nearEnd && feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
  }

  const stats = useMemo(() => {
    const results = finished.map((g) => resultFor(g, me.id)).filter((r) => r !== null);
    const wins = results.filter((r) => r === 'W').length;
    return { games: games.length, wins, winRate: percent(wins, results.length) };
  }, [games, finished, me.id]);

  return (
    <Screen
      withTabInset
      onScroll={me.signedIn ? onScroll : undefined}
      scrollEventThrottle={200}
      refreshControl={
        me.signedIn ? (
          <RefreshControl refreshing={feed.isRefetching && !feed.isFetchingNextPage} onRefresh={() => feed.refetch()} />
        ) : undefined
      }>
      <View style={styles.header}>
        <View>
          <ThemedText type="caption" themeColor="textSecondary">
            Coinche
          </ThemedText>
          <ThemedText type="title">Fil</ThemedText>
        </View>
        {me.signedIn ? (
          <View style={styles.headerActions}>
            <View>
              <IconButton
                name="users"
                accessibilityLabel={requests ? `Amis, ${plural(requests, 'demande')}` : 'Amis'}
                onPress={() => router.push('/friends')}
              />
              {requests ? (
                <View style={styles.badge}>
                  <ThemedText style={styles.badgeText}>{requests > 9 ? '9+' : requests}</ThemedText>
                </View>
              ) : null}
            </View>
            <View>
              <IconButton
                name="bell"
                accessibilityLabel={unread.data ? `${unread.data} notifications non lues` : 'Notifications'}
                onPress={() => router.push('/notifications')}
              />
              {unread.data ? (
                <View style={styles.badge}>
                  <ThemedText style={styles.badgeText}>{unread.data > 9 ? '9+' : unread.data}</ThemedText>
                </View>
              ) : null}
            </View>
          </View>
        ) : (
          <IconButton name="settings" accessibilityLabel="Réglages" onPress={() => router.push('/settings')} />
        )}
      </View>

      {games.length === 0 && items.length === 0 ? (
        <Card style={styles.empty}>
          <View style={styles.emptySuits}>
            <SuitIcon suit="hearts" size={22} />
            <SuitIcon suit="spades" size={22} />
            <SuitIcon suit="diamonds" size={22} />
            <SuitIcon suit="clubs" size={22} />
          </View>
          <ThemedText type="heading" style={styles.center}>
            Aucune partie pour l’instant
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.center}>
            Lance ta première partie, les scores apparaîtront ici.
          </ThemedText>
          <Button
            label="Nouvelle partie"
            trailingIcon="arrow-right"
            onPress={() => router.navigate('/')}
            style={styles.emptyButton}
          />
        </Card>
      ) : (
        <>
          <Card style={styles.stats}>
            <Stat value={stats.games} label="parties" />
            <View style={styles.statDivider} />
            <Stat value={stats.wins} label="victoires" />
            <View style={styles.statDivider} />
            <Stat value={stats.winRate} label="gagnées" />
          </Card>

          {ongoing.map((game) => (
            <OngoingGameCard
              key={game.id}
              game={game}
              readOnly={game.ownerId !== null && game.ownerId !== me.id}
            />
          ))}

          {me.signedIn ? (
            <View style={styles.list}>
              {items.map((item) => (
                <FeedCard key={item.game.id} item={item} viewerId={me.id} teamElo={teamElo} />
              ))}
              {feed.isLoading || feed.isFetchingNextPage ? <ActivityIndicator color={Colors.primary} /> : null}
              {!feed.isLoading && !feed.hasNextPage ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push({ pathname: '/friends', params: { tab: 'find' } })}
                  style={({ pressed }) => [styles.findPlayers, pressed && styles.pressed]}>
                  <ThemedText type="smallBold">Ajoute tes partenaires en amis pour voir leurs parties ici</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    Trouver des joueurs
                  </ThemedText>
                </Pressable>
              ) : null}
            </View>
          ) : finished.length > 0 ? (
            <Section
              large
              title="Terminées"
              action={
                finished.length > FINISHED_PREVIEW
                  ? { label: showAll ? 'Réduire' : 'Tout voir', onPress: () => setShowAll((v) => !v) }
                  : undefined
              }>
              <View style={styles.list}>
                {(showAll ? finished : finished.slice(0, FINISHED_PREVIEW)).map((game) => (
                  <FinishedGameCard key={game.id} game={game} viewerId={me.id} />
                ))}
              </View>
            </Section>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="heading" style={styles.statValue}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stats: {
    flexDirection: 'row',
    paddingVertical: Spacing.two + Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontVariant: ['tabular-nums'],
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: Spacing.one,
  },
  list: {
    gap: Spacing.two + Spacing.one,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: Radius.pill,
    backgroundColor: Colors.teamA,
    borderWidth: 1.5,
    borderColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  badgeText: {
    color: Colors.onPrimary,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: 800,
  },
  findPlayers: {
    alignItems: 'center',
    gap: 2,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.textTertiary,
  },
  pressed: {
    opacity: 0.8,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  emptySuits: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.one,
  },
  center: {
    textAlign: 'center',
  },
  emptyButton: {
    alignSelf: 'stretch',
    marginTop: Spacing.two,
  },
});
