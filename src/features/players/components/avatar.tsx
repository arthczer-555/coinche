import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius } from '@/constants/theme';
import type { Seat } from '@/features/coinche/types';

/** Couleurs de fond des avatars sans photo (tirées du thème Bistrot). */
const AVATAR_COLORS = [Colors.teamA, Colors.teamB, Colors.primary, '#B5762A', '#7A4BA8', '#2F7E7A'];

function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

type AvatarProps = {
  seat: Pick<Seat, 'id' | 'name' | 'kind'> & { avatarUrl?: string | null };
  size?: number;
  /** Contour encre façon autocollant (grands avatars). */
  outlined?: boolean;
};

/**
 * Pastille d'un joueur : photo si elle existe, sinon initiales sur une couleur stable.
 * Un invité (sans compte) a un rond crème en pointillés.
 */
export function Avatar({ seat, size = 36, outlined = false }: AvatarProps) {
  const isGuest = seat.kind === 'guest';
  const background = isGuest ? Colors.surfaceMuted : AVATAR_COLORS[hash(seat.id) % AVATAR_COLORS.length];
  const avatarUrl = 'avatarUrl' in seat ? seat.avatarUrl : null;

  return (
    <View
      accessibilityLabel={seat.name}
      style={[
        styles.avatar,
        { width: size, height: size, backgroundColor: background },
        isGuest && styles.guest,
        outlined && styles.outlined,
      ]}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <ThemedText
          style={[
            styles.initials,
            { fontSize: size * 0.38, lineHeight: size * 0.46, color: isGuest ? Colors.textSecondary : Colors.onPrimary },
          ]}>
          {initials(seat.name)}
        </ThemedText>
      )}
    </View>
  );
}

/** Avatar qui ouvre le profil du joueur. Un invité n'a pas de profil : avatar simple. */
export function AvatarLink({ seat, size = 36 }: { seat: Seat; size?: number }) {
  if (seat.kind === 'guest') return <Avatar seat={seat} size={size} />;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Profil de ${seat.name}`}
      hitSlop={6}
      onPress={() => router.push({ pathname: '/u/[id]', params: { id: seat.id } })}
      style={({ pressed }) => pressed && styles.pressed}>
      <Avatar seat={seat} size={size} />
    </Pressable>
  );
}

/** Avatars qui se chevauchent (équipe, liste de joueurs d'une partie). */
export function AvatarStack({ seats, size = 24 }: { seats: AvatarProps['seat'][]; size?: number }) {
  return (
    <View style={styles.stack}>
      {seats.map((seat, index) => (
        <View key={seat.id} style={[styles.stackItem, { marginLeft: index === 0 ? 0 : -size * 0.3, zIndex: seats.length - index }]}>
          <Avatar seat={seat} size={size} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  guest: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.textTertiary,
  },
  outlined: {
    borderWidth: 2,
    borderStyle: 'solid',
    borderColor: Colors.ink,
  },
  initials: {
    fontFamily: Fonts.body[800],
    letterSpacing: 0.3,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.94 }],
  },
  stack: {
    flexDirection: 'row',
  },
  stackItem: {
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.surface,
  },
});
