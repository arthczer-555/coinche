import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { IconButton } from '@/components/button';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MaxFontScale, Radius, Spacing, StickerSmall } from '@/constants/theme';
import { LOCAL_SEAT, profileToSeat, useMe } from '@/features/auth/session';
import { plural } from '@/features/coinche/format';
import { LOCAL_PLAYER_ID, recentPlayers } from '@/features/coinche/players';
import { newId, sortGames, useGames } from '@/features/coinche/store';
import type { Seat } from '@/features/coinche/types';
import { PlayerRow } from '@/features/players/components/player-row';
import { applyPick, currentTeams, parsePickTarget, resolveMe } from '@/features/players/draft';
import { matchesSeat, searchTerm } from '@/features/players/search';
import { useSearchProfiles } from '@/features/social/queries';
import { isBackendEnabled } from '@/lib/supabase';

/**
 * Choix d'un joueur pour une place : moi, un habitué, un compte (recherche par nom ou @pseudo, ou QR), ou un invité.
 * N'importe quel compte peut être ajouté, ami ou pas : la partie arrive directement sur son profil, avec une notif.
 */
export default function PickPlayerScreen() {
  const params = useLocalSearchParams<{ team: string; slot: string; gameId?: string }>();
  const target = parsePickTarget(params);
  const me = useMe();
  const gamesById = useGames((s) => s.games);
  const [query, setQuery] = useState('');
  const search = useSearchProfiles(query);

  // Dans une partie existante, "Moi" est déjà le compte ; dans la partie en préparation, l'identité locale.
  const meSeat: Seat = target.gameId && me.signedIn ? me.seat : LOCAL_SEAT;
  const seated = [...currentTeams(target).A, ...currentTeams(target).B];
  const seatedIds = new Set(seated.map((p) => p.id));
  const meSeated = seatedIds.has(meSeat.id);

  const trimmed = query.trim();
  const term = searchTerm(query);
  // "@..." : on cherche un pseudo, pas un prénom d'invité.
  const isHandle = trimmed.startsWith('@');
  const showMe = !meSeated && !trimmed;
  const regulars = useMemo(
    () => recentPlayers(sortGames(gamesById), [me.id, LOCAL_PLAYER_ID]),
    [gamesById, me.id],
  );
  const filteredRegulars = term ? regulars.filter(({ seat }) => matchesSeat(seat, term)) : regulars.slice(0, 8);
  const accounts = (search.data ?? [])
    .map(profileToSeat)
    .filter((s) => !filteredRegulars.some((r) => r.seat.id === s.id));

  function pick(seat: Seat) {
    applyPick(target, seat);
    router.back();
  }

  function addGuest() {
    if (!trimmed || isHandle) return;
    pick({ kind: 'guest', id: newId(), name: trimmed.slice(0, 40) });
  }

  return (
    <Screen
      edges={Platform.OS === 'ios' ? ['bottom'] : ['top', 'bottom']}
      header={
        <View>
          {Platform.OS === 'ios' ? <View style={styles.grabber} /> : null}
          <View style={styles.header}>
            <ThemedText type="heading" style={styles.title}>
              Qui joue ?
            </ThemedText>
            <IconButton name="x" variant="muted" size={36} accessibilityLabel="Fermer" onPress={router.back} />
          </View>
          <View style={styles.search}>
            <Icon name="search" size={18} color={Colors.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={me.signedIn ? 'Nom ou @pseudo' : 'Prénom'}
              placeholderTextColor={Colors.textTertiary}
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={addGuest}
              maxFontSizeMultiplier={MaxFontScale}
              maxLength={40}
            />
            {search.isFetching ? <ActivityIndicator color={Colors.textSecondary} /> : null}
          </View>
        </View>
      }>
      {me.signedIn ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace({ pathname: '/players/scan', params })}
          style={({ pressed }) => [styles.scan, pressed && styles.pressed]}>
          <Icon name="scan" size={22} color={Colors.onPrimary} />
          <View style={styles.scanText}>
            <ThemedText type="smallBold" themeColor="onPrimary">
              Scanner son QR code
            </ThemedText>
            <ThemedText type="small" themeColor="onPrimaryMuted">
              Il est sur son profil Coinche
            </ThemedText>
          </View>
          <Icon name="chevron-right" size={18} color={Colors.onPrimary} />
        </Pressable>
      ) : null}

      {showMe || (trimmed && !isHandle) ? (
        <Card style={styles.list}>
          {showMe ? <PlayerRow seat={resolveMe(meSeat, me.seat)} subtitle="Moi" onPress={() => pick(meSeat)} /> : null}
          {trimmed && !isHandle ? (
            <PlayerRow
              seat={{ kind: 'guest', id: 'new-guest', name: trimmed }}
              subtitle="Ajouter comme invité (sans compte)"
              onPress={addGuest}
              trailing={<Icon name="user-plus" size={18} color={Colors.textSecondary} />}
            />
          ) : null}
        </Card>
      ) : null}

      {!showMe && !trimmed && filteredRegulars.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          Tape un prénom pour ajouter un invité
          {me.signedIn ? ', ou un nom ou un @pseudo pour trouver un compte, même si vous n’êtes pas amis.' : '.'}
        </ThemedText>
      ) : null}

      {filteredRegulars.length > 0 ? (
        <Section title="Habitués">
          <Card style={styles.list}>
            {filteredRegulars.map(({ seat, games }, index) => (
              <PlayerRow
                key={seat.id}
                seat={seat}
                bordered={index > 0}
                subtitle={`${seat.kind === 'guest' ? 'Invité' : seat.username ? `@${seat.username}` : 'Compte'} · ${plural(games, 'partie')}`}
                onPress={() => pick(seat)}
                trailing={seatedIds.has(seat.id) ? <SeatedTag /> : null}
              />
            ))}
          </Card>
        </Section>
      ) : null}

      {accounts.length > 0 ? (
        <Section title="Comptes Coinche">
          <Card style={styles.list}>
            {accounts.map((seat, index) => (
              <PlayerRow
                key={seat.id}
                seat={seat}
                bordered={index > 0}
                subtitle={`@${seat.username}`}
                onPress={() => pick(seat)}
                trailing={seatedIds.has(seat.id) ? <SeatedTag /> : null}
              />
            ))}
          </Card>
        </Section>
      ) : null}

      {term.length >= 2 && me.signedIn && !search.isFetching && accounts.length === 0 && search.isSuccess ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          Aucun compte trouvé pour « {trimmed} ».
        </ThemedText>
      ) : null}

      {isBackendEnabled && !me.signedIn ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/auth/sign-in')}
          style={({ pressed }) => [styles.hint, pressed && styles.pressed]}>
          <ThemedText type="small" style={styles.hintText}>
            <ThemedText type="smallBold" style={styles.hintText}>
              Connecte-toi
            </ThemedText>{' '}
            pour retrouver tes potes par leur pseudo ou leur QR code.
          </ThemedText>
        </Pressable>
      ) : null}
    </Screen>
  );
}

function SeatedTag() {
  return (
    <ThemedText type="small" themeColor="textTertiary">
      À la table
    </ThemedText>
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
    paddingTop: Spacing.two,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
  },
  search: {
    marginTop: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 48,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.three,
    ...StickerSmall,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: Fonts.body[600],
    color: Colors.text,
    paddingVertical: Spacing.two,
  },
  scan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: Colors.primary,
    borderRadius: Radius.large,
    padding: Spacing.three,
    ...StickerSmall,
  },
  scanText: {
    flex: 1,
  },
  list: {
    paddingVertical: Spacing.one,
  },
  center: {
    textAlign: 'center',
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
});
