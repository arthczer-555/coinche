import { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius, Spacing, Sticker } from '@/constants/theme';
import { SuitIcon } from '@/features/coinche/components/suit-icon';
import { formatDate, plural } from '@/features/coinche/format';
import { firstName } from '@/features/coinche/players';
import { gameStats, totalScore } from '@/features/coinche/scoring';
import type { Game } from '@/features/coinche/types';
import { AvatarStack } from '@/features/players/components/avatar';
import type { YearRecap } from '@/features/stats/season';
import { recapHeadline } from '@/features/stats/season';

/** Carte image d'une partie (format story 4:5), capturée pour le partage. Rendue hors écran. */
export const GameShareCard = forwardRef<View, { game: Game }>(function GameShareCard({ game }, ref) {
  const score = totalScore(game);
  const stats = gameStats(game);
  return (
    <View ref={ref} collapsable={false} style={[styles.card, styles.green]}>
      <Brand light />
      <View style={styles.teams}>
        {(['A', 'B'] as const).map((team) => {
          const winner = game.winner === team;
          return (
            <View key={team} style={[styles.team, winner && styles.winner]}>
              <View style={styles.teamHead}>
                <SuitIcon suit={team === 'A' ? 'hearts' : 'spades'} size={18} color={team === 'A' ? Colors.teamA : Colors.teamB} />
                {game.teams[team].players.length > 0 ? <AvatarStack seats={game.teams[team].players} size={26} /> : null}
              </View>
              <ThemedText numberOfLines={1} style={styles.teamName}>
                {game.teams[team].name}
              </ThemedText>
              <ThemedText style={[styles.score, { color: team === 'A' ? Colors.teamA : Colors.teamB }]}>
                {score[team]}
              </ThemedText>
              {winner ? <ThemedText style={styles.crown}>VAINQUEUR</ThemedText> : null}
            </View>
          );
        })}
      </View>
      <View style={styles.facts}>
        <Fact value={plural(stats.rounds, 'mène')} />
        {stats.coinches > 0 ? <Fact value={plural(stats.coinches, 'coinche')} /> : null}
        {stats.capots > 0 ? <Fact value={plural(stats.capots, 'capot')} /> : null}
      </View>
      <ThemedText style={styles.footer}>
        {[formatDate(game.finishedAt ?? game.createdAt), game.location].filter(Boolean).join(' · ')}
      </ThemedText>
    </View>
  );
});

/** Carte image du récap de l'année. */
export const RecapShareCard = forwardRef<View, { recap: YearRecap; name: string }>(function RecapShareCard(
  { recap, name },
  ref,
) {
  return (
    <View ref={ref} collapsable={false} style={[styles.card, styles.cream]}>
      <Brand />
      <View>
        <ThemedText style={styles.recapTitle}>Ma saison {recap.year}</ThemedText>
        <ThemedText style={styles.recapName}>{name}</ThemedText>
      </View>
      <ThemedText style={styles.headline}>{recapHeadline(recap)}</ThemedText>
      <View style={styles.recapGrid}>
        <View style={styles.recapRow}>
          <Big value={recap.games} label="parties" />
          <Big value={recap.wins} label="victoires" />
        </View>
        <View style={styles.recapRow}>
          <Big value={recap.capots} label="capots" />
          <Big value={recap.bestWinStreak} label="d’affilée" />
        </View>
      </View>
      {recap.bestPartner ? (
        <ThemedText style={styles.recapLine}>
          Partenaire n°1 : {firstName(recap.bestPartner.seat.name)} ({plural(recap.bestPartner.games, 'partie')})
        </ThemedText>
      ) : null}
      {recap.favoritePlace ? <ThemedText style={styles.recapLine}>QG : {recap.favoritePlace}</ThemedText> : null}
    </View>
  );
});

function Brand({ light = false }: { light?: boolean }) {
  return (
    <View style={styles.brand}>
      <View style={styles.brandMark}>
        <SuitIcon suit="spades" size={16} color={Colors.teamA} />
      </View>
      <ThemedText style={[styles.brandText, { color: light ? Colors.onPrimary : Colors.ink }]}>Coinche</ThemedText>
    </View>
  );
}

function Fact({ value }: { value: string }) {
  return (
    <View style={styles.fact}>
      <ThemedText style={styles.factText}>{value}</ThemedText>
    </View>
  );
}

function Big({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.big}>
      <ThemedText style={styles.bigValue}>{value}</ThemedText>
      <ThemedText style={styles.bigLabel}>{label}</ThemedText>
    </View>
  );
}

/** Taille fixe (logique) des cartes : 360 x 450, soit 1080 x 1350 en @3x. */
const CARD_WIDTH = 360;

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.25,
    padding: Spacing.four,
    justifyContent: 'space-between',
    borderRadius: Radius.xlarge,
  },
  green: {
    backgroundColor: Colors.primary,
  },
  cream: {
    backgroundColor: Colors.background,
    borderWidth: 3,
    borderColor: Colors.ink,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  brandMark: {
    width: 30,
    height: 30,
    borderRadius: Radius.small,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Sticker,
  },
  brandText: {
    fontFamily: Fonts.serif,
    fontSize: 22,
    lineHeight: 26,
  },
  teams: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  team: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.one,
    ...Sticker,
  },
  winner: {
    transform: [{ rotate: '-3deg' }],
  },
  teamHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  teamName: {
    fontSize: 14,
    fontWeight: 700,
    color: Colors.text,
  },
  score: {
    fontFamily: Fonts.serif,
    fontSize: 48,
    lineHeight: 54,
  },
  crown: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: 1.5,
    color: Colors.warning,
  },
  facts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  fact: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    backgroundColor: Colors.gold,
    borderWidth: 2,
    borderColor: Colors.ink,
  },
  factText: {
    fontSize: 13,
    fontWeight: 800,
    color: Colors.ink,
  },
  footer: {
    fontSize: 13,
    color: Colors.onPrimaryMuted,
  },
  recapTitle: {
    fontFamily: Fonts.serif,
    fontSize: 40,
    lineHeight: 44,
    color: Colors.ink,
  },
  recapName: {
    fontSize: 16,
    fontWeight: 700,
    color: Colors.textSecondary,
  },
  headline: {
    fontFamily: Fonts.serifBold,
    fontSize: 20,
    lineHeight: 26,
    color: Colors.teamA,
  },
  recapGrid: {
    gap: Spacing.two,
  },
  recapRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  big: {
    flex: 1,
    padding: Spacing.two + Spacing.one,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.ink,
  },
  bigValue: {
    fontFamily: Fonts.serif,
    fontSize: 30,
    lineHeight: 34,
    color: Colors.ink,
  },
  bigLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: Colors.textSecondary,
  },
  recapLine: {
    fontSize: 14,
    fontWeight: 700,
    color: Colors.text,
  },
});
