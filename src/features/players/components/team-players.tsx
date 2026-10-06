import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { PLAYERS_PER_TEAM } from '@/features/coinche/players';
import type { Seat, TeamId } from '@/features/coinche/types';

import { Avatar } from './avatar';

type TeamPlayersProps = {
  team: TeamId;
  players: Seat[];
  /** Ouvre le choix d'un joueur pour cette place (vide ou occupée). */
  onPick: (slot: number) => void;
  onRemove: (slot: number) => void;
  /** Id du joueur qui tient le téléphone (affiché "Moi"). */
  meId: string;
  /** Comptes qui se sont retirés de la partie ("Pas moi"). */
  declinedIds?: readonly string[];
};

/** Les deux places d'une équipe, toujours affichées : joueur identifié, ou place libre à choisir. */
export function TeamPlayers({ team, players, onPick, onRemove, meId, declinedIds }: TeamPlayersProps) {
  return (
    <View style={styles.slots}>
      {Array.from({ length: PLAYERS_PER_TEAM }, (_, slot) => {
        const player = players[slot];
        if (!player) {
          // Numéro de la place à la table : 1-2 pour l'équipe 1, 3-4 pour l'équipe 2.
          const seatNumber = (team === 'A' ? 0 : PLAYERS_PER_TEAM) + slot + 1;
          return (
            <Pressable
              key={`empty-${slot}`}
              accessibilityRole="button"
              accessibilityLabel={`Choisir le joueur ${seatNumber}, équipe ${team === 'A' ? 1 : 2}`}
              onPress={() => onPick(slot)}
              style={({ pressed }) => [styles.slot, styles.empty, pressed && styles.pressed]}>
              <View style={styles.placeholder}>
                <Icon name="user" size={16} color={Colors.textSecondary} />
              </View>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.playerText}>
                Joueur {seatNumber}
              </ThemedText>
              <Icon name="chevron-right" size={16} color={Colors.textTertiary} />
            </Pressable>
          );
        }
        const isMe = player.id === meId;
        const declined = declinedIds?.includes(player.id) ?? false;
        return (
          <View key={player.id} style={styles.slot}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Changer ${player.name}`}
              onPress={() => onPick(slot)}
              style={({ pressed }) => [styles.player, pressed && styles.pressed]}>
              <Avatar seat={player} size={34} />
              <View style={styles.playerText}>
                <ThemedText numberOfLines={1} style={styles.name}>
                  {player.name}
                  {isMe && player.name !== 'Moi' ? ' (moi)' : ''}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {player.kind === 'guest' ? 'Invité, sans compte' : player.username ? `@${player.username}` : 'Ce téléphone'}
                  {declined ? (
                    <ThemedText type="small" themeColor="danger">
                      {' · a dit « Pas moi »'}
                    </ThemedText>
                  ) : null}
                </ThemedText>
              </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Retirer ${player.name}`}
              hitSlop={8}
              onPress={() => onRemove(slot)}
              style={({ pressed }) => [styles.remove, pressed && styles.pressed]}>
              <Icon name="x" size={14} color={Colors.textSecondary} />
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  slots: {
    gap: Spacing.two,
  },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 48,
  },
  empty: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.textTertiary,
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.two,
  },
  placeholder: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  player: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.one,
  },
  playerText: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: 700,
  },
  remove: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
