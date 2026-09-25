import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Tag } from '@/components/tag';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing, Sticker, StickerPressed } from '@/constants/theme';

import { formatDate, plural } from '../format';
import { gameStats, isStoppedEarly, totalScore } from '../scoring';
import type { Game } from '../types';
import { useGameMenu } from '../use-game-menu';
import { useTeamColors } from '../use-team-colors';
import { TeamDot } from './suit-icon';

function openGame(id: string) {
  router.push({ pathname: '/game/[id]', params: { id } });
}

/** Grande carte verte de la partie en cours, en tête du fil. */
export function OngoingGameCard({ game }: { game: Game }) {
  const colors = useTeamColors({ onDark: true });
  const openGameMenu = useGameMenu();
  const score = totalScore(game);

  return (
    <View style={styles.ongoing}>
      <View style={styles.header}>
        <View style={styles.live}>
          <View style={styles.liveDot} />
          <ThemedText type="caption" themeColor="onPrimary">
            En cours · Mène {game.rounds.length + 1}
          </ThemedText>
        </View>
        <View style={styles.headerRight}>
          <ThemedText type="small" themeColor="onPrimaryMuted">
            Objectif {game.targetScore}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Options de la partie"
            hitSlop={10}
            onPress={() => openGameMenu(game)}
            style={({ pressed }) => [styles.more, pressed && styles.pressed]}>
            <Icon name="more" size={18} color={Colors.onPrimary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.ongoingTeams}>
        {(['A', 'B'] as const).map((team) => (
          <View key={team} style={styles.ongoingTeam}>
            <View style={styles.teamLine}>
              <ThemedText numberOfLines={1} themeColor="onPrimary" style={styles.ongoingName}>
                {game.teams[team].name}
              </ThemedText>
              <ThemedText type="heading" themeColor="onPrimary" style={styles.tabular}>
                {score[team]}
              </ThemedText>
            </View>
            <View style={styles.darkTrack}>
              <View
                style={[
                  styles.fill,
                  { backgroundColor: colors[team], width: `${Math.min(score[team] / game.targetScore, 1) * 100}%` },
                ]}
              />
            </View>
          </View>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={() => openGame(game.id)}
        style={({ pressed }) => [styles.resume, pressed && StickerPressed]}>
        <ThemedText type="smallBold" style={styles.resumeLabel}>
          Reprendre la partie
        </ThemedText>
        <Icon name="arrow-right" size={16} color={Colors.text} />
      </Pressable>
    </View>
  );
}

/** Carte compacte d'une partie terminée. */
export function FinishedGameCard({ game }: { game: Game }) {
  const score = totalScore(game);
  const stats = gameStats(game);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => openGame(game.id)}
      style={({ pressed }) => [styles.finished, pressed && StickerPressed]}>
      <View style={styles.header}>
        <ThemedText type="small" themeColor="textSecondary">
          {formatDate(game.createdAt)}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Objectif {game.targetScore}
        </ThemedText>
      </View>

      <View style={styles.finishedTeams}>
        {(['A', 'B'] as const).map((team) => {
          const isWinner = game.winner === team;
          return (
            <View key={team} style={styles.teamLine}>
              <View style={styles.teamName}>
                <TeamDot team={team} />
                <ThemedText numberOfLines={1} style={[styles.finishedName, isWinner && styles.winnerName]}>
                  {game.teams[team].name}
                </ThemedText>
                {isWinner ? <Icon name="trophy" size={14} color={Colors.gold} /> : null}
              </View>
              <ThemedText
                type="heading"
                style={[styles.tabular, !isWinner && game.winner && { color: Colors.textSecondary }]}>
                {score[team]}
              </ThemedText>
            </View>
          );
        })}
      </View>

      <View style={styles.tags}>
        {isStoppedEarly(game) ? <Tag label={game.winner ? 'Arrêtée' : 'Arrêtée · nul'} tone="danger" /> : null}
        <Tag label={plural(stats.rounds, 'mène')} />
        {stats.coinches > 0 ? <Tag label={plural(stats.coinches, 'coinche')} tone="warning" /> : null}
        {stats.capots > 0 ? <Tag label={plural(stats.capots, 'capot')} tone="success" /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  ongoing: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xlarge,
    padding: Spacing.three + Spacing.one,
    gap: Spacing.three,
    ...Sticker,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  more: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,251,244,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: Radius.pill,
    backgroundColor: Colors.gold,
    boxShadow: '0px 0px 0px 3px rgba(242,182,50,0.3)',
  },
  ongoingTeams: {
    gap: Spacing.three,
  },
  ongoingTeam: {
    gap: Spacing.one + Spacing.half,
  },
  teamLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  ongoingName: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: 700,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
  darkTrack: {
    height: 6,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,251,244,0.16)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
  },
  resume: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.gold,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    minHeight: 46,
    borderWidth: 2,
    borderColor: Colors.ink,
  },
  resumeLabel: {
    fontSize: 14,
    fontWeight: 800,
  },
  finished: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.two + Spacing.one,
    ...Sticker,
  },
  finishedTeams: {
    gap: Spacing.half,
  },
  teamName: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
  },
  finishedName: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: 500,
  },
  winnerName: {
    fontWeight: 700,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + Spacing.half,
  },
  pressed: {
    opacity: 0.85,
  },
});
