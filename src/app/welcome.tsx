import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Colors, MaxContentWidth, Radius, Spacing, Sticker } from '@/constants/theme';
import { SuitIcon } from '@/features/coinche/components/suit-icon';
import type { Suit } from '@/features/coinche/types';
import { usePrefs } from '@/features/onboarding/prefs';

type Slide = { suit: Suit; color: string; title: string; text: string };

const SLIDES: Slide[] = [
  {
    suit: 'hearts',
    color: Colors.teamA,
    title: 'Comptez sans calculer',
    text: 'Le contrat, la coinche, fait ou chuté : l’app fait les comptes. Fini le papier et les calculs de tête au bistrot.',
  },
  {
    suit: 'spades',
    color: Colors.teamB,
    title: 'Taguez vos partenaires',
    text: 'Un pseudo, un QR code ou juste un prénom : la partie arrive sur le profil de chaque joueur, avec ses stats.',
  },
  {
    suit: 'diamonds',
    color: Colors.gold,
    title: 'Le Strava de la coinche',
    text: 'Fil de vos parties, bravos, classements entre potes, badges, bandes du bistrot. Le compte reste facultatif.',
  },
];

/** Accueil au premier lancement : trois cartes, puis on joue. */
export default function WelcomeScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const setSeenWelcome = usePrefs((s) => s.setSeenWelcome);
  const list = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;

  function finish() {
    setSeenWelcome();
    router.back();
  }

  function next() {
    if (last) finish();
    else {
      list.current?.scrollToIndex({ index: index + 1 });
      setIndex(index + 1);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + Spacing.three }]}>
      <StatusBar style="light" />
      <View style={styles.top}>
        <Pressable accessibilityRole="button" onPress={finish} hitSlop={10}>
          <ThemedText type="smallBold" themeColor="onPrimaryMuted">
            Passer
          </ThemedText>
        </Pressable>
      </View>

      <FlatList
        ref={list}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(slide) => slide.title}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={styles.inner}>
              <View style={[styles.card, { backgroundColor: Colors.surface }]}>
                <SuitIcon suit={item.suit} size={96} color={item.color} />
              </View>
              <ThemedText type="title" themeColor="onPrimary" style={styles.center}>
                {item.title}
              </ThemedText>
              <ThemedText themeColor="onPrimaryMuted" style={[styles.center, styles.text]}>
                {item.text}
              </ThemedText>
            </View>
          </View>
        )}
      />

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {SLIDES.map((slide, i) => (
            <View key={slide.title} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <Button label={last ? 'C’est parti' : 'Suivant'} variant="secondary" trailingIcon="arrow-right" onPress={next} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  top: {
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignItems: 'center',
    gap: Spacing.three,
  },
  card: {
    width: 170,
    height: 230,
    borderRadius: Radius.xlarge,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.four,
    transform: [{ rotate: '-4deg' }],
    ...Sticker,
  },
  center: {
    textAlign: 'center',
  },
  text: {
    fontSize: 17,
    lineHeight: 24,
  },
  bottom: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,251,244,0.3)',
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.gold,
  },
});
