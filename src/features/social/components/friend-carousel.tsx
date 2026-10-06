import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { BlockRole } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing, StickerPressed, StickerSmall } from '@/constants/theme';
import type { Seat } from '@/features/coinche/types';
import { Avatar } from '@/features/players/components/avatar';

import { FriendButton } from './friend-button';

export type FriendCarouselItem = { seat: Seat; caption?: string };

/** Marge des côtés de l'écran (`Screen`) : le carrousel déborde jusqu'au bord pour qu'on voie qu'il défile. */
const SCREEN_GUTTER = Spacing.three + Spacing.one;

/**
 * Rangée de cartes de joueurs qui défile à l'horizontale : avatar, nom, une ligne, bouton d'ami.
 * Amis d'un joueur sur son profil, "Tu les connais peut-être" sur l'écran Amis.
 */
export function FriendCarousel({ items }: { items: FriendCarouselItem[] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}>
      {items.map((item) => (
        <FriendCard key={item.seat.id} {...item} />
      ))}
    </ScrollView>
  );
}

function FriendCard({ seat, caption }: FriendCarouselItem) {
  return (
    <Pressable
      accessibilityRole={BlockRole}
      accessibilityLabel={seat.name}
      onPress={() => router.push({ pathname: '/u/[id]', params: { id: seat.id } })}
      style={({ pressed }) => [styles.card, pressed && StickerPressed]}>
      <Avatar seat={seat} size={60} />
      <ThemedText numberOfLines={1} style={styles.name}>
        {seat.name}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={2} style={styles.caption}>
        {caption ?? ' '}
      </ThemedText>
      <FriendButton seat={seat} compact />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginHorizontal: -SCREEN_GUTTER,
  },
  content: {
    gap: Spacing.two + Spacing.one,
    paddingHorizontal: SCREEN_GUTTER,
    // Place pour l'ombre décalée des cartes, sinon rognée par le défilement.
    paddingTop: Spacing.half,
    paddingBottom: Spacing.one + Spacing.half,
  },
  card: {
    width: 144,
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two + Spacing.one,
    borderRadius: Radius.large,
    backgroundColor: Colors.surface,
    ...StickerSmall,
  },
  name: {
    alignSelf: 'stretch',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: 700,
    marginTop: Spacing.one,
  },
  caption: {
    alignSelf: 'stretch',
    textAlign: 'center',
    // Deux lignes réservées : les boutons restent alignés d'une carte à l'autre.
    minHeight: 36,
    marginBottom: Spacing.one,
  },
});
