import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing, Sticker } from '@/constants/theme';
import { SuitIcon } from '@/features/coinche/components/suit-icon';
import { percent } from '@/features/coinche/scoring';
import { Avatar } from '@/features/players/components/avatar';

import type { LeaderboardRow } from '../api';

export type Metric = 'elo' | 'wins' | 'rate';

export function metricValue(row: LeaderboardRow, metric: Metric): number {
  if (metric === 'elo') return row.elo;
  if (metric === 'wins') return row.wins;
  return row.games > 0 ? row.wins / row.games : 0;
}

const PODIUM = [Colors.gold, '#C9C3B6', '#C98A4B'];

/** Une ligne de classement : rang (podium en couleur), joueur, valeur. */
export function LeaderboardRowItem({ row, rank, metric, isMe }: { row: LeaderboardRow; rank: number; metric: Metric; isMe: boolean }) {
  const display =
    metric === 'elo' ? String(row.elo) : metric === 'wins' ? String(row.wins) : percent(row.wins, row.games);
  const detail =
    metric === 'elo'
      ? `${row.ratedGames} partie${row.ratedGames > 1 ? 's' : ''} classée${row.ratedGames > 1 ? 's' : ''}`
      : `${row.wins}/${row.games} partie${row.games > 1 ? 's' : ''}`;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/u/[id]', params: { id: row.seat.id } })}
      style={({ pressed }) => [styles.row, isMe && styles.me, rank <= 3 && styles.podium, pressed && styles.pressed]}>
      <View style={[styles.rank, rank <= 3 && { backgroundColor: PODIUM[rank - 1] }]}>
        {rank <= 3 ? (
          <SuitIcon suit={(['hearts', 'spades', 'diamonds'] as const)[rank - 1]} size={12} color={Colors.ink} />
        ) : null}
        <ThemedText type="smallBold" style={styles.rankText}>
          {rank}
        </ThemedText>
      </View>
      <Avatar seat={row.seat} size={38} />
      <View style={styles.name}>
        <ThemedText numberOfLines={1} style={styles.bold}>
          {isMe ? 'Toi' : row.seat.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {[detail, row.city].filter(Boolean).join(' · ')}
        </ThemedText>
      </View>
      <ThemedText type="heading" style={styles.value}>
        {display}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.one,
    padding: Spacing.two + Spacing.one,
    borderRadius: Radius.large,
    backgroundColor: Colors.surface,
  },
  podium: {
    ...Sticker,
  },
  me: {
    backgroundColor: Colors.warningSoft,
  },
  pressed: {
    opacity: 0.8,
  },
  rank: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: Spacing.one,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceMuted,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  rankText: {
    fontVariant: ['tabular-nums'],
  },
  name: {
    flex: 1,
  },
  bold: {
    fontSize: 15,
    fontWeight: 700,
  },
  value: {
    fontVariant: ['tabular-nums'],
  },
});
