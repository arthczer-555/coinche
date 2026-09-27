import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing, Sticker } from '@/constants/theme';
import { SuitIcon } from '@/features/coinche/components/suit-icon';
import { gameStats, isFinished, MY_TEAM, percent } from '@/features/coinche/scoring';
import { useGames } from '@/features/coinche/store';

/**
 * Profil. Les stats sont calculées sur toutes les parties locales, du point de vue de l'équipe 1.
 * Quand il y aura des comptes, elles seront filtrées sur les parties du joueur.
 */
export default function ProfileScreen() {
  const gamesById = useGames((s) => s.games);

  const stats = useMemo(() => {
    const games = Object.values(gamesById);
    const finished = games.filter(isFinished);
    const perGame = games.map(gameStats);
    const rounds = perGame.reduce((n, s) => n + s.rounds, 0);
    const roundsWon = perGame.reduce((n, s) => n + s.roundsWon[MY_TEAM], 0);
    return {
      games: games.length,
      rounds,
      gamesWonRate: percent(finished.filter((g) => g.winner === MY_TEAM).length, finished.length),
      roundsWonRate: percent(roundsWon, rounds),
      coinches: perGame.reduce((n, s) => n + s.coinches, 0),
      capots: perGame.reduce((n, s) => n + s.capots, 0),
    };
  }, [gamesById]);

  return (
    <Screen withTabInset>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="caption" themeColor="textSecondary">
            Coinche
          </ThemedText>
          <ThemedText type="title">Profil</ThemedText>
          <ThemedText themeColor="textSecondary">Compte et amis bientôt disponibles</ThemedText>
        </View>
        <View style={styles.avatar}>
          <SuitIcon suit="spades" size={26} color={Colors.onPrimary} />
        </View>
      </View>

      <Section title="Statistiques">
        <View style={styles.grid}>
          <StatTile label="Parties" value={stats.games} />
          <StatTile label="Mènes" value={stats.rounds} />
          <StatTile label="Parties gagnées" value={stats.gamesWonRate} highlight />
          <StatTile label="Mènes gagnées" value={stats.roundsWonRate} />
          <StatTile label="Coinches" value={stats.coinches} />
          <StatTile label="Capots" value={stats.capots} />
        </View>
      </Section>

      <Section title="À venir">
        <Card style={styles.soon}>
          {['Amis et fil social', 'Classements entre potes', 'Badges et records', 'Stats par joueur et par partenaire'].map(
            (item, index) => (
              <View key={item} style={[styles.soonRow, index > 0 && styles.soonBorder]}>
                <SuitIcon suit={(['hearts', 'spades', 'diamonds', 'clubs'] as const)[index]} size={12} />
                <ThemedText>{item}</ThemedText>
              </View>
            ),
          )}
        </Card>
      </Section>
    </Screen>
  );
}

function StatTile({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <View style={[styles.tile, { backgroundColor: highlight ? Colors.primary : Colors.surface }]}>
      <ThemedText type="heading" themeColor={highlight ? 'onPrimary' : 'text'} style={styles.tileValue}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor={highlight ? 'onPrimaryMuted' : 'textSecondary'}>
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
    gap: Spacing.three,
  },
  headerText: {
    flexShrink: 1,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: Radius.pill,
    backgroundColor: Colors.teamA,
    alignItems: 'center',
    justifyContent: 'center',
    ...Sticker,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tile: {
    flexBasis: '48%',
    flexGrow: 1,
    borderRadius: Radius.large,
    padding: Spacing.three,
    ...Sticker,
  },
  tileValue: {
    fontSize: 28,
    lineHeight: 34,
    fontVariant: ['tabular-nums'],
  },
  soon: {
    paddingVertical: Spacing.one,
  },
  soonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.one,
    paddingVertical: Spacing.two + Spacing.one,
  },
  soonBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
});
