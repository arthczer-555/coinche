# Plan : Coinche, le "Strava de la coinche"

Plan produit et technique complet. Le README garde le résumé et l'état courant ; ce fichier garde le détail des phases.
Dernière mise à jour : 6 octobre 2026 (phases 0 à 6 livrées sur la branche `social` ; abonnements remplacés par des amis façon Facebook).

## Où on en est

| Phase | Contenu | État |
|---|---|---|
| 0. Fondations | Branche `social`, EAS, Supabase (schéma + RLS), UUID, TanStack Query, tests | Fait (branche `social`) |
| 1. Comptes et profils | Pseudo + mot de passe (sans e-mail) ou Apple, profil, réglages, suppression du compte | Fait (branche `social`) |
| 2. Joueurs dans la partie | 4 places, habitués, recherche, QR, invités, tags directs ("Pas moi" après coup), stats par joueur | Fait (branche `social`) |
| 3. Social | Fil des gens que je suis, bravos, commentaires, notifications, modération, photos | Fait (branche `social`) |
| 4. Stats et compétition | Cote Elo, face-à-face, records, badges, classements, activité | Fait (branche `social`) |
| 5. Bandes et live | Bandes, partie en direct, défis du mois, saisons, cartes image, récap annuel | Fait, sauf co-saisie |
| 6. Finitions et croissance | Accueil, mesure d'usage, fiche App Store | Fait en partie (voir plus bas) |

### Profil social et fil : ce qui existe déjà, ce qui manque

- **Profil social : oui, déjà là.** Chaque compte a un profil public (`/u/<id>`), que les autres joueurs connectés peuvent ouvrir (lien partagé, QR code, plus tard depuis le fil). On y voit : nom, pseudo, ville, nombre d'amis, bouton Ajouter en ami (ou Accepter / Refuser), stats (parties, % victoires, séries, forme, coinches, capots, contrats réussis), partenaires préférés, et l'historique des parties visibles (celles en visibilité "Amis" seulement une fois amis).
- **Fil façon Strava : oui (phase 3).** Connecté, le Fil montre mes parties et celles de mes amis, avec bravos, commentaires, photo, lieu, et les parties en cours en direct.

---

## Constats qui guident le plan

1. **Sortir la v1.0 locale d'abord** (branche `master`, en cours de soumission). Le social arrive en mise à jour 1.x, avec migration sans perte des parties locales (faite, testée).
2. **Changer l'icône Pastis 51 avant la sortie publique du social** : marque déposée, risque de refus et risque juridique.
3. **Poule et œuf** : la croissance vient des **joueurs invités**. Chaque partie peut amener jusqu'à 3 nouveaux comptes via le lien "récupère ta partie". C'est plus important que les likes.
4. **Taguer doit prendre moins de 10 secondes** : habitués en un tap, "Moi" pré-rempli, QR code, tags facultatifs.
5. **Les classements attirent la triche** : une partie ne comptera pour la cote qu'une fois validée par au moins un adversaire inscrit.
6. **Liens universels iOS** : il faut un domaine à nous (ex. `coinche.app`). En attendant, les liens passent par GitHub Pages (`u.html`, `invite.html`) qui redirigent vers `coinche://`.

## Choix techniques

| Besoin | Choix | Pourquoi |
|---|---|---|
| Backend | Supabase (Postgres, Auth, RLS, Realtime, Storage, Edge Functions) | Données relationnelles, sécurité par RLS, live, offre gratuite |
| Données serveur | TanStack Query | Cache, pagination, invalidation |
| État local | Zustand + AsyncStorage, file de synchro persistée | Saisie 100 % hors ligne au bistrot |
| Auth | Pseudo + mot de passe (adresse interne `@coinche.invalid`) + Apple (natif). Google plus tard | Pas d'e-mail : ni serveur d'e-mails ni nom de domaine à payer. Le code par e-mail a été retiré (il exigeait un SMTP à soi) |
| QR | `react-native-qrcode-svg` + `expo-camera` | Ajouter le joueur d'en face en 2 secondes |
| Push (phase 3) | `expo-notifications` + Edge Functions | |
| Photos (phase 3) | `expo-image-picker` + Supabase Storage | Avatars, photo de la tablée |
| Build | EAS (`eas.json`) ou `npx expo run:ios` en local | Modules natifs : dev build obligatoire |
| Tests | `jest-expo` (logique pure), scénario SQL sur PGlite | |

## Modèle de données

En place (`supabase/migrations/20260927000000_social_core.sql`) :

- `profiles` : pseudo unique, nom, ville, bio, avatar, `onboarded`
- `games` : une partie, un seul auteur (`owner_id`), mènes en JSON, score dénormalisé, visibilité
- `game_players` : places 0-3, compte ou invité, statut `pending` / `accepted` / `declined` calculé par trigger
- `guest_players` : invités, l'id sert de lien de réclamation
- `friendships` : amis façon Facebook (demande `pending`, puis `accepted` ; une ligne par paire). Remplace les abonnements asymétriques façon Strava (`follows`), jugés trop compliqués : on veut juste "on est amis, on voit nos parties".
- Fonctions : `add_friend` (demande, ou acceptation si l'autre avait demandé), `are_friends`, `friends_of`
- Fonctions : `respond_to_game`, `guest_invite`, `claim_guest`, `search_profiles`, `delete_my_account`

À ajouter : `kudos` (bravos), `comments`, `notifications`, `push_tokens`, `blocks`, `reports` (phase 3) ; `elo_history`, `badges`, `profile_badges`, vues `leaderboard`, `head_to_head` (phase 4) ; `groups`, `group_members` (phase 5).

---

## Phases

### Phase 0 : Fondations (faite)
- Branche `social`, `eas.json`, `expo-dev-client`
- Supabase : schéma, RLS, client optionnel (sans `.env.local`, l'app reste locale)
- Ids UUID (`expo-crypto`), migration du store v6 vers v7 testée
- TanStack Query, `jest-expo`
- Reste : remplacer l'icône, créer le projet Supabase

### Phase 1 : Comptes et profils (faite)
- Connexion pseudo + mot de passe ou Apple, accueil (nom, pseudo, ville) pour les comptes Apple
- Mode sans compte conservé ; à la connexion, les parties locales sont rattachées au compte
- Profil, QR code, réglages, déconnexion, suppression du compte
- Reste : avatars photo, connexion Google

### Phase 2 : Joueurs dans la partie (faite)
- "Nouvelle partie" : 2 places par équipe (moi, habitué, pseudo, QR, invité), noms d'équipe générés
- La partie arrive directement sur le profil des joueurs tagués, amis ou pas (6 octobre 2026 : plus de confirmation, trop de parties restaient en attente). "Pas moi" pour s'en retirer
- Invités : lien de réclamation depuis l'écran de fin ou l'écran Joueurs
- Stats par joueur et par partenaire, preneur facultatif, visibilité par partie
- Synchro hors ligne (file d'attente, relance réseau et premier plan)

### Phase 3 : Social (faite)
- **Fil des amis** : leurs parties visibles, paginées, avec joueurs, score, tags (capot, coinche réussie, remontada), lieu et photo
- **Bravos** (le kudos de Strava) et **commentaires**
- Détail social d'une partie : joueurs, courbe, mènes, bravos, commentaires
- Photo de la tablée et note après la partie ; lieu facultatif ("Au Café des Amis, Lyon")
- **Notifications** : écran + push (tag, bravo, commentaire, demande d'ami, demande acceptée, partie confirmée)
- Recherche de joueurs dédiée, "joueurs que tu connais peut-être"
- **Modération** (exigence Apple 1.2) : signaler, bloquer, filtre de grossièretés, contact
- Onglets : Fil | Classements | Jouer | Bandes | Profil

### Phase 4 : Stats et compétition (faite)
- Profil enrichi : activité par semaine, heatmap annuelle, % de réussite par hauteur de contrat, atout préféré
- Face-à-face contre un joueur ou une paire
- **Cote Elo** par joueur sur les parties validées, historique en graphique
- **Records** : plus grosse remontée, partie la plus courte, plus longue série, surcoinche réussie
- **Badges** : première partie, 10 / 100 / 1000 parties, premier capot, générale, 5 victoires d'affilée, "Pilier de bistrot"
- **Classements** : amis, bande, ville ; semaine, mois, saison, toujours

### Phase 5 : Bandes, live, viralité (faite, sauf co-saisie)
- **Bandes** (clubs) : créer, inviter par lien ou QR, classement et fil de la bande
- **Partie en direct** (Supabase Realtime) et co-saisie par un autre joueur de la table
- Défis mensuels, saisons
- Carte de partage image pour les stories, récap annuel "Ma saison de coinche"

### Phase 6 : Finitions et croissance (en partie)
Fait : accueil au premier lancement, mesure d'usage facultative (PostHog UE), fiche App Store (`store/app-store.md`), politique de confidentialité à jour.
Reporté, avec la raison :
- Thème sombre : toutes les couleurs sont figées dans les styles (~50 fichiers). Refonte à faire d'un bloc, gain faible pour l'instant.
- Variante "points faits + annonce" : les règles varient selon les tables (multiplicateur de la coinche, 160 ou 162, belote). À trancher avant de coder.
- Co-saisie à plusieurs téléphones : il faudrait fusionner des modifications concurrentes ; aujourd'hui un seul auteur par partie, c'est ce qui rend la synchro hors ligne fiable.
- `eas update` (mises à jour OTA) et connexion Google : demandent la config EAS / Google Cloud.

Idées d'origine de la phase 6 :
- Thème sombre, variante "points faits + annonce", belote-rebelote en option
- Onboarding animé, états vides, retours haptiques
- Fiche App Store, étiquettes de confidentialité, classification d'âge (contenu généré par les utilisateurs)
- Mises à jour OTA (`eas update`), analytics d'entonnoir (inscription, première partie taguée, invité converti)
- Plus tard : "Coinche+" (stats avancées, thèmes), seulement avec de la traction

---

## Vérification

- À chaque phase : `npx tsc --noEmit`, `npx expo lint`, `npm test`
- Schéma : scénario SQL de 107 vérifications sur PGlite (RLS, statuts, invités, fil, bravos, commentaires, notifications, blocage, stockage, Elo, classements, bandes) ; à rejouer sur un Supabase de test à chaque migration
- Parcours de bout en bout sur 2 simulateurs avec 2 comptes : A crée une partie et tague B, un invité et C par QR ; B voit la partie sur son profil (et peut dire "Pas moi") ; l'invité réclame sa place ; en mode avion, 5 mènes saisies puis synchronisées au retour du réseau
- Avant soumission : captures régénérées (`store/screenshots/seed.mjs`), captures iPad
