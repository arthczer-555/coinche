import { Colors } from '@/constants/theme';

/** Palette unique (l'app est en thème clair). Gardé en hook pour pouvoir ajouter un thème sombre plus tard. */
export function useTheme() {
  return Colors;
}
