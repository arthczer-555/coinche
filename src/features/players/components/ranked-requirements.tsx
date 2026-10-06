import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useMe } from '@/features/auth/session';
import { plural } from '@/features/coinche/format';
import type { Seat, TeamId } from '@/features/coinche/types';
import { FriendButton } from '@/features/social/components/friend-button';
import { useMyFriendships } from '@/features/social/queries';

import { rankedCheck, type RankedCheck } from '../ranked';
import { PlayerRow } from './player-row';

/** La table permet-elle une partie classée ? Revérifié toutes les 4 s tant qu'une demande d'ami attend. */
export function useRankedCheck(teams: Record<TeamId, Seat[]>): RankedCheck {
  const me = useMe();
  const friendships = useMyFriendships({ live: true });
  const friendIds = new Set((friendships.data ?? []).filter((f) => f.status === 'friends').map((f) => f.seat.id));
  return rankedCheck(teams, me.id, friendIds);
}

/**
 * Le petit avertissement d'une partie classée : à quoi elle sert, ce qu'il faut (4 comptes, tous amis avec moi),
 * et les joueurs à ajouter en amis directement d'ici.
 */
export function RankedRequirements({ teams }: { teams: Record<TeamId, Seat[]> }) {
  const check = useRankedCheck(teams);
  const friendships = useMyFriendships();
  const statusOf = (seat: Seat) => friendships.data?.find((f) => f.seat.id === seat.id)?.status ?? null;

  return (
    <Card style={styles.card}>
      <View style={styles.title}>
        <Icon name="trophy" size={18} color={Colors.text} />
        <ThemedText type="smallBold">Partie classée</ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        Elle fait bouger la cote Elo des 4 joueurs. Contre la triche, elle ne compte que si la table a 4 comptes, tous amis
        avec toi.
      </ThemedText>

      {check.missingAccounts > 0 ? (
        <View style={styles.line}>
          <Icon name="flag" size={16} color={Colors.warning} />
          <ThemedText type="small" themeColor="warning" style={styles.lineText}>
            Il manque {plural(check.missingAccounts, 'compte')} : les invités et les places vides ne comptent pas.
          </ThemedText>
        </View>
      ) : null}

      {check.notFriends.length > 0 ? (
        <View>
          {check.notFriends.map((seat, index) => (
            <PlayerRow
              key={seat.id}
              seat={seat}
              bordered={index > 0}
              subtitle={
                statusOf(seat) === 'sent'
                  ? 'Demande envoyée, à accepter sur son téléphone'
                  : statusOf(seat) === 'received'
                    ? 'T’a demandé en ami'
                    : 'Pas encore ami avec toi'
              }
              trailing={<FriendButton seat={seat} />}
            />
          ))}
        </View>
      ) : null}

      {check.ok ? (
        <View style={styles.line}>
          <Icon name="check" size={16} color={Colors.success} />
          <ThemedText type="small" themeColor="success" style={styles.lineText}>
            Tout le monde est ami : la partie comptera pour la cote.
          </ThemedText>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
  },
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  lineText: {
    flex: 1,
  },
});
