import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import type { PickedImage } from './api';

/**
 * Photo de la galerie, recadrée, réduite à `maxSize` px sur son grand côté et compressée en JPEG
 * (envoyée en base64). Null si annulé. La réduction se fait ici et pas dans le sélecteur : sur le web,
 * il ne recadre ni ne compresse, et une photo de téléphone dépasse les limites des buckets (2 Mo avatars, 5 Mo photos).
 */
export async function pickImage(
  aspect: [number, number],
  maxSize: number,
): Promise<PickedImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect,
    quality: 1,
  });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;

  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > maxSize) {
    context.resize(asset.width >= asset.height ? { width: maxSize } : { height: maxSize });
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!saved.base64) return null;
  return { uri: saved.uri, base64: saved.base64, mimeType: 'image/jpeg' };
}
