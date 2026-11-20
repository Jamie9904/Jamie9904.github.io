#!/bin/sh
# Offline Android app, step 5: signs the APK. Run on GitHub by .github/workflows/android.yml:
#   sh tools/android/sign.sh <unsigned.apk> <signed.apk>
#
# Every version of the app must be signed with the same key, or Android won't install it over the last one.
# The key is kept in this repository as a draft release named "Android signing key" (drafts are only visible to
# people who can change the repository), locked with the ANDROID_KEY_PASSWORD secret. The first run makes it.
# Download it from that draft release and keep it, with the password, somewhere safe as a backup.
set -eu
IN=$1 OUT=$2
GH=${GITHUB_ACTIONS:-}
say() { if [ -n "$GH" ]; then echo "::$1 title=$2::$3"; else echo "$2: $3"; fi; }
if [ -z "${ANDROID_KEY_PASSWORD:-}" ]; then
  say warning "APK not signed" "Add a repository secret named ANDROID_KEY_PASSWORD (Settings > Secrets and variables > Actions) with a long password of your own, then run this again. The APK isn't installable until it is signed."
  exit 3
fi
if [ ${#ANDROID_KEY_PASSWORD} -lt 12 ]; then say error "APK not signed" "ANDROID_KEY_PASSWORD must be at least 12 characters."; exit 1; fi
REPO=$GITHUB_REPOSITORY
KEY=$(mktemp -d)/lpn-android-key.p12
trap 'rm -f "$KEY"' EXIT
# Find the key. If GitHub can't be asked, stop: making a second key would stop updates installing.
ids=$(gh api "repos/$REPO/releases?per_page=100" --paginate -q '.[] | select(.draft and .name == "Android signing key") | .id')
id=$(printf '%s\n' $ids | sort -n | head -n 1)
if [ -z "$id" ]; then
  keytool -genkeypair -keystore "$KEY" -storetype PKCS12 -alias lpn -keyalg RSA -keysize 4096 -validity 36500 \
    -dname "CN=LPN Pallet Log, O=Jamie9904" -storepass:env ANDROID_KEY_PASSWORD -keypass:env ANDROID_KEY_PASSWORD
  gh release create android-signing-key --repo "$REPO" --draft --title "Android signing key" \
    --notes "The key that signs the LPN Pallet Log Android app. Every version must be signed with it, or phones won't install the update. It is locked with the ANDROID_KEY_PASSWORD secret. Keep a copy of this file and the password somewhere safe, and don't publish this release or delete it." \
    "$KEY#lpn-android-key.p12"
  say notice "Signing key" "Made the app's signing key and kept it as the draft release \"Android signing key\". Download it and keep it with the password as a backup."
else
  aid=$(gh api "repos/$REPO/releases/$id/assets" -q '.[] | select(.name == "lpn-android-key.p12") | .id')
  [ -n "$aid" ] || { say error "Signing key" "The draft release \"Android signing key\" has no lpn-android-key.p12. Put the backup copy back on it."; exit 1; }
  gh api -H "Accept: application/octet-stream" "repos/$REPO/releases/assets/$aid" > "$KEY"
fi
keytool -list -keystore "$KEY" -storetype PKCS12 -storepass:env ANDROID_KEY_PASSWORD >/dev/null 2>&1 || {
  say error "Signing key" "ANDROID_KEY_PASSWORD doesn't open the saved signing key. Put back the password it was made with."; exit 1; }
BT="$ANDROID_HOME/build-tools/$(ls "$ANDROID_HOME/build-tools" | sort -V | tail -n 1)"
ALIGNED=$(mktemp -d)/aligned.apk
"$BT/zipalign" -p -f 4 "$IN" "$ALIGNED"
"$BT/apksigner" sign --ks "$KEY" --ks-type PKCS12 --ks-key-alias lpn --ks-pass env:ANDROID_KEY_PASSWORD --key-pass env:ANDROID_KEY_PASSWORD --out "$OUT" "$ALIGNED"
"$BT/apksigner" verify "$OUT"
cert=$("$BT/apksigner" verify --print-certs "$OUT" | sed -n 's/.*SHA-256 digest: //p' | head -n 1)
say notice "APK signed" "$(basename "$OUT") ($(($(stat -c %s "$OUT") / 1048576)) MB), certificate SHA-256 $cert"
