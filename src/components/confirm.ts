import { ActionSheetIOS, Alert, Platform } from 'react-native';

/** Demande de confirmation qui marche aussi sur le web (Alert.alert y est ignoré). */
export function confirm(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void,
  destructive = true,
) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Annuler', style: 'cancel' },
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}

export type Action = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

/**
 * Menu d'actions : feuille d'actions native sur iOS, alerte sur Android (3 actions max),
 * et sur le web une confirmation par action jusqu'à ce que l'une soit acceptée.
 */
export function showActions(title: string, actions: Action[]) {
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: [...actions.map((a) => a.label), 'Annuler'],
        cancelButtonIndex: actions.length,
        destructiveButtonIndex: actions.flatMap((a, i) => (a.destructive ? [i] : [])),
      },
      (index) => actions[index]?.onPress(),
    );
    return;
  }
  if (Platform.OS === 'web') {
    const action = actions.find((a) => window.confirm(`${title}\n\n${a.label} ?`));
    action?.onPress();
    return;
  }
  Alert.alert(title, undefined, [
    ...actions.map((a) => ({
      text: a.label,
      style: a.destructive ? ('destructive' as const) : ('default' as const),
      onPress: a.onPress,
    })),
    { text: 'Annuler', style: 'cancel' },
  ]);
}
