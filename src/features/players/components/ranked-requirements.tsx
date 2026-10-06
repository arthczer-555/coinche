import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useMe } from '@/features/auth/session';
import { plural } from '@/features/coinche/format';
import type { Seat, TeamId } from '@/features/coinche/types';
import { FriendButton } from '@/features/social/components/friend-button';
import { useMyFriendships, useTableRatings } from '@/features/social/queries';
import { ELO_NEW_GAMES, eloStakes, formatEloDelta } from '@/features/stats/elo';

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
 * les joueurs à ajouter en amis directement d'ici, puis l'enjeu de chacun.
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

      {check.missingAccounts === 0 ? <EloStakes teams={teams} /> : null}
    </Card>
  );
}

/** Ce que chaque joueur gagne ou perd selon l'issue de la partie, annoncé avant de distribuer. */
function EloStakes({ teams }: { teams: Record<TeamId, Seat[]> }) {
  const ratings = useTableRatings([...teams.A, ...teams.B]);
  const current = ratings.data?.current;
  if (!current) return null;
  const ratedTeam = (team: TeamId) => teams[team].flatMap((p) => (current[p.id] ? [current[p.id]] : []));
  const rated = { A: ratedTeam('A'), B: ratedTeam('B') };
  if (rated.A.length !== teams.A.length || rated.B.length !== teams.B.length) return null;
  const stakes = eloStakes(rated);
  const hasNewPlayer = [...rated.A, ...rated.B].some((r) => r.games < ELO_NEW_GAMES);

  return (
    <View style={styles.stakes}>
      {(['A', 'B'] as const).map((team) => (
        <View key={team}>
          <View style={styles.stakesHeader}>
            <ThemedText type="smallBold" style={styles.lineText}>
              Équipe {team === 'A' ? 1 : 2}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.stakeColumn}>
              Victoire
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.stakeColumn}>
              Défaite
            </ThemedText>
          </View>
          {teams[team].map((seat, index) => (
            <PlayerRow
              key={seat.id}
              seat={seat}
              bordered={index > 0}
              subtitle={`${rated[team][index].elo} Elo${rated[team][index].games < ELO_NEW_GAMES ? ' · nouveau' : ''}`}
              trailing={
                <View style={styles.stakePills}>
                  <ThemedText
                    style={[styles.stakePill, styles.stakeWin]}
                    accessibilityLabel={`${formatEloDelta(stakes[team][index].win)} en cas de victoire`}>
                    {formatEloDelta(stakes[team][index].win)}
                  </ThemedText>
                  <ThemedText
                    style={[styles.stakePill, styles.stakeLoss]}
                    accessibilityLabel={`${formatEloDelta(stakes[team][index].loss)} en cas de défaite`}>
                    {formatEloDelta(stakes[team][index].loss)}
                  </ThemedText>
                </View>
              }
            />
          ))}
        </View>
      ))}
      <ThemedText type="small" themeColor="textSecondary">
        Pour un écart de score moyen : une partie serrée compte moitié moins, une raclée jusqu’à moitié plus. Battre
        plus fort que soi rapporte davantage.
        {hasNewPlayer ? ' Les 10 premières parties classées d’un joueur comptent 1,5 fois plus.' : ''}
      </ThemedText>
    </View>
  );
}

/** Largeur des colonnes Victoire / Défaite de l'enjeu. */
const STAKE_WIDTH = 58;

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
  stakes: {
    gap: Spacing.three,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  stakesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  stakeColumn: {
    width: STAKE_WIDTH,
    textAlign: 'center',
  },
  stakePills: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  stakePill: {
    width: STAKE_WIDTH,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: 800,
    fontVariant: ['tabular-nums'],
  },
  stakeWin: {
    backgroundColor: Colors.successSoft,
    color: Colors.success,
  },
  stakeLoss: {
    backgroundColor: Colors.dangerSoft,
    color: Colors.danger,
  },
});
