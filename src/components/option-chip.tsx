import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing, StickerSmall } from '@/constants/theme';

type OptionChipProps = {
  label?: string;
  /** Icône rendue avec la couleur de texte courante (dépend de l'état sélectionné). */
  renderIcon?: (color: string) => ReactNode;
  selected: boolean;
  onPress: () => void;
  /** Couleur de fond quand l'option est sélectionnée. Par défaut : encre. */
  color?: string;
  /** `outline` : la sélection est marquée par une bordure au lieu d'un fond plein. */
  appearance?: 'fill' | 'outline';
  /** Fond et texte quand non sélectionnée (ex : Capot mis en avant). */
  idleBackground?: string;
  idleTextColor?: string;
  size?: 'small' | 'large';
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function OptionChip({
  label,
  renderIcon,
  selected,
  onPress,
  color = Colors.ink,
  appearance = 'fill',
  idleBackground = Colors.surface,
  idleTextColor = Colors.text,
  size = 'small',
  style,
  accessibilityLabel,
}: OptionChipProps) {
  const filled = selected && appearance === 'fill';
  const textColor = filled ? Colors.onInk : idleTextColor;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        size === 'large' && styles.large,
        {
          backgroundColor: filled ? color : idleBackground,
          borderColor: Colors.border,
        },
        selected && StickerSmall,
        pressed && styles.pressed,
        style,
      ]}>
      {renderIcon?.(textColor)}
      {label ? (
        <ThemedText
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={[styles.label, size === 'large' && styles.largeLabel, { color: textColor }]}>
          {label}
        </ThemedText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 44,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.small + 2,
    borderWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one + Spacing.half,
  },
  large: {
    minHeight: 48,
    borderRadius: Radius.medium,
  },
  label: {
    fontSize: 15,
    fontWeight: 600,
  },
  largeLabel: {
    fontWeight: 800,
  },
  pressed: {
    opacity: 0.75,
  },
});
