import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius } from '@/constants/theme';

import { SUIT_LABEL } from '../format';
import type { Suit, TeamId } from '../types';
import { TEAM_SUIT, useTeamColors } from '../use-team-colors';

/** Couleur "naturelle" d'une carte : rouge pour coeur et carreau, encre pour pique et trèfle. */
export function suitColor(suit: Suit): string {
  return suit === 'hearts' || suit === 'diamonds' ? Colors.teamA : Colors.text;
}

/** Symbole de couleur dessiné en SVG (évite les emojis ♥️ selon la plateforme). SA / TA en texte. */
export function SuitIcon({ suit, size = 14, color }: { suit: Suit; size?: number; color?: string }) {
  const fill = color ?? suitColor(suit);

  if (suit === 'no-trump' || suit === 'all-trump') {
    return (
      <ThemedText accessibilityLabel={SUIT_LABEL[suit]} style={[styles.text, { color: fill, fontSize: size * 0.9 }]}>
        {suit === 'no-trump' ? 'SA' : 'TA'}
      </ThemedText>
    );
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel={SUIT_LABEL[suit]}>
      {suit === 'hearts' ? (
        <Path
          fill={fill}
          d="M12 21.2 3.6 13C1.4 10.8 1.4 7.2 3.6 5c2.1-2.1 5.5-2.1 7.6 0l.8.8.8-.8c2.1-2.1 5.5-2.1 7.6 0 2.2 2.2 2.2 5.8 0 8Z"
        />
      ) : null}
      {suit === 'diamonds' ? <Path fill={fill} d="M12 1.5 20 12l-8 10.5L4 12Z" /> : null}
      {suit === 'spades' ? (
        <Path
          fill={fill}
          d="M12 1.8C9.8 5 3 8.6 3 13.6a4.6 4.6 0 0 0 8 3.1L10 22h4l-1-5.3a4.6 4.6 0 0 0 8-3.1C21 8.6 14.2 5 12 1.8Z"
        />
      ) : null}
      {suit === 'clubs' ? (
        <>
          <Circle cx={12} cy={6.6} r={4.3} fill={fill} />
          <Circle cx={6.6} cy={13.4} r={4.3} fill={fill} />
          <Circle cx={17.4} cy={13.4} r={4.3} fill={fill} />
          <Circle cx={12} cy={12} r={2.6} fill={fill} />
          <Path fill={fill} d="M11 13h2l1.2 9H9.8Z" />
        </>
      ) : null}
    </Svg>
  );
}

/** Carré arrondi coloré avec la couleur de l'équipe (écran nouvelle partie). */
export function TeamBadge({ team, size = 36 }: { team: TeamId; size?: number }) {
  const color = useTeamColors()[team];
  return (
    <View style={[styles.badge, { width: size, height: size, backgroundColor: color }]}>
      <SuitIcon suit={TEAM_SUIT[team]} size={size * 0.45} color={Colors.onPrimary} />
    </View>
  );
}

/** Petit carré de couleur d'équipe (listes). */
export function TeamDot({ team, onDark = false }: { team: TeamId; onDark?: boolean }) {
  const color = useTeamColors({ onDark })[team];
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

const styles = StyleSheet.create({
  text: {
    fontWeight: 800,
    letterSpacing: 0.3,
  },
  badge: {
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 2.5,
  },
});
