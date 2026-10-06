import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, IconButton } from '@/components/button';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, Radius, Spacing, Sticker } from '@/constants/theme';
import { useMe } from '@/features/auth/session';
import { ScoreChart } from '@/features/coinche/components/score-chart';
import { plural } from '@/features/coinche/format';
import { gameStats, isFinished, isStoppedEarly, otherTeam, teamOf, totalScore } from '@/features/coinche/scoring';
import { useGame, useGames } from '@/features/coinche/store';
import type { Game } from '@/features/coinche/types';
import { GuestInvites } from '@/features/players/components/guest-invites';
import { GamePhoto } from '@/features/social/components/game-photo';
import { GameShareCard } from '@/features/social/components/share-cards';
import { queryClient } from '@/features/social/queries';
import { shareAsImage } from '@/features/social/share';
import { syncNow } from '@/features/sync/sync';

/** Écran de fin de partie : vainqueur, courbe du score, stats, puis continuer, revanche ou partage. */
export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const game = useGame(id);
  const rematch = useGames((s) => s.rematch);
  const me = useMe();
  const cardRef = useRef<View>(null);

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
  const myTeam = teamOf(game, me.id);
  const stats = gameStats(game, myTeam);
  const winnerName = winner ? game.teams[winner].name : null;
  const headline = !winnerName
    ? 'Match nul'
    : myTeam === winner || winnerName.toLowerCase() === 'nous'
      ? 'Victoire !'
      : `${winnerName} gagne${game.teams[winner!].players.length > 1 ? 'nt' : ''} !`;
  const status = isStoppedEarly(game) ? 'Partie arrêtée' : 'Partie terminée';

  function playAgain() {
    const newId = rematch(game!.id);
    if (!newId) return;
    router.dismissAll();
    router.push({ pathname: '/game/[id]', params: { id: newId } });
  }

  /** Ferme la partie et la poste dans le fil (selon sa visibilité), sans rien envoyer aux autres. */
  function done() {
    if (router.canDismiss()) router.dismissAll();
    router.navigate('/feed');
    // La synchro auto attend quelques secondes : on envoie tout de suite, puis le fil se relit depuis le serveur.
    void syncNow()
      .catch(() => undefined)
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['feed'] });
        queryClient.invalidateQueries({ queryKey: ['group-feed'] });
      });
  }

  function share() {
    const text = winnerName
      ? `🏆 ${winnerName} remporte la partie de coinche ${score[first]} à ${score[second]} (${game!.teams.A.name} vs ${game!.teams.B.name}, ${plural(stats.rounds, 'mène')}).`
      : `🤝 Match nul ${score.A} partout entre ${game!.teams.A.name} et ${game!.teams.B.name} à la coinche (${plural(stats.rounds, 'mène')}).`;
    shareAsImage(cardRef, text);
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
          <Button label="Continuer" variant="secondary" trailingIcon="arrow-right" onPress={done} />
          <View style={styles.secondaryActions}>
            <Button label="Revanche" variant="outline" icon="swap" onDark onPress={playAgain} style={styles.half} />
            <Button label="Partager" variant="outline" icon="share" onDark onPress={share} style={styles.half} />
          </View>
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

      {/* Le récit se raconte à la fin, avant de partager : il faut un compte, la photo part sur le serveur. */}
      {me.signedIn && game.ownerId === me.id && !game.simple ? <StoryPrompt game={game} /> : null}

      <GuestInvites game={game} onDark />

      {/* Carte image capturée au partage, rendue hors de l'écran. */}
      <View style={styles.offscreen}>
        <GameShareCard ref={cardRef} game={game} />
      </View>
    </Screen>
  );
}

/** Récit de la partie : une photo de la tablée, un mot, le lieu. */
function StoryPrompt({ game }: { game: Game }) {
  const hasStory = Boolean(game.note || game.location || game.photoPath);
  const details = [game.location, game.note].filter(Boolean).join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/game/[id]/story', params: { id: game.id } })}
      style={({ pressed }) => [styles.story, !hasStory && styles.storyEmpty, pressed && styles.pressed]}>
      {game.photoPath ? (
        <GamePhoto path={game.photoPath} style={styles.storyPhoto} />
      ) : (
        <View style={styles.storyIcon}>
          <Icon name="camera" size={22} color="#5E4812" />
        </View>
      )}
      <View style={styles.storyText}>
        <ThemedText type="smallBold" themeColor="onPrimary">
          {hasStory ? 'Ton récit' : 'Ajoute une photo de la tablée'}
        </ThemedText>
        <ThemedText type="small" themeColor="onPrimaryMuted" numberOfLines={2}>
          {hasStory ? details || 'Photo ajoutée' : 'Un mot, le lieu : la touche finale avant de partager.'}
        </ThemedText>
      </View>
      <Icon name={hasStory ? 'pencil' : 'chevron-right'} size={18} color={Colors.onPrimaryMuted} />
    </Pressable>
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
  story: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.medium,
    padding: Spacing.three - Spacing.one,
  },
  storyEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.onPrimaryMuted,
  },
  storyPhoto: {
    width: 52,
    height: 52,
    aspectRatio: 1,
    borderRadius: Radius.small,
  },
  storyIcon: {
    width: 52,
    height: 52,
    borderRadius: Radius.pill,
    backgroundColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyText: {
    flex: 1,
    gap: 2,
  },
  pressed: {
    opacity: 0.8,
  },
  offscreen: {
    position: 'absolute',
    left: -10000,
    top: 0,
    pointerEvents: 'none',
  },
  actions: {
    gap: Spacing.two + Spacing.one,
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: Spacing.two + Spacing.one,
  },
  half: {
    flex: 1,
    paddingHorizontal: Spacing.two,
  },
});
