import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, IconButton } from '@/components/button';
import { Card } from '@/components/card';
import { OptionChip } from '@/components/option-chip';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { Segmented } from '@/components/segmented';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MaxFontScale, Radius, Spacing, Sticker } from '@/constants/theme';
import { useMe } from '@/features/auth/session';
import { TeamBadge } from '@/features/coinche/components/suit-icon';
import { VISIBILITY_OPTIONS } from '@/features/coinche/format';
import { autoTeamName } from '@/features/coinche/players';
import { TARGET_PRESETS } from '@/features/coinche/scoring';
import { useGames } from '@/features/coinche/store';
import type { Seat, TeamId, Visibility } from '@/features/coinche/types';
import { RankedRequirements, useRankedCheck } from '@/features/players/components/ranked-requirements';
import { TeamPlayers } from '@/features/players/components/team-players';
import { applyPick, openPicker, resolveMe, useDraftPlayers } from '@/features/players/draft';
import { useMyGroups } from '@/features/social/queries';
import { track } from '@/lib/analytics';
import { isBackendEnabled } from '@/lib/supabase';

type TargetOption = number | 'custom';

const TARGET_OPTIONS: { value: TargetOption; label: string }[] = [
  ...TARGET_PRESETS.map((value) => ({ value, label: String(value) })),
  { value: 'custom', label: 'Autre' },
];

const FALLBACK_NAME: Record<TeamId, string> = { A: 'Nous', B: 'Eux' };

/** Avec les joueurs (tags, fil des amis) ou juste les points, comme la v1.0. */
type Kind = 'social' | 'simple';

const KIND_OPTIONS: { value: Kind; label: string }[] = [
  { value: 'social', label: 'Avec les joueurs' },
  { value: 'simple', label: 'Juste les points' },
];

type GameMode = 'friendly' | 'ranked';

const MODE_OPTIONS: { value: GameMode; label: string }[] = [
  { value: 'friendly', label: 'Amicale' },
  { value: 'ranked', label: 'Classée' },
];

export default function PlayScreen() {
  const createGame = useGames((s) => s.createGame);
  const me = useMe();
  const draft = useDraftPlayers((s) => s.teams);
  const setDraft = useDraftPlayers((s) => s.setTeams);
  const resetDraft = useDraftPlayers((s) => s.reset);

  const [names, setNames] = useState<Record<TeamId, string>>({ A: '', B: '' });
  const [target, setTarget] = useState<TargetOption>(TARGET_PRESETS[0]);
  const [customTarget, setCustomTarget] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('friends');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [mode, setMode] = useState<GameMode>('friendly');
  const [kind, setKind] = useState<Kind>('social');
  const groups = useMyGroups();
  // Juste les points : il faut un compte (sans compte, rien n'est partagé de toute façon).
  const simple = me.signedIn && kind === 'simple';

  const targetScore = target === 'custom' ? Number.parseInt(customTarget, 10) : target;
  const isValid = Number.isFinite(targetScore) && targetScore > 0;
  // Juste les points : moi seul dans l'équipe 1, comme la v1.0. Le brouillon reste là si on revient en arrière.
  const players: Record<TeamId, Seat[]> = simple
    ? { A: [me.seat], B: [] }
    : { A: draft.A.map((p) => resolveMe(p, me.seat)), B: draft.B.map((p) => resolveMe(p, me.seat)) };
  // Classée : seulement avec un compte, et si la table le permet (4 comptes, tous amis avec moi).
  const ranked = me.signedIn && !simple && mode === 'ranked';
  const rankedCheck = useRankedCheck(players);
  const canStart = isValid && (!ranked || rankedCheck.ok);

  function swapTeams() {
    setNames({ A: names.B, B: names.A });
    // Juste les points : je reste dans l'équipe 1, seuls les noms s'échangent.
    if (!simple) setDraft({ A: draft.B, B: draft.A });
  }

  function start() {
    if (!canStart) return;
    const id = createGame({
      teamA: { name: names.A, players: players.A },
      teamB: { name: names.B, players: players.B },
      targetScore,
      ownerId: me.signedIn ? me.id : null,
      visibility,
      groupId: me.signedIn ? groupId : null,
      ranked,
      simple,
    });
    const seated = [...players.A, ...players.B];
    track('game_created', {
      accounts: seated.filter((p) => p.kind === 'user' && p.id !== me.id).length,
      guests: seated.filter((p) => p.kind === 'guest').length,
      group: groupId !== null,
      ranked,
      simple,
      target: targetScore,
    });
    setNames({ A: '', B: '' });
    setCustomTarget('');
    resetDraft();
    router.push({ pathname: '/game/[id]', params: { id } });
  }

  return (
    <Screen
      withTabInset
      footer={<Button label="Distribuer" trailingIcon="arrow-right" onPress={start} disabled={!canStart} />}>
      <View>
        <ThemedText type="title">Nouvelle partie</ThemedText>
        <ThemedText themeColor="textSecondary">
          {simple ? 'Deux équipes, un score à atteindre.' : 'Qui s’assoit à la table ?'}
        </ThemedText>
      </View>

      {me.signedIn ? (
        <View style={styles.kind}>
          <Segmented options={KIND_OPTIONS} value={kind} onChange={setKind} />
          {simple ? (
            <ThemedText type="small" themeColor="textSecondary">
              Personne n’est tagué : la partie reste dans ton fil, visible par toi seul.
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      <View style={styles.teams}>
        {(['A', 'B'] as const).map((team) => (
          <View key={team}>
            <Card style={styles.team}>
              <View style={styles.teamHeader}>
                <TeamBadge team={team} />
                <View style={styles.teamText}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.teamLabel}>
                    Équipe {team === 'A' ? 1 : 2}
                  </ThemedText>
                  <TextInput
                    value={names[team]}
                    onChangeText={(text) => setNames({ ...names, [team]: text })}
                    placeholder={simple ? FALLBACK_NAME[team] : autoTeamName(players[team], FALLBACK_NAME[team])}
                    placeholderTextColor={Colors.text}
                    style={styles.teamInput}
                    maxLength={24}
                    maxFontSizeMultiplier={MaxFontScale}
                    returnKeyType="done"
                    accessibilityLabel={`Nom de l'équipe ${team === 'A' ? 1 : 2}`}
                  />
                </View>
              </View>
              {simple ? null : (
                <TeamPlayers
                  team={team}
                  players={players[team]}
                  meId={me.id}
                  onPick={(slot) => openPicker({ team, slot })}
                  onRemove={(slot) => applyPick({ team, slot }, null)}
                />
              )}
            </Card>
            {team === 'A' ? (
              <View style={styles.swap}>
                <IconButton name="swap" variant="surface" size={36} accessibilityLabel="Inverser les équipes" onPress={swapTeams} />
              </View>
            ) : null}
          </View>
        ))}
      </View>

      {isBackendEnabled && !me.signedIn ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/auth/sign-in')}
          style={({ pressed }) => [styles.hint, pressed && styles.pressed]}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.hintText}>
            <ThemedText type="smallBold">Crée ton compte</ThemedText> pour taguer tes potes : la partie apparaîtra sur leur
            profil.
          </ThemedText>
        </Pressable>
      ) : null}

      {me.signedIn && !simple ? (
        <Section title="Type de partie">
          <Segmented options={MODE_OPTIONS} value={mode} onChange={setMode} />
          {ranked ? <RankedRequirements teams={players} /> : null}
        </Section>
      ) : null}

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

      {me.signedIn && !simple && (groups.data ?? []).length > 0 ? (
        <Section title="Partie de la bande">
          <View style={styles.chips}>
            <OptionChip label="Aucune" selected={groupId === null} onPress={() => setGroupId(null)} />
            {(groups.data ?? []).map((group) => (
              <OptionChip
                key={group.id}
                label={group.name}
                selected={groupId === group.id}
                onPress={() => setGroupId(group.id)}
                color={Colors.primary}
              />
            ))}
          </View>
        </Section>
      ) : null}

      {me.signedIn && !simple ? (
        <Section title="Qui peut voir la partie ?">
          <Segmented options={VISIBILITY_OPTIONS} value={visibility} onChange={setVisibility} />
        </Section>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  kind: {
    gap: Spacing.two,
  },
  teams: {
    gap: 0,
  },
  team: {
    gap: Spacing.three,
  },
  teamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
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
  swap: {
    alignItems: 'center',
    marginVertical: -Spacing.two,
    zIndex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  hint: {
    borderRadius: Radius.medium,
    backgroundColor: Colors.warningSoft,
    padding: Spacing.three,
  },
  hintText: {
    color: Colors.warning,
  },
  pressed: {
    opacity: 0.8,
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
