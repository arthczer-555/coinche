import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Tag } from '@/components/tag';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing, Sticker, StickerPressed } from '@/constants/theme';
import { AvatarStack } from '@/features/players/components/avatar';
import { resultFor } from '@/features/stats/player-stats';

import { formatDate, plural } from '../format';
import { teamFullName } from '../players';
import { gameStats, isFinished, isStoppedEarly, teamOf, totalScore } from '../scoring';
import type { Game, TeamId } from '../types';
import { useGameMenu } from '../use-game-menu';
import { useTeamColors } from '../use-team-colors';
import { TeamDot } from './suit-icon';

export function openGame(id: string) {
  router.push({ pathname: '/game/[id]', params: { id } });
}

/**
 * Grande carte verte de la partie en cours, en tête du fil.
 * `readOnly` : partie comptée par quelqu'un d'autre (pas de menu, on la regarde seulement).
 */
export function OngoingGameCard({ game, readOnly = false }: { game: Game; readOnly?: boolean }) {
  const colors = useTeamColors({ onDark: true });
  const openGameMenu = useGameMenu();
  const score = totalScore(game);

  return (
    <View style={styles.ongoing}>
      <View style={styles.header}>
        <View style={styles.live}>
          <View style={styles.liveDot} />
          <ThemedText type="caption" themeColor="onPrimary">
            {readOnly ? 'En direct' : 'En cours'} · Mène {game.rounds.length + 1}
          </ThemedText>
        </View>
        <View style={styles.headerRight}>
          <ThemedText type="small" themeColor="onPrimaryMuted">
            Objectif {game.targetScore}
          </ThemedText>
          {readOnly ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Options de la partie"
              hitSlop={10}
              onPress={() => openGameMenu(game)}
              style={({ pressed }) => [styles.more, pressed && styles.pressed]}>
              <Icon name="more" size={18} color={Colors.onPrimary} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.ongoingTeams}>
        {(['A', 'B'] as const).map((team) => (
          <View key={team} style={styles.ongoingTeam}>
            <View style={styles.teamLine}>
              <View style={styles.teamName}>
                {game.teams[team].players.length > 0 ? <AvatarStack seats={game.teams[team].players} size={22} /> : null}
                <ThemedText numberOfLines={2} themeColor="onPrimary" style={styles.ongoingName}>
                  {teamFullName(game.teams[team], team)}
                </ThemedText>
              </View>
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
          {readOnly ? 'Voir la partie' : 'Reprendre la partie'}
        </ThemedText>
        <Icon name="arrow-right" size={16} color={Colors.text} />
      </Pressable>
    </View>
  );
}

const RESULT_TAG = {
  W: { label: 'Victoire', tone: 'success' },
  L: { label: 'Défaite', tone: 'danger' },
  D: { label: 'Nul', tone: 'neutral' },
} as const;

/**
 * Carte compacte d'une partie terminée.
 * `viewerId` : le joueur dont on regarde le fil ou le profil (bilan Victoire / Défaite, capots de son équipe).
 */
export function FinishedGameCard({ game, viewerId }: { game: Game; viewerId?: string }) {
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
      <ScoreLines game={game} />
      <GameTags game={game} viewerId={viewerId} />
    </Pressable>
  );
}

/** Les deux équipes (joueurs, noms complets, trophée, cote moyenne si on la connaît) et leur score. */
export function ScoreLines({ game, elo }: { game: Game; elo?: (team: TeamId) => number | null }) {
  const score = totalScore(game);
  return (
    <View style={styles.finishedTeams}>
      {(['A', 'B'] as const).map((team) => {
        const isWinner = game.winner === team;
        return (
          <View key={team} style={styles.teamLine}>
            <View style={styles.teamName}>
              <TeamDot team={team} />
              {game.teams[team].players.length > 0 ? <AvatarStack seats={game.teams[team].players} size={22} /> : null}
              <ThemedText numberOfLines={2} style={[styles.finishedName, isWinner && styles.winnerName]}>
                {teamFullName(game.teams[team], team)}
              </ThemedText>
              {isWinner ? <Icon name="trophy" size={14} color={Colors.gold} /> : null}
              <EloPill value={elo?.(team) ?? null} />
            </View>
            <ThemedText type="heading" style={[styles.tabular, !isWinner && game.winner && { color: Colors.textSecondary }]}>
              {score[team]}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

/** Cote Elo moyenne d'une équipe, à côté de son nom. */
function EloPill({ value }: { value: number | null }) {
  if (value === null) return null;
  return (
    <View style={styles.eloPill} accessibilityLabel={`Cote moyenne ${value}`}>
      <ThemedText style={styles.eloValue}>
        {value}
        <ThemedText style={styles.eloUnit}> Elo</ThemedText>
      </ThemedText>
    </View>
  );
}

/** Étiquettes d'une partie : bilan du joueur qui regarde, mènes, coinches, capots. */
export function GameTags({ game, viewerId }: { game: Game; viewerId?: string }) {
  const stats = gameStats(game, viewerId ? teamOf(game, viewerId) : null);
  const result = viewerId ? resultFor(game, viewerId) : null;
  return (
    <View style={styles.tags}>
      {!isFinished(game) ? <Tag label="En cours" tone="warning" /> : null}
      {game.ranked ? <Tag label="Classée" tone="success" /> : null}
      {game.simple ? <Tag label="Juste les points" /> : null}
      {result ? <Tag label={RESULT_TAG[result].label} tone={RESULT_TAG[result].tone} /> : null}
      {isStoppedEarly(game) ? <Tag label={game.winner ? 'Arrêtée' : 'Arrêtée · nul'} tone="danger" /> : null}
      <Tag label={plural(stats.rounds, 'mène')} />
      {stats.coinches > 0 ? <Tag label={plural(stats.coinches, 'coinche')} tone="warning" /> : null}
      {stats.capots > 0 ? <Tag label={plural(stats.capots, 'capot')} tone="success" /> : null}
    </View>
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
  eloPill: {
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: Spacing.two,
    paddingVertical: 1,
  },
  eloValue: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 800,
    fontVariant: ['tabular-nums'],
  },
  eloUnit: {
    fontSize: 10,
    fontWeight: 600,
    color: Colors.textSecondary,
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
