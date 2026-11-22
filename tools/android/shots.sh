#!/bin/sh
# Screenshots of the Android app on a virtual phone (GitHub's Android emulator), so its screens can be looked over
# before an APK goes to the owner: cut-off text, overlaps, bars covering content. Run by .github/workflows/android.yml
# inside the emulator step; the pictures are kept as the run's "android-screenshots" artifact.
# Two sizes: the emulator's own (Pixel 6, 411 dp wide) and a small phone (360 dp), each normal and with Bigger buttons.
set -u
APK=tools/android/android/app/build/outputs/apk/debug/app-debug.apk
PKG=io.github.jamie9904.lpnlog
OUT=shots
mkdir -p "$OUT"
adb install -r "$APK"
adb shell pm grant "$PKG" android.permission.CAMERA || true
act() { adb shell am start -W -n "$PKG/.MainActivity" "$@" >/dev/null 2>&1; }
shot() { sleep "${2:-3}"; adb exec-out screencap -p > "$OUT/$1.png"; echo "shot $1"; }
back() { adb shell input keyevent 4; sleep "${1:-1.5}"; }
set_of() {
  s=$1; n=$2
  adb shell am force-stop "$PKG"
  act; shot "$s-1-open" 12
  back 2.5                                   # closes a Carry on sheet if one opened (else just the "Back again" note)
  act -a "$PKG.CONTINUE"; sleep 2
  for l in "VLT00404${n}01" "RUN00183${n}02" "QUB00189${n}03"; do adb shell input text "$l"; adb shell input keyevent 66; sleep 1.2; done
  shot "$s-2-main" 2
  act -a "$PKG.SHOW" --es what settings; shot "$s-3-settings" 3
  back
  act -a "$PKG.SHOW" --es what carry; shot "$s-4-sheet" 2
  back
  act -a "$PKG.SCAN"; shot "$s-5-scanner" 7
  back 2.5
  act -a "$PKG.SHOW" --es what big-on; sleep 1
  shot "$s-6-main-big" 2
  act -a "$PKG.SCAN"; shot "$s-7-scanner-big" 7
  back 2.5
  act -a "$PKG.SHOW" --es what big-off; sleep 1
  act -a "$PKG.MANIFEST"; shot "$s-8-manifest" 3   # the Manifest check on its own page
  back; shot "$s-9-menu" 2                        # Back from a page goes to the start menu
}
# The phone's own text reader on the user's manifest photos (only the test copy has them): what it got right, missing
# and extra, from the app's log lines. Run once, before the screenshots.
ocr_test() {
  adb shell am force-stop "$PKG"; act; sleep 8
  f="/sdcard/Documents/LPN Pallet Log/ocrtest.txt"; adb shell rm -f "'$f'"
  act -a "$PKG.SHOW" --es what ocrtest
  i=0; while [ $i -lt 300 ]; do sleep 3; i=$((i+1)); adb shell cat "'$f'" 2>/dev/null | grep -q '"done"' && break; done
  adb shell cat "'$f'" > "$OUT/ocr-phone-reader.txt" 2>/dev/null
  adb logcat -d | grep -iE "chromium|console|capacitor|tesseract|worker" | grep -viE "Handling local request|callback:" | tail -300 > "$OUT/ocr-log.txt" 2>/dev/null
  echo "Phone text reader on the manifest photos:"; cat "$OUT/ocr-phone-reader.txt"
}
ocr_test
adb logcat -c
set_of normal 11
adb shell wm size 720x1440; adb shell wm density 320; sleep 3
set_of small 22
adb shell wm size reset; adb shell wm density reset
# The page's own messages while the screenshots were taken (Capacitor/Console), to see why a step didn't happen.
adb logcat -d -s Capacitor/Console:V Capacitor:V > "$OUT/page-log.txt" 2>/dev/null || true
ls -1 "$OUT" | wc -l | xargs echo "screenshots:"
