import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing, StickerSmall } from '@/constants/theme';

import { useToggleKudos } from '../queries';

/** Bravo (le kudos de Strava) : un tap pour féliciter, un autre pour retirer. */
export function KudosButton({ gameId, count, active }: { gameId: string; count: number; active: boolean }) {
  const toggle = useToggleKudos(gameId);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={active ? 'Retirer mon bravo' : 'Bravo !'}
      accessibilityState={{ selected: active }}
      disabled={toggle.isPending}
      onPress={() => toggle.mutate(!active)}
      style={({ pressed }) => [
        styles.button,
        active ? styles.active : styles.idle,
        active && StickerSmall,
        pressed && styles.pressed,
      ]}>
      <Icon name="thumbs-up" size={16} color={active ? Colors.ink : Colors.textSecondary} strokeWidth={active ? 2.4 : 2} />
      <ThemedText type="smallBold" style={{ color: active ? Colors.ink : Colors.textSecondary }}>
        {count > 0 ? count : 'Bravo'}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one + Spacing.half,
    minHeight: 36,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  idle: {
    backgroundColor: Colors.surfaceMuted,
  },
  active: {
    backgroundColor: Colors.gold,
  },
  pressed: {
    opacity: 0.75,
  },
});
