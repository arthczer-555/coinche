import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';

export type TagTone = 'success' | 'danger' | 'warning' | 'neutral';

const TONES: Record<TagTone, { background: string; text: string }> = {
  success: { background: Colors.successSoft, text: Colors.success },
  danger: { background: Colors.dangerSoft, text: Colors.danger },
  warning: { background: Colors.warningSoft, text: Colors.warning },
  neutral: { background: Colors.neutralSoft, text: Colors.text },
};

/** Petite étiquette colorée (Fait, Chuté, Coinché ×2, 2 mènes...). */
export function Tag({ label, tone = 'neutral' }: { label: string; tone?: TagTone }) {
  const colors = TONES[tone];
  return (
    <View style={[styles.tag, { backgroundColor: colors.background }]}>
      <ThemedText style={[styles.label, { color: colors.text }]}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingHorizontal: Spacing.one + Spacing.half,
    paddingVertical: 1,
    borderRadius: 6,
  },
  label: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: 800,
  },
});
