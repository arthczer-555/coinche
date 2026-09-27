/**
 * Design system "Bistrot" : fond crème "tapis de cartes", vert forêt en couleur principale,
 * contours encre et ombres décalées façon autocollant. Tomate (coeur) pour l'équipe 1,
 * bleu roi (pique) pour l'équipe 2, moutarde pour les accents.
 * Palette claire uniquement (userInterfaceStyle: light dans app.json).
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  /** Fond des écrans. */
  background: '#F3EDE1',
  /** Cartes et blocs posés sur le fond. */
  surface: '#FFFBF4',
  /** Contrôles segmentés, chips inactives. */
  surfaceMuted: '#E8E0D0',
  border: '#E8E0D0',
  text: '#1E1A15',
  textSecondary: '#80776A',
  textTertiary: '#ADA595',
  /** Noir d'encre : contours, sélection, tab bar. */
  ink: '#1E1A15',
  onInk: '#FFFBF4',

  primary: '#1F4D3A',
  primaryLight: '#2B5E48',
  onPrimary: '#FFFBF4',
  onPrimaryMuted: '#A9BFB2',

  teamA: '#E0482F',
  teamB: '#2C4DB5',
  /** Variantes lisibles sur fond vert (carte en cours, écran de fin). */
  teamAOnDark: '#FFB3A2',
  teamBOnDark: '#C3CFFF',

  success: '#2F6B45',
  successSoft: '#DCEADB',
  danger: '#C8402A',
  dangerSoft: '#F7D8CF',
  warning: '#86661A',
  warningSoft: '#F7E6B6',
  neutralSoft: '#EDE6D8',
  gold: '#F2B632',
} as const;

export type ThemeColor = keyof typeof Colors;

/**
 * Familles chargées dans le layout racine (useFonts).
 * `serif` : Fraunces Black figée sur SOFT 100 / WONK 1 (assets/fonts), pour titres et scores.
 * `body` : Figtree, une famille par graisse (Android ne synthétise pas les graisses des polices custom).
 */
export const Fonts = {
  serif: 'FrauncesSoft-Black',
  serifBold: 'FrauncesSoft-Bold',
  body: {
    400: 'Figtree_400Regular',
    500: 'Figtree_500Medium',
    600: 'Figtree_600SemiBold',
    700: 'Figtree_700Bold',
    800: 'Figtree_800ExtraBold',
  },
  mono: Platform.select({ ios: 'ui-monospace', web: 'var(--font-mono)', default: 'monospace' }),
} as const;

export type BodyWeight = keyof typeof Fonts.body;

/** Famille Figtree la plus proche d'une graisse CSS (500 par défaut). */
export function bodyFont(weight: string | number | undefined): string {
  const value = weight === 'bold' ? 700 : Number(weight) || 500;
  const available = Object.keys(Fonts.body).map(Number) as BodyWeight[];
  const closest = available.reduce((best, w) => (Math.abs(w - value) < Math.abs(best - value) ? w : best));
  return Fonts.body[closest];
}

/** Contour encre + ombre décalée : l'effet "autocollant" des blocs mis en avant. */
export const Sticker = {
  borderWidth: 2,
  borderColor: Colors.ink,
  boxShadow: `3px 3px 0px ${Colors.ink}`,
} as const;

/** Variante discrète (chips sélectionnées, petits boutons). */
export const StickerSmall = {
  borderWidth: 2,
  borderColor: Colors.ink,
  boxShadow: `2px 2px 0px ${Colors.ink}`,
} as const;

/** État appuyé d'un autocollant : il "s'enfonce" à la place de son ombre. */
export const StickerPressed = {
  boxShadow: `0px 0px 0px ${Colors.ink}`,
  transform: [{ translateX: 2 }, { translateY: 2 }],
} as const;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Hauteur de la tab bar flottante (sa marge basse dépend de la safe area). */
export const TabBarHeight = 64;
export const MaxContentWidth = 640;
/**
 * Grossissement max appliqué par le réglage "Taille du texte" du téléphone.
 * Au-delà, les éléments à taille fixe (tab bar, pastilles, scores) cassent.
 */
export const MaxFontScale = 1.4;

export const Radius = {
  small: 10,
  medium: 14,
  large: 20,
  xlarge: 26,
  pill: 999,
} as const;
