import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { allPlayers } from '@/features/coinche/players';
import { totalScore } from '@/features/coinche/scoring';
import type { Game, Seat, TeamId } from '@/features/coinche/types';
import type { TableRatings } from '@/features/social/api';
import { useMyFriendships, useTableRatings } from '@/features/social/queries';
import { formatEloDelta, rateGame } from '@/features/stats/elo';

import { Avatar } from './avatar';
import { useRankedCheck } from './ranked-requirements';

type EloRow = { seat: Seat; before: number; after: number };

/**
 * Cote de chaque joueur avant et après la partie. Une fois la partie classée par la base, ses chiffres font foi ;
 * avant (la synchro prend quelques secondes), le même calcul fait ici, à partir des cotes actuelles.
 */
function eloRows(game: Game, ratings: TableRatings): EloRow[] | null {
  if (Object.keys(ratings.rated).length > 0) {
    return allPlayers(game).flatMap((seat) => (ratings.rated[seat.id] ? [{ seat, ...ratings.rated[seat.id] }] : []));
  }
  const ratedTeam = (team: TeamId) =>
    game.teams[team].players.flatMap((p) => (ratings.current[p.id] ? [ratings.current[p.id]] : []));
  const rated = { A: ratedTeam('A'), B: ratedTeam('B') };
  if (rated.A.length !== game.teams.A.players.length || rated.B.length !== game.teams.B.players.length) return null;
  const score = totalScore(game);
  const next = rateGame(rated, { winner: game.winner, scoreA: score.A, scoreB: score.B, target: game.targetScore });
  return (['A', 'B'] as const).flatMap((team) =>
    game.teams[team].players.map((seat, index) => ({ seat, before: rated[team][index].elo, after: next[team][index] })),
  );
}

/** Fin d'une partie classée (fond vert) : ce que chaque joueur a gagné ou perdu, ou pourquoi elle ne compte pas. */
export function EloGains({ game }: { game: Game }) {
  const teams = { A: game.teams.A.players, B: game.teams.B.players };
  const check = useRankedCheck(teams);
  const friendships = useMyFriendships();
  const ratings = useTableRatings([...teams.A, ...teams.B], game.id);
  if (!ratings.data || !friendships.data) return null;

  const alreadyRated = Object.keys(ratings.data.rated).length > 0;
  const rows = alreadyRated || check.ok ? eloRows(game, ratings.data) : null;

  return (
    <View style={styles.section}>
      <ThemedText type="caption" themeColor="onPrimaryMuted">
        Cote Elo
      </ThemedText>
      <View style={styles.card}>
        {rows ? (
          [...rows]
            .sort((a, b) => b.after - b.before - (a.after - a.before))
            .map((row, index) => (
              <View key={row.seat.id} style={[styles.row, index > 0 && styles.border]}>
                <Avatar seat={row.seat} size={34} />
                <View style={styles.text}>
                  <ThemedText type="smallBold" themeColor="onPrimary" numberOfLines={1}>
                    {row.seat.name}
                  </ThemedText>
                  <ThemedText type="small" themeColor="onPrimaryMuted">
                    {row.before} → {row.after}
                  </ThemedText>
                </View>
                <ThemedText
                  style={[
                    styles.delta,
                    row.after > row.before ? styles.gain : row.after < row.before ? styles.loss : styles.even,
                  ]}>
                  {formatEloDelta(row.after - row.before)}
                </ThemedText>
              </View>
            ))
        ) : (
          <ThemedText type="small" themeColor="onPrimaryMuted">
            {check.missingAccounts > 0
              ? 'Partie non classée : il faut 4 comptes à la table, les invités et les places vides ne comptent pas.'
              : 'Partie non classée : tous les joueurs doivent être amis avec toi.'}
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two + Spacing.one,
  },
  card: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three - Spacing.one,
    paddingVertical: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.one,
    paddingVertical: Spacing.two,
  },
  border: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.onPrimaryMuted,
  },
  text: {
    flex: 1,
  },
  delta: {
    minWidth: 58,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: 800,
    fontVariant: ['tabular-nums'],
  },
  gain: {
    backgroundColor: Colors.gold,
    color: '#5E4812',
  },
  loss: {
    backgroundColor: Colors.dangerSoft,
    color: Colors.danger,
  },
  even: {
    backgroundColor: Colors.primary,
    color: Colors.onPrimary,
  },
});
