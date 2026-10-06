import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Animated, Easing, PanResponder, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing, Sticker, StickerSmall } from '@/constants/theme';
import { useMe } from '@/features/auth/session';
import { SuitIcon } from '@/features/coinche/components/suit-icon';
import type { Seat } from '@/features/coinche/types';
import { isDemo } from '@/features/demo/is-demo';
import { usePrefs } from '@/features/onboarding/prefs';
import { Avatar } from '@/features/players/components/avatar';

type Slide = { art: 'score' | 'table' | 'feed'; color: string; title: string; text: string };

const SLIDES: Slide[] = [
  {
    art: 'score',
    color: Colors.teamA,
    title: 'Comptez sans calculer',
    text: 'Le contrat, la coinche, fait ou chuté : l’app fait les comptes. Fini le papier et les calculs de tête au bistrot.',
  },
  {
    art: 'table',
    color: Colors.teamB,
    title: 'Taguez vos partenaires',
    text: 'Un pseudo, un QR code ou juste un prénom : la partie arrive sur le profil de chaque joueur, avec ses stats.',
  },
  {
    art: 'feed',
    color: Colors.gold,
    title: 'Le Strava de la coinche',
    text: 'Fil de vos parties, bravos, classements entre potes, badges, bandes du bistrot. Le compte reste facultatif.',
  },
];

/** Distance de glissement (px) qui fait changer de carte. */
const SWIPE_DISTANCE = 40;

/**
 * Accueil au premier lancement : trois cartes (glisser ou « Suivant »), puis la connexion.
 * Les cartes sont pilotées par l'état plutôt qu'une liste horizontale : `scrollToIndex` ne défile pas sur le web.
 */
export default function WelcomeScreen() {
  const me = useMe();
  const setSeenWelcome = usePrefs((s) => s.setSeenWelcome);
  const [{ index, direction }, setPage] = useState({ index: 0, direction: 1 });
  const [appear] = useState(() => new Animated.Value(0));
  const [swipe] = useState(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -SWIPE_DISTANCE) move(1);
        else if (g.dx > SWIPE_DISTANCE) move(-1);
      },
    }),
  );
  const slide = SLIDES[index];
  const last = index === SLIDES.length - 1;

  function move(step: 1 | -1) {
    setPage((page) => {
      const next = page.index + step;
      return next < 0 || next >= SLIDES.length ? page : { index: next, direction: step };
    });
  }

  // Chaque carte arrive en glissant depuis le côté d'où on vient.
  useEffect(() => {
    appear.setValue(0);
    Animated.timing(appear, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [appear, index]);

  function finish() {
    setSeenWelcome();
    // Fin de l'accueil : la connexion (on peut la fermer pour jouer sans compte). Le mode démo, déjà connecté, la montre quand même.
    if (me.signedIn && !isDemo) {
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } else {
      router.replace('/auth/sign-in');
    }
  }

  return (
    <Screen
      edges={['top', 'bottom']}
      backgroundColor={Colors.primary}
      contentContainerStyle={styles.content}
      header={
        <View style={styles.header}>
          <StatusBar style="light" />
          <View style={styles.progress}>
            {SLIDES.map((s, i) => (
              <View key={s.art} style={[styles.segment, i <= index && styles.segmentDone]} />
            ))}
          </View>
          <Pressable accessibilityRole="button" onPress={finish} hitSlop={10}>
            <ThemedText type="smallBold" themeColor="onPrimaryMuted">
              Passer
            </ThemedText>
          </Pressable>
        </View>
      }
      footer={
        <Button
          label={last ? 'C’est parti' : 'Suivant'}
          variant="secondary"
          trailingIcon="arrow-right"
          onPress={() => (last ? finish() : move(1))}
        />
      }>
      <Animated.View
        {...swipe.panHandlers}
        style={[
          styles.step,
          {
            opacity: appear,
            transform: [{ translateX: appear.interpolate({ inputRange: [0, 1], outputRange: [direction * 48, 0] }) }],
          },
        ]}>
        <View style={styles.art}>
          <View style={[styles.halo, { backgroundColor: slide.color }]} />
          {slide.art === 'score' ? <ScoreArt /> : slide.art === 'table' ? <TableArt /> : <FeedArt />}
        </View>
        <View style={styles.copy}>
          <ThemedText type="title" themeColor="onPrimary" style={styles.center}>
            {slide.title}
          </ThemedText>
          <ThemedText themeColor="onPrimaryMuted" style={[styles.center, styles.text]}>
            {slide.text}
          </ThemedText>
        </View>
      </Animated.View>
    </Screen>
  );
}

/** Carte 1 : la feuille de marque tenue par l'app. */
function ScoreArt() {
  return (
    <>
      <View style={styles.sheet}>
        <View style={styles.sheetTeams}>
          <TeamScore suit="hearts" label="Nous" score="1 240" color={Colors.teamA} />
          <View style={styles.sheetDivider} />
          <TeamScore suit="spades" label="Eux" score="980" color={Colors.teamB} />
        </View>
        <View style={styles.contract}>
          <SuitIcon suit="hearts" size={14} />
          <ThemedText type="smallBold">120 coinché</ThemedText>
          <View style={styles.made}>
            <Icon name="check" size={12} color={Colors.onPrimary} strokeWidth={3} />
            <ThemedText type="smallBold" themeColor="onPrimary">
              Fait
            </ThemedText>
          </View>
        </View>
      </View>
      <View style={[styles.chip, styles.scoreChip]}>
        <ThemedText type="heading">+240</ThemedText>
      </View>
    </>
  );
}

function TeamScore({ suit, label, score, color }: { suit: 'hearts' | 'spades'; label: string; score: string; color: string }) {
  return (
    <View style={styles.team}>
      <View style={styles.teamLabel}>
        <SuitIcon suit={suit} size={13} />
        <ThemedText type="caption" themeColor="textSecondary">
          {label}
        </ThemedText>
      </View>
      <ThemedText type="title" style={{ color }}>
        {score}
      </ThemedText>
    </View>
  );
}

type TablePlayer = { seat: Seat; tag: string; color: string; place: ViewStyle };

/** Places autour du tapis (290 × 270, places de 90 de large) : moi en bas, mon partenaire en face. */
const TABLE: TablePlayer[] = [
  { seat: { kind: 'user', id: 'welcome-lea5', name: 'Léa Morel' }, tag: '@lea', color: Colors.teamA, place: { top: 0, left: 100 } },
  { seat: { kind: 'user', id: 'welcome-paul6', name: 'Paul Roux' }, tag: '@paul', color: Colors.teamB, place: { top: 102, left: 0 } },
  { seat: { kind: 'user', id: 'welcome-sam1', name: 'Sam Bernard' }, tag: '@sam', color: Colors.teamB, place: { top: 102, right: 0 } },
  { seat: { kind: 'user', id: 'welcome-moi2', name: 'Toi' }, tag: 'Toi', color: Colors.teamA, place: { bottom: 0, left: 100 } },
];

/** Carte 2 : une table, chaque joueur tagué sur sa place. */
function TableArt() {
  return (
    <View style={styles.table}>
      <View style={styles.felt}>
        <Icon name="scan" size={30} color={Colors.ink} />
        <View style={styles.feltSuits}>
          <SuitIcon suit="hearts" size={14} />
          <SuitIcon suit="spades" size={14} />
          <SuitIcon suit="diamonds" size={14} />
          <SuitIcon suit="clubs" size={14} />
        </View>
      </View>
      {TABLE.map(({ seat, tag, color, place }) => (
        <View key={seat.id} style={[styles.player, place]}>
          <Avatar seat={seat} size={52} outlined />
          <View style={[styles.tag, { backgroundColor: color }]}>
            <ThemedText type="smallBold" themeColor="onPrimary">
              {tag}
            </ThemedText>
          </View>
        </View>
      ))}
    </View>
  );
}

const LEA = TABLE[0].seat;

/** Carte 3 : une partie dans le fil, avec ses bravos et un badge. */
function FeedArt() {
  return (
    <>
      <View style={[styles.post, styles.postBehind]} />
      <View style={styles.post}>
        <View style={styles.postHeader}>
          <Avatar seat={LEA} size={36} />
          <View style={styles.postWho}>
            <ThemedText type="smallBold" numberOfLines={1}>
              Léa a gagné avec Paul
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              Il y a 2 h · Classée
            </ThemedText>
          </View>
        </View>
        <View style={styles.postScore}>
          <ThemedText type="heading" style={{ color: Colors.teamA }}>
            1 240
          </ThemedText>
          <ThemedText type="heading" themeColor="textTertiary">
            -
          </ThemedText>
          <ThemedText type="heading" style={{ color: Colors.teamB }}>
            980
          </ThemedText>
        </View>
        <View style={styles.postActions}>
          <View style={[styles.reaction, { backgroundColor: Colors.gold }]}>
            <Icon name="thumbs-up" size={14} color={Colors.ink} />
            <ThemedText type="smallBold">12 bravos</ThemedText>
          </View>
          <View style={[styles.reaction, { backgroundColor: Colors.surfaceMuted }]}>
            <Icon name="message" size={14} color={Colors.ink} />
            <ThemedText type="smallBold">3</ThemedText>
          </View>
        </View>
      </View>
      <View style={[styles.chip, styles.badge]}>
        <Icon name="trophy" size={26} color={Colors.onPrimary} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.two,
  },
  progress: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.one + Spacing.half,
  },
  segment: {
    flex: 1,
    height: 6,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,251,244,0.2)',
  },
  segmentDone: {
    backgroundColor: Colors.gold,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  step: {
    alignItems: 'center',
    gap: Spacing.five,
  },
  art: {
    width: 300,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: Radius.pill,
    ...Sticker,
  },
  copy: {
    gap: Spacing.two,
  },
  center: {
    textAlign: 'center',
  },
  text: {
    fontSize: 17,
    lineHeight: 24,
  },
  chip: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    ...StickerSmall,
  },
  sheet: {
    width: 260,
    gap: Spacing.three,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xlarge,
    padding: Spacing.three + Spacing.one,
    transform: [{ rotate: '-3deg' }],
    ...Sticker,
  },
  sheetTeams: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sheetDivider: {
    width: 2,
    alignSelf: 'stretch',
    borderRadius: Radius.pill,
    backgroundColor: Colors.border,
  },
  team: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
  },
  teamLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  contract: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.neutralSoft,
    borderRadius: Radius.medium,
    paddingVertical: Spacing.two,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
  },
  made: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    backgroundColor: Colors.success,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
  },
  scoreChip: {
    top: 18,
    right: 6,
    backgroundColor: Colors.gold,
    borderRadius: Radius.medium,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    transform: [{ rotate: '8deg' }],
  },
  table: {
    width: 290,
    height: 270,
  },
  felt: {
    position: 'absolute',
    top: 75,
    left: 85,
    width: 120,
    height: 120,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    ...Sticker,
  },
  feltSuits: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  player: {
    position: 'absolute',
    width: 90,
    alignItems: 'center',
  },
  tag: {
    marginTop: -Spacing.two,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
    ...StickerSmall,
  },
  post: {
    width: 260,
    gap: Spacing.three,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xlarge,
    padding: Spacing.three,
    transform: [{ rotate: '-2deg' }],
    ...Sticker,
  },
  postBehind: {
    position: 'absolute',
    height: 150,
    backgroundColor: Colors.surfaceMuted,
    transform: [{ rotate: '5deg' }, { translateY: -18 }],
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  postWho: {
    flexShrink: 1,
  },
  postScore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  postActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  reaction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two + Spacing.one,
    ...StickerSmall,
  },
  badge: {
    top: 14,
    right: 8,
    width: 54,
    height: 54,
    borderRadius: Radius.pill,
    backgroundColor: Colors.teamA,
    transform: [{ rotate: '10deg' }],
  },
});
