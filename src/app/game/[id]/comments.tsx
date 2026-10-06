import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { IconButton } from '@/components/button';
import { showActions, type Action } from '@/components/confirm';
import { Icon } from '@/components/icon';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MaxFontScale, Radius, Spacing, StickerSmall } from '@/constants/theme';
import { useMe } from '@/features/auth/session';
import { formatRelative } from '@/features/coinche/format';
import { useGame } from '@/features/coinche/store';
import { Avatar } from '@/features/players/components/avatar';
import type { Comment } from '@/features/social/api';
import { useAddComment, useComments, useDeleteComment, useRemoteGame } from '@/features/social/queries';
import { isClean, UNCLEAN_MESSAGE } from '@/features/social/content-filter';
import { useModeration } from '@/features/social/use-moderation';

const MAX_LENGTH = 500;

/** Commentaires d'une partie. Appui long : supprimer (le mien, ou tous sur ma partie) ou signaler. */
export default function CommentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const local = useGame(id);
  const remote = useRemoteGame(id, !local);
  const game = local ?? remote.data ?? undefined;
  const comments = useComments(id);
  const add = useAddComment(id);
  const remove = useDeleteComment(id);
  const { reportContent } = useModeration();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isGameOwner = game?.ownerId === me.id;

  function send() {
    const text = body.trim();
    if (!text || add.isPending) return;
    if (!isClean(text)) {
      setError(UNCLEAN_MESSAGE);
      return;
    }
    setError(null);
    add.mutate(text, { onSuccess: () => setBody(''), onError: (e) => setError(e.message) });
  }

  function openMenu(comment: Comment) {
    const mine = comment.author.id === me.id;
    const actions: Action[] = [];
    if (mine || isGameOwner) {
      actions.push({ label: 'Supprimer', destructive: true, onPress: () => remove.mutate(comment.id) });
    }
    if (!mine) {
      actions.push({ label: 'Signaler', destructive: true, onPress: () => reportContent('comment', comment.id) });
      actions.push({
        label: `Voir le profil de ${comment.author.name}`,
        onPress: () => router.push({ pathname: '/u/[id]', params: { id: comment.author.id } }),
      });
    }
    showActions('Commentaire', actions);
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        edges={Platform.OS === 'ios' ? ['bottom'] : ['top', 'bottom']}
        header={
          <View>
            {Platform.OS === 'ios' ? <View style={styles.grabber} /> : null}
            <View style={styles.header}>
              <ThemedText type="heading" style={styles.title}>
                Commentaires
              </ThemedText>
              <IconButton name="x" variant="muted" size={36} accessibilityLabel="Fermer" onPress={router.back} />
            </View>
          </View>
        }
        footer={
          me.signedIn ? (
            <View style={styles.inputRow}>
              <TextInput
                value={body}
                onChangeText={setBody}
                placeholder="Écris un commentaire…"
                placeholderTextColor={Colors.textTertiary}
                style={styles.input}
                multiline
                maxLength={MAX_LENGTH}
                maxFontSizeMultiplier={MaxFontScale}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Envoyer"
                disabled={!body.trim() || add.isPending}
                onPress={send}
                style={({ pressed }) => [styles.send, (!body.trim() || add.isPending) && styles.disabled, pressed && styles.pressed]}>
                {add.isPending ? (
                  <ActivityIndicator color={Colors.onPrimary} />
                ) : (
                  <Icon name="send" size={18} color={Colors.onPrimary} />
                )}
              </Pressable>
            </View>
          ) : null
        }>
        {error ? (
          <ThemedText type="small" themeColor="danger">
            {error}
          </ThemedText>
        ) : null}

        {!me.signedIn ? (
          <ThemedText themeColor="textSecondary">Connecte-toi pour lire et écrire des commentaires.</ThemedText>
        ) : comments.isLoading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (comments.data ?? []).length === 0 ? (
          <ThemedText themeColor="textSecondary" style={styles.center}>
            Pas encore de commentaire. Lance la discussion !
          </ThemedText>
        ) : (
          <View style={styles.list}>
            {(comments.data ?? []).map((comment) => (
              <Pressable
                key={comment.id}
                onLongPress={() => openMenu(comment)}
                delayLongPress={300}
                accessibilityHint="Appui long pour les options"
                style={styles.comment}>
                <Pressable onPress={() => router.push({ pathname: '/u/[id]', params: { id: comment.author.id } })}>
                  <Avatar seat={comment.author} size={34} />
                </Pressable>
                <View style={styles.bubble}>
                  <View style={styles.meta}>
                    <ThemedText type="smallBold" numberOfLines={1} style={styles.author}>
                      {comment.author.name}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textTertiary">
                      {formatRelative(comment.createdAt)}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.body}>{comment.body}</ThemedText>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
  center: {
    textAlign: 'center',
  },
  list: {
    gap: Spacing.three,
  },
  comment: {
    flexDirection: 'row',
    gap: Spacing.two + Spacing.one,
  },
  bubble: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.medium,
    padding: Spacing.two + Spacing.one,
    gap: 2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  author: {
    flexShrink: 1,
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    minHeight: 46,
    maxHeight: 120,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surface,
    ...StickerSmall,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two + Spacing.one,
    paddingBottom: Spacing.two + Spacing.one,
    fontSize: 16,
    fontFamily: Fonts.body[500],
    color: Colors.text,
  },
  send: {
    width: 46,
    height: 46,
    borderRadius: Radius.pill,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...StickerSmall,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.8,
  },
});
