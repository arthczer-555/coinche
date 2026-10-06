import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';

import { Button, IconButton } from '@/components/button';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MaxFontScale, Radius, Spacing, StickerSmall } from '@/constants/theme';
import { useMe } from '@/features/auth/session';
import { isClean, UNCLEAN_MESSAGE } from '@/features/social/content-filter';
import { useCreateGroup } from '@/features/social/queries';

/** Nouvelle bande : un nom, une ville, une description. */
export default function NewGroupScreen() {
  const me = useMe();
  const create = useCreateGroup();
  const [name, setName] = useState('');
  const [city, setCity] = useState(me.profile?.city ?? '');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const valid = name.trim().length >= 2;

  function submit() {
    if (!valid) return;
    if (!isClean(name) || !isClean(description)) {
      setError(UNCLEAN_MESSAGE);
      return;
    }
    setError(null);
    create.mutate(
      { name: name.trim(), city: city.trim() || null, description: description.trim() || null },
      {
        onSuccess: (id) => router.replace({ pathname: '/group/[id]', params: { id } }),
        onError: (e) => setError(e.message),
      },
    );
  }

  return (
    <Screen
      edges={Platform.OS === 'ios' ? ['bottom'] : ['top', 'bottom']}
      header={
        <View style={styles.header}>
          <ThemedText type="heading" style={styles.title}>
            Nouvelle bande
          </ThemedText>
          <IconButton name="x" variant="muted" size={36} accessibilityLabel="Fermer" onPress={router.back} />
        </View>
      }
      footer={<Button label="Créer la bande" onPress={submit} disabled={!valid || create.isPending} />}>
      <Section title="Nom">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Les rois du Café des Amis"
          placeholderTextColor={Colors.textTertiary}
          style={styles.input}
          maxLength={40}
          autoFocus
          maxFontSizeMultiplier={MaxFontScale}
        />
      </Section>
      <Section title="Ville (facultatif)">
        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder="Lyon"
          placeholderTextColor={Colors.textTertiary}
          style={styles.input}
          maxLength={40}
          autoCapitalize="words"
          maxFontSizeMultiplier={MaxFontScale}
        />
      </Section>
      <Section title="Description (facultatif)">
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Coinche tous les jeudis soir."
          placeholderTextColor={Colors.textTertiary}
          style={[styles.input, styles.multiline]}
          maxLength={160}
          multiline
          maxFontSizeMultiplier={MaxFontScale}
        />
      </Section>
      <ThemedText type="small" themeColor="textSecondary">
        Tu en seras l’admin. Tu pourras inviter tes potes avec un code ou un lien.
      </ThemedText>
      {error ? (
        <ThemedText type="small" themeColor="danger">
          {error}
        </ThemedText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  input: {
    minHeight: 50,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    ...StickerSmall,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    fontFamily: Fonts.body[600],
    color: Colors.text,
  },
  multiline: {
    minHeight: 80,
    paddingTop: Spacing.three,
    textAlignVertical: 'top',
  },
});
