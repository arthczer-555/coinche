import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, TextInput, View } from 'react-native';

import { Button, IconButton } from '@/components/button';
import { notify } from '@/components/confirm';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts, MaxFontScale, Radius, Spacing, StickerSmall } from '@/constants/theme';
import { CONTACT_EMAIL, PRIVACY_URL } from '@/constants/links';
import { isAppleSignInAvailable, signInWithApple, signInWithPassword, signUpWithPassword } from '@/features/auth/actions';
import { MIN_PASSWORD_LENGTH, signUpError, suggestUsername } from '@/features/auth/credentials';
import { waitForProfile } from '@/features/auth/wait-for-profile';
import { SuitIcon } from '@/features/coinche/components/suit-icon';
import { track } from '@/lib/analytics';

type Mode = 'signup' | 'login';

const MODES = [
  { value: 'signup', label: 'Créer un compte' },
  { value: 'login', label: 'J’ai un compte' },
] as const;

/** Connexion / inscription : prénom, nom, pseudo et mot de passe (pas d'e-mail), ou Apple sur iPhone. */
export default function SignInScreen() {
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [mode, setMode] = useState<Mode>('signup');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  // Tant que le joueur n'a pas touché au pseudo, il suit le prénom et le nom.
  const [usernameEdited, setUsernameEdited] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  async function run(action: () => Promise<void>) {
    setLoading(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  }

  async function finish() {
    const profile = await waitForProfile();
    if (profile && !profile.onboarded) {
      router.replace({ pathname: '/account/edit', params: { welcome: '1' } });
    } else {
      router.back();
    }
  }

  function changeName(first: string, last: string) {
    setFirstName(first);
    setLastName(last);
    if (!usernameEdited) setUsername(suggestUsername(`${first} ${last}`));
  }

  const apple = () =>
    run(async () => {
      if (await signInWithApple()) await finish();
    });

  const signUp = () =>
    run(async () => {
      const form = { firstName, lastName, username, password };
      const invalid = signUpError(form);
      if (invalid) throw new Error(invalid);
      await signUpWithPassword(form);
      track('onboarding_completed');
      await finish();
    });

  const logIn = () =>
    run(async () => {
      await signInWithPassword(username, password);
      await finish();
    });

  const submit = mode === 'signup' ? signUp : logIn;
  const filled =
    username.trim().length > 0 && password.length > 0 && (mode === 'login' || (firstName.trim() && lastName.trim()));

  return (
    <Screen
      edges={Platform.OS === 'ios' ? ['bottom'] : ['top', 'bottom']}
      header={
        <View style={styles.header}>
          <IconButton name="x" variant="muted" size={36} accessibilityLabel="Fermer" onPress={router.back} />
        </View>
      }>
      <View style={styles.hero}>
        <View style={styles.suits}>
          <SuitIcon suit="hearts" size={26} />
          <SuitIcon suit="spades" size={26} />
          <SuitIcon suit="diamonds" size={26} />
          <SuitIcon suit="clubs" size={26} />
        </View>
        <ThemedText type="title" style={styles.center}>
          Rejoins la table
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.center}>
          Tague tes partenaires, retrouve toutes tes parties sur ton profil et compare tes stats avec tes potes.
        </ThemedText>
      </View>

      <View style={styles.form}>
        {appleAvailable ? (
          <>
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={Radius.large}
              style={styles.apple}
              onPress={apple}
            />
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              ou avec un pseudo
            </ThemedText>
          </>
        ) : null}

        <Segmented
          options={MODES}
          value={mode}
          onChange={(next) => {
            setMode(next);
            setError(null);
          }}
        />

        {mode === 'signup' ? (
          <View style={styles.row}>
            <TextInput
              value={firstName}
              onChangeText={(text) => changeName(text, lastName)}
              placeholder="Prénom"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="words"
              autoComplete="given-name"
              textContentType="givenName"
              maxLength={30}
              style={[styles.input, styles.flex]}
              maxFontSizeMultiplier={MaxFontScale}
            />
            <TextInput
              value={lastName}
              onChangeText={(text) => changeName(firstName, text)}
              placeholder="Nom"
              placeholderTextColor={Colors.textTertiary}
              autoCapitalize="words"
              autoComplete="family-name"
              textContentType="familyName"
              maxLength={30}
              style={[styles.input, styles.flex]}
              maxFontSizeMultiplier={MaxFontScale}
            />
          </View>
        ) : null}

        <View style={[styles.input, styles.row, styles.prefixed]}>
          <ThemedText style={styles.prefix}>@</ThemedText>
          <TextInput
            value={username}
            onChangeText={(text) => {
              setUsername(text.replace(/^@/, ''));
              setUsernameEdited(true);
            }}
            placeholder="pseudo"
            placeholderTextColor={Colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            maxLength={21}
            style={[styles.inputText, styles.flex]}
            maxFontSizeMultiplier={MaxFontScale}
          />
        </View>

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder={mode === 'signup' ? `Mot de passe (${MIN_PASSWORD_LENGTH} caractères min.)` : 'Mot de passe'}
          placeholderTextColor={Colors.textTertiary}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          textContentType="password"
          style={styles.input}
          maxFontSizeMultiplier={MaxFontScale}
          onSubmitEditing={() => filled && !loading && submit()}
          returnKeyType="go"
        />

        <Button
          label={mode === 'signup' ? 'Créer mon compte' : 'Se connecter'}
          onPress={submit}
          disabled={loading || !filled}
        />
        {mode === 'login' ? (
          <Button
            label="Mot de passe oublié ?"
            variant="ghost"
            onPress={() =>
              notify(
                'Mot de passe oublié',
                `Écris-nous à ${CONTACT_EMAIL} avec ton pseudo : on réinitialise ton mot de passe.`,
              )
            }
          />
        ) : (
          <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
            Pas d’e-mail : ton pseudo et ton mot de passe suffisent. Garde-les bien, ils servent à te reconnecter sur un
            autre téléphone.
          </ThemedText>
        )}
      </View>

      {loading ? <ActivityIndicator color={Colors.primary} /> : null}
      {error ? (
        <ThemedText type="small" style={[styles.center, styles.error]}>
          {error}
        </ThemedText>
      ) : null}

      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        En continuant, tu acceptes notre{' '}
        <ThemedText type="smallBold" onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)} style={styles.link}>
          politique de confidentialité
        </ThemedText>
        .
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'flex-end',
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
  },
  suits: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  center: {
    textAlign: 'center',
  },
  form: {
    gap: Spacing.three,
  },
  apple: {
    height: 54,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
    minWidth: 0,
  },
  input: {
    minHeight: 54,
    borderRadius: Radius.large,
    backgroundColor: Colors.surface,
    ...StickerSmall,
    paddingHorizontal: Spacing.three,
    fontSize: 17,
    fontFamily: Fonts.body[600],
    color: Colors.text,
  },
  prefixed: {
    gap: Spacing.one,
  },
  prefix: {
    fontSize: 17,
    fontFamily: Fonts.body[700],
    color: Colors.textSecondary,
  },
  inputText: {
    minHeight: 50,
    fontSize: 17,
    fontFamily: Fonts.body[600],
    color: Colors.text,
  },
  error: {
    color: Colors.danger,
  },
  link: {
    textDecorationLine: 'underline',
  },
});
