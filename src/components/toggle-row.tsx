import type { ReactNode } from 'react';
import { Platform, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';

type ToggleRowProps = {
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  /** Contenu affiché sous la ligne (ex : choix de l'équipe). */
  children?: ReactNode;
};

/** Ligne de réglage avec un interrupteur, pour les listes de règles. */
export function ToggleRow({ title, subtitle, value, onValueChange, children }: ToggleRowProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.text}>
          <ThemedText style={styles.title}>{title}</ThemedText>
          {subtitle ? (
            <ThemedText type="small" themeColor="textSecondary">
              {subtitle}
            </ThemedText>
          ) : null}
        </View>
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ true: Colors.gold, false: Colors.surfaceMuted }}
          thumbColor={Platform.OS === 'ios' ? undefined : Colors.surface}
          ios_backgroundColor={Colors.surfaceMuted}
          // react-native-web colore le pouce actif avec sa propre prop (turquoise par défaut).
          {...(Platform.OS === 'web' ? { activeThumbColor: Colors.surface } : {})}
        />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  text: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: 700,
  },
});
