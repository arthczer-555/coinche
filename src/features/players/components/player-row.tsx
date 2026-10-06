import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { BlockRole } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import type { Seat } from '@/features/coinche/types';

import { Avatar } from './avatar';

type PlayerRowProps = {
  seat: Seat;
  subtitle?: string;
  onPress?: () => void;
  /** Élément à droite (bouton, étiquette, chevron). */
  trailing?: ReactNode;
  /** Trait de séparation au-dessus (lignes d'une même carte). */
  bordered?: boolean;
};

/** Ligne "avatar + nom + sous-titre" des listes de joueurs. */
export function PlayerRow({ seat, subtitle, onPress, trailing, bordered = false }: PlayerRowProps) {
  const content = (
    <>
      <Avatar seat={seat} size={38} />
      <View style={styles.text}>
        <ThemedText numberOfLines={1} style={styles.name}>
          {seat.name}
        </ThemedText>
        {subtitle ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      {trailing}
    </>
  );

  if (!onPress) return <View style={[styles.row, bordered && styles.border]}>{content}</View>;
  return (
    <Pressable
      accessibilityRole={trailing ? BlockRole : 'button'}
      onPress={onPress}
      style={({ pressed }) => [styles.row, bordered && styles.border, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.one,
    paddingVertical: Spacing.two + Spacing.half,
  },
  border: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  text: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: 700,
  },
  pressed: {
    opacity: 0.7,
  },
});
