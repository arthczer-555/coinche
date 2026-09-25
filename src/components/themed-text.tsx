import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { bodyFont, Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  /**
   * - title / heading / display : Fraunces arrondie, pour les titres et les gros scores.
   * - les autres : Figtree, la famille suit le fontWeight du style.
   * - caption : petit label en capitales espacées (titres de section).
   */
  type?: 'default' | 'small' | 'smallBold' | 'caption' | 'heading' | 'title' | 'display';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  const flat: TextStyle = StyleSheet.flatten([{ color: theme[themeColor ?? 'text'] }, styles[type], style]);
  const font = flat.fontFamily ? null : { fontFamily: bodyFont(flat.fontWeight), fontWeight: 'normal' as const };

  return <Text style={[flat, font]} {...rest} />;
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: 500,
  },
  small: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: 700,
  },
  caption: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: 800,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  heading: {
    fontFamily: Fonts.serif,
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 36,
    lineHeight: 40,
    letterSpacing: -0.8,
  },
  display: {
    fontFamily: Fonts.serif,
    fontSize: 60,
    lineHeight: 64,
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
});
