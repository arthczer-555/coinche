import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useRef } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { Button, IconButton } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useMe } from '@/features/auth/session';
import { plural } from '@/features/coinche/format';
import { firstName } from '@/features/coinche/players';
import { RecapShareCard } from '@/features/social/components/share-cards';
import { useMyGames } from '@/features/social/queries';
import { shareAsImage } from '@/features/social/share';
import { yearRecap } from '@/features/stats/season';

const CARD_WIDTH = 360;

/** "Ma saison de coinche" : le bilan de l'année, à partager en image. */
export default function RecapScreen() {
  const params = useLocalSearchParams<{ year?: string }>();
  const year = Number.parseInt(params.year ?? '', 10) || new Date().getFullYear();
  const me = useMe();
  const { games } = useMyGames();
  const recap = useMemo(() => yearRecap(games, me.id, year), [games, me.id, year]);
  const cardRef = useRef<View>(null);
  const { width } = useWindowDimensions();
  const scale = Math.min(1, (width - Spacing.four * 2) / CARD_WIDTH);

  const text = `Ma saison ${year} de coinche : ${plural(recap.games, 'partie')}, ${plural(recap.wins, 'victoire')}, ${plural(recap.capots, 'capot')}${
    recap.bestPartner ? `. Partenaire n°1 : ${firstName(recap.bestPartner.seat.name)}` : ''
  }.`;

  return (
    <Screen
      edges={['top', 'bottom']}
      backgroundColor={Colors.primary}
      header={
        <View style={styles.header}>
          <StatusBar style="light" />
          <ThemedText type="caption" themeColor="onPrimaryMuted">
            Récap {year}
          </ThemedText>
          <IconButton name="x" variant="onDark" size={36} accessibilityLabel="Fermer" onPress={router.back} />
        </View>
      }
      footer={<Button label="Partager ma saison" variant="secondary" icon="share" onPress={() => shareAsImage(cardRef, text)} />}>
      <View style={[styles.cardWrap, { height: CARD_WIDTH * 1.25 * scale }]}>
        <View style={{ transform: [{ scale }] }}>
          <RecapShareCard ref={cardRef} recap={recap} name={me.seat.name} />
        </View>
      </View>
      {recap.games > 0 ? (
        <View style={styles.more}>
          {recap.busiestMonth ? (
            <ThemedText themeColor="onPrimary">
              Ton mois le plus coinché : {recap.busiestMonth.name} ({plural(recap.busiestMonth.games, 'partie')}).
            </ThemedText>
          ) : null}
          {recap.biggestComeback ? (
            <ThemedText themeColor="onPrimary">Ta plus belle remontée : {recap.biggestComeback} points de retard.</ThemedText>
          ) : null}
          <ThemedText themeColor="onPrimaryMuted">
            {plural(recap.rounds, 'mène')} jouées, {plural(recap.coinches, 'coinche')} vues passer.
          </ThemedText>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  more: {
    gap: Spacing.two,
  },
});
