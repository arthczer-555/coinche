import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useMe } from '@/features/auth/session';
import { firstName } from '@/features/coinche/players';
import type { Game } from '@/features/coinche/types';
import { AvatarStack } from '@/features/players/components/avatar';

import { useGameSocial } from '../queries';
import { GamePhoto } from './game-photo';
import { KudosButton } from './kudos-button';

/**
 * Récit (note, lieu, photo), bravos et commentaires sous le score d'une partie synchronisée.
 * Le récit s'écrit à la fin (écran de résultat), pas pendant la partie.
 */
export function GameSocial({ game }: { game: Game }) {
  const me = useMe();
  // Juste les points : partie visible de son auteur seul, rien de social à afficher.
  const enabled = game.ownerId !== null && !game.simple;
  const social = useGameSocial(game.id, enabled);

  if (!me.signedIn || !enabled) return null;

  const kudos = social.data?.kudos ?? [];
  const comments = social.data?.comments ?? 0;
  const hasStory = Boolean(game.note || game.location || game.photoPath);

  return (
    <View style={styles.container}>
      {hasStory ? (
        <View style={styles.story}>
          {game.location ? (
            <View style={styles.location}>
              <Icon name="map-pin" size={14} color={Colors.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {game.location}
              </ThemedText>
            </View>
          ) : null}
          {game.note ? <ThemedText style={styles.note}>{game.note}</ThemedText> : null}
          {game.photoPath ? <GamePhoto path={game.photoPath} /> : null}
        </View>
      ) : null}

      <View style={styles.bar}>
        <KudosButton gameId={game.id} count={kudos.length} active={social.data?.iKudoed ?? false} />
        {kudos.length > 0 ? (
          <View style={styles.kudoers}>
            <AvatarStack seats={kudos.slice(0, 4)} size={22} />
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.flex}>
              {kudos.length === 1
                ? `${firstName(kudos[0].name)} dit bravo`
                : `${firstName(kudos[0].name)} et ${kudos.length - 1} autre${kudos.length > 2 ? 's' : ''}`}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.flex} />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Commentaires"
          onPress={() => router.push({ pathname: '/game/[id]/comments', params: { id: game.id } })}
          style={({ pressed }) => [styles.comments, pressed && styles.pressed]}>
          <Icon name="message" size={16} color={Colors.textSecondary} />
          <ThemedText type="smallBold" themeColor="textSecondary">
            {comments > 0 ? comments : 'Commenter'}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  story: {
    gap: Spacing.two,
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  note: {
    fontSize: 16,
    lineHeight: 22,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  kudoers: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
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
  pressed: {
    opacity: 0.75,
  },
});
