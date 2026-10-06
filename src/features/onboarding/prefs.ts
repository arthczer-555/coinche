import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Préférences de l'app sur ce téléphone (accueil vu, etc.). */
type PrefsState = {
  seenWelcome: boolean;
  /** Comptes qui ont vu le tour d'après l'inscription sur ce téléphone. */
  tourSeenBy: string[];
  /** Identifiant anonyme de l'installation (mesure d'usage hors connexion). */
  installId: string | null;
  setSeenWelcome: () => void;
  markTourSeen: (profileId: string) => void;
  setInstallId: (id: string) => void;
};

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      seenWelcome: false,
      tourSeenBy: [],
      installId: null,
      setSeenWelcome: () => set({ seenWelcome: true }),
      markTourSeen: (profileId) => set((s) => ({ tourSeenBy: [...s.tourSeenBy, profileId] })),
      setInstallId: (installId) => set({ installId }),
    }),
    { name: 'coinche-prefs', storage: createJSONStorage(() => AsyncStorage), version: 1 },
  ),
);
