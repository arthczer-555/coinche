#!/bin/zsh
# Captures App Store (voir README > Captures App Store).
#
# Prérequis : build Release en mode démo, installé sur le simulateur (un même .app sert pour iPhone et iPad) :
#   EXPO_PUBLIC_DEMO=1 npx expo run:ios --configuration Release --device <udid> --no-bundler
#   xcrun simctl install <autre udid> ~/Library/Developer/Xcode/DerivedData/Coinche-*/Build/Products/Release-iphonesimulator/Coinche.app
#
# Usage : store/screenshots/capture.sh <udid> <dossier>   (ex. store/screenshots/iphone-6.9)
set -e
D=$1; OUT=$2
[[ -n $D && -n $OUT ]] || { echo "Usage : $0 <udid> <dossier>"; exit 1; }
mkdir -p $OUT
APP=com.czernichow.coinche
id() { printf "dddddddd-0000-4000-8000-%012d" $1; }
# Juste après le démarrage, SpringBoard refuse parfois le lancement : on réessaie.
launch() { for i in {1..10}; do xcrun simctl launch $D $APP >/dev/null 2>&1 && return; sleep 3; done; xcrun simctl launch $D $APP; }

# 1. Ouvrir les deep links sans la confirmation « Ouvrir dans Coinche ? » (le simulateur doit être éteint).
xcrun simctl shutdown $D 2>/dev/null || true
PREFS=~/Library/Developer/CoreSimulator/Devices/$D/data/Library/Preferences/com.apple.launchservices.schemeapproval.plist
/usr/libexec/PlistBuddy -c "Delete :com.apple.CoreSimulator.CoreSimulatorBridge-->coinche" $PREFS 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :com.apple.CoreSimulator.CoreSimulatorBridge-->coinche string $APP" $PREFS
xcrun simctl boot $D
xcrun simctl bootstatus $D >/dev/null

# 2. Premier lancement : la démo copie les parties d'Alex dans le stockage local.
launch
sleep 10
xcrun simctl terminate $D $APP

# 3. Partie en cours retouchée (aléatoire dans la démo) : Alex & Léa mènent 610 à 490, mènes variées.
STORE="$(xcrun simctl get_app_container $D $APP data)/Library/Application Support/$APP/RCTAsyncLocalStorage_V1"
python3 - "$STORE" <<'EOF'
import json, os, sys
manifest = json.load(open(os.path.join(sys.argv[1], 'manifest.json')))
# Valeur longue : rangée dans un fichier à part, nommé d'après le MD5 de la clé.
path = os.path.join(sys.argv[1], '24b7c8fc3af8e3986e12aa355626a825') if manifest.get('coinche-games') is None else None
data = json.load(open(path)) if path else json.loads(manifest['coinche-games'])
game = data['state']['games']['dddddddd-0000-4000-8000-000000001001']
player = lambda n: 'dddddddd-0000-4000-8000-%012d' % n
rounds = [  # preneur, contrat, atout, enchère, fait, joueur
    ('A', 150, 'diamonds', 'none', True, player(2)),
    ('B', 120, 'hearts', 'coinche', True, player(3)),
    ('A', 80, 'clubs', 'none', True, player(1)),
    ('B', 100, 'all-trump', 'none', False, player(4)),
    ('B', 'capot', 'spades', 'none', True, player(3)),
    ('A', 110, 'no-trump', 'coinche', True, player(1)),
]
for round, (bidder, bid, trump, coinche, made, taker) in zip(game['rounds'], rounds):
    round.update(bidder=bidder, bid=bid, trump=trump, coinche=coinche, made=made, takerId=taker)
if path:
    json.dump(data, open(path, 'w'), ensure_ascii=False, separators=(',', ':'))
else:
    manifest['coinche-games'] = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    json.dump(manifest, open(os.path.join(sys.argv[1], 'manifest.json'), 'w'), ensure_ascii=False)
EOF

# 4. Captures, barre d'état figée.
xcrun simctl status_bar $D override --time "21:41" --dataNetwork wifi --wifiMode active --wifiBars 3 \
  --cellularMode active --cellularBars 4 --batteryState discharging --batteryLevel 100
launch
sleep 8
shot() { xcrun simctl openurl $D "coinche:///$1"; sleep ${3:-5}; xcrun simctl io $D screenshot $OUT/$2.png >/dev/null 2>&1; }
shot feed 1-fil 7
shot "game/$(id 1001)" 2-partie
shot "game/$(id 1008)/result" 3-fin-de-partie   # partie classée gagnée : gains d'Elo
shot leaderboard 4-classements
shot "u/$(id 2)" 5-profil 6                     # profil de Léa (celui d'Alex, le compte démo, est peu flatteur)

# 5. RGB sans transparence (exigé par App Store Connect) ; sur iPad, poignée de redimensionnement effacée.
python3 - $OUT/*.png <<'EOF'
import sys
from PIL import Image
for f in sys.argv[1:]:
    im = Image.open(f).convert('RGB')
    w, h = im.size
    if w > h * 0.7:  # iPad (3:4) : la poignée d'iPadOS 26 tient dans les 64 px du coin, sur le fond
        im.paste(im.getpixel((w - 80, h - 80)), (w - 64, h - 64, w, h))
    im.save(f, optimize=True)
EOF
echo "Captures dans $OUT"
