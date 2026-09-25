# Coinche

**Catégorie : Perso entreprenarial**

Le "Strava de la belote coinchée" : une app mobile pour compter les points de ses parties, puis à terme un réseau social autour du jeu (profils, amis, fil d'activité, stats, classements).

## État actuel (v0.1)

Compteur de points complet, stocké localement sur le téléphone :

- **Nouvelle partie** : noms des deux équipes (la sienne en premier, bouton pour inverser), score à atteindre (1000 / 1500 / 2000 ou libre).
- **Saisie d'une mène** (modal) : équipe preneuse, contrat (80 à 160, capot, générale), atout facultatif (coeur, carreau, pique, trèfle, SA, TA ; n'influe pas sur le score), enchère (rien, coinché, surcoinché), fait ou chuté, belote-rebelote (oui/non, créditée à l'équipe qui prend), aperçu des points avant validation.
- **Écran de partie** : gros score, progression vers l'objectif, numéro de la prochaine mène, tableau des mènes (contrat + symbole de l'atout s'il a été saisi) avec étiquettes (Fait, Chuté, Coinché, Belote), annulation de la dernière mène.
- **Fin de partie** : vainqueur, courbe d'évolution du score, stats (coinches, capots, meilleure mène), revanche en un tap, partage du résultat.
- **Fil** : stats globales, carte de la partie en cours, parties terminées façon Strava.
- **Profil** : parties, mènes, % de parties gagnées, % de mènes gagnées, coinches, capots. Les victoires (Fil et Profil) sont comptées du point de vue de l'équipe 1, qui doit être celle du propriétaire du téléphone.

### Règles de score

| Cas | Points |
|---|---|
| Contrat fait | l'équipe preneuse marque son contrat (x2 coinché, x4 surcoinché) |
| Contrat chuté | la défense marque 160 (320 coinché, 640 surcoinché) |
| Capot | vaut 250 points |
| Générale | capot réalisé par un seul joueur, vaut 500 points |
| Belote-rebelote | toujours comptée : +20 pour l'équipe qui prend, même si le contrat chute |
| Fin de partie | la première équipe à atteindre l'objectif gagne. Si les deux le dépassent sur la même mène, le plus gros score gagne (égalité : on continue) |

Toute la logique est dans `src/features/coinche/scoring.ts` (fonctions pures).

## Stack

- Expo SDK 57, React Native, TypeScript
- Expo Router (stack + onglets headless `expo-router/ui` avec tab bar custom)
- Zustand + AsyncStorage pour la persistance locale (store versionné, migration v1 vers v2)
- react-native-svg (icônes, symboles de cartes, graphique), Fraunces arrondie (fichiers dans `assets/fonts/`) pour les titres et scores, Figtree (`@expo-google-fonts/figtree`) pour le texte

## Structure

```
src/
  app/                      # routes (Expo Router)
    _layout.tsx             # stack racine
    (tabs)/                 # Fil, Jouer, Profil
    game/[id]/index.tsx     # écran de partie
    game/[id]/round.tsx     # saisie d'une mène (modal)
    game/[id]/result.tsx    # fin de partie (plein écran)
  features/coinche/         # domaine "coinche" : types, scoring, store, composants (score, mènes, cartes, graphique)
  components/               # UI partagée (Button, Icon, Card, Segmented, OptionChip, ToggleRow, Tag, Screen, Section, AppTabs)
  constants/theme.ts        # palette, polices, espacements, rayons
```

Le domaine coinche est isolé dans `src/features/coinche/` pour que l'app sociale se construise autour (futurs `features/auth`, `features/social`, `features/profile`...). Les modèles ont déjà des ids stables, des dates ISO et des `playerIds` par équipe pour une future synchro backend.

## Lancer

```bash
npm install
npx expo start      # puis scanner le QR code avec Expo Go, ou "w" pour le web
npx tsc --noEmit    # typecheck
```

## Publication iOS

Bundle ID `com.czernichow.coinche` (définitif une fois l'app créée dans App Store Connect). Build local via Xcode :

```bash
npx expo prebuild -p ios --clean   # régénère ios/ depuis app.json (ne jamais éditer ios/ à la main)
xed ios                            # puis Product > Archive, destination "Any iOS Device"
```

À chaque nouvel envoi, incrémenter `ios.buildNumber` dans `app.json` (et `version` pour une nouvelle version publique), puis refaire le prebuild.

### Site (GitHub Pages)

Le dossier `docs/` contient le mini-site statique servi par GitHub Pages (Settings > Pages > branche par défaut, dossier `/docs`) :

- `index.html` : présentation + FAQ support, sert d'**URL de support** dans App Store Connect.
- `confidentialite.html` : **politique de confidentialité** (aucune donnée collectée, tout reste en local). À mettre à jour avant d'ajouter comptes/backend.
- `style.css` : reprend les tokens "Bistrot" de `src/constants/theme.ts`.

## Design

Le design compte. Direction **"Bistrot"** : l'univers "tapis de cartes" crème et vert forêt, poussé vers quelque chose de plus ludique (choisi parmi trois pistes, entre l'ancienne version sobre et une maquette très "gaming").

- Fond crème `#F3EDE1`, cartes crème clair `#FFFBF4`, vert forêt `#1F4D3A` en couleur principale, moutarde `#F2B632` pour les accents (reprendre la partie, belote, trophée).
- Équipe 1 = coeur, tomate `#E0482F`. Équipe 2 = pique, bleu roi `#2C4DB5`.
- Effet "autocollant" : contour encre 2px + ombre décalée pleine (`Sticker`, `StickerSmall` dans `theme.ts`, via `boxShadow`). Au tap, le bloc "s'enfonce" (`StickerPressed`). À réserver aux blocs et boutons, pas aux petits éléments.
- Écran de partie : chaque score est une carte à jouer (symbole en coin), celle de l'équipe qui mène penche.
- Titres et scores en **Fraunces Black arrondie** (instance statique SOFT 100 / WONK 1 générée depuis la police variable, dans `assets/fonts/`), texte courant en **Figtree** (la famille suit le `fontWeight`, géré dans `ThemedText`).
- Tab bar flottante noire en pilule avec le bouton "Jouer" (pique rouge) au centre.
- Thème clair uniquement pour l'instant (`userInterfaceStyle: light`). Tous les tokens sont dans `src/constants/theme.ts`.
- Icône de l'app : broc de pastis en plexi translucide, pastis jaune pâle et logo "PASTIS 51" au centre, sur fond blanc (`assets/images/icon.png`, déclinée en foreground/monochrome Android, splash et favicon). Style volontairement basique. Attention : le logo 51 est une marque déposée, risque de refus en cas de publication sur les stores.

## Roadmap

- [ ] Comptes utilisateurs + backend (Supabase ou équivalent)
- [ ] Joueurs rattachés aux équipes, stats par joueur et par binôme
- [ ] Fil social : parties des amis, likes, commentaires
- [ ] Classements entre potes, badges, records
- [ ] Saisie optionnelle des points réellement faits (variante "points faits + annonce")
- [ ] Thème sombre
- [ ] Écran de réglages (la roue du Fil mène au Profil pour l'instant)
