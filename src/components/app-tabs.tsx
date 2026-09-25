import { TabList, TabSlot, TabTrigger, Tabs, type TabListProps, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { SuitIcon } from '@/features/coinche/components/suit-icon';

/** Tab bar flottante (pilule noire) avec le bouton "Jouer" au centre. Même rendu sur iOS, Android et web. */
export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <FloatingTabList>
          <TabTrigger name="index" href="/" asChild>
            <TabButton icon="house" label="Fil" />
          </TabTrigger>
          <TabTrigger name="play" href="/play" asChild>
            <PlayButton />
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton icon="user" label="Profil" />
          </TabTrigger>
        </FloatingTabList>
      </TabList>
    </Tabs>
  );
}

function FloatingTabList({ style, ...props }: TabListProps) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.container, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
      <View {...props} style={[styles.bar, style]} />
    </View>
  );
}

function TabButton({ icon, label, isFocused, ...props }: TabTriggerSlotProps & { icon: IconName; label: string }) {
  const color = isFocused ? Colors.onInk : 'rgba(255,251,244,0.5)';
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
      <Icon name={icon} size={20} color={color} strokeWidth={isFocused ? 2.2 : 1.8} />
      <ThemedText style={[styles.label, { color }]}>{label}</ThemedText>
    </Pressable>
  );
}

function PlayButton({ isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityLabel="Nouvelle partie"
      accessibilityState={{ selected: isFocused }}
      style={({ pressed }) => [
        styles.play,
        { backgroundColor: isFocused ? Colors.surface : Colors.teamA },
        pressed && styles.pressed,
      ]}>
      <SuitIcon suit="spades" size={22} color={isFocused ? Colors.teamA : Colors.onPrimary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: {
    height: '100%',
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing.three + Spacing.one,
  },
  bar: {
    width: '100%',
    maxWidth: 420,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.ink,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.two,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    height: '100%',
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: 700,
  },
  play: {
    width: 48,
    height: 48,
    borderRadius: Radius.pill,
    borderWidth: 2,
    borderColor: Colors.onInk,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
