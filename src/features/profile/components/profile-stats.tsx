import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { Section } from '@/components/section';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing, Sticker } from '@/constants/theme';
import { plural } from '@/features/coinche/format';
import { percent } from '@/features/coinche/scoring';
import { PlayerRow } from '@/features/players/components/player-row';
import type { PlayerStats } from '@/features/stats/player-stats';

/** Grille de stats d'un joueur, forme du moment et partenaires préférés. */
export function ProfileStats({ stats }: { stats: PlayerStats }) {
  return (
    <>
      <Section title="Statistiques">
        <View style={styles.grid}>
          <StatTile label="Parties" value={stats.games} />
          <StatTile label="Victoires" value={percent(stats.wins, stats.finished)} highlight />
          <StatTile label="Mènes gagnées" value={percent(stats.roundsWon, stats.rounds)} />
          <StatTile
            label={stats.streak < 0 ? 'Défaites d’affilée' : 'Victoires d’affilée'}
            value={Math.abs(stats.streak)}
            icon={stats.streak >= 2}
          />
          <StatTile label="Coinches" value={stats.coinches} />
          <StatTile label="Capots" value={stats.capots} />
          {stats.contractsTaken > 0 ? (
            <StatTile label="Contrats réussis" value={percent(stats.contractsMade, stats.contractsTaken)} />
          ) : null}
          <StatTile label="Meilleure série" value={stats.bestWinStreak} />
        </View>
      </Section>

      {stats.form.length > 0 ? (
        <Section title="Forme">
          <View style={styles.form}>
            {stats.form.map((result, index) => (
              <View
                key={index}
                accessibilityLabel={result === 'W' ? 'Victoire' : result === 'L' ? 'Défaite' : 'Nul'}
                style={[
                  styles.formDot,
                  {
                    backgroundColor:
                      result === 'W' ? Colors.success : result === 'L' ? Colors.danger : Colors.surfaceMuted,
                  },
                ]}>
                <ThemedText style={styles.formLabel} themeColor={result === 'D' ? 'text' : 'onPrimary'}>
                  {result === 'W' ? 'V' : result === 'L' ? 'D' : 'N'}
                </ThemedText>
              </View>
            ))}
          </View>
        </Section>
      ) : null}

      {stats.partners.length > 0 ? (
        <Section title="Partenaires">
          <Card style={styles.list}>
            {stats.partners.slice(0, 5).map((partner, index) => (
              <PlayerRow
                key={partner.seat.id}
                seat={partner.seat}
                bordered={index > 0}
                subtitle={plural(partner.games, 'partie') + ' ensemble'}
                trailing={
                  <ThemedText type="smallBold" themeColor={partner.wins * 2 >= partner.games ? 'success' : 'textSecondary'}>
                    {percent(partner.wins, partner.games)}
                  </ThemedText>
                }
              />
            ))}
          </Card>
        </Section>
      ) : null}
    </>
  );
}

function StatTile({
  label,
  value,
  highlight,
  icon,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
  icon?: boolean;
}) {
  return (
    <View style={[styles.tile, { backgroundColor: highlight ? Colors.primary : Colors.surface }]}>
      <View style={styles.tileValueRow}>
        <ThemedText type="heading" themeColor={highlight ? 'onPrimary' : 'text'} style={styles.tileValue}>
          {value}
        </ThemedText>
        {icon ? <Icon name="flame" size={20} color={Colors.teamA} /> : null}
      </View>
      <ThemedText type="small" themeColor={highlight ? 'onPrimaryMuted' : 'textSecondary'} numberOfLines={1}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
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
  tileValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  tileValue: {
    fontSize: 28,
    lineHeight: 34,
    fontVariant: ['tabular-nums'],
  },
  form: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  formDot: {
    width: 36,
    height: 36,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.ink,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: 800,
  },
  list: {
    paddingVertical: Spacing.one,
  },
});
