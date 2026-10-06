import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Section } from '@/components/section';
import { Spacing } from '@/constants/theme';
import { FinishedGameCard, OngoingGameCard } from '@/features/coinche/components/game-card';
import { isFinished } from '@/features/coinche/scoring';
import type { Game } from '@/features/coinche/types';

const PREVIEW = 3;

/** Parties d'un profil, de la plus récente à la plus ancienne. */
export function GameHistory({
  games,
  viewerId,
  title = 'Parties',
  editableOwnerId,
}: {
  games: Game[];
  viewerId: string;
  title?: string;
  /** Les parties de ce compte (ou locales) gardent leur menu ; les autres sont en lecture seule. */
  editableOwnerId?: string | null;
}) {
  const [showAll, setShowAll] = useState(false);
  if (games.length === 0) return null;
  const visible = showAll ? games : games.slice(0, PREVIEW);

  return (
    <Section
      large
      title={title}
      action={
        games.length > PREVIEW ? { label: showAll ? 'Réduire' : 'Tout voir', onPress: () => setShowAll((v) => !v) } : undefined
      }>
      <View style={styles.list}>
        {visible.map((game) =>
          isFinished(game) ? (
            <FinishedGameCard key={game.id} game={game} viewerId={viewerId} />
          ) : (
            <OngoingGameCard
              key={game.id}
              game={game}
              readOnly={editableOwnerId === undefined || (game.ownerId !== null && game.ownerId !== editableOwnerId)}
            />
          ),
        )}
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two + Spacing.one,
  },
});
