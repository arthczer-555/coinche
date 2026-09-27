import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, MaxContentWidth, Spacing, TabBarHeight } from '@/constants/theme';

type ScreenProps = ScrollViewProps & {
  /**
   * Bords verticaux protégés par la safe area. Par défaut : haut uniquement (écrans d'onglet).
   * Les bords gauche/droite sont toujours protégés (encoche en paysage sur tablette ou pliable).
   */
  edges?: ('top' | 'bottom')[];
  /** Laisse la place de la tab bar flottante sous le contenu (ou sous le footer). */
  withTabInset?: boolean;
  /** En-tête fixe au-dessus du contenu scrollable. */
  header?: React.ReactNode;
  /** Pied fixe (boutons d'action). */
  footer?: React.ReactNode;
  backgroundColor?: string;
};

export function Screen({
  children,
  edges = ['top'],
  withTabInset = false,
  header,
  footer,
  backgroundColor = Colors.background,
  contentContainerStyle,
  ...rest
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const tabSpace = withTabInset ? TabBarHeight + Math.max(insets.bottom, Spacing.three) : 0;
  // Insets lus via le hook plutôt que <SafeAreaView> : ce dernier renvoie 0 en haut dans un fullScreenModal iOS.
  const safeAreaPadding = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  };

  return (
    <View style={[styles.safeArea, safeAreaPadding, { backgroundColor }]}>
      {header ? (
        <View style={styles.header}>
          <View style={styles.inner}>{header}</View>
        </View>
      ) : null}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Spacing.five + (footer ? 0 : tabSpace) },
          contentContainerStyle,
        ]}
        {...rest}>
        <View style={styles.inner}>{children}</View>
      </ScrollView>
      {footer ? (
        <View style={[styles.footer, { paddingBottom: Spacing.three + tabSpace }]}>
          <View style={styles.inner}>{footer}</View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.three + Spacing.one,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
  content: {
    paddingHorizontal: Spacing.three + Spacing.one,
    paddingTop: Spacing.three,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    gap: Spacing.four,
  },
  footer: {
    paddingHorizontal: Spacing.three + Spacing.one,
    paddingTop: Spacing.two,
  },
});
