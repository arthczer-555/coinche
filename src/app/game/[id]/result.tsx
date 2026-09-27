import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Share, StyleSheet, View } from 'react-native';

import { Button, IconButton } from '@/components/button';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius, Spacing, Sticker } from '@/constants/theme';
import { ScoreChart } from '@/features/coinche/components/score-chart';
import { plural } from '@/features/coinche/format';
import { gameStats, isFinished, isStoppedEarly, otherTeam, totalScore } from '@/features/coinche/scoring';
import { useGame, useGames } from '@/features/coinche/store';

/** Écran de fin de partie : vainqueur, courbe du score, stats, revanche et partage. */
export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const game = useGame(id);
  const rematch = useGames((s) => s.rematch);

  if (!game || !isFinished(game)) {
    return (
      <Screen edges={['top', 'bottom']} backgroundColor={Colors.primary}>
        <StatusBar style="light" />
        <ThemedText themeColor="onPrimary">Cette partie n’est pas terminée.</ThemedText>
        <Button label="Retour" variant="secondary" onPress={router.back} />
      </Screen>
    );
  }

  // Sans vainqueur (partie arrêtée sur une égalité) : match nul, affiché dans l'ordre des équipes.
  const winner = game.winner;
  const first = winner ?? 'A';
  const second = otherTeam(first);
  const score = totalScore(game);
  const stats = gameStats(game);
  const winnerName = winner ? game.teams[winner].name : null;
  const headline = !winnerName
    ? 'Match nul'
    : winnerName.toLowerCase() === 'nous'
      ? 'Nous gagnons !'
      : `${winnerName} gagne !`;
  const status = isStoppedEarly(game) ? 'Partie arrêtée' : 'Partie terminée';

  function playAgain() {
    const newId = rematch(game!.id);
    if (!newId) return;
    router.dismissAll();
    router.push({ pathname: '/game/[id]', params: { id: newId } });
  }

  async function share() {
    try {
      await Share.share({
        message: winnerName
          ? `🏆 ${winnerName} remporte la partie de coinche ${score[first]} à ${score[second]} (${game!.teams.A.name} vs ${game!.teams.B.name}, ${plural(stats.rounds, 'mène')}).`
          : `🤝 Match nul ${score.A} partout entre ${game!.teams.A.name} et ${game!.teams.B.name} à la coinche (${plural(stats.rounds, 'mène')}).`,
      });
    } catch {
      // Partage indisponible (web sans Web Share API) : rien à faire.
    }
  }

  return (
    <Screen
      edges={['top', 'bottom']}
      backgroundColor={Colors.primary}
      header={
        <View style={styles.header}>
          {/* Fond vert foncé : texte de la barre d'état en clair (le layout racine le remet en sombre). */}
          <StatusBar style="light" />
          <IconButton name="x" variant="onDark" size={36} accessibilityLabel="Fermer" onPress={router.back} />
        </View>
      }
      footer={
        <View style={styles.actions}>
          <Button label="Revanche" variant="secondary" onPress={playAgain} />
          <Button label="Partager le résultat" variant="outline" icon="share" onDark onPress={share} />
        </View>
      }>
      <View style={styles.hero}>
        <View style={[styles.trophy, !winner && styles.draw]}>
          <Icon name={winner ? 'trophy' : 'swap'} size={26} color={winner ? '#5E4812' : Colors.onPrimary} />
        </View>
        <ThemedText type="caption" themeColor="onPrimaryMuted">
          {status} · {plural(stats.rounds, 'mène')}
        </ThemedText>
        <ThemedText type="title" themeColor="onPrimary" style={styles.center}>
          {headline}
        </ThemedText>
        <View style={styles.finalScore}>
          <ThemedText style={[styles.scoreText, { color: Colors.onPrimary }]}>{score[first]}</ThemedText>
          <ThemedText style={[styles.scoreText, styles.scoreSeparator]}>-</ThemedText>
          <ThemedText style={[styles.scoreText, { color: winner ? Colors.onPrimaryMuted : Colors.onPrimary }]}>
            {score[second]}
          </ThemedText>
        </View>
      </View>

      <ScoreChart game={game} />

      <View style={styles.stats}>
        <Stat value={String(stats.coinches)} label={stats.coinches > 1 ? 'coinches' : 'coinche'} />
        <Stat value={String(stats.capots)} label={stats.capots > 1 ? 'capots' : 'capot'} />
        <Stat value={`+${stats.bestRound}`} label="meilleure mène" />
      </View>
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="heading" themeColor="onPrimary">
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="onPrimaryMuted">
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'flex-end',
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  trophy: {
    width: 60,
    height: 60,
    borderRadius: Radius.pill,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
    ...Sticker,
  },
  draw: {
    backgroundColor: Colors.primaryLight,
  },
  center: {
    textAlign: 'center',
  },
  finalScore: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.three,
  },
  scoreText: {
    fontFamily: Fonts.serif,
    fontSize: 34,
    lineHeight: 40,
    fontVariant: ['tabular-nums'],
  },
  scoreSeparator: {
    color: Colors.onPrimaryMuted,
    fontSize: 22,
  },
  stats: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  stat: {
    flex: 1,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.medium,
    padding: Spacing.three - Spacing.one,
  },
  actions: {
    gap: Spacing.two + Spacing.one,
  },
});
