import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
} from '@expo-google-fonts/figtree';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { DialogHost } from '@/components/dialog';
import { Colors } from '@/constants/theme';
import { useAuthBootstrap } from '@/features/auth/use-bootstrap';
import { usePushBootstrap } from '@/features/notifications/push';
import { queryClient } from '@/features/social/queries';

SplashScreen.preventAutoHideAsync();

const theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: Colors.background, card: Colors.background, primary: Colors.primary },
};

export default function RootLayout() {
  useAuthBootstrap();
  usePushBootstrap();
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
    <QueryClientProvider client={queryClient}>
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
          <Stack.Screen name="game/[id]/players" />
          <Stack.Screen name="players/pick" options={{ presentation: 'modal' }} />
          <Stack.Screen
            name="players/scan"
            options={{ presentation: 'fullScreenModal', contentStyle: { backgroundColor: Colors.ink } }}
          />
          <Stack.Screen name="auth/sign-in" options={{ presentation: 'modal' }} />
          <Stack.Screen name="account/edit" options={{ presentation: 'modal' }} />
          <Stack.Screen
            name="account/qr"
            options={{ presentation: 'fullScreenModal', contentStyle: { backgroundColor: Colors.primary } }}
          />
          <Stack.Screen name="settings" />
          <Stack.Screen name="u/[id]" />
          <Stack.Screen name="invite/[id]" options={{ presentation: 'modal' }} />
          <Stack.Screen name="game/[id]/comments" options={{ presentation: 'modal' }} />
          <Stack.Screen name="game/[id]/story" options={{ presentation: 'modal' }} />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="friends" />
          <Stack.Screen name="account/blocked" />
          <Stack.Screen name="group/[id]" />
          <Stack.Screen name="group/new" options={{ presentation: 'modal' }} />
          <Stack.Screen name="group/join" options={{ presentation: 'modal' }} />
          <Stack.Screen
            name="welcome"
            options={{ presentation: 'fullScreenModal', contentStyle: { backgroundColor: Colors.primary }, gestureEnabled: false }}
          />
          <Stack.Screen
            name="onboarding"
            options={{ presentation: 'fullScreenModal', contentStyle: { backgroundColor: Colors.primary }, gestureEnabled: false }}
          />
          <Stack.Screen
            name="recap"
            options={{ presentation: 'fullScreenModal', contentStyle: { backgroundColor: Colors.primary } }}
          />
        </Stack>
        <DialogHost />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
