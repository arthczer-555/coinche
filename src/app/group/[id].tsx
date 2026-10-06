import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, IconButton } from '@/components/button';
import { Card } from '@/components/card';
import { confirm } from '@/components/confirm';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { groupInviteLink } from '@/constants/links';
import { useMe } from '@/features/auth/session';
import { plural } from '@/features/coinche/format';
import { PlayerRow } from '@/features/players/components/player-row';
import { FeedCard } from '@/features/social/components/feed-card';
import { LeaderboardRowItem } from '@/features/social/components/leaderboard-row';
import {
  useGroupFeed,
  useGroupLeaderboard,
  useGroupMembers,
  useLeaveGroup,
  useMyGroups,
  useTeamElo,
} from '@/features/social/queries';
import { shareText } from '@/features/social/share';
import { periodStart } from '@/features/stats/periods';

type Tab = 'ranking' | 'games' | 'members';

const TABS: { value: Tab; label: string }[] = [
  { value: 'ranking', label: 'Classement' },
  { value: 'games', label: 'Parties' },
  { value: 'members', label: 'Membres' },
];

/** Une bande : code d'invitation, classement du mois, parties de la bande, membres. */
export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const groups = useMyGroups();
  const group = groups.data?.find((g) => g.id === id);
  const [tab, setTab] = useState<Tab>('ranking');
  const since = useMemo(() => periodStart('month'), []);
  const ranking = useGroupLeaderboard(id, since);
  const feed = useGroupFeed(tab === 'games' ? id : undefined);
  const members = useGroupMembers(tab === 'members' ? id : undefined);
  const leave = useLeaveGroup(id);
  const teamElo = useTeamElo(useMemo(() => (feed.data?.pages.flat() ?? []).map((item) => item.game), [feed.data]));

  const back = () => (router.canGoBack() ? router.back() : router.replace('/groups'));
  const header = (
    <View style={styles.header}>
      <IconButton name="chevron-left" accessibilityLabel="Retour" onPress={back} />
    </View>
  );

  if (groups.isLoading) {
    return (
      <Screen edges={['top', 'bottom']} header={header}>
        <ActivityIndicator color={Colors.primary} />
      </Screen>
    );
  }
  if (!group) {
    return (
      <Screen edges={['top', 'bottom']} header={header}>
        <ThemedText themeColor="textSecondary">Bande introuvable (ou tu n’en fais plus partie).</ThemedText>
      </Screen>
    );
  }

  function invite() {
    shareText(`Rejoins la bande « ${group!.name} » sur Coinche : ${groupInviteLink(group!.inviteCode)} (code ${group!.inviteCode})`);
  }

  function askLeave(profileId: string, name: string) {
    const self = profileId === me.id;
    confirm(
      self ? 'Quitter la bande ?' : `Retirer ${name} ?`,
      self ? 'Tu pourras revenir avec le code.' : `${name} pourra revenir avec le code.`,
      self ? 'Quitter' : 'Retirer',
      () => leave.mutate(profileId, { onSuccess: () => (self ? back() : undefined) }),
    );
  }

  const rows = (ranking.data ?? []).filter((row) => row.games > 0);
  const items = feed.data?.pages.flat() ?? [];

  return (
    <Screen edges={['top', 'bottom']} header={header}>
      <View>
        <ThemedText type="title">{group.name}</ThemedText>
        <ThemedText themeColor="textSecondary">
          {[plural(group.members, 'membre'), group.city].filter(Boolean).join(' · ')}
        </ThemedText>
        {group.description ? <ThemedText style={styles.description}>{group.description}</ThemedText> : null}
      </View>

      <Card style={styles.invite}>
        <View style={styles.inviteText}>
          <ThemedText type="caption" themeColor="textSecondary">
            Code d’invitation
          </ThemedText>
          <ThemedText style={styles.code}>{group.inviteCode}</ThemedText>
        </View>
        <Button label="Inviter" icon="share" variant="secondary" onPress={invite} />
      </Card>

      <Segmented options={TABS} value={tab} onChange={setTab} />

      {tab === 'ranking' ? (
        ranking.isLoading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : rows.length === 0 ? (
          <ThemedText themeColor="textSecondary" style={styles.center}>
            Aucune partie de la bande ce mois-ci. Au moment de lancer une partie, choisis la bande !
          </ThemedText>
        ) : (
          <View style={styles.list}>
            <ThemedText type="small" themeColor="textSecondary">
              Victoires ce mois-ci, dans les parties de la bande
            </ThemedText>
            {rows.map((row, index) => (
              <LeaderboardRowItem key={row.seat.id} row={row} rank={index + 1} metric="wins" isMe={row.seat.id === me.id} />
            ))}
          </View>
        )
      ) : null}

      {tab === 'games' ? (
        feed.isLoading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : items.length === 0 ? (
          <ThemedText themeColor="textSecondary" style={styles.center}>
            Pas encore de partie dans la bande.
          </ThemedText>
        ) : (
          <View style={styles.list}>
            {items.map((item) => (
              <FeedCard key={item.game.id} item={item} viewerId={me.id} teamElo={teamElo} />
            ))}
            {feed.hasNextPage ? (
              <Button
                label="Voir plus"
                variant="ghost"
                disabled={feed.isFetchingNextPage}
                onPress={() => feed.fetchNextPage()}
              />
            ) : null}
          </View>
        )
      ) : null}

      {tab === 'members' ? (
        members.isLoading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <Card style={styles.members}>
            {(members.data ?? []).map((member, index) => {
              const self = member.seat.id === me.id;
              const canRemove = self || (group.isAdmin && member.role !== 'admin');
              return (
                <PlayerRow
                  key={member.seat.id}
                  seat={member.seat}
                  bordered={index > 0}
                  subtitle={member.role === 'admin' ? 'Admin' : 'Membre'}
                  onPress={() => router.push({ pathname: '/u/[id]', params: { id: member.seat.id } })}
                  trailing={
                    canRemove ? (
                      <Button
                        label={self ? 'Quitter' : 'Retirer'}
                        variant="ghost"
                        onPress={() => askLeave(member.seat.id, member.seat.name)}
                      />
                    ) : null
                  }
                />
              );
            })}
          </Card>
        )
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  description: {
    marginTop: Spacing.two,
  },
  invite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  inviteText: {
    flex: 1,
  },
  code: {
    fontFamily: Fonts.body[800],
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: 4,
    color: Colors.primary,
  },
  list: {
    gap: Spacing.two,
  },
  members: {
    paddingVertical: Spacing.one,
  },
  center: {
    textAlign: 'center',
  },
});

