import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing, StickerSmall } from '@/constants/theme';
import type { Seat } from '@/features/coinche/types';
import { Avatar } from '@/features/players/components/avatar';
import { ELO_NEW_GAMES } from '@/features/stats/elo';

type ProfileHeaderProps = {
  seat: Seat;
  subtitle?: string | null;
  /** Nombre d'amis (lien vers la liste). */
  friends?: number;
  /** Nombre d'amis en commun avec moi (profil d'un autre joueur), affiché s'il y en a. */
  mutual?: number;
  /** Boutons sous l'en-tête (modifier, QR code, ajouter en ami). */
  actions?: ReactNode;
  /** Cote Elo, en grand à côté du nom (absente sans compte). */
  rating?: { elo: number; games: number } | null;
};

/** En-tête de profil : gros avatar, nom, pseudo et ville, nombre d'amis (et en commun), cote Elo en grand. */
export function ProfileHeader({ seat, subtitle, friends, mutual, actions, rating }: ProfileHeaderProps) {
  const openFriends = () => router.push({ pathname: '/friends', params: { id: seat.id } });
  return (
    <View style={styles.container}>
      <View style={styles.identity}>
        <Avatar seat={seat} size={76} outlined />
        <View style={styles.text}>
          <ThemedText type="heading" numberOfLines={2}>
            {seat.name}
          </ThemedText>
          {subtitle ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {subtitle}
            </ThemedText>
          ) : null}
          {friends !== undefined ? (
            <View style={styles.counts}>
              <Count value={friends} label={friends > 1 ? 'amis' : 'ami'} onPress={openFriends} />
              {mutual ? <Count value={mutual} label="en commun" onPress={openFriends} /> : null}
            </View>
          ) : null}
        </View>
        {rating ? <EloBadge elo={rating.elo} games={rating.games} /> : null}
      </View>
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

/** La cote, bien visible. "Provisoire" pendant les premières parties classées, où elle bouge plus vite. */
function EloBadge({ elo, games }: { elo: number; games: number }) {
  const provisional = games < ELO_NEW_GAMES;
  return (
    <View
      style={styles.elo}
      accessibilityLabel={`Cote Elo ${elo}${provisional ? ', provisoire' : ''}`}
      accessible>
      <ThemedText type="title" style={styles.eloValue}>
        {elo}
      </ThemedText>
      <ThemedText type="caption" themeColor="textSecondary">
        {provisional ? 'Elo provisoire' : 'Elo'}
      </ThemedText>
    </View>
  );
}

function Count({ value, label, onPress }: { value: number; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="link" hitSlop={8} onPress={onPress}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.countText}>
        <ThemedText type="smallBold">{value}</ThemedText> {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  counts: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginTop: Spacing.one,
  },
  countText: {
    textDecorationLine: 'underline',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  elo: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.large,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    ...StickerSmall,
  },
  eloValue: {
    fontSize: 30,
    lineHeight: 34,
    fontVariant: ['tabular-nums'],
  },
});
