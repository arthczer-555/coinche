import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, IconButton } from '@/components/button';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { profileToSeat, useMe } from '@/features/auth/session';
import { firstName } from '@/features/coinche/players';
import { HeadToHeadCard, PlayerCompetition } from '@/features/profile/components/competition';
import { GameHistory } from '@/features/profile/components/game-history';
import { ProfileHeader } from '@/features/profile/components/profile-header';
import { ProfileStats } from '@/features/profile/components/profile-stats';
import { showActions } from '@/components/confirm';
import { FriendCarousel, type FriendCarouselItem } from '@/features/social/components/friend-carousel';
import { mutualFriendsLabel } from '@/features/social/mutual';
import {
  useBlocked,
  useFriends,
  useFriendStatus,
  useFriendSuggestions,
  useMutualFriends,
  useMyGames,
  usePlayerGames,
  useProfile,
  useRating,
} from '@/features/social/queries';
import { useFriendActions } from '@/features/social/use-friend-actions';
import { useModeration } from '@/features/social/use-moderation';
import { headToHead, playerStats } from '@/features/stats/player-stats';

/** Profil public d'un joueur (lien partagé, QR code scanné avec l'appareil photo, avatar touché). */
export default function PlayerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const profile = useProfile(id);
  const games = usePlayerGames(id);
  const friends = useFriends(id);
  const friendship = useFriendStatus(id);
  const mutual = useMutualFriends(id);
  const suggestions = useFriendSuggestions();
  const friendActions = useFriendActions();
  const rating = useRating(id);
  const mine = useMyGames();
  const blocked = useBlocked();
  const { reportContent, toggleBlock } = useModeration();

  const sorted = useMemo(
    () => [...(games.data ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [games.data],
  );
  // Stats calculées sur les parties triées (forme et séries dépendent de l'ordre).
  const stats = useMemo(() => playerStats(sorted, id), [sorted, id]);
  const h2h = useMemo(() => headToHead(mine.games, me.id, id), [mine.games, me.id, id]);

  // Ses amis, sans moi : ceux que je pourrais ajouter d'abord (le plus d'amis en commun en tête), puis les nôtres.
  const theirFriends = useMemo((): FriendCarouselItem[] => {
    const mutualIds = new Set(mutual.map((seat) => seat.id));
    const suggested = new Map((suggestions.data ?? []).map((s) => [s.seat.id, s]));
    const commonCount = (seatId: string) => suggested.get(seatId)?.mutual ?? 0;
    const others = (friends.data ?? [])
      .filter((seat) => seat.id !== me.id && !mutualIds.has(seat.id))
      .sort((a, b) => commonCount(b.id) - commonCount(a.id));
    return [
      ...others.map((seat) => {
        const suggestion = suggested.get(seat.id);
        const caption = suggestion
          ? mutualFriendsLabel(suggestion.mutualNames, suggestion.mutual)
          : seat.kind === 'user' && seat.username
            ? `@${seat.username}`
            : undefined;
        return { seat, caption };
      }),
      ...mutual.map((seat) => ({ seat, caption: 'Dans tes amis' })),
    ];
  }, [friends.data, mutual, suggestions.data, me.id]);

  const isBlocked = blocked.data?.some((s) => s.id === id) ?? false;
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const header = (
    <View style={styles.header}>
      <IconButton name="chevron-left" accessibilityLabel="Retour" onPress={back} />
      {me.signedIn && profile.data && profile.data.id !== me.id ? (
        <IconButton
          name="more"
          accessibilityLabel="Options"
          onPress={() =>
            showActions(profile.data!.display_name, [
              { label: 'Signaler', destructive: true, onPress: () => reportContent('profile', id) },
              {
                label: isBlocked ? 'Débloquer' : 'Bloquer',
                destructive: !isBlocked,
                onPress: () => toggleBlock(id, profile.data!.display_name, isBlocked),
              },
            ])
          }
        />
      ) : null}
    </View>
  );

  if (!me.signedIn) {
    return (
      <Screen edges={['top', 'bottom']} header={header}>
        <ThemedText type="heading">Profil d’un joueur</ThemedText>
        <ThemedText themeColor="textSecondary">Connecte-toi pour voir son profil et l’ajouter en ami.</ThemedText>
        <Button label="Se connecter" onPress={() => router.push('/auth/sign-in')} />
      </Screen>
    );
  }

  if (profile.isLoading) {
    return (
      <Screen edges={['top', 'bottom']} header={header}>
        <ActivityIndicator color={Colors.primary} />
      </Screen>
    );
  }

  if (!profile.data) {
    return (
      <Screen edges={['top', 'bottom']} header={header}>
        <ThemedText themeColor="textSecondary">Ce joueur n’existe pas (ou plus).</ThemedText>
      </Screen>
    );
  }

  const isMe = profile.data.id === me.id;
  const name = firstName(profile.data.display_name);
  const status = friendship.status;
  const busy = friendActions.busy || friendship.isLoading;

  function friendButtons() {
    switch (status) {
      case 'friends':
        return (
          <Button label="Amis" variant="secondary" icon="users" style={styles.action} disabled={busy} onPress={() => friendActions.unfriend(id, name)} />
        );
      case 'sent':
        return (
          <Button
            label="Demande envoyée"
            variant="secondary"
            icon="check"
            style={styles.action}
            disabled={busy}
            onPress={() => friendActions.cancelRequest(id, name)}
          />
        );
      case 'received':
        return (
          <>
            <Button label="Accepter" icon="check" style={styles.action} disabled={busy} onPress={() => friendActions.addFriend(id)} />
            <Button label="Refuser" variant="secondary" icon="x" style={styles.action} disabled={busy} onPress={() => friendActions.decline(id)} />
          </>
        );
      default:
        return (
          <Button label="Ajouter en ami" icon="user-plus" style={styles.action} disabled={busy} onPress={() => friendActions.addFriend(id)} />
        );
    }
  }

  return (
    <Screen edges={['top', 'bottom']} header={header}>
      <ProfileHeader
        seat={profileToSeat(profile.data)}
        subtitle={[`@${profile.data.username}`, profile.data.city].filter(Boolean).join(' · ')}
        friends={friends.data?.length}
        mutual={mutual.length}
        rating={rating.data}
        actions={
          isMe ? null : isBlocked ? (
            <Button label="Débloquer" variant="secondary" style={styles.action} onPress={() => toggleBlock(id, profile.data!.display_name, true)} />
          ) : (
            friendButtons()
          )
        }
      />

      {!isMe && !isBlocked && !friendship.isLoading && status !== 'friends' ? (
        <ThemedText type="small" themeColor="textSecondary">
          {status === 'received' ? `${name} veut t’ajouter à ses amis. ` : ''}
          Entre amis, vous voyez les parties l’un de l’autre dans vos fils, et celles jouées ensemble comptent pour la
          cote.
        </ThemedText>
      ) : null}

      {!isMe && !isBlocked && theirFriends.length > 0 ? (
        <Section
          title={`Amis de ${name}`}
          action={{ label: 'Tout voir', onPress: () => router.push({ pathname: '/friends', params: { id } }) }}>
          <FriendCarousel items={theirFriends.slice(0, 12)} />
        </Section>
      ) : null}

      {games.isLoading ? (
        <ActivityIndicator color={Colors.primary} />
      ) : stats.games > 0 ? (
        <>
          {!isMe ? <HeadToHeadCard h2h={h2h} name={profile.data.display_name.split(' ')[0]} /> : null}
          <ProfileStats stats={stats} />
          <PlayerCompetition games={sorted} playerId={id} rating={rating.data} />
        </>
      ) : (
        <View style={styles.empty}>
          <ThemedText themeColor="textSecondary" style={styles.center}>
            {isMe || status === 'friends'
              ? 'Aucune partie visible pour l’instant.'
              : 'Aucune partie visible. Devenez amis pour voir ses parties.'}
          </ThemedText>
        </View>
      )}

      <GameHistory games={sorted} viewerId={id} />
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
  },
  empty: {
    paddingVertical: Spacing.three,
  },
  center: {
    textAlign: 'center',
  },
});
