import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, IconButton } from '@/components/button';
import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { Segmented } from '@/components/segmented';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MaxFontScale, Radius, Spacing, StickerSmall } from '@/constants/theme';
import { profileLink } from '@/constants/links';
import { profileToSeat, useMe } from '@/features/auth/session';
import { plural } from '@/features/coinche/format';
import { firstName, recentPlayers } from '@/features/coinche/players';
import type { Seat } from '@/features/coinche/types';
import { PlayerRow } from '@/features/players/components/player-row';
import { FriendButton } from '@/features/social/components/friend-button';
import { FriendCarousel } from '@/features/social/components/friend-carousel';
import { mutualFriendsLabel } from '@/features/social/mutual';
import {
  useFriends,
  useFriendSuggestions,
  useMutualFriends,
  useMyFriendships,
  useMyGames,
  useProfile,
  useSearchProfiles,
} from '@/features/social/queries';
import { shareText } from '@/features/social/share';
import { isBackendEnabled } from '@/lib/supabase';

type Tab = 'friends' | 'find';

/**
 * Amis : mes amis et les demandes reçues, et "Trouver" (recherche, joueurs croisés à table, QR, invitation).
 * Avec `id`, affiche les amis d'un autre joueur.
 */
export default function FriendsRoute() {
  const params = useLocalSearchParams<{ tab?: string; id?: string }>();
  // Lien vers un autre onglet alors que la page est déjà ouverte : on repart de l'onglet demandé.
  return <FriendsScreen key={`${params.id ?? ''}:${params.tab ?? ''}`} params={params} />;
}

function FriendsScreen({ params }: { params: { tab?: string; id?: string } }) {
  const me = useMe();
  const profileId = params.id ?? me.id;
  const isMine = profileId === me.id;
  const [tab, setTab] = useState<Tab>(params.tab === 'find' ? 'find' : 'friends');
  const profile = useProfile(isMine ? undefined : profileId);
  const friendships = useMyFriendships();
  const friendCount = friendships.data?.filter((f) => f.status === 'friends').length;

  const tabs: { value: Tab; label: string }[] = [
    { value: 'friends', label: `Amis${friendCount !== undefined ? ` ${friendCount}` : ''}` },
    { value: 'find', label: 'Trouver' },
  ];

  const back = () => (router.canGoBack() ? router.back() : router.replace('/feed'));
  const name = profile.data ? firstName(profile.data.display_name) : null;
  const title = isMine ? 'Amis' : name ? `Amis de ${name}` : 'Amis';

  if (!me.signedIn) {
    return (
      <Screen
        edges={['top', 'bottom']}
        header={<IconButton name="chevron-left" accessibilityLabel="Retour" onPress={back} />}>
        <ThemedText type="title">Amis</ThemedText>
        <Card style={styles.cta}>
          <ThemedText>Crée ton compte pour ajouter tes partenaires en amis et voir leurs parties dans ton fil.</ThemedText>
          {isBackendEnabled ? <Button label="Créer mon compte" onPress={() => router.push('/auth/sign-in')} /> : null}
        </Card>
      </Screen>
    );
  }

  return (
    <Screen
      edges={['top', 'bottom']}
      header={
        <View style={styles.header}>
          <IconButton name="chevron-left" accessibilityLabel="Retour" onPress={back} />
          <ThemedText type="heading" numberOfLines={1} style={styles.title}>
            {title}
          </ThemedText>
          <View style={styles.spacer} />
        </View>
      }>
      {isMine ? (
        <>
          <Segmented options={tabs} value={tab} onChange={setTab} />
          {tab === 'find' ? <FindFriends /> : <MyFriends onFind={() => setTab('find')} />}
        </>
      ) : (
        <TheirFriends profileId={profileId} name={name ?? 'Ce joueur'} />
      )}
    </Screen>
  );
}

/** Mes amis, avec les demandes reçues en haut, puis des suggestions, et celles que j'ai envoyées en bas. */
function MyFriends({ onFind }: { onFind: () => void }) {
  const friendships = useMyFriendships();
  const suggestions = useFriendSuggestions();
  if (friendships.isLoading) return <ActivityIndicator color={Colors.primary} />;

  const list = friendships.data ?? [];
  const received = list.filter((f) => f.status === 'received').map((f) => f.seat);
  const friends = list.filter((f) => f.status === 'friends').map((f) => f.seat);
  const sent = list.filter((f) => f.status === 'sent').map((f) => f.seat);

  return (
    <>
      {received.length > 0 ? (
        <Section title={received.length > 1 ? 'Demandes d’amis' : 'Demande d’ami'}>
          <PlayerList seats={received} subtitle={() => 'Veut t’ajouter à ses amis'} />
        </Section>
      ) : null}

      {(suggestions.data ?? []).length > 0 ? (
        <Section title="Tu les connais peut-être" action={{ label: 'Tout voir', onPress: onFind }}>
          <FriendCarousel
            items={(suggestions.data ?? [])
              .slice(0, 10)
              .map((s) => ({ seat: s.seat, caption: mutualFriendsLabel(s.mutualNames, s.mutual) }))}
          />
        </Section>
      ) : null}

      {friends.length > 0 ? (
        <Section title="Mes amis">
          <PlayerList seats={friends} />
        </Section>
      ) : (
        <View style={styles.empty}>
          <ThemedText themeColor="textSecondary" style={styles.center}>
            Ajoute tes partenaires en amis : vous verrez les parties l’un de l’autre dans vos fils.
          </ThemedText>
          <Button label="Trouver des joueurs" variant="secondary" icon="search" onPress={onFind} />
        </View>
      )}

      {sent.length > 0 ? (
        <Section title="Demandes envoyées">
          <PlayerList seats={sent} subtitle={() => 'En attente de réponse'} />
        </Section>
      ) : null}
    </>
  );
}

/** Les amis d'un autre joueur : ceux que je pourrais ajouter (le plus d'amis en commun en tête), puis les nôtres. */
function TheirFriends({ profileId, name }: { profileId: string; name: string }) {
  const me = useMe();
  const friends = useFriends(profileId);
  const mutual = useMutualFriends(profileId);
  const suggestions = useFriendSuggestions();

  const others = useMemo(() => {
    const mutualIds = new Set(mutual.map((seat) => seat.id));
    const suggested = new Map((suggestions.data ?? []).map((s) => [s.seat.id, s]));
    const commonCount = (seatId: string) => suggested.get(seatId)?.mutual ?? 0;
    return (friends.data ?? [])
      .filter((seat) => seat.id !== me.id && !mutualIds.has(seat.id))
      .sort((a, b) => commonCount(b.id) - commonCount(a.id))
      .map((seat) => ({ seat, suggestion: suggested.get(seat.id) }));
  }, [friends.data, mutual, suggestions.data, me.id]);

  if (friends.isLoading) return <ActivityIndicator color={Colors.primary} />;
  if (others.length === 0 && mutual.length === 0) {
    return (
      <ThemedText themeColor="textSecondary" style={[styles.center, styles.empty]}>
        {(friends.data ?? []).length > 0
          ? `Pour l’instant, ${name} n’a que toi sur Coinche.`
          : `${name} n’a pas encore d’amis sur Coinche.`}
      </ThemedText>
    );
  }
  return (
    <>
      {others.length > 0 ? (
        <Section title={mutual.length > 0 ? 'Pas encore tes amis' : `${plural(others.length, 'ami')}`}>
          <PlayerList
            seats={others.map((o) => o.seat)}
            subtitle={(seat) => {
              const suggestion = others.find((o) => o.seat.id === seat.id)?.suggestion;
              if (suggestion) return mutualFriendsLabel(suggestion.mutualNames, suggestion.mutual);
              return seat.kind === 'user' && seat.username ? `@${seat.username}` : undefined;
            }}
          />
        </Section>
      ) : null}
      {mutual.length > 0 ? (
        <Section title={`${plural(mutual.length, 'ami')} en commun`}>
          <PlayerList seats={mutual} />
        </Section>
      ) : null}
    </>
  );
}

function PlayerList({ seats, subtitle }: { seats: Seat[]; subtitle?: (seat: Seat) => string | undefined }) {
  return (
    <Card style={styles.list}>
      {seats.map((seat, index) => (
        <PlayerRow
          key={seat.id}
          seat={seat}
          bordered={index > 0}
          subtitle={subtitle?.(seat) ?? (seat.kind === 'user' && seat.username ? `@${seat.username}` : undefined)}
          onPress={() => router.push({ pathname: '/u/[id]', params: { id: seat.id } })}
          trailing={<FriendButton seat={seat} />}
        />
      ))}
    </Card>
  );
}

/** Onglet "Trouver" : recherche, joueurs croisés à table, QR code, invitation. */
function FindFriends() {
  const me = useMe();
  const [query, setQuery] = useState('');
  const search = useSearchProfiles(query);
  const friendships = useMyFriendships();
  const friendSuggestions = useFriendSuggestions();
  const { games } = useMyGames();
  const trimmed = query.trim();

  // Amis d'amis : le plus d'amis en commun d'abord, puis le plus de parties ensemble.
  const known = useMemo(() => {
    const together = new Map(recentPlayers(games, [me.id]).map((p) => [p.seat.id, p.games]));
    return (friendSuggestions.data ?? [])
      .map((s) => ({ ...s, games: together.get(s.seat.id) ?? 0 }))
      .sort((a, b) => b.mutual - a.mutual || b.games - a.games);
  }, [friendSuggestions.data, games, me.id]);

  // Joueurs croisés à table avec qui je n'ai encore aucun lien (ni ami, ni demande en cours), hors amis d'amis déjà cités.
  const suggestions = useMemo(() => {
    const linked = new Set([...(friendships.data ?? []).map((f) => f.seat.id), ...known.map((k) => k.seat.id)]);
    return recentPlayers(games, [me.id])
      .filter(({ seat }) => seat.kind === 'user' && seat.username && !linked.has(seat.id))
      .slice(0, 10);
  }, [games, me.id, friendships.data, known]);

  function invite() {
    shareText(`On se fait une coinche ? Retrouve-moi sur Coinche pour qu’on voie nos parties et nos stats : ${profileLink(me.id)}`);
  }

  return (
    <>
      <View style={styles.search}>
        <Icon name="search" size={18} color={Colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Nom ou pseudo"
          placeholderTextColor={Colors.textTertiary}
          style={styles.input}
          autoCorrect={false}
          autoCapitalize="none"
          maxFontSizeMultiplier={MaxFontScale}
        />
        {search.isFetching ? <ActivityIndicator color={Colors.textSecondary} /> : null}
      </View>

      {trimmed.length >= 2 ? (
        (search.data ?? []).length > 0 ? (
          <PlayerList
            seats={(search.data ?? []).map(profileToSeat)}
            subtitle={(seat) => {
              const p = search.data?.find((x) => x.id === seat.id);
              return [p ? `@${p.username}` : null, p?.city].filter(Boolean).join(' · ');
            }}
          />
        ) : search.isSuccess ? (
          <ThemedText themeColor="textSecondary" style={styles.center}>
            Personne ne s’appelle « {trimmed} » sur Coinche. Invite-le !
          </ThemedText>
        ) : null
      ) : (
        <>
          <View style={styles.actions}>
            <Action
              icon="scan"
              label="Scanner son QR code"
              onPress={() => router.push({ pathname: '/players/scan', params: { mode: 'profile' } })}
            />
            <Action icon="share" label="Inviter un ami" onPress={invite} />
          </View>

          {known.length > 0 ? (
            <Section title="Tu les connais peut-être">
              <PlayerList
                seats={known.map((k) => k.seat)}
                subtitle={(seat) => {
                  const k = known.find((x) => x.seat.id === seat.id);
                  if (!k) return undefined;
                  const together = k.games > 0 ? ` · ${plural(k.games, 'partie')} ensemble` : '';
                  return mutualFriendsLabel(k.mutualNames, k.mutual) + together;
                }}
              />
            </Section>
          ) : null}

          {suggestions.length > 0 ? (
            <Section title="Tu as joué avec eux">
              <PlayerList
                seats={suggestions.map((s) => s.seat)}
                subtitle={(seat) => {
                  const count = suggestions.find((s) => s.seat.id === seat.id)?.games ?? 0;
                  return `${plural(count, 'partie')} ensemble`;
                }}
              />
            </Section>
          ) : null}
          {suggestions.length === 0 && known.length === 0 && !friendSuggestions.isLoading ? (
            <ThemedText themeColor="textSecondary" style={styles.center}>
              Tous tes partenaires sont déjà tes amis. Cherche un pseudo ou invite un ami !
            </ThemedText>
          ) : null}
        </>
      )}
    </>
  );
}

function Action({ icon, label, onPress }: { icon: 'scan' | 'share'; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <View style={styles.actionIcon}>
        <Icon name={icon} size={20} color={Colors.onPrimary} />
      </View>
      <ThemedText type="smallBold" style={styles.center}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  title: {
    flexShrink: 1,
  },
  spacer: {
    width: 40,
  },
  cta: {
    gap: Spacing.three,
  },
  empty: {
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  center: {
    textAlign: 'center',
  },
  list: {
    paddingVertical: Spacing.one,
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 48,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.three,
    ...StickerSmall,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: Fonts.body[600],
    color: Colors.text,
    paddingVertical: Spacing.two,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two + Spacing.one,
  },
  action: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.large,
    backgroundColor: Colors.surface,
    ...StickerSmall,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
});
