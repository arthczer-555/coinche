import { ActionSheetIOS, Alert, Platform } from 'react-native';

import { openDialog } from './dialog';

/** Demande de confirmation : alerte native sur mobile, boîte de dialogue sur le web (Alert.alert y est ignoré). */
export function confirm(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void,
  destructive = true,
) {
  if (Platform.OS === 'web') {
    openDialog({
      title,
      message,
      actions: [
        { label: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
        { label: 'Annuler', style: 'cancel' },
      ],
    });
    return;
  }
  Alert.alert(title, message, [
    { text: 'Annuler', style: 'cancel' },
    { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
  ]);
}

/** Simple message avec un bouton OK (erreur, remerciement). */
export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') {
    openDialog({ title, message, actions: [{ label: 'OK', style: 'cancel' }] });
    return;
  }
  Alert.alert(title, message);
}

export type Action = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

/**
 * Menu d'actions : feuille d'actions native sur iOS, alerte sur Android (paginée avec "Plus…"),
 * et sur le web une boîte de dialogue avec toutes les actions.
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
    openDialog({
      title,
      actions: [
        ...actions.map((a) => ({ label: a.label, style: a.destructive ? ('destructive' as const) : ('default' as const), onPress: a.onPress })),
        { label: 'Annuler', style: 'cancel' },
      ],
    });
    return;
  }
  // Android : 3 boutons au plus dans une alerte (Annuler compris). Au-delà, un bouton "Plus…" ouvre la suite.
  const visible = actions.length > 2 ? actions.slice(0, 1) : actions;
  const rest = actions.length > 2 ? actions.slice(1) : [];
  Alert.alert(title, undefined, [
    ...visible.map((a) => ({
      text: a.label,
      style: a.destructive ? ('destructive' as const) : ('default' as const),
      onPress: a.onPress,
    })),
    ...(rest.length > 0 ? [{ text: 'Plus…', onPress: () => showActions(title, rest) }] : []),
    { text: 'Annuler', style: 'cancel' },
  ]);
}
