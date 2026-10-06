import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Section } from '@/components/section';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { inviteLink } from '@/constants/links';
import { useMe } from '@/features/auth/session';
import { allPlayers, firstName } from '@/features/coinche/players';
import type { Game } from '@/features/coinche/types';
import { shareText } from '@/features/social/share';
import { track } from '@/lib/analytics';

import { PlayerRow } from './player-row';

/**
 * Invités (sans compte) d'une de mes parties : un lien leur permet de créer leur compte
 * et de récupérer toutes les parties jouées sous ce prénom. C'est la boucle de croissance de l'app.
 */
export function GuestInvites({ game, onDark = false }: { game: Game; onDark?: boolean }) {
  const me = useMe();
  const guests = allPlayers(game).filter((p) => p.kind === 'guest');
  if (!me.signedIn || game.ownerId !== me.id || guests.length === 0) return null;

  function invite(guestId: string, name: string) {
    track('guest_invited');
    shareText(
      `${firstName(name)}, je t’ai ajouté à notre partie de coinche ! Récupère-la sur ton profil Coinche : ${inviteLink(guestId)}`,
    );
  }

  const title = 'Inviter les joueurs sans compte';
  const content = (
    <Card style={styles.card}>
      <ThemedText type="small" themeColor="textSecondary">
        Envoie-leur le lien : en créant leur compte, ils récupèrent leurs parties et leurs stats.
      </ThemedText>
      {guests.map((guest, index) => (
        <PlayerRow
          key={guest.id}
          seat={guest}
          bordered={index > 0}
          subtitle="Invité"
          trailing={
            <Button
              label="Inviter"
              variant="outline"
              icon="share"
              style={styles.button}
              onPress={() => invite(guest.id, guest.name)}
            />
          }
        />
      ))}
    </Card>
  );

  // Sur fond vert (écran de fin), le titre de section passe en clair.
  if (onDark) {
    return (
      <View style={styles.dark}>
        <ThemedText type="caption" themeColor="onPrimaryMuted">
          {title}
        </ThemedText>
        {content}
      </View>
    );
  }
  return <Section title={title}>{content}</Section>;
}

const styles = StyleSheet.create({
  dark: {
    gap: Spacing.two + Spacing.one,
  },
  card: {
    gap: Spacing.one,
  },
  button: {
    minHeight: 40,
    paddingHorizontal: Spacing.three,
  },
});
