import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

import { scoreHistory } from '../scoring';
import type { Game } from '../types';
import { useTeamColors } from '../use-team-colors';

const HEIGHT = 120;
const PAD = 6;

/** Courbes de score cumulé des deux équipes, avec la ligne d'objectif. Pensé pour fond vert. */
export function ScoreChart({ game }: { game: Game }) {
  const [width, setWidth] = useState(0);
  const colors = useTeamColors({ onDark: true });
  const history = scoreHistory(game);
  const maxScore = Math.max(game.targetScore, ...history.map((s) => Math.max(s.A, s.B)));

  const x = (i: number) => PAD + (i / Math.max(history.length - 1, 1)) * (width - PAD * 2);
  const y = (value: number) => PAD + (1 - value / maxScore) * (HEIGHT - PAD * 2);
  const points = (team: 'A' | 'B') => history.map((s, i) => `${x(i)},${y(s[team])}`).join(' ');
  const last = history.length - 1;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <ThemedText type="smallBold" themeColor="onPrimary">
          Évolution du score
        </ThemedText>
        <View style={styles.legend}>
          {(['A', 'B'] as const).map((team) => (
            <View key={team} style={styles.legendItem}>
              <View style={[styles.legendLine, { backgroundColor: colors[team] }]} />
              <ThemedText type="small" themeColor="onPrimaryMuted" numberOfLines={1} style={styles.legendText}>
                {game.teams[team].name}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.chart} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Svg width={width} height={HEIGHT}>
            <Line
              x1={PAD}
              x2={width - PAD}
              y1={y(game.targetScore)}
              y2={y(game.targetScore)}
              stroke="rgba(251,248,242,0.3)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            {(['B', 'A'] as const).map((team) => (
              <Polyline
                key={team}
                points={points(team)}
                fill="none"
                stroke={colors[team]}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}
            {game.winner ? (
              <Circle cx={x(last)} cy={y(history[last][game.winner])} r={4} fill={colors[game.winner]} />
            ) : null}
          </Svg>
        ) : null}
      </View>

      <View style={styles.axis}>
        <ThemedText style={styles.axisText}>Mène 1</ThemedText>
        <ThemedText style={styles.axisText}>Objectif {game.targetScore}</ThemedText>
        <ThemedText style={styles.axisText}>Mène {game.rounds.length}</ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.two + Spacing.one,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  legend: {
    flexDirection: 'row',
    gap: Spacing.two + Spacing.one,
    flexShrink: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flexShrink: 1,
  },
  legendLine: {
    width: 10,
    height: 2.5,
    borderRadius: Radius.pill,
  },
  legendText: {
    fontSize: 12,
    flexShrink: 1,
  },
  chart: {
    height: HEIGHT,
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  axisText: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: 500,
    color: Colors.onPrimaryMuted,
  },
});
