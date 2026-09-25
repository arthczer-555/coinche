import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';

type SegmentedProps<T extends string | number> = {
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  /** Fond et texte du segment actif. Par défaut : encre. */
  selectedBackground?: string;
  selectedText?: string;
  style?: StyleProp<ViewStyle>;
};

/** Contrôle segmenté façon iOS, sur fond crème. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  selectedBackground = Colors.ink,
  selectedText = Colors.onInk,
  style,
}: SegmentedProps<T>) {
  return (
    <View style={[styles.track, style]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              selected && [styles.selected, { backgroundColor: selectedBackground }],
              pressed && !selected && styles.pressed,
            ]}>
            <ThemedText
              numberOfLines={1}
              style={[styles.label, { color: selected ? selectedText : Colors.text }, selected && styles.selectedLabel]}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.medium,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    minHeight: 42,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.one,
  },
  selected: {
    borderWidth: 1.5,
    borderColor: Colors.ink,
  },
  label: {
    fontSize: 15,
    fontWeight: 600,
  },
  selectedLabel: {
    fontWeight: 800,
  },
  pressed: {
    opacity: 0.6,
  },
});
