import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { BlockRole } from '@/components/button';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing, Sticker } from '@/constants/theme';
import { GameTags, openGame, ScoreLines } from '@/features/coinche/components/game-card';
import { formatRelative } from '@/features/coinche/format';
import { teamOf } from '@/features/coinche/scoring';
import type { TeamId } from '@/features/coinche/types';
import { Avatar } from '@/features/players/components/avatar';

import type { FeedItem } from '../api';
import { useOtherGameMenu } from '../use-other-game-menu';
import { GamePhoto } from './game-photo';
import { KudosButton } from './kudos-button';

/** Une partie dans le fil, façon Strava : qui, où, quand, le score (avec la cote moyenne des équipes), la photo, bravos et commentaires. */
export function FeedCard({
  item,
  viewerId,
  teamElo,
}: {
  item: FeedItem;
  viewerId: string;
  /** Cote moyenne d'une équipe (voir useTeamElo). */
  teamElo?: (game: FeedItem['game'], team: TeamId) => number | null;
}) {
  const { game, owner } = item;
  const openOtherGameMenu = useOtherGameMenu();
  const isMine = game.ownerId === viewerId;
  const iPlayed = teamOf(game, viewerId) !== null;

  return (
    <Pressable
      accessibilityRole={BlockRole}
      onPress={() => openGame(game.id)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="link"
          disabled={!owner}
          onPress={() => owner && router.push({ pathname: '/u/[id]', params: { id: owner.id } })}
          style={styles.author}>
          {owner ? <Avatar seat={owner} size={36} /> : null}
          <View style={styles.authorText}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {isMine ? 'Toi' : owner ? owner.name : 'Un joueur'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {[formatRelative(game.finishedAt ?? game.createdAt), game.location].filter(Boolean).join(' · ')}
            </ThemedText>
          </View>
        </Pressable>
        {isMine ? null : (
          <Pressable accessibilityRole="button" accessibilityLabel="Options" hitSlop={10} onPress={() => openOtherGameMenu(game, viewerId)}>
            <Icon name="more" size={18} color={Colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {game.note ? <ThemedText style={styles.note}>{game.note}</ThemedText> : null}
      {game.photoPath ? <GamePhoto path={game.photoPath} /> : null}

      <ScoreLines game={game} elo={teamElo && !game.simple ? (team) => teamElo(game, team) : undefined} />
      <GameTags game={game} viewerId={iPlayed ? viewerId : undefined} />

      {/* Juste les points : partie visible de son auteur seul, pas de bravos ni de commentaires. */}
      {game.simple ? null : (
        <View style={styles.footer}>
          <KudosButton gameId={game.id} count={item.kudos} active={item.iKudoed} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Commentaires"
            onPress={() => router.push({ pathname: '/game/[id]/comments', params: { id: game.id } })}
            style={({ pressed }) => [styles.comments, pressed && styles.pressed]}>
            <Icon name="message" size={16} color={Colors.textSecondary} />
            <ThemedText type="smallBold" themeColor="textSecondary">
              {item.comments > 0 ? item.comments : 'Commenter'}
            </ThemedText>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.large,
    padding: Spacing.three,
    gap: Spacing.three,
    ...Sticker,
  },
  pressed: {
    opacity: 0.9,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  author: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.one,
  },
  authorText: {
    flex: 1,
  },
  note: {
    fontSize: 15,
    lineHeight: 21,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingTop: Spacing.two + Spacing.one,
  },
  comments: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + Spacing.half,
    minHeight: 36,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceMuted,
  },
});
