import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Button } from '@/components/button';
import { Icon, type IconName } from '@/components/icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { profileLink } from '@/constants/links';
import { Colors, Radius, Spacing, Sticker, StickerPressed, StickerSmall } from '@/constants/theme';
import { type UserSeat, useMe } from '@/features/auth/session';
import { SuitIcon } from '@/features/coinche/components/suit-icon';
import { firstName } from '@/features/coinche/players';
import { usePushRegistration } from '@/features/notifications/push';
import { Avatar } from '@/features/players/components/avatar';
import { shareText } from '@/features/social/share';
import { track } from '@/lib/analytics';

type Step = 'card' | 'friends' | 'push';

/**
 * Petit tour juste après l'inscription (une fois le pseudo choisi) : ma carte de joueur (QR code),
 * ajouter ses potes, puis activer les notifications si le téléphone peut encore les demander
 * (jamais sur le web). Ouvert par `account/edit?welcome=1`, il rend la main à l'écran d'origine.
 */
export default function OnboardingScreen() {
  const me = useMe();
  const push = usePushRegistration();
  const [index, setIndex] = useState(0);
  // Une fois la permission demandée, le statut change : l'étape doit rester affichée jusqu'à la sortie.
  const [askingPush, setAskingPush] = useState(false);
  const [appear] = useState(() => new Animated.Value(0));

  const steps: Step[] = push.status === 'undetermined' || askingPush ? ['card', 'friends', 'push'] : ['card', 'friends'];
  const step = steps[Math.min(index, steps.length - 1)];
  const last = index >= steps.length - 1;

  // Chaque étape arrive en fondu, légèrement par le bas.
  useEffect(() => {
    appear.setValue(0);
    Animated.timing(appear, { toValue: 1, duration: 280, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [appear, index]);

  function finish(skipped: boolean) {
    track('onboarding_tour_finished', { step, skipped });
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  function next() {
    if (last) finish(false);
    else setIndex(index + 1);
  }

  async function enablePush() {
    setAskingPush(true);
    try {
      await push.enable();
    } finally {
      finish(false);
    }
  }

  if (!me.profile) {
    return (
      <Screen edges={['top', 'bottom']} backgroundColor={Colors.primary}>
        <ThemedText themeColor="onPrimary">Connecte-toi pour créer ta carte de joueur.</ThemedText>
        <Button label="Retour" variant="secondary" onPress={() => finish(true)} />
      </Screen>
    );
  }

  const username = me.profile.username;
  const name = firstName(me.seat.name);

  return (
    <Screen
      edges={['top', 'bottom']}
      backgroundColor={Colors.primary}
      contentContainerStyle={styles.content}
      header={
        <View style={styles.header}>
          <StatusBar style="light" />
          <View style={styles.progress}>
            {steps.map((s, i) => (
              <View key={s} style={[styles.segment, i <= index && styles.segmentDone]} />
            ))}
          </View>
          <Pressable accessibilityRole="button" onPress={() => finish(true)} hitSlop={10}>
            <ThemedText type="smallBold" themeColor="onPrimaryMuted">
              Passer
            </ThemedText>
          </Pressable>
        </View>
      }
      footer={
        step === 'push' ? (
          <View style={styles.buttons}>
            <Button label="Activer les notifications" variant="secondary" icon="bell" onPress={enablePush} />
            <Button label="Plus tard" variant="ghost" onDark onPress={() => finish(false)} />
          </View>
        ) : (
          <Button label={last ? 'C’est parti' : 'Suivant'} variant="secondary" trailingIcon="arrow-right" onPress={next} />
        )
      }>
      <Animated.View
        style={[
          styles.step,
          {
            opacity: appear,
            transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
          },
        ]}>
        {step === 'card' ? (
          <>
            <PlayerCard seat={me.seat} username={username} />
            <Copy
              title={`Bienvenue, ${name} !`}
              text="Voici ta carte de joueur. À la table, ton partenaire scanne ce QR code depuis « Qui joue ? » : la partie arrive direct sur ton profil, avec tes stats."
            />
          </>
        ) : step === 'friends' ? (
          <>
            <Table seat={me.seat} />
            <Copy
              title="Remplis ta table"
              text="Ajoute tes potes : vous verrez vos parties dans le Fil, vous vous direz bravo, et vous pourrez jouer en Classée pour la cote."
            />
            <View style={styles.actions}>
              <Action
                icon="search"
                label="Trouver mes potes"
                onPress={() => router.push({ pathname: '/friends', params: { tab: 'find' } })}
              />
              <Action
                icon="share"
                label="Inviter un pote"
                onPress={() =>
                  shareText(
                    `On se fait une coinche ? Retrouve-moi sur Coinche pour qu’on voie nos parties et nos stats : ${profileLink(me.id)}`,
                  )
                }
              />
            </View>
          </>
        ) : (
          <>
            <NotificationPreview />
            <Copy
              title="Ne rate rien"
              text="On te prévient quand on te met à une table, qu’on te dit bravo ou qu’on veut t’ajouter en ami."
            />
          </>
        )}
      </Animated.View>
    </Screen>
  );
}

function Copy({ title, text }: { title: string; text: string }) {
  return (
    <View style={styles.copy}>
      <ThemedText type="title" themeColor="onPrimary" style={styles.center}>
        {title}
      </ThemedText>
      <ThemedText themeColor="onPrimaryMuted" style={[styles.center, styles.text]}>
        {text}
      </ThemedText>
    </View>
  );
}

/** Étape 1 : la carte du joueur, façon carte à jouer, avec son QR code. */
function PlayerCard({ seat, username }: { seat: UserSeat; username: string }) {
  return (
    <View style={styles.playerCard}>
      <View style={[styles.cardCorner, styles.cardCornerTop]}>
        <SuitIcon suit="hearts" size={16} />
        <SuitIcon suit="spades" size={16} />
      </View>
      <Avatar seat={seat} size={56} outlined />
      <View style={styles.identity}>
        <ThemedText type="heading" style={styles.center} numberOfLines={1}>
          {seat.name}
        </ThemedText>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.center}>
          @{username}
        </ThemedText>
      </View>
      <QRCode value={profileLink(seat.id)} size={136} color={Colors.ink} backgroundColor={Colors.surface} />
      <View style={[styles.cardCorner, styles.cardCornerBottom]}>
        <SuitIcon suit="diamonds" size={16} />
        <SuitIcon suit="clubs" size={16} />
      </View>
    </View>
  );
}

/** Places libres autour du tapis (table de 220, places de 56) : partenaire en face, adversaires sur les côtés. */
const EMPTY_SEATS: { color: string; style: ViewStyle }[] = [
  { color: Colors.teamA, style: { top: 0, left: 82 } },
  { color: Colors.teamB, style: { top: 82, left: 0 } },
  { color: Colors.gold, style: { top: 82, right: 0 } },
];

/** Étape 2 : une table de coinche, moi en bas, trois places à remplir. */
function Table({ seat }: { seat: UserSeat }) {
  return (
    <View style={styles.table}>
      <View style={styles.felt}>
        <SuitIcon suit="hearts" size={22} />
        <SuitIcon suit="spades" size={22} />
      </View>
      {EMPTY_SEATS.map(({ color, style }) => (
        <View key={color} style={[styles.seat, { backgroundColor: color }, style]}>
          <Icon name="plus" size={22} color={Colors.onPrimary} />
        </View>
      ))}
      <View style={styles.me}>
        <Avatar seat={seat} size={60} outlined />
      </View>
    </View>
  );
}

const NOTIFICATIONS: { icon: IconName; color: string; text: string; tilt: string }[] = [
  { icon: 'user-plus', color: Colors.teamA, text: 'Léa t’a ajouté à une partie', tilt: '-2deg' },
  { icon: 'thumbs-up', color: Colors.gold, text: 'Paul dit bravo pour ta partie', tilt: '1.5deg' },
  { icon: 'users', color: Colors.teamB, text: 'Sam veut t’ajouter à ses amis', tilt: '-1deg' },
];

/** Étape 3 : un aperçu des notifications qu'on recevra. */
function NotificationPreview() {
  return (
    <View style={styles.notifications}>
      {NOTIFICATIONS.map((n) => (
        <View key={n.text} style={[styles.notification, { transform: [{ rotate: n.tilt }] }]}>
          <View style={[styles.notificationIcon, { backgroundColor: n.color }]}>
            <Icon name={n.icon} size={16} color={Colors.onPrimary} />
          </View>
          <ThemedText type="smallBold" style={styles.notificationText} numberOfLines={1}>
            {n.text}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

function Action({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && StickerPressed]}>
      <View style={styles.actionIcon}>
        <Icon name={icon} size={18} color={Colors.onPrimary} />
      </View>
      <ThemedText type="smallBold" style={styles.center}>
        {label}
      </ThemedText>
    </Pressable>
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
    gap: Spacing.four,
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
  buttons: {
    gap: Spacing.one,
  },
  playerCard: {
    width: 230,
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xlarge,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    transform: [{ rotate: '-3deg' }],
    ...Sticker,
  },
  cardCorner: {
    position: 'absolute',
    gap: Spacing.half,
  },
  cardCornerTop: {
    top: Spacing.three,
    left: Spacing.three,
  },
  cardCornerBottom: {
    bottom: Spacing.three,
    right: Spacing.three,
    transform: [{ rotate: '180deg' }],
  },
  identity: {
    alignSelf: 'stretch',
    gap: Spacing.half,
  },
  table: {
    width: 220,
    height: 220,
  },
  felt: {
    position: 'absolute',
    top: 40,
    left: 40,
    width: 140,
    height: 140,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    ...Sticker,
  },
  seat: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...StickerSmall,
  },
  me: {
    position: 'absolute',
    bottom: 0,
    left: 80,
  },
  notifications: {
    alignSelf: 'stretch',
    alignItems: 'center',
    gap: Spacing.three + Spacing.one,
    paddingVertical: Spacing.two,
  },
  notification: {
    width: '100%',
    maxWidth: 320,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.one,
    backgroundColor: Colors.surface,
    borderRadius: Radius.large,
    padding: Spacing.two + Spacing.one,
    ...StickerSmall,
  },
  notificationIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationText: {
    flexShrink: 1,
    fontSize: 14,
  },
  actions: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: Spacing.three,
  },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.surface,
    borderRadius: Radius.large,
    padding: Spacing.three,
    ...StickerSmall,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
