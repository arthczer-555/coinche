import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, IconButton } from '@/components/button';
import { Card } from '@/components/card';
import { confirm } from '@/components/confirm';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing, Sticker, StickerPressed } from '@/constants/theme';
import { RoundRow, RoundTableHeader } from '@/features/coinche/components/round-row';
import { Scoreboard } from '@/features/coinche/components/scoreboard';
import { isFinished } from '@/features/coinche/scoring';
import { useGame, useGames } from '@/features/coinche/store';
import { useGameMenu } from '@/features/coinche/use-game-menu';

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const game = useGame(id);
  const undoLastRound = useGames((s) => s.undoLastRound);
  const openGameMenu = useGameMenu();

  if (!game) {
    return (
      <Screen edges={['top', 'bottom']} header={<IconButton name="chevron-left" accessibilityLabel="Retour" onPress={router.back} />}>
        <ThemedText themeColor="textSecondary">Partie introuvable.</ThemedText>
      </Screen>
    );
  }

  const hasRounds = game.rounds.length > 0;

  function undo() {
    if (!game) return;
    confirm(
      'Supprimer la dernière mène ?',
      `La mène ${game.rounds.length} sera retirée du score.`,
      'Supprimer',
      () => undoLastRound(game.id),
    );
  }

  return (
    <Screen
      edges={['top', 'bottom']}
      header={
        <View style={styles.header}>
          <IconButton name="chevron-left" accessibilityLabel="Retour" onPress={router.back} />
          <View style={styles.headerTitle}>
            <ThemedText type="smallBold" numberOfLines={1} style={styles.title}>
              {game.teams.A.name} vs {game.teams.B.name}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
              Premier à {game.targetScore}
            </ThemedText>
          </View>
          <IconButton
            name="more"
            accessibilityLabel="Options de la partie"
            onPress={() => openGameMenu(game, { onDeleted: router.back })}
          />
        </View>
      }
      footer={
        <View style={styles.footer}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Annuler la dernière mène"
            disabled={!hasRounds}
            onPress={undo}
            style={({ pressed }) => [styles.undo, pressed && hasRounds && StickerPressed, !hasRounds && styles.disabled]}>
            <Icon name="undo" size={20} color={Colors.text} />
          </Pressable>
          {isFinished(game) ? (
            <Button
              label="Voir le résultat"
              icon="trophy"
              style={styles.main}
              onPress={() => router.push({ pathname: '/game/[id]/result', params: { id: game.id } })}
            />
          ) : (
            <Button
              label="Nouvelle mène"
              icon="plus"
              style={styles.main}
              onPress={() => router.push({ pathname: '/game/[id]/round', params: { id: game.id } })}
            />
          )}
        </View>
      }>
      <Scoreboard game={game} />

      <Card style={styles.table}>
        <RoundTableHeader game={game} />
        {hasRounds ? (
          game.rounds
            .map((round, index) => (
              <View key={round.id} style={styles.rowBorder}>
                <RoundRow game={game} round={round} index={index} />
              </View>
            ))
            .reverse()
        ) : (
          <View style={[styles.rowBorder, styles.empty]}>
            <ThemedText themeColor="textSecondary" style={styles.emptyText}>
              Aucune mène jouée. Distribue les cartes !
            </ThemedText>
          </View>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  table: {
    padding: 0,
    overflow: 'hidden',
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  empty: {
    padding: Spacing.four,
  },
  emptyText: {
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.two + Spacing.one,
  },
  undo: {
    width: 54,
    height: 54,
    borderRadius: Radius.large,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Sticker,
  },
  main: {
    flex: 1,
  },
  disabled: {
    opacity: 0.4,
  },
});
