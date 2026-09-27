import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

import { isFinished, isStoppedEarly, totalScore } from '../scoring';
import type { Game, TeamId } from '../types';
import { TEAM_SUIT, useTeamColors } from '../use-team-colors';
import { SuitIcon } from './suit-icon';

/** Grand tableau de score de l'écran de partie : une carte à jouer par équipe, celle qui mène penche. */
export function Scoreboard({ game }: { game: Game }) {
  const score = totalScore(game);
  const nextRound = game.rounds.length + 1;
  const leader: TeamId | null = score.A === score.B ? null : score.A > score.B ? 'A' : 'B';

  return (
    <View style={styles.container}>
      <View style={styles.cards}>
        <TeamCard game={game} team="A" points={score.A} leader={leader} />
        <TeamCard game={game} team="B" points={score.B} leader={leader} />
      </View>

      <View style={styles.footer}>
        <ThemedText type="small" themeColor="textSecondary">
          {isFinished(game) ? (isStoppedEarly(game) ? 'Partie arrêtée' : 'Partie terminée') : `Mène ${nextRound}`}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {game.rounds.length} jouée{game.rounds.length > 1 ? 's' : ''}
        </ThemedText>
      </View>
    </View>
  );
}

function TeamCard({ game, team, points, leader }: { game: Game; team: TeamId; points: number; leader: TeamId | null }) {
  const color = useTeamColors()[team];
  const remaining = game.targetScore - points;
  const tilt = leader === null ? null : leader === team ? styles.lead : styles.trail;

  return (
    <Card style={[styles.card, tilt]}>
      <View style={styles.cornerTop}>
        <SuitIcon suit={TEAM_SUIT[team]} size={14} color={color} />
      </View>
      <View style={styles.cornerBottom}>
        <SuitIcon suit={TEAM_SUIT[team]} size={14} color={color} />
      </View>

      <ThemedText type="smallBold" numberOfLines={1} style={styles.center}>
        {game.teams[team].name}
      </ThemedText>
      <ThemedText type="display" numberOfLines={1} adjustsFontSizeToFit style={[styles.points, points >= 1000 && styles.pointsLong, { color }]}>
        {points}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        {game.winner === team ? 'Vainqueur' : remaining > 0 ? `encore ${remaining}` : 'Objectif atteint'}
      </ThemedText>

      <View style={styles.track}>
        <View style={[styles.fill, { backgroundColor: color, width: `${Math.min(points / game.targetScore, 1) * 100}%` }]} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  cards: {
    flexDirection: 'row',
    gap: Spacing.two + Spacing.one,
    paddingTop: Spacing.one,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
    paddingTop: Spacing.three + Spacing.one,
    paddingBottom: Spacing.five,
    paddingHorizontal: Spacing.three,
  },
  lead: {
    transform: [{ rotate: '-2deg' }],
  },
  trail: {
    transform: [{ rotate: '1.5deg' }, { translateY: 6 }],
  },
  cornerTop: {
    position: 'absolute',
    top: Spacing.two + Spacing.half,
    left: Spacing.two + Spacing.half,
  },
  cornerBottom: {
    position: 'absolute',
    bottom: Spacing.two + Spacing.half,
    right: Spacing.two + Spacing.half,
    transform: [{ rotate: '180deg' }],
  },
  center: {
    textAlign: 'center',
  },
  points: {
    fontSize: 52,
    lineHeight: 58,
    textAlign: 'center',
  },
  pointsLong: {
    fontSize: 42,
  },
  track: {
    alignSelf: 'stretch',
    height: 5,
    marginTop: Spacing.two,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.one,
  },
});
