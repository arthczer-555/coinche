import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, IconButton } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { FinishedGameCard, OngoingGameCard } from '@/features/coinche/components/game-card';
import { SuitIcon } from '@/features/coinche/components/suit-icon';
import { isFinished, MY_TEAM, percent } from '@/features/coinche/scoring';
import { sortGames, useGames } from '@/features/coinche/store';

const FINISHED_PREVIEW = 3;

/**
 * Fil d'activité. Pour l'instant : les parties jouées sur ce téléphone.
 * Plus tard : les parties des amis, likes, commentaires.
 */
export default function FeedScreen() {
  const gamesById = useGames((s) => s.games);
  const games = useMemo(() => sortGames(gamesById), [gamesById]);
  const ongoing = games.filter((g) => !isFinished(g));
  const finished = games.filter(isFinished);
  const [showAll, setShowAll] = useState(false);

  // Sans comptes, "victoires" = parties gagnées par l'équipe 1 (celle du propriétaire du téléphone).
  const stats = useMemo(
    () => ({
      games: games.length,
      wins: finished.filter((g) => g.winner === MY_TEAM).length,
      winRate: percent(finished.filter((g) => g.winner === MY_TEAM).length, finished.length),
    }),
    [games, finished],
  );

  return (
    <Screen withTabInset>
      <View style={styles.header}>
        <View>
          <ThemedText type="caption" themeColor="textSecondary">
            Coinche
          </ThemedText>
          <ThemedText type="title">Fil</ThemedText>
        </View>
        <IconButton name="settings" accessibilityLabel="Profil et réglages" onPress={() => router.navigate('/profile')} />
      </View>

      {games.length === 0 ? (
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
            <OngoingGameCard key={game.id} game={game} />
          ))}

          {finished.length > 0 ? (
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
                  <FinishedGameCard key={game.id} game={game} />
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
