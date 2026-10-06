import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Préférences de l'app sur ce téléphone (accueil vu, etc.). */
type PrefsState = {
  seenWelcome: boolean;
  /** Compte créé sur ce téléphone dont le tour d'après l'inscription reste à montrer. */
  tourPendingFor: string | null;
  /** Identifiant anonyme de l'installation (mesure d'usage hors connexion). */
  installId: string | null;
  setSeenWelcome: () => void;
  setTourPending: (profileId: string | null) => void;
  setInstallId: (id: string) => void;
};

export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      seenWelcome: false,
      tourPendingFor: null,
      installId: null,
      setSeenWelcome: () => set({ seenWelcome: true }),
      setTourPending: (tourPendingFor) => set({ tourPendingFor }),
      setInstallId: (installId) => set({ installId }),
    }),
    { name: 'coinche-prefs', storage: createJSONStorage(() => AsyncStorage), version: 1 },
  ),
);
