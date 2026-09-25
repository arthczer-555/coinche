import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing, Sticker, StickerPressed, StickerSmall } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';

type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: Variant;
  /** Icône avant le label. */
  icon?: IconName;
  /** Icône après le label (ex : flèche). */
  trailingIcon?: IconName;
  /** Pour les boutons posés sur un fond sombre (vert). */
  onDark?: boolean;
};

const VARIANTS: Record<Variant, { background: string; text: string; border?: string; sticker?: boolean }> = {
  primary: { background: Colors.primary, text: Colors.onPrimary, sticker: true },
  secondary: { background: Colors.surface, text: Colors.text, sticker: true },
  outline: { background: 'transparent', text: Colors.text, border: Colors.ink },
  ghost: { background: 'transparent', text: Colors.textSecondary },
};

export function Button({
  label,
  variant = 'primary',
  icon,
  trailingIcon,
  onDark = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const colors = VARIANTS[variant];
  const textColor = onDark && variant !== 'secondary' ? Colors.onPrimary : colors.text;
  const borderColor = onDark && variant === 'outline' ? 'rgba(255,251,244,0.35)' : colors.border;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={(state) => [
        styles.button,
        { backgroundColor: colors.background },
        borderColor && { borderColor, borderWidth: 2 },
        colors.sticker && Sticker,
        variant === 'ghost' && styles.ghost,
        state.pressed && (colors.sticker && !disabled ? StickerPressed : styles.pressed),
        disabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      <View style={styles.content}>
        {icon ? <Icon name={icon} size={16} color={textColor} /> : null}
        <ThemedText style={[styles.label, { color: textColor }, variant === 'ghost' && styles.ghostLabel]}>
          {label}
        </ThemedText>
        {trailingIcon ? <Icon name={trailingIcon} size={16} color={textColor} /> : null}
      </View>
    </Pressable>
  );
}

/** Bouton carré ou rond avec une seule icône (retour, fermer, menu...). */
export function IconButton({
  name,
  onPress,
  accessibilityLabel,
  variant = 'surface',
  size = 40,
}: {
  name: IconName;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: 'surface' | 'muted' | 'onDark';
  size?: number;
}) {
  const background =
    variant === 'surface' ? Colors.surface : variant === 'muted' ? Colors.surfaceMuted : 'rgba(251,248,242,0.12)';
  const color = variant === 'onDark' ? Colors.onPrimary : Colors.text;
  const sticker = variant === 'surface';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconButton,
        { width: size, height: size, backgroundColor: background },
        sticker && StickerSmall,
        pressed && (sticker ? StickerPressed : styles.pressed),
      ]}>
      <Icon name={name} size={18} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: Radius.large,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  ghost: {
    minHeight: 44,
  },
  label: {
    fontSize: 16,
    fontWeight: 800,
  },
  ghostLabel: {
    fontSize: 15,
    fontWeight: 600,
  },
  iconButton: {
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.4,
  },
});
