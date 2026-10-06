import AppTabs from '@/components/app-tabs';
import { useIntroScreens } from '@/features/onboarding/use-intro';

export default function TabLayout() {
  // Accueil en trois cartes au premier lancement, petit tour juste après l'inscription.
  useIntroScreens();

  return <AppTabs />;
}
