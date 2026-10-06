/**
 * Mode démo (EXPO_PUBLIC_DEMO=1, voir `npm run dev`) : l'app se croit connectée et le social est servi
 * par des données fictives, sans serveur. Pour voir et tester tous les écrans. Jamais actif en production.
 */
export const isDemo = process.env.EXPO_PUBLIC_DEMO === '1';
