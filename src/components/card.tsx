import { StyleSheet, View, type ViewProps } from 'react-native';

import { Colors, Radius, Spacing, Sticker } from '@/constants/theme';

/** Bloc crème clair posé sur le fond, contour encre et ombre décalée (autocollant). */
export function Card({ style, ...rest }: ViewProps) {
  return <View style={[styles.card, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.large,
    padding: Spacing.three,
    ...Sticker,
  },
});
