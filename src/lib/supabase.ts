import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from './database.types';

// Mode démo (npm run dev, voir features/demo/is-demo.ts) : jamais de vrai serveur, même si .env.local est rempli.
const demo = process.env.EXPO_PUBLIC_DEMO === '1';
const url = demo ? undefined : process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = demo ? undefined : process.env.EXPO_PUBLIC_SUPABASE_KEY;

/**
 * Client Supabase, ou null si le projet n'est pas configuré (.env absent) :
 * l'app reste alors un compteur 100 % local, comme la v1.0.
 */
export const supabase: SupabaseClient<Database> | null =
  url && key
    ? createClient<Database>(url, key, {
        auth: {
          // Sur le web (rendu statique), le stockage par défaut du navigateur suffit.
          ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          lock: processLock,
        },
      })
    : null;

export const isBackendEnabled = supabase !== null;

/** URL du projet (fichiers du stockage lus directement par expo-image). */
export const supabaseUrl = url ?? null;

// Le jeton ne se rafraîchit que quand l'app est au premier plan.
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** Client garanti, pour le code qui n'est atteint que connecté. */
export function requireSupabase(): SupabaseClient<Database> {
  if (!supabase) throw new Error('Supabase non configuré (EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY).');
  return supabase;
}
