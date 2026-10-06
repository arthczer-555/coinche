#!/usr/bin/env bash
# Coinche : initialise tout le backend Supabase en une commande.
#
#   npm run supabase:setup
#
# 1. Crée le projet "coinche" (région Paris) s'il n'existe pas, et garde le mot de passe de la base.
# 2. Applique le schéma (supabase/migrations) : tables, RLS, stockage, Elo, bandes, direct, push.
# 3. Configure l'auth (supabase/config.toml) : comptes pseudo + mot de passe sans e-mail, connexion Apple.
# 4. Déploie la fonction Edge `push` et la branche sur les notifications (secret partagé dans Vault).
# 5. Écrit .env.local (URL et clé publique) : l'app passe en mode connecté au prochain lancement.
# 6. Vérifie le résultat.
#
# Relançable sans risque : chaque étape saute ou refait à l'identique ce qui est déjà fait.
# Pré-requis : CLI Supabase connecté (supabase login), jq, openssl.
# Variables facultatives : SUPABASE_PROJECT_NAME (coinche), SUPABASE_REGION (eu-west-3 = Paris),
# SUPABASE_ORG_ID (si plusieurs organisations), SUPABASE_PROJECT_REF (projet déjà créé ailleurs).

set -euo pipefail
cd "$(dirname "$0")/.."

NAME="${SUPABASE_PROJECT_NAME:-coinche}"
REGION="${SUPABASE_REGION:-eu-west-3}"
ENV_FILE=".env.local"
REF_FILE="supabase/.temp/project-ref"

step() { printf '\n\033[1;32m> %s\033[0m\n' "$*"; }
info() { printf '  %s\n' "$*"; }
warn() { printf '\033[1;33m  ! %s\033[0m\n' "$*"; }
die() {
  printf '\n\033[1;31mx %s\033[0m\n' "$*" >&2
  exit 1
}

# .env.local : jamais commité. Seules les variables EXPO_PUBLIC_ partent dans l'app, les autres restent ici.
env_get() {
  if [ -f "$ENV_FILE" ]; then grep -E "^$1=" "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true; fi
}
env_set() {
  if [ ! -f "$ENV_FILE" ]; then
    printf '# Généré par supabase/setup.sh. Ne jamais commiter.\n# Seules les variables EXPO_PUBLIC_ partent dans l app ; les autres sont des secrets locaux.\n' >"$ENV_FILE"
  fi
  if grep -qE "^$1=" "$ENV_FILE"; then
    awk -v k="$1" -v v="$2" 'index($0, k "=") == 1 { print k "=" v; next } { print }' "$ENV_FILE" >"$ENV_FILE.tmp"
    mv "$ENV_FILE.tmp" "$ENV_FILE"
  else
    printf '%s=%s\n' "$1" "$2" >>"$ENV_FILE"
  fi
}

# Le CLI renvoie un tableau, ou un objet qui l'enveloppe selon les versions.
list_of() { jq "if type == \"array\" then . else (.$1 // []) end"; }
project_field() {
  supabase projects list -o json | list_of projects |
    jq -r --arg ref "$1" --arg field "$2" 'map(select((.ref // .id) == $ref)) | .[0][$field] // empty'
}

retry() {
  local tries=$1
  shift
  for ((i = 1; i <= tries; i++)); do
    "$@" && return 0
    if [ "$i" -lt "$tries" ]; then
      warn "Échec, nouvel essai dans 15 s ($i/$tries)"
      sleep 15
    fi
  done
  return 1
}

# ---------------------------------------------------------------------------
step "Vérifications"
command -v supabase >/dev/null || die "CLI Supabase absent : brew install supabase/tap/supabase"
command -v jq >/dev/null || die "jq absent : brew install jq"
command -v openssl >/dev/null || die "openssl absent"
PROJECTS=$(supabase projects list -o json 2>/dev/null | list_of projects) || die "CLI non connecté : lance supabase login"
info "CLI connecté"

# ---------------------------------------------------------------------------
step "Projet"
REF="${SUPABASE_PROJECT_REF:-}"
if [ -z "$REF" ] && [ -f "$REF_FILE" ]; then REF=$(cat "$REF_FILE"); fi
if [ -z "$REF" ]; then
  REF=$(jq -r --arg n "$NAME" 'map(select(.name == $n)) | .[0] | (.ref // .id) // empty' <<<"$PROJECTS")
fi
DB_PASSWORD="${SUPABASE_DB_PASSWORD:-$(env_get SUPABASE_DB_PASSWORD)}"

if [ -z "$REF" ]; then
  ORG="${SUPABASE_ORG_ID:-}"
  if [ -z "$ORG" ]; then
    ORGS=$(supabase orgs list -o json | list_of organizations)
    [ "$(jq length <<<"$ORGS")" = 1 ] || die "Plusieurs organisations : relance avec SUPABASE_ORG_ID=<id> (voir supabase orgs list)"
    ORG=$(jq -r '.[0].id' <<<"$ORGS")
  fi
  # Mot de passe gardé AVANT la création : il ne doit jamais se perdre.
  DB_PASSWORD=$(openssl rand -hex 20)
  env_set SUPABASE_DB_PASSWORD "$DB_PASSWORD"
  info "Création de « $NAME » (région $REGION), mot de passe de la base gardé dans $ENV_FILE"
  supabase projects create "$NAME" --org-id "$ORG" --region "$REGION" --db-password "$DB_PASSWORD" >/dev/null
  REF=$(supabase projects list -o json | list_of projects | jq -r --arg n "$NAME" 'map(select(.name == $n)) | .[0] | (.ref // .id) // empty')
  [ -n "$REF" ] || die "Projet créé mais introuvable : relance le script"
else
  info "Projet existant : $REF"
fi

if [ -z "$DB_PASSWORD" ]; then
  printf '  Mot de passe de la base (Dashboard > Project Settings > Database) : '
  read -rs DB_PASSWORD
  printf '\n'
  [ -n "$DB_PASSWORD" ] || die "Mot de passe requis"
  env_set SUPABASE_DB_PASSWORD "$DB_PASSWORD"
fi

STATUS=$(project_field "$REF" status)
[ -n "$STATUS" ] || die "Projet $REF introuvable sur ce compte (s'il a été supprimé : rm $REF_FILE, puis relance)"
[ "$STATUS" = "ACTIVE_HEALTHY" ] || info "Démarrage du projet (1 à 3 minutes à la création)..."
for _ in $(seq 1 60); do
  [ "$STATUS" = "ACTIVE_HEALTHY" ] && break
  sleep 5
  STATUS=$(project_field "$REF" status)
done
[ "$STATUS" = "ACTIVE_HEALTHY" ] || die "Projet pas prêt (statut : ${STATUS:-inconnu}). Relance le script dans une minute."
info "Projet prêt : https://supabase.com/dashboard/project/$REF"

retry 5 supabase link --project-ref "$REF" --password "$DB_PASSWORD" >/dev/null || die "Liaison au projet impossible"

# ---------------------------------------------------------------------------
step "Schéma de la base"
retry 3 supabase db push --linked --include-all --password "$DB_PASSWORD" --yes || die "Migrations non appliquées"

# ---------------------------------------------------------------------------
step "Auth : comptes pseudo + mot de passe, connexion Apple"
# Le code de sortie ne dit rien d'utile : le CLI échoue ensuite en lisant la config Storage (bug connu,
# "databasePoolMode"), sans conséquence ici (les limites de taille sont portées par les buckets).
# On juge donc sur ce qu'il affiche pour l'Auth. Pas de modèle d'e-mail dans config.toml : en offre
# gratuite sans SMTP à soi, Supabase refuserait toute la config Auth en bloc.
AUTH_OUT=$(supabase config push --project-ref "$REF" --yes 2>&1 || true)
if grep -q "ConfigPushAuth" <<<"$AUTH_OUT" || ! grep -qE "Auth config is up to date|Updating Auth service" <<<"$AUTH_OUT"; then
  printf '%s\n' "$AUTH_OUT" | tail -n 3
  warn "Config non envoyée : Dashboard > Auth > Providers > Apple (Client IDs = com.czernichow.coinche),"
  warn "  Email > Confirm email désactivé, Password > longueur minimale 8"
else
  info "Config envoyée (mot de passe de 8 caractères min., pas d'e-mail de confirmation, Apple)"
fi

# ---------------------------------------------------------------------------
step "Notifications push"
PUSH_SECRET=$(env_get PUSH_WEBHOOK_SECRET)
if [ -z "$PUSH_SECRET" ]; then
  PUSH_SECRET=$(openssl rand -hex 32)
  env_set PUSH_WEBHOOK_SECRET "$PUSH_SECRET"
fi
retry 2 supabase functions deploy push --project-ref "$REF" --no-verify-jwt --use-api || die "Fonction push non déployée"
supabase secrets set --project-ref "$REF" "PUSH_WEBHOOK_SECRET=$PUSH_SECRET" >/dev/null

# URL de la fonction et secret dans Vault : lus par le déclencheur (migration push_trigger).
SQL_FILE=$(mktemp)
trap 'rm -f "$SQL_FILE"' EXIT
chmod 600 "$SQL_FILE"
cat >"$SQL_FILE" <<SQL
do \$\$
declare
  item record;
  sid uuid;
begin
  for item in select * from (values
    ('coinche_push_url', 'https://$REF.supabase.co/functions/v1/push'),
    ('coinche_push_secret', '$PUSH_SECRET')
  ) as t(name, value) loop
    select id into sid from vault.secrets where name = item.name;
    if sid is null then
      perform vault.create_secret(item.value, item.name);
    else
      perform vault.update_secret(sid, item.value);
    end if;
  end loop;
end
\$\$;
SQL
supabase db query --linked -f "$SQL_FILE" >/dev/null || die "Secrets Vault non posés"
info "Fonction déployée et branchée sur les notifications"

# ---------------------------------------------------------------------------
step "Clés de l'app"
KEYS=$(supabase projects api-keys --project-ref "$REF" -o json | list_of api_keys)
KEY=$(jq -r '(map(select(.type == "publishable")) + map(select(.name == "anon"))) | .[0].api_key // empty' <<<"$KEYS")
[ -n "$KEY" ] || die "Clé publique introuvable"
env_set EXPO_PUBLIC_SUPABASE_URL "https://$REF.supabase.co"
env_set EXPO_PUBLIC_SUPABASE_KEY "$KEY"
info "$ENV_FILE à jour"

# ---------------------------------------------------------------------------
step "Vérification"
CHECK=$(supabase db query --linked -o json "
  select
    (select count(*) from pg_tables where schemaname = 'public') as tables,
    has_table_privilege('authenticated', 'public.games', 'select') as api,
    (select count(*) from storage.buckets where id in ('avatars', 'game-photos')) as buckets,
    exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'games') as realtime,
    (select count(*) from vault.secrets where name like 'coinche_push_%') as push
")
# Première ligne du résultat, quelle que soit l'enveloppe du JSON renvoyé par le CLI.
ROW=$(jq '[.. | objects | select(has("tables"))][0]' <<<"$CHECK")
ok() { if [ "$(jq -r ".$1" <<<"$ROW")" = "$2" ]; then info "ok  $3"; else warn "$3 : attendu $2, obtenu $(jq -c ".$1" <<<"$ROW")"; fi; }
info "$(jq -r '.tables' <<<"$ROW") tables dans public"
ok api true "accès de l'app aux tables"
ok buckets 2 "stockage (avatars, photos des parties)"
ok realtime true "parties en direct (Realtime)"
ok push 2 "secrets du push"

cat <<EOF

$(printf '\033[1;32m')Backend prêt.$(printf '\033[0m') Projet : https://supabase.com/dashboard/project/$REF

Relance l'app pour lire $ENV_FILE : npm run web (navigateur), ou npx expo start (iPhone).
npm run dev reste en mode démo, sans serveur.

Reste à faire à la main :
  1. Apple Developer > Identifiers > com.czernichow.coinche : cocher "Sign in with Apple"
     (sinon, le bouton Apple échoue ; pseudo + mot de passe marchent sans).
  2. Push sur iPhone : npx eas-cli@latest init (projectId), puis npx eas-cli@latest credentials (clé APNs).
EOF
