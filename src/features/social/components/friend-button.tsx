import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing, StickerSmall } from '@/constants/theme';
import { useMe } from '@/features/auth/session';
import { firstName } from '@/features/coinche/players';
import type { Seat } from '@/features/coinche/types';

import { useFriendStatus } from '../queries';
import { useFriendActions } from '../use-friend-actions';

/**
 * Petit bouton d'ami des listes de joueurs : Ajouter, Envoyée, Accepter (+ refuser), Amis.
 * `compact` (cartes étroites) : pas de bouton refuser à côté d'Accepter, le refus se fait depuis le profil.
 */
export function FriendButton({ seat, compact = false }: { seat: Seat; compact?: boolean }) {
  const me = useMe();
  const { status, isLoading } = useFriendStatus(seat.id);
  const actions = useFriendActions();
  if (!me.signedIn || seat.kind !== 'user' || seat.id === me.id) return null;

  const name = firstName(seat.name);
  const busy = actions.busy || isLoading;

  if (status === 'received') {
    if (compact) return <Pill label="Accepter" icon="check" primary busy={busy} onPress={() => actions.addFriend(seat.id)} />;
    return (
      <View style={styles.pair}>
        <Pill label="Accepter" icon="check" primary busy={busy} onPress={() => actions.addFriend(seat.id)} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Refuser la demande de ${name}`}
          disabled={busy}
          hitSlop={4}
          onPress={() => actions.decline(seat.id)}
          style={({ pressed }) => [styles.decline, pressed && styles.pressed]}>
          <Icon name="x" size={16} color={Colors.text} />
        </Pressable>
      </View>
    );
  }
  if (status === 'friends') {
    return <Pill label="Amis" icon="users" busy={busy} onPress={() => actions.unfriend(seat.id, name)} />;
  }
  if (status === 'sent') {
    return <Pill label="Envoyée" icon="check" busy={busy} onPress={() => actions.cancelRequest(seat.id, name)} />;
  }
  return <Pill label="Ajouter" icon="user-plus" primary busy={busy} onPress={() => actions.addFriend(seat.id)} />;
}

function Pill({
  label,
  icon,
  primary = false,
  busy,
  onPress,
}: {
  label: string;
  icon: IconName;
  primary?: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  const color = primary ? Colors.onPrimary : Colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [styles.button, primary ? styles.primary : styles.muted, pressed && styles.pressed]}>
      {busy ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <>
          <Icon name={icon} size={14} color={color} />
          <ThemedText type="smallBold" style={{ color }}>
            {label}
          </ThemedText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    minWidth: 96,
    minHeight: 36,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  primary: {
    backgroundColor: Colors.primary,
    ...StickerSmall,
  },
  muted: {
    backgroundColor: Colors.surfaceMuted,
  },
  pair: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  decline: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
});
