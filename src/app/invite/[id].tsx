import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, IconButton } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useMe } from '@/features/auth/session';
import { plural } from '@/features/coinche/format';
import { firstName } from '@/features/coinche/players';
import { Avatar } from '@/features/players/components/avatar';
import { claimGuest, fetchGuestInvite } from '@/features/social/api';
import { queryClient } from '@/features/social/queries';
import { track } from '@/lib/analytics';
import { isBackendEnabled } from '@/lib/supabase';

/**
 * Lien d'invitation d'un invité : "Arthur t'a ajouté à 3 parties sous le nom de Léa".
 * Une fois connecté, on récupère ces parties sur son compte, avec ses stats.
 */
export default function InviteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const invite = useQuery({
    queryKey: ['guest-invite', id],
    queryFn: () => fetchGuestInvite(id),
    enabled: isBackendEnabled && !!id,
  });
  const claim = useMutation({
    mutationFn: () => claimGuest(id),
    onSuccess: (games) => {
      track('guest_claimed', { games });
      queryClient.invalidateQueries({ queryKey: ['player-games'] });
      queryClient.invalidateQueries({ queryKey: ['guest-invite', id] });
    },
  });

  const close = () => (router.canGoBack() ? router.back() : router.replace('/profile'));
  const header = <IconButton name="x" variant="muted" size={36} accessibilityLabel="Fermer" onPress={close} />;

  if (invite.isLoading) {
    return (
      <Screen edges={['top', 'bottom']} header={header}>
        <ActivityIndicator color={Colors.primary} />
      </Screen>
    );
  }

  const data = invite.data;
  if (!data) {
    return (
      <Screen edges={['top', 'bottom']} header={header}>
        <ThemedText type="heading">Invitation introuvable</ThemedText>
        <ThemedText themeColor="textSecondary">Le lien est peut-être incomplet, ou la partie a été supprimée.</ThemedText>
      </Screen>
    );
  }

  const claimed = claim.isSuccess;

  return (
    <Screen
      edges={['top', 'bottom']}
      header={header}
      footer={
        claimed ? (
          <Button label="Voir mon profil" trailingIcon="arrow-right" onPress={() => router.replace('/profile')} />
        ) : data.claimed ? null : me.signedIn ? (
          <Button label="Récupérer mes parties" onPress={() => claim.mutate()} disabled={claim.isPending} />
        ) : (
          <Button label="Créer mon compte" trailingIcon="arrow-right" onPress={() => router.push('/auth/sign-in')} />
        )
      }>
      <View style={styles.hero}>
        <Avatar seat={{ kind: 'guest', id, name: data.guestName }} size={76} />
        <ThemedText type="title" style={styles.center}>
          {claimed ? 'C’est fait !' : `Salut ${firstName(data.guestName)} !`}
        </ThemedText>
      </View>

      <Card style={styles.card}>
        {claimed ? (
          <ThemedText>
            {plural(claim.data ?? 0, 'partie')} {(claim.data ?? 0) > 1 ? 'sont maintenant' : 'est maintenant'} sur ton
            profil, avec tes stats.
          </ThemedText>
        ) : data.claimed ? (
          <ThemedText>Ces parties ont déjà été récupérées par un compte Coinche.</ThemedText>
        ) : (
          <ThemedText>
            <ThemedText style={styles.bold}>{data.ownerName}</ThemedText> (@{data.ownerUsername}) t’a ajouté à{' '}
            {plural(data.games, 'partie')} sous le nom « {data.guestName} ».{' '}
            {me.signedIn
              ? 'Récupère-les : elles iront sur ton profil et compteront dans tes stats.'
              : 'Crée ton compte en 30 secondes pour les récupérer sur ton profil.'}
          </ThemedText>
        )}
      </Card>

      {claim.error ? (
        <ThemedText type="small" themeColor="danger" style={styles.center}>
          {claim.error.message}
        </ThemedText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    gap: Spacing.three,
  },
  card: {
    gap: Spacing.two,
  },
  center: {
    textAlign: 'center',
  },
  bold: {
    fontWeight: 700,
  },
});
