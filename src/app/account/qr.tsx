import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Button, IconButton } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing, Sticker } from '@/constants/theme';
import { profileLink } from '@/constants/links';
import { useMe } from '@/features/auth/session';
import { Avatar } from '@/features/players/components/avatar';
import { shareText } from '@/features/social/share';

/** Mon QR code : mon partenaire le scanne pour me mettre à sa table (ou m'ajouter en ami). */
export default function MyQrScreen() {
  const me = useMe();

  if (!me.profile) {
    return (
      <Screen edges={['top', 'bottom']} backgroundColor={Colors.primary}>
        <ThemedText themeColor="onPrimary">Connecte-toi pour avoir ton QR code.</ThemedText>
        <Button label="Retour" variant="secondary" onPress={router.back} />
      </Screen>
    );
  }

  const link = profileLink(me.id);

  function share() {
    shareText(`Retrouve-moi sur Coinche : ${link}`);
  }

  return (
    <Screen
      edges={['top', 'bottom']}
      backgroundColor={Colors.primary}
      header={
        <View style={styles.header}>
          <StatusBar style="light" />
          <IconButton name="x" variant="onDark" size={36} accessibilityLabel="Fermer" onPress={router.back} />
        </View>
      }
      footer={<Button label="Partager mon profil" variant="secondary" icon="share" onPress={share} />}>
      <View style={styles.card}>
        <Avatar seat={me.seat} size={64} outlined />
        <View style={styles.identity}>
          <ThemedText type="heading" style={styles.center}>
            {me.seat.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            @{me.profile.username}
          </ThemedText>
        </View>
        <View style={styles.qr}>
          <QRCode value={link} size={220} color={Colors.ink} backgroundColor={Colors.surface} />
        </View>
      </View>
      <ThemedText themeColor="onPrimaryMuted" style={styles.center}>
        Fais scanner ce code à ton partenaire depuis l’écran « Qui joue ? » : tu seras à sa table et la partie arrivera sur
        ton profil.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'flex-end',
  },
  card: {
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xlarge,
    padding: Spacing.four,
    ...Sticker,
  },
  identity: {
    gap: 2,
  },
  qr: {
    padding: Spacing.two,
    backgroundColor: Colors.surface,
  },
  center: {
    textAlign: 'center',
  },
});
