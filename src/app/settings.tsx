import Constants from 'expo-constants';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button, IconButton } from '@/components/button';
import { Card } from '@/components/card';
import { confirm, notify } from '@/components/confirm';
import { Icon, type IconName } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { PRIVACY_URL, SUPPORT_URL } from '@/constants/links';
import { deleteAccount, signOut, unsyncedGamesCount } from '@/features/auth/actions';
import { useMe } from '@/features/auth/session';
import { plural } from '@/features/coinche/format';
import { useGames } from '@/features/coinche/store';
import { PlayerRow } from '@/features/players/components/player-row';
import { isBackendEnabled } from '@/lib/supabase';

/** Réglages : compte, confidentialité, aide, déconnexion et suppression du compte. */
export default function SettingsScreen() {
  const me = useMe();
  const pending = useGames((s) => Object.keys(s.pendingSync).filter((id) => s.games[id]?.ownerId === me.id).length);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      router.back();
    } catch (e) {
      notify('Oups', e instanceof Error ? e.message : 'Une erreur est survenue.');
    } finally {
      setBusy(false);
    }
  }

  function askSignOut() {
    const unsynced = unsyncedGamesCount();
    confirm(
      'Se déconnecter ?',
      unsynced > 0
        ? `${plural(unsynced, 'partie')} pas encore envoyée${unsynced > 1 ? 's' : ''} (pas de réseau) sera perdue sur ce téléphone.`
        : 'Tes parties restent sur ton compte : tu les retrouveras en te reconnectant.',
      'Se déconnecter',
      () => run(signOut),
    );
  }

  function askDelete() {
    confirm(
      'Supprimer ton compte ?',
      'Ton profil, tes parties et tes amis seront définitivement supprimés. Tes potes perdront tes parties de leur fil. Impossible de revenir en arrière.',
      'Supprimer définitivement',
      () => run(deleteAccount),
    );
  }

  return (
    <Screen
      edges={['top', 'bottom']}
      header={
        <View style={styles.header}>
          <IconButton name="chevron-left" accessibilityLabel="Retour" onPress={router.back} />
          <ThemedText type="heading">Réglages</ThemedText>
          <View style={styles.headerSpacer} />
        </View>
      }>
      {isBackendEnabled ? (
        <Section title="Compte">
          {me.profile ? (
            <Card style={styles.list}>
              <PlayerRow
                seat={me.seat}
                subtitle={`@${me.profile.username}`}
                onPress={() => router.push('/account/edit')}
                trailing={<Icon name="pencil" size={16} color={Colors.textSecondary} />}
              />
              <Row
                icon={pending > 0 ? 'undo' : 'check'}
                label={pending > 0 ? `${plural(pending, 'partie')} en attente d’envoi` : 'Tout est synchronisé'}
                bordered
              />
            </Card>
          ) : (
            <Card style={styles.signIn}>
              <ThemedText>Crée ton compte pour taguer tes potes et retrouver tes parties partout.</ThemedText>
              <Button label="Se connecter" onPress={() => router.push('/auth/sign-in')} />
            </Card>
          )}
        </Section>
      ) : null}

      <Section title="Aide">
        <Card style={styles.list}>
          <Row icon="share" label="Aide et contact" onPress={() => WebBrowser.openBrowserAsync(SUPPORT_URL)} />
          <Row
            icon="check"
            label="Politique de confidentialité"
            bordered
            onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}
          />
        </Card>
      </Section>

      {me.profile ? (
        <Section title="Zone sensible">
          <Card style={styles.list}>
            <Row icon="x" label="Joueurs bloqués" onPress={() => router.push('/account/blocked')} />
            <Row icon="log-out" label="Se déconnecter" bordered onPress={askSignOut} />
            <Row icon="x" label="Supprimer mon compte" danger bordered onPress={askDelete} />
          </Card>
        </Section>
      ) : null}

      {busy ? <ActivityIndicator color={Colors.primary} /> : null}

      <ThemedText type="small" themeColor="textTertiary" style={styles.version}>
        Coinche {Constants.expoConfig?.version ?? ''}
      </ThemedText>
    </Screen>
  );
}

function Row({
  icon,
  label,
  onPress,
  bordered = false,
  danger = false,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  bordered?: boolean;
  danger?: boolean;
}) {
  const color = danger ? Colors.danger : Colors.text;
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, bordered && styles.border, pressed && styles.pressed]}>
      <Icon name={icon} size={18} color={danger ? Colors.danger : Colors.textSecondary} />
      <ThemedText style={[styles.rowLabel, { color }]}>{label}</ThemedText>
      {onPress ? <Icon name="chevron-right" size={16} color={Colors.textTertiary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSpacer: {
    width: 40,
  },
  list: {
    paddingVertical: Spacing.one,
  },
  signIn: {
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 50,
  },
  border: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: 600,
  },
  pressed: {
    opacity: 0.7,
  },
  version: {
    textAlign: 'center',
  },
});
