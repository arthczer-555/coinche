import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, IconButton } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useMe } from '@/features/auth/session';
import { SuitIcon } from '@/features/coinche/components/suit-icon';
import { plural } from '@/features/coinche/format';
import { useGroupPreview, useJoinGroup } from '@/features/social/queries';

/** Rejoindre une bande depuis son code (saisi, ou lien coinche://group/join?code=…). */
export default function JoinGroupScreen() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const me = useMe();
  const preview = useGroupPreview(code?.toUpperCase());
  const join = useJoinGroup();

  const close = () => (router.canGoBack() ? router.back() : router.replace('/groups'));
  const header = <IconButton name="x" variant="muted" size={36} accessibilityLabel="Fermer" onPress={close} />;

  if (!me.signedIn) {
    return (
      <Screen edges={['top', 'bottom']} header={header}>
        <ThemedText type="heading">Rejoindre une bande</ThemedText>
        <ThemedText themeColor="textSecondary">Crée ton compte pour rejoindre la bande.</ThemedText>
        <Button label="Créer mon compte" onPress={() => router.push('/auth/sign-in')} />
      </Screen>
    );
  }

  const group = preview.data;

  return (
    <Screen
      edges={['top', 'bottom']}
      header={header}
      footer={
        group ? (
          group.alreadyMember ? (
            <Button label="Voir la bande" onPress={() => router.replace({ pathname: '/group/[id]', params: { id: group.id } })} />
          ) : (
            <Button
              label="Rejoindre la bande"
              disabled={join.isPending}
              onPress={() =>
                join.mutate(code!, { onSuccess: (id) => router.replace({ pathname: '/group/[id]', params: { id } }) })
              }
            />
          )
        ) : null
      }>
      {preview.isLoading ? (
        <ActivityIndicator color={Colors.primary} />
      ) : !group ? (
        <>
          <ThemedText type="heading">Code inconnu</ThemedText>
          <ThemedText themeColor="textSecondary">Vérifie le code « {code} » avec la personne qui te l’a donné.</ThemedText>
        </>
      ) : (
        <Card style={styles.card}>
          <View style={styles.suits}>
            <SuitIcon suit="hearts" size={20} />
            <SuitIcon suit="spades" size={20} />
            <SuitIcon suit="diamonds" size={20} />
            <SuitIcon suit="clubs" size={20} />
          </View>
          <ThemedText type="title" style={styles.center}>
            {group.name}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.center}>
            {[plural(group.members, 'membre'), group.city].filter(Boolean).join(' · ')}
          </ThemedText>
          {group.description ? <ThemedText style={styles.center}>{group.description}</ThemedText> : null}
        </Card>
      )}
      {join.error ? (
        <ThemedText type="small" themeColor="danger">
          {join.error.message}
        </ThemedText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.four,
  },
  suits: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  center: {
    textAlign: 'center',
  },
});
