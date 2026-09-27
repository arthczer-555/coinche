import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Button, IconButton } from '@/components/button';
import { OptionChip } from '@/components/option-chip';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { Segmented } from '@/components/segmented';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { SuitIcon } from '@/features/coinche/components/suit-icon';
import { BID_VALUES, formatBid, scoreRound, totalScore } from '@/features/coinche/scoring';
import { useGame, useGames } from '@/features/coinche/store';
import { SUIT_LABEL } from '@/features/coinche/format';
import type { Bid, Coinche, Suit, TeamId } from '@/features/coinche/types';
import { TEAM_SUIT, useTeamColors } from '@/features/coinche/use-team-colors';

const TEAMS: TeamId[] = ['A', 'B'];

const TRUMPS: Suit[] = ['hearts', 'diamonds', 'spades', 'clubs', 'no-trump', 'all-trump'];

const COINCHE_OPTIONS: { value: Coinche; label: string }[] = [
  { value: 'none', label: 'Rien' },
  { value: 'coinche', label: 'Coinché' },
  { value: 'surcoinche', label: 'Surcoinché' },
];

const RESULT_OPTIONS: { value: 'made' | 'failed'; label: string }[] = [
  { value: 'made', label: 'Fait' },
  { value: 'failed', label: 'Chuté' },
];

export default function RoundScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const game = useGame(id);
  const addRound = useGames((s) => s.addRound);
  const teamColors = useTeamColors();

  const [bidder, setBidder] = useState<TeamId | null>(null);
  const [bid, setBid] = useState<Bid | null>(null);
  /** Facultatif : un second appui sur l'atout choisi le désélectionne. */
  const [trump, setTrump] = useState<Suit | null>(null);
  const [coinche, setCoinche] = useState<Coinche>('none');
  const [made, setMade] = useState(true);

  if (!game) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ThemedText themeColor="textSecondary">Partie introuvable.</ThemedText>
      </Screen>
    );
  }

  const score = totalScore(game);
  const draft = bidder !== null && bid !== null ? { bidder, bid, trump, coinche, made } : null;
  const preview = draft ? scoreRound(draft) : null;

  function submit() {
    if (!game || !draft) return;
    addRound(game.id, draft);
    if (useGames.getState().games[game.id]?.winner) {
      router.replace({ pathname: '/game/[id]/result', params: { id: game.id } });
    } else {
      router.back();
    }
  }

  return (
    <Screen
      edges={Platform.OS === 'ios' ? ['bottom'] : ['top', 'bottom']}
      header={
        <View>
          {Platform.OS === 'ios' ? <View style={styles.grabber} /> : null}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <ThemedText type="heading" style={styles.title}>
                Mène {game.rounds.length + 1}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {game.teams.A.name} {score.A} · {game.teams.B.name} {score.B}
              </ThemedText>
            </View>
            <IconButton name="x" variant="muted" size={36} accessibilityLabel="Fermer" onPress={router.back} />
          </View>
        </View>
      }
      footer={
        <View style={styles.footer}>
          <View style={styles.preview}>
            {TEAMS.map((team) => (
              <ThemedText key={team} type="small" themeColor="textSecondary" numberOfLines={1}>
                {game.teams[team].name}{' '}
                <ThemedText type="smallBold" style={{ color: preview?.[team] ? teamColors[team] : Colors.text }}>
                  {preview?.[team] ? `+${preview[team]}` : '0'}
                </ThemedText>
              </ThemedText>
            ))}
          </View>
          <Button label="Valider la mène" onPress={submit} disabled={!draft} />
        </View>
      }>
      <Section title="Qui prend ?">
        <View style={styles.row}>
          {TEAMS.map((team) => (
            <OptionChip
              key={team}
              label={game.teams[team].name}
              renderIcon={(color) => (
                <SuitIcon suit={TEAM_SUIT[team]} size={13} color={bidder === team ? color : teamColors[team]} />
              )}
              selected={bidder === team}
              onPress={() => setBidder(team)}
              color={teamColors[team]}
              size="large"
              style={styles.flex}
            />
          ))}
        </View>
      </Section>

      <Section title="Contrat">
        <View style={styles.grid}>
          {BID_VALUES.map((value) => {
            const special = typeof value !== 'number';
            return (
              <OptionChip
                key={String(value)}
                label={formatBid(value)}
                selected={bid === value}
                onPress={() => setBid(value)}
                idleBackground={special ? Colors.warningSoft : Colors.surface}
                idleTextColor={special ? Colors.warning : Colors.text}
                style={styles.cell}
              />
            );
          })}
        </View>
      </Section>

      <Section title="Atout (facultatif)">
        <View style={styles.row}>
          {TRUMPS.map((suit) => (
            <OptionChip
              key={suit}
              accessibilityLabel={SUIT_LABEL[suit]}
              renderIcon={() => <SuitIcon suit={suit} size={18} />}
              selected={trump === suit}
              onPress={() => setTrump(trump === suit ? null : suit)}
              appearance="outline"
              style={styles.flex}
            />
          ))}
        </View>
      </Section>

      <Section title="Enchère">
        <Segmented
          options={COINCHE_OPTIONS}
          value={coinche}
          onChange={setCoinche}
          selectedBackground={Colors.surface}
          selectedText={Colors.text}
        />
      </Section>

      <Section title="Résultat">
        <Segmented
          options={RESULT_OPTIONS}
          value={made ? 'made' : 'failed'}
          onChange={(value) => setMade(value === 'made')}
          selectedBackground={made ? Colors.primary : Colors.danger}
          selectedText={Colors.onPrimary}
        />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceMuted,
    marginBottom: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.two,
  },
  headerText: {
    flexShrink: 1,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  cell: {
    flexBasis: '18%',
    flexGrow: 1,
    paddingHorizontal: Spacing.one,
  },
  footer: {
    gap: Spacing.two + Spacing.one,
  },
  preview: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.three,
  },
});
