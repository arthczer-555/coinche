import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { Section } from '@/components/section';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { Game } from '@/features/coinche/types';
import { monthName, monthlyChallenges } from '@/features/stats/season';

/** Défis du mois : remis à zéro le 1er, avec leur progression. */
export function MonthlyChallenges({ games, playerId }: { games: Game[]; playerId: string }) {
  const now = new Date();
  const challenges = monthlyChallenges(games, playerId, now);
  const done = challenges.filter((c) => c.done).length;
  return (
    <Section title={`Défis de ${monthName(now)} · ${done}/${challenges.length}`}>
      <Card style={styles.card}>
        {challenges.map((challenge) => (
          <View key={challenge.id} style={styles.row}>
            <View style={[styles.check, challenge.done && styles.checkDone]}>
              {challenge.done ? <Icon name="check" size={14} color={Colors.ink} strokeWidth={3} /> : null}
            </View>
            <View style={styles.text}>
              <View style={styles.labelRow}>
                <ThemedText type="smallBold" style={[styles.label, challenge.done && styles.labelDone]}>
                  {challenge.label}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.count}>
                  {challenge.value}/{challenge.goal}
                </ThemedText>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    { width: `${(challenge.value / challenge.goal) * 100}%` },
                    challenge.done && styles.fillDone,
                  ]}
                />
              </View>
            </View>
          </View>
        ))}
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.one,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: Radius.pill,
    borderWidth: 2,
    borderColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: {
    backgroundColor: Colors.gold,
    borderColor: Colors.ink,
  },
  text: {
    flex: 1,
    gap: Spacing.one,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  label: {
    flex: 1,
  },
  labelDone: {
    color: Colors.textSecondary,
  },
  count: {
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 6,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
  },
  fillDone: {
    backgroundColor: Colors.gold,
  },
});
