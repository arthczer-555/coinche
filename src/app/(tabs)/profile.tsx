import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, IconButton } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useMe } from '@/features/auth/session';
import { SuitIcon } from '@/features/coinche/components/suit-icon';
import { MonthlyChallenges } from '@/features/profile/components/challenges';
import { PlayerCompetition } from '@/features/profile/components/competition';
import { GameHistory } from '@/features/profile/components/game-history';
import { ProfileHeader } from '@/features/profile/components/profile-header';
import { ProfileStats } from '@/features/profile/components/profile-stats';
import { gamesPlayedBy, useFriends, useMyGames, useRating } from '@/features/social/queries';
import { playerStats } from '@/features/stats/player-stats';
import { isBackendEnabled } from '@/lib/supabase';

/**
 * Mon profil : mes parties (comptées ici ou taguées par d'autres), mes stats, mes partenaires.
 * Sans compte, les stats portent sur les parties locales où "Moi" est à la table.
 */
export default function ProfileScreen() {
  const me = useMe();
  const { games } = useMyGames();
  const friends = useFriends(me.signedIn ? me.id : undefined);
  const rating = useRating(me.signedIn ? me.id : undefined);

  const played = useMemo(() => gamesPlayedBy(games, me.id), [games, me.id]);
  const stats = useMemo(() => playerStats(played, me.id), [played, me.id]);

  return (
    <Screen withTabInset>
      <View style={styles.header}>
        <ThemedText type="caption" themeColor="textSecondary">
          Coinche
        </ThemedText>
        <IconButton name="settings" accessibilityLabel="Réglages" onPress={() => router.push('/settings')} />
      </View>

      <ProfileHeader
        seat={me.seat}
        subtitle={me.profile ? [`@${me.profile.username}`, me.profile.city].filter(Boolean).join(' · ') : null}
        friends={friends.data?.length}
        rating={me.signedIn ? rating.data : null}
        actions={
          me.signedIn ? (
            <>
              <Button label="Modifier" variant="secondary" icon="pencil" style={styles.action} onPress={() => router.push('/account/edit')} />
              <Button label="Amis" variant="secondary" icon="users" style={styles.action} onPress={() => router.push('/friends')} />
              <Button label="QR" icon="scan" style={styles.action} onPress={() => router.push('/account/qr')} />
            </>
          ) : null
        }
      />

      {isBackendEnabled && !me.signedIn ? (
        <Card style={styles.signIn}>
          <View style={styles.suits}>
            <SuitIcon suit="hearts" size={18} />
            <SuitIcon suit="spades" size={18} />
            <SuitIcon suit="diamonds" size={18} />
            <SuitIcon suit="clubs" size={18} />
          </View>
          <ThemedText type="heading">Ton profil de joueur</ThemedText>
          <ThemedText themeColor="textSecondary">
            Crée ton compte : tes potes pourront te taguer, tes parties te suivront sur tous tes téléphones et tu verras
            tes stats avec chaque partenaire.
          </ThemedText>
          <Button label="Créer mon compte" trailingIcon="arrow-right" onPress={() => router.push('/auth/sign-in')} />
        </Card>
      ) : null}

      {me.profile && !me.profile.onboarded ? (
        <Card style={styles.signIn}>
          <ThemedText type="heading">Choisis ton pseudo</ThemedText>
          <ThemedText themeColor="textSecondary">
            Tes potes s’en servent pour te trouver et te taguer dans leurs parties.
          </ThemedText>
          <Button
            label="Compléter mon profil"
            trailingIcon="arrow-right"
            onPress={() => router.push({ pathname: '/account/edit', params: { welcome: '1' } })}
          />
        </Card>
      ) : null}

      {stats.games > 0 ? (
        <>
          <MonthlyChallenges games={played} playerId={me.id} />
          <ProfileStats stats={stats} />
          <PlayerCompetition games={played} playerId={me.id} rating={rating.data} />
          <Button
            label={`Ma saison ${new Date().getFullYear()}`}
            variant="secondary"
            icon="trophy"
            onPress={() => router.push('/recap')}
          />
        </>
      ) : (
        <ThemedText themeColor="textSecondary" style={styles.center}>
          Joue ta première partie pour voir tes stats ici.
        </ThemedText>
      )}

      <GameHistory games={played} viewerId={me.id} title="Mes parties" editableOwnerId={me.signedIn ? me.id : null} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  action: {
    flex: 1,
    paddingHorizontal: Spacing.two,
  },
  signIn: {
    gap: Spacing.two,
  },
  suits: {
    flexDirection: 'row',
    gap: Spacing.one + Spacing.half,
  },
  center: {
    textAlign: 'center',
  },
});
