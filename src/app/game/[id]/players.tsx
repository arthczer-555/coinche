import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { IconButton } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { Segmented } from '@/components/segmented';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useMe } from '@/features/auth/session';
import { TeamBadge } from '@/features/coinche/components/suit-icon';
import { VISIBILITY_OPTIONS } from '@/features/coinche/format';
import { useGame, useGames } from '@/features/coinche/store';
import { GuestInvites } from '@/features/players/components/guest-invites';
import { RankedRequirements } from '@/features/players/components/ranked-requirements';
import { TeamPlayers } from '@/features/players/components/team-players';
import { applyPick, openPicker } from '@/features/players/draft';
import { useDeclinedPlayers } from '@/features/social/queries';

/** Joueurs d'une partie déjà lancée (oubli, erreur de place) et qui peut la voir. */
export default function GamePlayersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const game = useGame(id);
  const me = useMe();
  const setVisibility = useGames((s) => s.setVisibility);
  const declined = useDeclinedPlayers(me.signedIn ? game?.id : undefined);

  return (
    <Screen
      edges={['top', 'bottom']}
      header={
        <View style={styles.header}>
          <IconButton name="chevron-left" accessibilityLabel="Retour" onPress={router.back} />
          <ThemedText type="heading">Joueurs</ThemedText>
          <View style={styles.spacer} />
        </View>
      }>
      {!game ? (
        <ThemedText themeColor="textSecondary">Partie introuvable.</ThemedText>
      ) : (
        <>
          {(['A', 'B'] as const).map((team) => (
            <Card key={team} style={styles.team}>
              <View style={styles.teamHeader}>
                <TeamBadge team={team} size={30} />
                <ThemedText type="smallBold" numberOfLines={1} style={styles.teamName}>
                  {game.teams[team].name}
                </ThemedText>
              </View>
              <TeamPlayers
                team={team}
                players={game.teams[team].players}
                meId={me.id}
                declinedIds={declined.data}
                onPick={(slot) => openPicker({ team, slot, gameId: game.id })}
                onRemove={(slot) => applyPick({ team, slot, gameId: game.id }, null)}
              />
            </Card>
          ))}

          {me.signedIn && game.ranked ? (
            <RankedRequirements teams={{ A: game.teams.A.players, B: game.teams.B.players }} />
          ) : null}

          {me.signedIn ? (
            <Section title="Qui peut voir la partie ?">
              <Segmented
                options={VISIBILITY_OPTIONS}
                value={game.visibility}
                onChange={(visibility) => setVisibility(game.id, visibility)}
              />
              <ThemedText type="small" themeColor="textSecondary">
                Les joueurs de la partie la voient toujours.
              </ThemedText>
            </Section>
          ) : null}

          <GuestInvites game={game} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spacer: {
    width: 40,
  },
  team: {
    gap: Spacing.three,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.one,
  },
  teamName: {
    flex: 1,
    fontSize: 15,
  },
});
