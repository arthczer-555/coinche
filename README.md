# Coinche

**Catégorie : Perso entreprenarial**

Le "Strava de la belote coinchée" : une app mobile pour compter les points de ses parties, identifier les joueurs à la table, et retrouver toutes ses parties et ses stats sur son profil. À terme, un vrai réseau social autour du jeu (fil des amis, bravos, commentaires, classements, badges, bandes).

## Branches et versions

- `master` : **v1.1**, l'app sociale complète : comptes, joueurs tagués, profils, amis, fil façon Strava, bravos, commentaires, notifications, cote Elo, classements, badges, bandes, parties en direct, récap annuel (phases 0 à 6 de [PLAN.md](PLAN.md)). Fonctionne aussi sans backend configuré (retombe sur le mode local de la v1.0). Développée sur `social`, fusionnée dans `master` le 6 octobre 2026.
- La **v1.0** (compteur 100 % local, soumise sur l'App Store) correspond au commit `3b9e6ee`.

## Fonctionnalités

### Compteur (v1.0)

- **Nouvelle partie** : noms des deux équipes (la sienne en premier, bouton pour inverser), score à atteindre (1000 / 1500 / 2000 ou libre).
- **Saisie d'une mène** (modal) : équipe preneuse, contrat (80 à 160, capot, générale), atout facultatif (coeur, carreau, pique, trèfle, SA, TA ; n'influe pas sur le score), enchère (rien, coinché, surcoinché), fait ou chuté, aperçu des points avant validation.
- **Écran de partie** : gros score, progression vers l'objectif, numéro de la prochaine mène, tableau des mènes (contrat + symbole de l'atout s'il a été saisi) avec étiquettes (Fait, Chuté, Coinché), annulation de la dernière mène.
- **Fin de partie** : vainqueur, courbe d'évolution du score, stats (coinches, capots, meilleure mène), revanche en un tap, partage du résultat.
- **Fil** : stats globales (parties, victoires, % de parties gagnées), carte de la partie en cours, parties terminées façon Strava.
- **Profil** : parties, mènes, % de parties gagnées, % de mènes gagnées, coinches, capots.

### Social (v1.1)

- **Comptes** : prénom, nom, pseudo (`@arthur.c`) et mot de passe (8 caractères min.), **sans e-mail** ; connexion avec le pseudo et le mot de passe. Ou "Se connecter avec Apple" sur iPhone (écran d'accueil ensuite pour choisir son nom et son pseudo). Mot de passe oublié : on écrit au contact, réinitialisation à la main (voir plus bas). **Le compte reste facultatif** : sans compte, l'app marche comme la v1.0.
- **Joueurs à la table** : sur "Nouvelle partie", 2 places par équipe. Pour chaque place : moi, un habitué (joueurs déjà croisés, triés par fréquence), **n'importe quel compte, ami ou pas** (recherche par nom ou `@pseudo`, sans tenir compte des accents, pseudo exact puis amis d'abord ; le pseudo est unique et distingue deux joueurs du même nom), le **QR code** de son profil (scan caméra), ou un **invité** (juste un prénom). Les noms d'équipe se génèrent tout seuls ("Arthur & Léa") et restent modifiables. Joueurs et visibilité modifiables après coup (menu "…" > Joueurs et visibilité).
- **La partie arrive directement sur le profil des joueurs tagués**, amis ou pas, sans validation : le joueur reçoit une notification (le tap ouvre la partie). S'il n'y a pas joué, il choisit "Pas moi" dans le menu "…" de la partie (écran de la partie ou carte du Fil) : elle quitte son profil et ses stats, et l'auteur voit "a dit « Pas moi »" (écran Joueurs). Un joueur bloqué ne peut pas être tagué.
- **Invités** : chaque invité reçoit un lien (écran de fin ou écran Joueurs, bouton "Inviter"). En créant son compte, il récupère toutes les parties jouées sous ce prénom, avec ses stats. C'est la boucle de croissance de l'app.
- **Profils** : le mien (onglet Profil) et celui des autres (`/u/<id>`, ouvert depuis un lien ou un QR scanné avec l'appareil photo). Stats par joueur : parties, % victoires, % mènes gagnées, série en cours, meilleure série, coinches, capots, % de contrats réussis par son équipe, forme (5 dernières), **partenaires** (parties ensemble, % victoires). Ajouter en ami, nombre d'amis (liste consultable).
- **Visibilité d'une partie** : tout le monde, mes amis (par défaut), ou seulement les joueurs.
- **"Juste les points"** (en haut de Nouvelle partie, connecté) : la partie de la v1.0. Juste les noms d'équipe ("Nous" / "Eux" par défaut) et le score à atteindre ; je suis seul à la table (équipe 1), personne n'est tagué. La partie est privée : elle n'apparaît que dans mon fil et sur mon profil, et compte dans mes stats. Ni récit, ni bravos, ni commentaires, ni cote affichée, ni bande, ni classements (colonne `games.simple`, exclue de `leaderboard()`). Étiquette "Juste les points" sur la carte ; la revanche garde le mode.
- **Réglages** : profil, état de la synchro, aide, confidentialité, déconnexion, **suppression du compte** (exigence App Store).
- **Hors ligne d'abord** : la saisie écrit toujours en local ; les parties partent au serveur dès qu'il y a du réseau (file d'attente persistée, relance au retour du réseau et au retour au premier plan).

### Social et compétition (v1.1, phases 3 à 6)

- **Fil façon Strava** (onglet Fil, connecté) : mes parties et celles de mes amis, paginé, avec auteur, lieu, note, photo de la tablée, score, bravos et commentaires. Parties des autres encore en cours : "En direct", le score se met à jour tout seul (Supabase Realtime).
- **Bravos** (le kudos de Strava) et **commentaires** (écran dédié, appui long : supprimer / signaler). Toujours disponibles, y compris sur ses propres parties.
- **Récit d'une partie** (auteur, une fois la partie finie : écran de résultat avant le partage, ou menu "…") : un mot, le lieu (avec les lieux habituels en un tap), une photo (bucket privé, visible comme la partie). Photos et avatars sont recadrés puis réduits en JPEG avant l'envoi (1600 px / 512 px, `features/social/pick-image.ts`) : léger pour le fil et sous les limites des buckets, y compris sur le web. En démo, la photo choisie s'affiche le temps de la session.
- **Notifications** : tag, confirmation (anciennes parties), bravo, commentaire, demande d'ami, demande acceptée. Écran + pastille dans le Fil ; push via la fonction Edge `push` (activées à la demande depuis l'écran Notifications).
- **Amis, comme sur Facebook** (pas d'abonnés ni d'abonnements) : j'envoie une demande, l'autre l'accepte ou la refuse ; une fois amis, chacun voit les parties de l'autre (dans son fil et sur son profil), et les parties jouées ensemble comptent pour la cote. Retirer un ami ou bloquer défait le lien. Écran Amis (icône en haut du Fil avec pastille des demandes reçues, bouton du Profil, ou compteur d'amis) : onglet "Amis" (demandes reçues à accepter / refuser, mes amis, demandes envoyées à retirer) et "Trouver" (recherche par nom ou pseudo, scan du QR code d'un profil, invitation par lien, joueurs croisés à table pas encore amis). Bouton Ajouter / Envoyée / Accepter / Amis sur chaque ligne et sur le profil d'un joueur.
- **Amis d'un autre joueur et amis en commun** : sur son profil, "12 amis · 3 en commun" et une rangée de cartes "Amis de Léa" (ceux que je peux ajouter d'abord, triés par amis en commun, puis nos amis communs), bouton d'ami directement sur chaque carte ; "Tout voir" ouvre la liste complète ("Pas encore tes amis", puis "Amis en commun"). L'intersection se fait côté app (les amitiés acceptées sont lisibles de tous).
- **"Tu les connais peut-être"** : amis de mes amis, sans lien avec moi ni blocage, triés par nombre d'amis en commun (fonction `friend_suggestions()`), avec "En commun : Léa, Paul et 2 autres". Carrousel dans l'onglet "Amis", liste complète dans "Trouver" (départage par parties jouées ensemble ; "Tu as joué avec eux" ne les répète pas). Après "Ajouter", la carte reste avec "Envoyée" jusqu'au prochain passage.
- **Modération** (exigence Apple 1.2) : signaler un profil / une partie / un commentaire, bloquer un joueur (liste dans Réglages), filtre de grossièretés côté app et côté base.
- **Photo de profil**.
- **Parties classées** : au lancement (Nouvelle partie), choix "Amicale" ou "Classée". Classée n'est possible qu'avec 4 comptes à la table, tous amis avec celui qui compte les points (l'anti-triche, puisque les parties arrivent sans validation) : un petit avertissement l'explique et liste les joueurs à ajouter en amis directement sur place (la liste se met à jour toute seule quand ils acceptent). Le bouton Distribuer reste grisé tant que ce n'est pas bon. Une fois les 4 comptes à la table, la carte annonce **l'enjeu** : pour chaque joueur, sa cote, ce qu'il gagne en cas de victoire et perd en cas de défaite (pour un écart de score moyen). Étiquette "Classée" sur la partie ; l'écran Joueurs redit si elle comptera encore. À la fin, l'écran de résultat montre **la cote de chacun avant → après et son gain** (chiffres de la base une fois la partie classée, le même calcul fait sur le téléphone en attendant la synchro), ou pourquoi la partie ne compte pas. La base revérifie tout à la fin (personne n'a dit "Pas moi", toujours amis).
- **Cote Elo** (formule dans `features/stats/elo.ts`, identique en SQL dans `try_rate_game`) : départ à 1000, une équipe vaut la moyenne de ses deux joueurs ; échelle de 800 points au lieu de 400 et K = 96 sur les 10 premières parties classées puis 64, pour que les cotes s'écartent vraiment (simulé : écart type à peu près doublé par rapport à l'Elo classique, ~180 après 15 parties, ~320 après 60) ; l'écart de score compte (x0,5 partie serrée à x1,5 raclée) ; plancher à 100. Cote en grand à côté du nom sur les profils ("provisoire" avant 10 parties classées), courbe d'évolution, et **cote moyenne de chaque équipe** sur les cartes du Fil (celle d'avant la partie si elle a été classée, sinon la cote actuelle ; rien pour une équipe avec un invité).
- **Classements** (onglet) : amis, ma ville, tous ; cote, victoires ou % de victoires ; semaine, mois, saison (trimestre), toujours.
- **Profil enrichi** : défis du mois, activité sur 12 semaines, réussite par hauteur de contrat, records (remontée, victoire éclair, plus grosse mène, fanny), 14 badges avec progression, face-à-face (toi et ce joueur, ensemble / contre).
- **Bandes** (onglet) : créer, rejoindre par code ou lien, classement du mois de la bande, parties de la bande, membres (admin : retirer). On range une partie dans une bande au lancement.
- **Partage en image** : carte de la partie (écran de fin) et récap "Ma saison" (Profil), au format story.
- **Accueil** au premier lancement (`welcome.tsx`) : 3 cartes illustrées (feuille de marque, table taguée, partie dans le fil), « Suivant » ou glisser, puis la page de connexion (fermable pour jouer sans compte). En démo : ouvrir `/welcome` à la main.
- **Petit tour après l'inscription** (`/onboarding`, plein écran vert) : ma carte de joueur avec mon QR code, "Remplis ta table" (trouver ses potes, inviter par lien), puis activer les notifications (seulement sur iPhone, si la permission n'a jamais été demandée). Il s'ouvre au retour sur les onglets, une fois le pseudo choisi, seulement sur le téléphone où le compte vient d'être créé, jamais après une simple connexion (drapeau `tourPendingFor` posé par `auth/sign-in`, lu par `features/onboarding/use-intro.ts`) : il ne coupe donc ni la connexion, ni l'écran d'accueil du profil, ni la récupération des parties d'invité. "Passer" à tout moment. En démo (compte ancien), il ne se déclenche pas : ouvrir `/onboarding` à la main dans le navigateur.
- **Mesure d'usage** facultative (PostHog UE, désactivée sans clé) sur l'entonnoir : partie lancée, invité, invité converti, bravo, commentaire, bande.

### Règles de score

| Cas | Points |
|---|---|
| Contrat fait | l'équipe preneuse marque son contrat (x2 coinché, x4 surcoinché) |
| Contrat chuté | la défense marque 160 (320 coinché, 640 surcoinché) |
| Capot | vaut 250 points |
| Générale | capot réalisé par un seul joueur, vaut 500 points |
| Belote-rebelote | non comptée (pas de +20) |
| Fin de partie | la première équipe à atteindre l'objectif gagne. Si les deux le dépassent sur la même mène, le plus gros score gagne (égalité : on continue) |

Toute la logique est dans `src/features/coinche/scoring.ts` (fonctions pures).

## Stack

- Expo SDK 57, React Native, TypeScript ; iOS et web (react-native-web, SPA) avec le même code
- Expo Router (stack + onglets headless `expo-router/ui` avec tab bar custom)
- Zustand + AsyncStorage pour l'état local (store `coinche-games` versionné, v8 : migrations pures dans `features/coinche/migrations.ts`, testées)
- **Supabase** (Postgres + Auth + RLS) pour les comptes et le social, **TanStack Query** pour les données serveur
- `expo-apple-authentication`, `expo-camera` (scan QR), `react-native-qrcode-svg`, `expo-crypto` (UUID), `expo-network`, `expo-dev-client`, `expo-notifications`, `expo-image-picker` + `expo-image-manipulator` (réduction des photos), `react-native-view-shot` + `expo-sharing` (cartes image ; `html-to-image` sur le web)
- Supabase Realtime (parties en direct), Storage (avatars public, photos de parties privé), Edge Function `push` (Deno)
- react-native-svg (icônes, symboles de cartes, graphique), Fraunces arrondie (fichiers dans `assets/fonts/`) pour les titres et scores, Figtree (`@expo-google-fonts/figtree`) pour le texte
- Tests : `jest-expo` (logique pure : scoring, joueurs, migration, stats, conversion serveur, store)

## Structure

```
src/
  app/                        # routes (Expo Router)
    _layout.tsx               # stack racine, QueryClient, bootstrap session + synchro
    (tabs)/                   # index = Nouvelle partie, feed = Fil, profile = Profil
    game/[id]/index.tsx       # écran de partie (lecture seule si la partie est à quelqu'un d'autre)
    game/[id]/round.tsx       # saisie d'une mène (modal)
    game/[id]/result.tsx      # fin de partie (plein écran), invitations des invités
    game/[id]/players.tsx     # joueurs et visibilité d'une partie lancée
    players/pick.tsx          # "Qui joue ?" : choix d'un joueur pour une place (modal)
    players/scan.tsx          # scan du QR code d'un joueur
    auth/sign-in.tsx          # inscription / connexion : pseudo + mot de passe, ou Apple
    account/edit.tsx          # profil (et accueil après inscription avec ?welcome=1)
    account/qr.tsx            # mon QR code
    u/[id].tsx                # profil public d'un joueur (lien coinche://u/<id>)
    invite/[id].tsx           # récupérer ses parties d'invité (lien coinche://invite/<id>)
    game/[id]/comments.tsx    # commentaires (modal)
    game/[id]/story.tsx       # récit : note, lieu, photo (modal)
    (tabs)/leaderboard.tsx    # classements
    (tabs)/groups.tsx         # mes bandes
    group/[id].tsx, group/new.tsx, group/join.tsx  # une bande, créer, rejoindre (coinche://group/join?code=)
    friends.tsx               # Amis : amis et demandes, trouver (?tab=find, ?id= pour les amis d'un autre joueur)
    notifications.tsx, recap.tsx, welcome.tsx, account/blocked.tsx
    onboarding.tsx            # petit tour après l'inscription (carte de joueur, potes, notifications)
    settings.tsx              # réglages
  features/
    coinche/                  # domaine : types, scoring, joueurs (placement, habitués), store + file de synchro, migrations
    auth/                     # session (useMe), actions (Apple, OTP, déconnexion, suppression), bootstrap
    players/                  # avatars, places d'une équipe, brouillon de la nouvelle partie
    profile/                  # en-tête, stats, historique
    social/                   # appels Supabase (api.ts), hooks TanStack Query (queries.ts), partage texte / image (share.ts)
    stats/                    # stats par joueur, records, badges, activité, défis du mois, récap annuel, périodes
    notifications/            # push (jeton, permission, ouverture au tap) ; push.web.ts : sans effet sur le web
    onboarding/               # préférences locales (accueil vu, tour à montrer, id d'installation), déclenchement de l'accueil et du tour
    sync/                     # conversion app <-> base, envoi / récupération des parties
  lib/                        # client Supabase, types de la base, mesure d'usage
  components/                 # UI partagée (Button, Icon, Card, Segmented, OptionChip, Tag, Screen, Section, AppTabs, confirm + Dialog du web)
  constants/                  # theme.ts (design system), links.ts (liens web publics)
supabase/
  setup.sh                    # initialisation complète du backend (npm run supabase:setup)
  migrations/                 # droits de l'API, socle social, fil/bravos/commentaires/notifications/modération/stockage, cote Elo/classements, bandes/direct, recherche de joueurs, tags sans validation, suggestions d'amis, parties classées et nouvelle cote, déclencheur du push, parties "juste les points"
  functions/push/             # fonction Edge : envoi des notifications push (Expo)
  config.toml                 # config Supabase CLI : Auth poussée sur le projet par setup.sh
```

### Modèle et règles côté serveur

- Une partie a **un seul auteur** (`owner_id`, celui qui compte) : lui seul la modifie. Les mènes sont stockées en JSON dans la partie (un seul écrivain, envoi atomique, simple hors ligne). Le score final est dénormalisé (`score_a`, `score_b`) pour le fil et les futurs classements.
- `game_players` : places 0-1 (équipe A) et 2-3 (équipe B), soit un compte soit un invité. Le **statut** est calculé par trigger : `accepted` d'office (plus de validation depuis la migration `tags_direct`), `declined` quand le joueur a dit "Pas moi" (`respond_to_game`) ou si l'un a bloqué l'autre. L'auteur ne peut pas changer le statut d'un joueur. `pending` n'est plus produit.
- Invités : `guest_players`, l'id sert de lien de réclamation. `claim_guest()` bascule les places (et le preneur des mènes) sur le compte.
- `friendships` : une ligne par paire de joueurs (`pending` puis `accepted`). Demander ou accepter passe par `add_friend()` (accepte si l'autre avait déjà demandé) ; refuser, annuler ou retirer un ami supprime la ligne. Bloquer supprime le lien et empêche toute nouvelle demande.
- RLS : partie lisible selon sa visibilité (tout le monde, amis, joueurs), toujours par ses joueurs ; rien n'est lisible sans compte sauf l'aperçu d'une invitation (`guest_invite()`).
- Côté app, "Moi" hors connexion est l'identité locale `me` ; à la connexion, `adoptLocalGames` rattache les parties locales au compte et remplace "Moi" par le joueur.

## Lancer

```bash
npm install
npm run dev         # LE point d'entrée : ouvre l'app dans le navigateur en mode démo. Touche i : simulateur iOS (même serveur)
npm run web         # web avec les vraies données (compteur local, ou Supabase si .env.local)
npx expo start      # mobile seul ; sans .env.local : mode local (v1.0), Expo Go suffit
npm run check       # typecheck + lint + tests (aussi : npm run typecheck, npm run lint, npm test)
```

**Mode démo** (voir tous les écrans sans serveur) : `npm run dev`, dans le navigateur ou l'app de développement. L'app se croit connectée en tant que "Alex Martin" et le social est servi par des données fictives (`src/features/demo/` : 12 joueurs + 4 amis d'amis pour les suggestions, ~55 parties sur 3 mois, 2 bandes, bravos, commentaires, notifications, cotes Elo). Les bravos, commentaires, amis (demandes, acceptation) et bandes marchent en mémoire (remis à zéro au redémarrage). Attention : au premier lancement en démo, les parties locales du téléphone sont remplacées par celles de la démo (sur le web, elles vivent dans le stockage du navigateur, à part).

### Web

**Chaque modification doit marcher sur mobile et sur le web** (règles détaillées dans `AGENTS.md`). Le web sert à développer et tester vite, dans le navigateur, avec le même code :

- SPA (`web.output: "single"`) : pas de rendu serveur, le stockage local marche comme sur le téléphone.
- Menus d'actions, confirmations et messages : boîte de dialogue maison (`components/dialog.tsx`) à la place des alertes natives.
- Partage : feuille de partage du navigateur si elle existe, sinon le lien est copié et la carte image est téléchargée (capture `html-to-image`).
- Scan du QR code : par la webcam. Photos : sélecteur de fichiers.
- Pas de notifications push ni de connexion Apple sur le web (pseudo + mot de passe marchent).

Les fonctionnalités sociales utilisent des modules natifs (Apple, caméra) : il faut un **development build** (`npx expo run:ios`, ou `npx eas-cli@latest build --profile development`), pas Expo Go.

### Brancher Supabase (une commande)

```bash
supabase login            # une fois (CLI : brew install supabase/tap/supabase)
npm run supabase:setup    # tout le reste
```

**État : projet créé le 6 octobre 2026** sur le compte Supabase perso (organisation `arthczer-555`), ref `wkzgrkotgsqozkfmfouj`, région Paris, offre gratuite. Schéma, config Auth, fonction push et `.env.local` en place ; inscription et connexion par pseudo testées de bout en bout sur ce projet.

`supabase/setup.sh` fait tout, et peut être relancé sans risque :

1. Crée le projet `coinche` en région **Paris** (`eu-west-3`, ce qu'annonce la politique de confidentialité) s'il n'existe pas. Le mot de passe de la base est généré et gardé dans `.env.local`.
2. Applique le schéma (`supabase db push`) : tables, RLS, stockage, Elo, bandes, Realtime, déclencheur du push.
3. Pousse la config Auth de `supabase/config.toml` : mot de passe de 8 caractères min., pas d'e-mail de confirmation, connexion Apple native (Client ID `com.czernichow.coinche`, pas de clé secrète pour ce flux). Pas de modèle d'e-mail dans la config : en offre gratuite sans SMTP à soi, Supabase refuse toute la config Auth s'il y en a un. L'erreur Storage `databasePoolMode` du CLI 2.107 est un bug sans conséquence, ignoré.
4. Déploie la fonction Edge `push`. Le déclencheur `notifications_push` l'appelle à chaque notification (pg_net), avec l'URL et le secret partagé rangés dans Vault : pas de webhook à créer à la main.
5. Écrit `.env.local` (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY`, plus les secrets locaux qui ne partent pas dans l'app).
6. Vérifie : accès de l'app aux tables, buckets, Realtime, secrets du push.

Ensuite, à la main :

- Apple Developer : cocher "Sign in with Apple" sur l'App ID (le prebuild l'ajoute aux entitlements via `ios.usesAppleSignIn`).
- Pas de serveur d'e-mails nécessaire : aucun e-mail n'est envoyé (comptes pseudo + mot de passe, ou Apple).
- Push sur iPhone : `npx eas-cli@latest init` (`extra.eas.projectId`, sans lui pas de jeton push), puis la clé APNs avec `npx eas-cli@latest credentials`.
- Mesure d'usage (facultatif) : projet PostHog en région UE, `EXPO_PUBLIC_POSTHOG_KEY` dans `.env.local`.
- Types de la base : écrits à la main dans `src/lib/database.types.ts` (même format que `supabase gen types typescript --linked`), à tenir à jour quand le schéma évolue.

**Comptes pseudo + mot de passe.** Supabase Auth exige un e-mail : l'app en invente un, interne et jamais utilisé (`<uuid>@coinche.invalid`, domaine réservé qui n'existe pas, `features/auth/credentials.ts`). À la connexion, `login_email()` retrouve cette adresse à partir du pseudo (qui peut donc changer) ; elle ne renvoie jamais l'e-mail d'un compte Apple. Le prénom + nom et le pseudo sont posés à la création du profil (`handle_new_user`), l'écran d'accueil est sauté. **Mot de passe oublié** (pas d'e-mail de récupération) : le joueur écrit au contact, et on remet un mot de passe à la main :

```bash
supabase db query --linked "update auth.users set encrypted_password = extensions.crypt('nouveau-mot-de-passe', extensions.gen_salt('bf')) where id = (select id from public.profiles where username = 'le.pseudo')"
```

`npm run dev` reste en mode démo même avec `.env.local` rempli : la démo ne parle jamais au vrai serveur.

**Droits de l'API (important pour toute nouvelle migration).** Depuis mai 2026, un nouveau projet Supabase n'expose plus ses nouvelles tables à l'API sans `GRANT` explicite ([changelog](https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically)). La première migration (`20260926000000_data_api_grants.sql`) rétablit les droits par défaut pour que le schéma marche tel quel ; la sécurité repose sur RLS et sur les `revoke` de chaque migration. Supabase appliquera le nouveau comportement aux projets existants le 30 octobre 2026 : **toute nouvelle table doit donc porter ses propres `grant`** (`grant select, insert, update, delete on public.x to authenticated`, puis les `revoke` fins), et chaque migration doit avoir un numéro de version (préfixe horodaté) unique.

Pas de Docker sur la machine de dev : le schéma a été validé avec PGlite (Postgres en WebAssembly) sur un scénario complet de **107 vérifications** (RLS, statuts des tags, invités, fil, bravos, commentaires, notifications, blocage, filtre de grossièretés, stockage, cote Elo et anti-triche, classements, bandes, suppression de compte, upserts de la synchro), puis **43 vérifications sur les amis** au passage des abonnements aux amis (demande, doublons, acceptation, refus, retrait, visibilité, fil, tags, classement, blocage, suppression de compte), et **11 vérifications sur les suggestions d'amis** (ordre, amis en commun, exclusion de moi, de mes amis, des demandes en cours, des bloqués et des amis de 3e niveau, limite, sans connexion). Les droits de l'API et le déclencheur du push ont été validés de la même façon, dans un Postgres sans droits par défaut (comme un nouveau projet) : sans `data_api_grants`, l'app reçoit "permission denied" sur toutes les tables.

## Publication iOS

Bundle ID `com.czernichow.coinche` (définitif une fois l'app créée dans App Store Connect). Build local via Xcode :

```bash
npx expo prebuild -p ios --clean   # régénère ios/ depuis app.json (ne jamais éditer ios/ à la main)
xed ios                            # puis Product > Archive, destination "Any iOS Device"
```

À chaque nouvel envoi, incrémenter `ios.buildNumber` dans `app.json` (et `version` pour une nouvelle version publique), puis refaire le prebuild.

**iPad supporté** (`ios.supportsTablet: true`) : portrait sur iPhone, toutes orientations sur iPad (`UISupportedInterfaceOrientations~ipad`, requis pour le multitâche iPad). App Store Connect exige donc aussi des **captures iPad 13"**. Attention : une fois publiée avec le support iPad, Apple ne permet plus de le retirer.

### Captures App Store

`store/screenshots/iphone-6.5/` : 3 captures iPhone 6,5" (1284 x 2778, simulateur iPhone 13 Pro Max), le format demandé par App Store Connect. `store/screenshots/iphone-6.9/` : les mêmes en 6,9" (1320 x 2868, iPhone 17 Pro Max). `store/screenshots/ipad-13/` : les mêmes en iPad 13" (2064 x 2752, simulateur iPad Pro 13" M5, portrait ; poignée de redimensionnement de fenêtre iPadOS 26 effacée en bas à droite). Build Release. Données fictives cohérentes générées par `store/screenshots/seed.mjs` (état AsyncStorage `coinche-games` à copier dans `Library/Application Support/com.czernichow.coinche/RCTAsyncLocalStorage_V1/manifest.json` du conteneur de l'app), écrans ouverts par deep link (`coinche:///feed`, `coinche:///game/<id>`, `coinche:///game/<id>/result`).

### Écrans supportés

Mise en page vérifiée de 320 px (petit Android) à l'iPad 13" paysage : contenu centré à `MaxContentWidth` (640), safe areas lues via `useSafeAreaInsets` dans `Screen` (gauche/droite toujours protégés), textes longs tronqués ou rétrécis (`adjustsFontSizeToFit`). Le grossissement du texte système est plafonné à `MaxFontScale` (1.4) dans `ThemedText` et les `TextInput`.

### Site (GitHub Pages)

Le dossier `docs/` contient le mini-site statique servi par GitHub Pages (Settings > Pages > branche par défaut, dossier `/docs`) :

- `index.html` : présentation + FAQ support, sert d'**URL de support** dans App Store Connect.
- `confidentialite.html` : **politique de confidentialité**, version 1.1 (comptes, données collectées, hébergement Supabase UE, suppression). GitHub Pages sert `master`.
- `u.html`, `invite.html` et `join.html` : pages de redirection des liens partagés (profil, invité, bande) (`?id=<uuid>` vers `coinche://u/<id>` et `coinche://invite/<id>`). Un lien https passe partout (SMS, WhatsApp) contrairement au schéma de l'app. Le QR code du profil contient le lien `u.html` : scanné avec l'appareil photo il ouvre le profil, scanné dans l'app il assoit le joueur.
- Adresse de contact (index et confidentialité) : renseignée. Plus tard : un domaine à nous pour les liens universels iOS (impossible sur `*.github.io/coinche`).
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
- Icône de l'app : dame et roi de coeur en éventail, chacun avec un gros coeur couronné (diadème pour la dame, couronne pour le roi), "Coinche" en Fraunces au-dessus avec un coeur à la place du point du i, sur fond blanc. Même style autocollant que l'app (contours encre, ombre décalée). `assets/images/icon.png`, déclinée en foreground/monochrome Android, splash (composition transparente sur le fond crème) et favicon (les deux cartes seules, le titre étant illisible en 48 px).

## Roadmap ("Strava de la coinche")

Plan détaillé, état de chaque phase et choix techniques : [PLAN.md](PLAN.md).

- [x] Phases 0 à 6 : fondations, comptes, joueurs tagués, social, compétition, bandes et direct, accueil et mesure d'usage (branche `social`)
- [x] Brancher Supabase (projet `wkzgrkotgsqozkfmfouj`, `npm run supabase:setup`)
- [ ] Tester à plusieurs téléphones avec de vrais comptes (inscription et connexion testées sur le serveur, pas encore le reste)
- [x] Remplacer l'icône Pastis 51 (dame et roi de coeur)
- [x] Fusion de `social` dans `master` (politique de confidentialité 1.1 en ligne), migration `simple_games` appliquée sur le serveur
- [ ] Publier la 1.1 : archive du build 3, fiche App Privacy, compte de test pour la review, "Sign in with Apple" coché
- [ ] Variante "points faits + annonce" : à trancher (règles de la table)
- [ ] Thème sombre (refonte des styles, reportée)
- [ ] Co-saisie d'une partie à plusieurs téléphones, connexion Google, `eas update`
