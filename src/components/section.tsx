import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type SectionProps = ViewProps & {
  title: string;
  /** Lien à droite du titre (ex : "Tout voir"). */
  action?: { label: string; onPress: () => void };
  /** Titre en serif (liste) plutôt qu'en petites capitales (formulaire). */
  large?: boolean;
};

export function Section({ title, action, large = false, children, style, ...rest }: SectionProps) {
  return (
    <View style={[styles.section, style]} {...rest}>
      <View style={styles.header}>
        {large ? (
          <ThemedText type="heading">{title}</ThemedText>
        ) : (
          <ThemedText type="caption" themeColor="textSecondary">
            {title}
          </ThemedText>
        )}
        {action ? (
          <Pressable onPress={action.onPress} hitSlop={8}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {action.label}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two + Spacing.one,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
