import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, IconButton } from '@/components/button';
import { Icon } from '@/components/icon';
import { OptionChip } from '@/components/option-chip';
import { Screen } from '@/components/screen';
import { Section } from '@/components/section';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MaxFontScale, Radius, Spacing, StickerSmall } from '@/constants/theme';
import { useGame, useGames } from '@/features/coinche/store';
import { contentError, type PickedImage } from '@/features/social/api';
import { GamePhoto } from '@/features/social/components/game-photo';
import { isClean, UNCLEAN_MESSAGE } from '@/features/social/content-filter';
import { pickImage } from '@/features/social/pick-image';
import { queryClient, removeGamePhotos, uploadGamePhoto } from '@/features/social/queries';
import { syncNow } from '@/features/sync/sync';

/** Récit de la partie par son auteur : un mot, le lieu, une photo de la tablée. */
export default function StoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const game = useGame(id);
  const gamesById = useGames((s) => s.games);
  const setStory = useGames((s) => s.setStory);

  const [note, setNote] = useState(game?.note ?? '');
  const [location, setLocation] = useState(game?.location ?? '');
  const [image, setImage] = useState<PickedImage | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lieux déjà utilisés, du plus fréquent au plus rare.
  const places = useMemo(() => {
    const counts = new Map<string, number>();
    for (const g of Object.values(gamesById)) {
      if (g.location) counts.set(g.location, (counts.get(g.location) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([place]) => place).slice(0, 6);
  }, [gamesById]);

  if (!game) {
    return (
      <Screen edges={['top', 'bottom']}>
        <ThemedText themeColor="textSecondary">Partie introuvable.</ThemedText>
      </Screen>
    );
  }

  async function choosePhoto() {
    const picked = await pickImage([4, 3], 1600);
    if (picked) {
      setImage(picked);
      setRemovePhoto(false);
    }
  }

  async function save() {
    if (!game) return;
    if (!isClean(note) || !isClean(location)) {
      setError(UNCLEAN_MESSAGE);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      setStory(game.id, {
        note: note.trim() || null,
        location: location.trim() || null,
        ...(removePhoto ? { photoPath: null } : {}),
      });
      let photoPath = removePhoto ? null : game.photoPath;
      if (image) {
        // La photo est rangée dans le dossier de la partie : elle doit d'abord exister sur le serveur.
        await syncNow();
        photoPath = await uploadGamePhoto(game.id, image);
        setStory(game.id, { photoPath });
      }
      void publishStory(game.id, image || removePhoto ? photoPath : undefined);
      router.back();
    } catch (e) {
      setError(image ? 'Photo non envoyée : vérifie ta connexion et réessaie.' : contentError(e));
    } finally {
      setSaving(false);
    }
  }

  const showCurrentPhoto = !image && !removePhoto && game.photoPath;

  return (
    <Screen
      edges={Platform.OS === 'ios' ? ['bottom'] : ['top', 'bottom']}
      header={
        <View style={styles.header}>
          <ThemedText type="heading" style={styles.title}>
            Raconte la partie
          </ThemedText>
          <IconButton name="x" variant="muted" size={36} accessibilityLabel="Fermer" onPress={router.back} />
        </View>
      }
      footer={<Button label="Publier" onPress={save} disabled={saving} />}>
      <Section title="Un mot sur la partie">
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Remontada de fou au dernier pli !"
          placeholderTextColor={Colors.textTertiary}
          style={[styles.input, styles.multiline]}
          multiline
          maxLength={280}
          maxFontSizeMultiplier={MaxFontScale}
        />
      </Section>

      <Section title="Où ?">
        <View style={styles.inputRow}>
          <Icon name="map-pin" size={18} color={Colors.textSecondary} />
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="Café des Amis, Lyon"
            placeholderTextColor={Colors.textTertiary}
            style={styles.inlineInput}
            maxLength={60}
            autoCapitalize="words"
            maxFontSizeMultiplier={MaxFontScale}
          />
        </View>
        {places.length > 0 ? (
          <View style={styles.chips}>
            {places.map((place) => (
              <OptionChip key={place} label={place} selected={location === place} onPress={() => setLocation(place)} />
            ))}
          </View>
        ) : null}
      </Section>

      <Section title="Photo de la tablée">
        {image ? <Image source={{ uri: image.uri }} style={styles.photo} contentFit="cover" /> : null}
        {showCurrentPhoto ? <GamePhoto path={game.photoPath!} /> : null}
        <View style={styles.photoActions}>
          <Pressable
            accessibilityRole="button"
            onPress={choosePhoto}
            style={({ pressed }) => [styles.photoButton, pressed && styles.pressed]}>
            <Icon name="camera" size={18} color={Colors.text} />
            <ThemedText type="smallBold">{image || showCurrentPhoto ? 'Changer la photo' : 'Choisir une photo'}</ThemedText>
          </Pressable>
          {image || showCurrentPhoto ? (
            <Button
              label="Retirer"
              variant="ghost"
              onPress={() => {
                setImage(null);
                setRemovePhoto(true);
              }}
            />
          ) : null}
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          Visible par les mêmes personnes que la partie.
        </ThemedText>
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

/**
 * En arrière-plan : envoie le récit, range les photos qui ne servent plus, puis rafraîchit le fil (lu depuis le serveur).
 * `keep` : la photo à garder (null : aucune) ; undefined si la photo n'a pas changé.
 */
async function publishStory(gameId: string, keep: string | null | undefined) {
  await syncNow();
  // Tant que le serveur pointe sur l'ancienne photo, on la garde : sinon elle disparaît du fil des amis.
  if (keep !== undefined && !useGames.getState().pendingSync[gameId]) {
    await removeGamePhotos(gameId, keep).catch(() => undefined);
  }
  queryClient.invalidateQueries({ queryKey: ['feed'] });
  queryClient.invalidateQueries({ queryKey: ['group-feed'] });
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
    fontFamily: Fonts.body[500],
    color: Colors.text,
  },
  multiline: {
    minHeight: 96,
    paddingTop: Spacing.three,
    textAlignVertical: 'top',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 50,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    ...StickerSmall,
    paddingHorizontal: Spacing.three,
  },
  inlineInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: Fonts.body[600],
    color: Colors.text,
    paddingVertical: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Radius.medium,
  },
  photoActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surfaceMuted,
  },
  pressed: {
    opacity: 0.75,
  },
  center: {
    textAlign: 'center',
  },
});
