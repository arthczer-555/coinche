import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
} from '@expo-google-fonts/figtree';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: Colors.background, card: Colors.background, primary: Colors.primary },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'FrauncesSoft-Black': require('../../assets/fonts/FrauncesSoft-Black.ttf'),
    'FrauncesSoft-Bold': require('../../assets/fonts/FrauncesSoft-Bold.ttf'),
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="game/[id]/index" />
        <Stack.Screen name="game/[id]/round" options={{ presentation: 'modal' }} />
        <Stack.Screen
          name="game/[id]/result"
          options={{ presentation: 'fullScreenModal', contentStyle: { backgroundColor: Colors.primary } }}
        />
      </Stack>
    </ThemeProvider>
  );
}
