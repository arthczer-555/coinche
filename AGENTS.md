This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Web et mobile : chaque modification sur les deux

L'app tourne sur iOS (cible principale, App Store) et sur le web. Le web sert à développer vite : `npm run dev` ouvre l'app dans le navigateur en mode démo (données fictives, sans serveur), et le même serveur Metro sert le development build iOS (touche `i`).

- **Toute modification doit marcher sur mobile ET sur le web.** La vérifier dans le navigateur (`npm run dev`) en plus de `npm run check` (typecheck, lint, tests). Si un comportement ne peut pas exister sur le web, prévoir un équivalent ou un repli explicite, jamais un écran qui plante ou un bouton qui ne fait rien.
- Petite différence : `Platform.OS` dans le même fichier. Module natif sans support web : fichier `.web.ts(x)` à côté, avec exactement les mêmes exports (ex. `features/notifications/push.web.ts`). Toute modification de l'un se reporte sur l'autre.
- Pas d'`Alert.alert`, `ActionSheetIOS` ni `Share.share` en direct (ignorés sur le web) : passer par `confirm`, `notify`, `showActions` (`components/confirm.ts`, boîte de dialogue `components/dialog.tsx` sur le web) et `shareText`, `shareAsImage` (`features/social/share.ts`).
- Un bloc cliquable qui contient d'autres boutons prend `accessibilityRole={BlockRole}` (`components/button.tsx`) : sur le web, `button` devient un `<button>` HTML, qui ne peut pas en contenir d'autres.
- `pointerEvents` et ombres dans le style (`pointerEvents: 'none'`, `boxShadow`), pas en prop ni en `shadow*` (dépréciés sur le web).
- Web en SPA (`web.output: "single"` dans `app.json`) : pas de rendu serveur, `window` et le stockage local sont toujours disponibles.
- Absents du web : notifications push et connexion Apple (pseudo + mot de passe marchent). Le scan QR passe par la webcam.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npm run dev                 # web (navigateur) + mode démo ; touche i pour iOS
npm run check               # typecheck + lint + tests
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md
