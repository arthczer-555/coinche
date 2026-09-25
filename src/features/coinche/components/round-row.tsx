import { StyleSheet, View } from 'react-native';

import { Tag } from '@/components/tag';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius, Spacing } from '@/constants/theme';

import { COINCHE_LABEL } from '../format';
import { formatBid, scoreRound } from '../scoring';
import type { Game, Round } from '../types';
import { useTeamColors } from '../use-team-colors';

import { SuitIcon } from './suit-icon';

/** En-tête du tableau des mènes, aligné sur les colonnes de RoundRow. */
export function RoundTableHeader({ game }: { game: Game }) {
  return (
    <View style={[styles.row, styles.headerRow]}>
      <ThemedText type="caption" themeColor="textSecondary" style={styles.indexColumn}>
        #
      </ThemedText>
      <ThemedText type="caption" themeColor="textSecondary" style={styles.body}>
        Contrat
      </ThemedText>
      {(['A', 'B'] as const).map((team) => (
        <ThemedText key={team} type="caption" themeColor="textSecondary" numberOfLines={1} style={styles.points}>
          {game.teams[team].name}
        </ThemedText>
      ))}
    </View>
  );
}

export function RoundRow({ game, round, index }: { game: Game; round: Round; index: number }) {
  const colors = useTeamColors();
  const points = scoreRound(round);

  return (
    <View style={styles.row}>
      <View style={styles.indexColumn}>
        <View style={[styles.index, { backgroundColor: colors[round.bidder] }]}>
          <ThemedText style={styles.indexText}>{index + 1}</ThemedText>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.contract}>
          <ThemedText style={styles.bid}>{formatBid(round.bid)}</ThemedText>
          {round.trump ? <SuitIcon suit={round.trump} size={14} /> : null}
        </View>
        <View style={styles.tags}>
          <Tag label={round.made ? 'Fait' : 'Chuté'} tone={round.made ? 'success' : 'danger'} />
          {round.coinche !== 'none' ? <Tag label={COINCHE_LABEL[round.coinche]} tone="warning" /> : null}
          {round.belote ? <Tag label="Belote" /> : null}
        </View>
      </View>

      <Points value={points.A} color={colors.A} />
      <Points value={points.B} color={colors.B} />
    </View>
  );
}

function Points({ value, color }: { value: number; color: string }) {
  return (
    <ThemedText style={[styles.points, styles.pointsText, { color: value ? color : Colors.textTertiary }]}>
      {value ? `+${value}` : '–'}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.two + Spacing.one,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  headerRow: {
    paddingVertical: Spacing.two,
  },
  indexColumn: {
    width: 26,
  },
  index: {
    width: 24,
    height: 24,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 800,
    color: Colors.onPrimary,
  },
  body: {
    flex: 1,
    gap: 3,
  },
  contract: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  bid: {
    fontSize: 16,
    fontWeight: 800,
    fontVariant: ['tabular-nums'],
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  points: {
    width: 58,
    textAlign: 'right',
  },
  pointsText: {
    fontSize: 16,
    fontFamily: Fonts.serif,
    fontVariant: ['tabular-nums'],
  },
});
