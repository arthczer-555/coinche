import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useMe } from '@/features/auth/session';
import type { LeaderboardScope } from '@/features/social/api';
import { LeaderboardRowItem, metricValue, type Metric } from '@/features/social/components/leaderboard-row';
import { useLeaderboard } from '@/features/social/queries';
import { periodStart, type Period } from '@/features/stats/periods';
import { isBackendEnabled } from '@/lib/supabase';


const SCOPES: { value: LeaderboardScope; label: string }[] = [
  { value: 'friends', label: 'Amis' },
  { value: 'city', label: 'Ma ville' },
  { value: 'all', label: 'Tous' },
];

const METRICS: { value: Metric; label: string }[] = [
  { value: 'elo', label: 'Cote' },
  { value: 'wins', label: 'Victoires' },
  { value: 'rate', label: '% victoires' },
];

const PERIODS: { value: Period; label: string }[] = [
  { value: 'week', label: 'Semaine' },
  { value: 'month', label: 'Mois' },
  { value: 'season', label: 'Saison' },
  { value: 'all', label: 'Toujours' },
];

/** Minimum de parties pour apparaître au classement du % de victoires. */
const MIN_GAMES_FOR_RATE = 5;

/** Classements entre amis, dans sa ville ou général : cote, victoires, % de victoires. */
export default function LeaderboardScreen() {
  const me = useMe();
  const [scope, setScope] = useState<LeaderboardScope>('friends');
  const [metric, setMetric] = useState<Metric>('elo');
  const [period, setPeriod] = useState<Period>('month');
  const since = metric === 'elo' ? null : periodStart(period);
  const board = useLeaderboard(scope, since);

  const rows = useMemo(() => {
    const list = (board.data ?? []).filter((row) =>
      metric === 'elo' ? row.ratedGames > 0 || row.seat.id === me.id : metric === 'rate' ? row.games >= MIN_GAMES_FOR_RATE : row.games > 0,
    );
    return list.sort((a, b) => metricValue(b, metric) - metricValue(a, metric) || b.games - a.games);
  }, [board.data, metric, me.id]);

  if (!me.signedIn) {
    return (
      <Screen withTabInset>
        <ThemedText type="title">Classements</ThemedText>
        <Card style={styles.cta}>
          <ThemedText>
            Compare-toi à tes potes : cote Elo, victoires du mois, meilleur pourcentage. Il faut un compte pour entrer au
            classement.
          </ThemedText>
          {isBackendEnabled ? <Button label="Créer mon compte" onPress={() => router.push('/auth/sign-in')} /> : null}
        </Card>
      </Screen>
    );
  }

  const emptyText =
    scope === 'city' && !me.profile?.city
      ? 'Ajoute ta ville dans ton profil pour voir le classement de ta ville.'
      : metric === 'elo'
        ? 'Personne n’a encore de cote ici. Lancez une partie classée, à 4 comptes entre amis !'
        : metric === 'rate'
          ? `Il faut au moins ${MIN_GAMES_FOR_RATE} parties sur la période pour entrer dans ce classement.`
          : 'Aucune partie terminée sur la période.';

  return (
    <Screen
      withTabInset
      refreshControl={<RefreshControl refreshing={board.isRefetching} onRefresh={() => board.refetch()} />}>
      <View>
        <ThemedText type="caption" themeColor="textSecondary">
          Coinche
        </ThemedText>
        <ThemedText type="title">Classements</ThemedText>
      </View>

      <View style={styles.filters}>
        <Segmented options={SCOPES} value={scope} onChange={setScope} />
        <Segmented
          options={METRICS}
          value={metric}
          onChange={setMetric}
          selectedBackground={Colors.primary}
          selectedText={Colors.onPrimary}
        />
        {metric !== 'elo' ? (
          <Segmented
            options={PERIODS}
            value={period}
            onChange={setPeriod}
            selectedBackground={Colors.surface}
            selectedText={Colors.text}
          />
        ) : null}
      </View>

      {board.isLoading ? (
        <ActivityIndicator color={Colors.primary} />
      ) : rows.length === 0 ? (
        <ThemedText themeColor="textSecondary" style={styles.center}>
          {emptyText}
        </ThemedText>
      ) : (
        <View style={styles.list}>
          {rows.map((row, index) => (
            <LeaderboardRowItem key={row.seat.id} row={row} rank={index + 1} metric={metric} isMe={row.seat.id === me.id} />
          ))}
        </View>
      )}

      {scope === 'friends' ? (
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/friends', params: { tab: 'find' } })} style={styles.more}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Ajoute des amis pour agrandir ton classement
          </ThemedText>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  cta: {
    gap: Spacing.three,
  },
  filters: {
    gap: Spacing.two,
  },
  center: {
    textAlign: 'center',
  },
  list: {
    gap: Spacing.two,
  },
  more: {
    alignItems: 'center',
    padding: Spacing.three,
  },
});
