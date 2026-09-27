#!/bin/zsh
# Build the Android APK from the current client.
#   ./tools/build-apk.sh
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export ANDROID_HOME=$HOME/Library/Android/sdk

echo "==> copying client into the Android shell"
rm -rf "$ROOT/android-app/www"
cp -R "$ROOT/client" "$ROOT/android-app/www"

echo "==> syncing Capacitor"
cd "$ROOT/android-app"
npx cap sync android >/dev/null

echo "==> gradle assembleDebug"
cd android
./gradlew assembleDebug --no-daemon -q

mkdir -p "$ROOT/dist"
cp app/build/outputs/apk/debug/app-debug.apk "$ROOT/dist/VrindavanDham-debug.apk"
echo "==> $ROOT/dist/VrindavanDham-debug.apk  ($(du -h "$ROOT/dist/VrindavanDham-debug.apk" | cut -f1))"
echo
echo "Install with:  adb install -r dist/VrindavanDham-debug.apk"
