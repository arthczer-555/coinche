import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MaxFontScale, Radius, Spacing, Sticker, StickerPressed, StickerSmall } from '@/constants/theme';
import { useMe } from '@/features/auth/session';
import { SuitIcon } from '@/features/coinche/components/suit-icon';
import { plural } from '@/features/coinche/format';
import { useMyGroups } from '@/features/social/queries';
import { isBackendEnabled } from '@/lib/supabase';

const SUITS = ['hearts', 'spades', 'diamonds', 'clubs'] as const;

/** Bandes : les clubs de joueurs (la bande du bistrot, la famille, l'asso). */
export default function GroupsScreen() {
  const me = useMe();
  const groups = useMyGroups();
  const [code, setCode] = useState('');
  const cleanCode = code.trim().toUpperCase();

  if (!me.signedIn) {
    return (
      <Screen withTabInset>
        <ThemedText type="title">Bandes</ThemedText>
        <Card style={styles.cta}>
          <ThemedText>
            Crée la bande de ton bistrot ou de ta famille : un classement rien qu’à vous, et toutes vos parties au même
            endroit.
          </ThemedText>
          {isBackendEnabled ? <Button label="Créer mon compte" onPress={() => router.push('/auth/sign-in')} /> : null}
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      withTabInset
      refreshControl={<RefreshControl refreshing={groups.isRefetching} onRefresh={() => groups.refetch()} />}>
      <View>
        <ThemedText type="caption" themeColor="textSecondary">
          Coinche
        </ThemedText>
        <ThemedText type="title">Bandes</ThemedText>
      </View>

      {groups.isLoading ? (
        <ActivityIndicator color={Colors.primary} />
      ) : (groups.data ?? []).length === 0 ? (
        <Card style={styles.cta}>
          <View style={styles.suits}>
            {SUITS.map((suit) => (
              <SuitIcon key={suit} suit={suit} size={20} />
            ))}
          </View>
          <ThemedText type="heading">Pas encore de bande</ThemedText>
          <ThemedText themeColor="textSecondary">
            Une bande, c’est un classement rien qu’à vous et toutes vos parties au même endroit.
          </ThemedText>
        </Card>
      ) : (
        <View style={styles.list}>
          {(groups.data ?? []).map((group, index) => (
            <Pressable
              key={group.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/group/[id]', params: { id: group.id } })}
              style={({ pressed }) => [styles.group, pressed && StickerPressed]}>
              <View style={[styles.badge, { backgroundColor: index % 2 === 0 ? Colors.teamA : Colors.teamB }]}>
                <SuitIcon suit={SUITS[index % SUITS.length]} size={20} color={Colors.onPrimary} />
              </View>
              <View style={styles.groupText}>
                <ThemedText type="heading" numberOfLines={1} style={styles.groupName}>
                  {group.name}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  {[plural(group.members, 'membre'), group.city].filter(Boolean).join(' · ')}
                </ThemedText>
              </View>
              <Icon name="chevron-right" size={18} color={Colors.textTertiary} />
            </Pressable>
          ))}
        </View>
      )}

      <Button label="Créer une bande" icon="plus" onPress={() => router.push('/group/new')} />

      <Section title="Rejoindre avec un code">
        <View style={styles.joinRow}>
          <TextInput
            value={code}
            onChangeText={(text) => setCode(text.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6))}
            placeholder="A3F9C2"
            placeholderTextColor={Colors.textTertiary}
            autoCapitalize="characters"
            autoCorrect={false}
            style={styles.codeInput}
            maxFontSizeMultiplier={MaxFontScale}
          />
          <Button
            label="Rejoindre"
            variant="secondary"
            disabled={cleanCode.length !== 6}
            onPress={() => router.push({ pathname: '/group/join', params: { code: cleanCode } })}
          />
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cta: {
    gap: Spacing.two + Spacing.one,
  },
  suits: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  list: {
    gap: Spacing.two + Spacing.one,
  },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.large,
    backgroundColor: Colors.surface,
    ...Sticker,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    ...StickerSmall,
  },
  groupText: {
    flex: 1,
  },
  groupName: {
    fontSize: 20,
  },
  joinRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  codeInput: {
    flex: 1,
    minHeight: 54,
    borderRadius: Radius.large,
    backgroundColor: Colors.surface,
    ...StickerSmall,
    paddingHorizontal: Spacing.three,
    fontSize: 20,
    letterSpacing: 4,
    fontFamily: Fonts.body[800],
    color: Colors.text,
  },
});
