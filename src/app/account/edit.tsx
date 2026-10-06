import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, IconButton } from '@/components/button';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MaxFontScale, Radius, Spacing, StickerSmall } from '@/constants/theme';
import { saveMyProfile } from '@/features/auth/actions';
import { suggestUsername, USERNAME } from '@/features/auth/credentials';
import { profileToSeat, useMe } from '@/features/auth/session';
import { Avatar } from '@/features/players/components/avatar';
import { Icon } from '@/components/icon';
import { pickImage } from '@/features/social/pick-image';
import { isUsernameAvailable, uploadAvatar } from '@/features/social/queries';
import { track } from '@/lib/analytics';

/** Profil : nom affiché, pseudo, ville. En mode `welcome`, c'est l'écran d'accueil après l'inscription. */
export default function EditProfileScreen() {
  const { welcome } = useLocalSearchParams<{ welcome?: string }>();
  const isWelcome = welcome === '1';
  const { profile } = useMe();

  const provisional = profile ? /^joueur[0-9a-f]{8}$/.test(profile.username) : false;
  const [name, setName] = useState(profile?.display_name ?? '');
  const [username, setUsername] = useState(
    profile && provisional ? suggestUsername(profile.display_name) : (profile?.username ?? ''),
  );
  const [city, setCity] = useState(profile?.city ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ActivityIndicator color={Colors.primary} />
      </Screen>
    );
  }

  const cleanName = name.trim();
  const validUsername = USERNAME.test(username);
  const canSave = cleanName.length > 0 && validUsername && !saving;

  async function changePhoto() {
    if (!profile) return;
    const image = await pickImage([1, 1], 512);
    if (!image) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadAvatar(profile.id, image);
      await saveMyProfile({ avatar_url: url });
    } catch {
      setError('Photo non envoyée : vérifie ta connexion et réessaie.');
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!profile || !canSave) return;
    setSaving(true);
    setError(null);
    try {
      if (!(await isUsernameAvailable(username, profile.id))) {
        setError(`@${username} est déjà pris.`);
        return;
      }
      await saveMyProfile({ display_name: cleanName, username, city: city.trim() || null, onboarded: true });
      if (isWelcome) track('onboarding_completed');
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      edges={Platform.OS === 'ios' ? ['bottom'] : ['top', 'bottom']}
      header={
        <View style={styles.header}>
          <ThemedText type="heading" style={styles.title}>
            {isWelcome ? 'Bienvenue !' : 'Mon profil'}
          </ThemedText>
          {isWelcome ? null : (
            <IconButton name="x" variant="muted" size={36} accessibilityLabel="Fermer" onPress={router.back} />
          )}
        </View>
      }
      footer={<Button label={isWelcome ? 'C’est parti' : 'Enregistrer'} onPress={save} disabled={!canSave} />}>
      {isWelcome ? (
        <ThemedText themeColor="textSecondary">
          Choisis comment tes potes te verront. Ton pseudo leur sert à te trouver pour te taguer dans leurs parties.
        </ThemedText>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Changer ma photo"
        onPress={changePhoto}
        disabled={uploading}
        style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}>
        <View>
          <Avatar seat={{ ...profileToSeat(profile), name: cleanName || profile.display_name }} size={88} outlined />
          <View style={styles.camera}>
            {uploading ? <ActivityIndicator color={Colors.onPrimary} size="small" /> : <Icon name="camera" size={16} color={Colors.onPrimary} />}
          </View>
        </View>
        <ThemedText type="smallBold" themeColor="textSecondary">
          {profile.avatar_url ? 'Changer ma photo' : 'Ajouter une photo'}
        </ThemedText>
      </Pressable>

      <Section title="Nom affiché">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Prénom Nom"
          placeholderTextColor={Colors.textTertiary}
          style={styles.input}
          maxLength={40}
          autoCapitalize="words"
          textContentType="name"
          maxFontSizeMultiplier={MaxFontScale}
        />
      </Section>

      <Section title="Pseudo">
        <View style={styles.usernameRow}>
          <ThemedText style={styles.at}>@</ThemedText>
          <TextInput
            value={username}
            onChangeText={(text) => setUsername(text.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
            placeholder="arthur.c"
            placeholderTextColor={Colors.textTertiary}
            style={[styles.input, styles.usernameInput]}
            maxLength={20}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
            maxFontSizeMultiplier={MaxFontScale}
          />
        </View>
        <ThemedText type="small" themeColor={validUsername || !username ? 'textSecondary' : 'danger'}>
          3 à 20 caractères : lettres minuscules, chiffres, point ou tiret bas.
        </ThemedText>
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
          textContentType="addressCity"
          maxFontSizeMultiplier={MaxFontScale}
        />
      </Section>

      {saving ? <ActivityIndicator color={Colors.primary} /> : null}
      {error ? (
        <ThemedText type="small" themeColor="danger" style={styles.center}>
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
  avatar: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  camera: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.8,
  },
  input: {
    minHeight: 50,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    ...StickerSmall,
    paddingHorizontal: Spacing.three,
    fontSize: 17,
    fontFamily: Fonts.body[600],
    color: Colors.text,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  at: {
    fontSize: 20,
    fontWeight: 800,
    color: Colors.textSecondary,
  },
  usernameInput: {
    flex: 1,
  },
  center: {
    textAlign: 'center',
  },
});
