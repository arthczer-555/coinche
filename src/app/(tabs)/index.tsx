import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button, IconButton } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { Segmented } from '@/components/segmented';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MaxFontScale, Radius, Spacing, Sticker } from '@/constants/theme';
import { TeamBadge } from '@/features/coinche/components/suit-icon';
import { TARGET_PRESETS } from '@/features/coinche/scoring';
import { useGames } from '@/features/coinche/store';
import type { TeamId } from '@/features/coinche/types';

type TargetOption = number | 'custom';

const TARGET_OPTIONS: { value: TargetOption; label: string }[] = [
  ...TARGET_PRESETS.map((value) => ({ value, label: String(value) })),
  { value: 'custom', label: 'Autre' },
];

export default function PlayScreen() {
  const createGame = useGames((s) => s.createGame);

  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [target, setTarget] = useState<TargetOption>(TARGET_PRESETS[0]);
  const [customTarget, setCustomTarget] = useState('');

  const targetScore = target === 'custom' ? Number.parseInt(customTarget, 10) : target;
  const isValid = Number.isFinite(targetScore) && targetScore > 0;

  function swapTeams() {
    setTeamA(teamB);
    setTeamB(teamA);
  }

  function start() {
    if (!isValid) return;
    const id = createGame({ teamA, teamB, targetScore });
    setTeamA('');
    setTeamB('');
    setCustomTarget('');
    router.push({ pathname: '/game/[id]', params: { id } });
  }

  return (
    <Screen
      withTabInset
      footer={<Button label="Distribuer" trailingIcon="arrow-right" onPress={start} disabled={!isValid} />}>
      <View>
        <ThemedText type="title">Nouvelle partie</ThemedText>
        <ThemedText themeColor="textSecondary">Qui s’assoit à la table ?</ThemedText>
      </View>

      <Card style={styles.teams}>
        <View style={styles.teamInputs}>
          <TeamInput team="A" label="Équipe 1" value={teamA} onChangeText={setTeamA} placeholder="Nous" />
          <View style={styles.separator} />
          <TeamInput team="B" label="Équipe 2" value={teamB} onChangeText={setTeamB} placeholder="Eux" />
        </View>
        <IconButton name="swap" variant="muted" size={36} accessibilityLabel="Inverser les équipes" onPress={swapTeams} />
      </Card>

      <Section title="Score à atteindre">
        <Segmented options={TARGET_OPTIONS} value={target} onChange={setTarget} />
        {target === 'custom' ? (
          <TextInput
            value={customTarget}
            onChangeText={(text) => setCustomTarget(text.replace(/[^0-9]/g, ''))}
            placeholder="Ex : 3000"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="number-pad"
            autoFocus
            style={styles.customInput}
            maxLength={5}
            maxFontSizeMultiplier={MaxFontScale}
          />
        ) : null}
      </Section>
    </Screen>
  );
}

function TeamInput({
  team,
  label,
  value,
  onChangeText,
  placeholder,
}: {
  team: TeamId;
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.teamRow}>
      <TeamBadge team={team} />
      <View style={styles.teamText}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.teamLabel}>
          {label}
        </ThemedText>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.text}
          style={styles.teamInput}
          maxLength={24}
          maxFontSizeMultiplier={MaxFontScale}
          returnKeyType="done"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  teams: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  teamInputs: {
    flex: 1,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  teamText: {
    flex: 1,
  },
  teamLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
  teamInput: {
    fontSize: 17,
    fontFamily: Fonts.body[700],
    color: Colors.text,
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginLeft: 36 + Spacing.three,
  },
  customInput: {
    minHeight: 48,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    ...Sticker,
    paddingHorizontal: Spacing.three,
    fontSize: 17,
    fontFamily: Fonts.body[700],
    color: Colors.text,
  },
});
