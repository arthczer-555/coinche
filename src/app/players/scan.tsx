import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, IconButton } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { parseProfileLink } from '@/constants/links';
import { profileToSeat, useMe } from '@/features/auth/session';
import { applyPick, parsePickTarget } from '@/features/players/draft';
import { fetchProfile } from '@/features/social/api';

/** Scan du QR code affiché sur le profil d'un joueur, pour l'asseoir à la table. */
export default function ScanPlayerScreen() {
  const params = useLocalSearchParams<{ team?: string; slot?: string; gameId?: string; mode?: string }>();
  const target = parsePickTarget(params);
  // "profile" : depuis la page Amis, on ouvre le profil scanné au lieu d'asseoir le joueur.
  const openProfile = params.mode === 'profile';
  const me = useMe();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const busy = useRef(false);

  async function onScanned({ data }: BarcodeScanningResult) {
    if (busy.current) return;
    const profileId = parseProfileLink(data);
    if (!profileId) {
      setMessage('Ce QR code n’est pas un profil Coinche.');
      return;
    }
    if (profileId === me.id) {
      setMessage('C’est ton propre QR code !');
      return;
    }
    busy.current = true;
    setLoading(true);
    try {
      const profile = await fetchProfile(profileId);
      if (!profile) {
        setMessage('Profil introuvable.');
        return;
      }
      if (openProfile) {
        router.replace({ pathname: '/u/[id]', params: { id: profile.id } });
        return;
      }
      applyPick(target, profileToSeat(profile));
      router.back();
    } catch {
      setMessage('Impossible de charger ce profil. Vérifie ta connexion.');
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {permission?.granted ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={loading ? undefined : onScanned}
        />
      ) : null}

      <View style={[styles.overlay, { paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + Spacing.four }]}>
        <View style={styles.header}>
          <ThemedText type="heading" themeColor="onPrimary">
            Scanner un joueur
          </ThemedText>
          <IconButton name="x" variant="onDark" size={36} accessibilityLabel="Fermer" onPress={router.back} />
        </View>

        {permission?.granted ? (
          <View style={styles.frame}>{loading ? <ActivityIndicator color={Colors.onPrimary} size="large" /> : null}</View>
        ) : (
          <View style={styles.permission}>
            <ThemedText themeColor="onPrimary" style={styles.center}>
              La caméra sert uniquement à lire le QR code du profil de ton partenaire.
            </ThemedText>
            {permission && !permission.canAskAgain ? (
              <ThemedText type="small" themeColor="onPrimaryMuted" style={styles.center}>
                Autorise la caméra pour Coinche dans les Réglages du téléphone.
              </ThemedText>
            ) : (
              <Button label="Autoriser la caméra" variant="secondary" onPress={requestPermission} />
            )}
          </View>
        )}

        <View style={styles.footer}>
          <ThemedText themeColor="onPrimary" style={styles.center}>
            {message ??
              (openProfile
                ? 'Demande-lui d’ouvrir son profil et vise le QR code pour le retrouver.'
                : 'Demande-lui d’ouvrir son profil et vise le QR code.')}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.ink,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  frame: {
    alignSelf: 'center',
    width: 240,
    height: 240,
    borderRadius: Radius.xlarge,
    borderWidth: 3,
    borderColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  permission: {
    gap: Spacing.three,
  },
  footer: {
    backgroundColor: 'rgba(30,26,21,0.7)',
    borderRadius: Radius.medium,
    padding: Spacing.three,
  },
  center: {
    textAlign: 'center',
  },
});
