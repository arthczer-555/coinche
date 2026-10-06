import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { create } from 'zustand';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radius, Spacing, Sticker } from '@/constants/theme';

export type DialogAction = {
  label: string;
  onPress?: () => void;
  style?: 'default' | 'destructive' | 'cancel';
};

type Dialog = { title: string; message?: string; actions: DialogAction[] };

const useDialog = create<{ dialog: Dialog | null }>(() => ({ dialog: null }));

/**
 * Boîte de dialogue du web, à la place d'Alert et d'ActionSheetIOS qui n'y existent pas.
 * Ouverte par `confirm`, `showActions` et `notify` (components/confirm.ts).
 */
export function openDialog(dialog: Dialog) {
  useDialog.setState({ dialog });
}

function close() {
  useDialog.setState({ dialog: null });
}

/** À monter une fois dans le layout racine. N'affiche rien tant qu'aucune boîte n'est ouverte. */
export function DialogHost() {
  const dialog = useDialog((s) => s.dialog);
  if (!dialog) return null;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Fermer" style={StyleSheet.absoluteFill} onPress={close} />
        <View style={styles.sheet} role="dialog" aria-label={dialog.title}>
          <View style={styles.text}>
            <ThemedText type="heading">{dialog.title}</ThemedText>
            {dialog.message ? <ThemedText themeColor="textSecondary">{dialog.message}</ThemedText> : null}
          </View>
          {dialog.actions.map((action) => (
            <Button
              key={action.label}
              label={action.label}
              variant={action.style === 'cancel' ? 'ghost' : action.style === 'destructive' ? 'primary' : 'secondary'}
              style={action.style === 'destructive' ? styles.destructive : undefined}
              onPress={() => {
                close();
                action.onPress?.();
              }}
            />
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
    backgroundColor: 'rgba(30,26,21,0.45)',
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    gap: Spacing.two + Spacing.one,
    padding: Spacing.four,
    borderRadius: Radius.xlarge,
    backgroundColor: Colors.surface,
    ...Sticker,
  },
  text: {
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  destructive: {
    backgroundColor: Colors.danger,
  },
});
