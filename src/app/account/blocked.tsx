import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, IconButton } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { PlayerRow } from '@/features/players/components/player-row';
import { useBlocked, useSetBlocked } from '@/features/social/queries';

/** Joueurs bloqués, avec déblocage. */
export default function BlockedScreen() {
  const blocked = useBlocked();
  const setBlocked = useSetBlocked();

  return (
    <Screen
      edges={['top', 'bottom']}
      header={
        <View style={styles.header}>
          <IconButton name="chevron-left" accessibilityLabel="Retour" onPress={router.back} />
          <ThemedText type="heading">Joueurs bloqués</ThemedText>
          <View style={styles.spacer} />
        </View>
      }>
      {blocked.isLoading ? (
        <ActivityIndicator color={Colors.primary} />
      ) : (blocked.data ?? []).length === 0 ? (
        <ThemedText themeColor="textSecondary">Tu n’as bloqué personne.</ThemedText>
      ) : (
        <Card style={styles.list}>
          {(blocked.data ?? []).map((seat, index) => (
            <PlayerRow
              key={seat.id}
              seat={seat}
              bordered={index > 0}
              subtitle={seat.kind === 'user' && seat.username ? `@${seat.username}` : undefined}
              trailing={
                <Button
                  label="Débloquer"
                  variant="outline"
                  style={styles.button}
                  disabled={setBlocked.isPending}
                  onPress={() => setBlocked.mutate({ profileId: seat.id, blocked: false })}
                />
              }
            />
          ))}
        </Card>
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
  list: {
    paddingVertical: Spacing.one,
  },
  button: {
    minHeight: 40,
    paddingHorizontal: Spacing.three,
  },
});
