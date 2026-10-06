import { Image } from 'expo-image';
import { StyleSheet, type StyleProp, type ImageStyle } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import { useSession } from '@/features/auth/session';
import { demoPhotoUri } from '@/features/demo/demo-api';
import { isDemo } from '@/features/demo/is-demo';
import { supabaseUrl } from '@/lib/supabase';

/**
 * Photo d'une partie. Le bucket est privé : on la lit avec le jeton du joueur,
 * et le serveur vérifie qu'il a le droit de voir la partie.
 */
export function GamePhoto({ path, style }: { path: string; style?: StyleProp<ImageStyle> }) {
  const token = useSession((s) => s.session?.access_token);
  if (isDemo) {
    // Mode démo : la photo choisie pendant la session, sinon une photo d'illustration.
    return (
      <Image
        source={{ uri: demoPhotoUri(path) ?? `https://picsum.photos/seed/coinche-${path.replace(/\W/g, '')}/800/600` }}
        style={[styles.photo, style]}
        contentFit="cover"
        transition={150}
        accessibilityLabel="Photo de la partie"
      />
    );
  }
  if (!supabaseUrl || !token) return null;
  return (
    <Image
      source={{
        uri: `${supabaseUrl}/storage/v1/object/authenticated/game-photos/${path}`,
        headers: { Authorization: `Bearer ${token}` },
        cacheKey: path,
      }}
      style={[styles.photo, style]}
      contentFit="cover"
      transition={150}
      accessibilityLabel="Photo de la partie"
    />
  );
}

const styles = StyleSheet.create({
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Radius.medium,
    backgroundColor: Colors.surfaceMuted,
  },
});
