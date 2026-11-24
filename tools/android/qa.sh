#!/bin/sh
# Hand-run QA pass of the Android app on GitHub's virtual phone (android.yml, "Bug hunt" ticked). Runs after
# shots.sh on the same phone with the test copy already installed, and pushes the app through things the screenshot
# run doesn't: a first install, Back everywhere, the app being closed by Android and reopened, low memory, larger
# text, light and dark, sideways, files and text shared in, the shortcuts, opening and closing the cameras many
# times, fast typing, and a few minutes of random taps (monkey). It never fails the run: qa/report.txt lists what
# went wrong (crashes, freezes, page errors) and qa/*.png show each step. Only made-up numbers and the old-build
# test files (tests/fixtures/old) go into the phone.
set -u
PKG=io.github.jamie9904.lpnlog
OUT=qa
mkdir -p "$OUT"
R="$OUT/report.txt"; : > "$R"
step() { echo "== $*" | tee -a "$R"; adb shell log -t LPNQA "STEP $*" >/dev/null 2>&1; }
note() { echo "   $*" | tee -a "$R"; }
act() { adb shell am start -W -n "$PKG/.MainActivity" "$@" 2>/dev/null | grep -E "TotalTime|Error" | tr -d '\r'; }
shot() { sleep "${2:-2}"; adb exec-out screencap -p > "$OUT/$1.png"; }
back() { adb shell input keyevent 4; sleep "${1:-1.2}"; }
alive() { adb shell pidof "$PKG" >/dev/null 2>&1 && echo yes || echo no; }
top() { adb shell dumpsys activity activities 2>/dev/null | grep -m1 -E "topResumedActivity|mResumedActivity" | sed 's/.*{[^ ]* [^ ]* //; s/ .*//' | tr -d '\r'; }
# Tap the first on-screen element whose text or description contains $1 (the page's buttons show up in Android's
# accessibility tree). Prints "tapped" or "not found".
tap() {
  adb shell uiautomator dump /sdcard/qa-ui.xml >/dev/null 2>&1; adb pull /sdcard/qa-ui.xml "$OUT/ui.xml" >/dev/null 2>&1
  xy=$(python3 - "$1" "$OUT/ui.xml" <<'E'
import sys, re, xml.etree.ElementTree as T
want = sys.argv[1].lower()
try: root = T.parse(sys.argv[2]).getroot()
except Exception: print(""); sys.exit()
for n in root.iter("node"):
    t = (n.get("text") or "") + " " + (n.get("content-desc") or "")
    if want in t.lower():
        m = re.findall(r"\d+", n.get("bounds") or "")
        if len(m) == 4:
            x1, y1, x2, y2 = map(int, m)
            if x2 > x1 and y2 > y1: print((x1 + x2) // 2, (y1 + y2) // 2); break
E
)
  if [ -n "$xy" ]; then adb shell input tap $xy; sleep "${2:-1.5}"; echo tapped; else echo "not found"; fi
}
adb logcat -c
adb shell pm grant "$PKG" android.permission.CAMERA 2>/dev/null

step "1. First install: storage cleared, cold start"
adb shell pm clear "$PKG" >/dev/null; adb shell pm grant "$PKG" android.permission.CAMERA 2>/dev/null
note "start time: $(act)"; shot 01-first-open 6
note "Skip: $(tap Skip)"; shot 02-after-intro 2

step "2. Back on the start menu asks before leaving; the app stays open after one Back"
back; shot 03-back-once 1; note "open after one Back: $(alive), on top: $(top)"
act >/dev/null; sleep 2

step "3. Log pallets: fast typing, a repeat, nonsense, a very long line"
act -a "$PKG.CONTINUE" >/dev/null; sleep 2
i=10; while [ $i -lt 40 ]; do adb shell input text "VLT0040412$i"; adb shell input keyevent 66; i=$((i+1)); done
adb shell input text "VLT004041210"; adb shell input keyevent 66; sleep 1; shot 04-repeat 1
adb shell input text "hello"; adb shell input keyevent 66; sleep 1; shot 05-nonsense 1
adb shell input text "VLT00404121012345678901234567890123456789"; adb shell input keyevent 66; sleep 1; shot 06-long 1
note "open: $(alive)"

step "4. Android closes the app in the background, then it's opened again (the log must still be there)"
adb shell input keyevent 3; sleep 2; adb shell am kill "$PKG"; sleep 1; note "after kill: running=$(alive)"
note "reopen: $(act)"; shot 07-after-kill 5
adb shell am force-stop "$PKG"; note "after force-stop, reopen: $(act)"; shot 08-after-force-stop 5

step "5. Low memory while open"
adb shell am send-trim-memory "$PKG" RUNNING_CRITICAL 2>&1 | head -1; sleep 2; note "open: $(alive)"; shot 09-trim 1

step "6. Larger text (1.3) and the smallest (0.85)"
adb shell settings put system font_scale 1.3; sleep 2; act -a "$PKG.CONTINUE" >/dev/null; shot 10-font-130-log 3
act -a "$PKG.MANIFEST" >/dev/null; shot 11-font-130-manifest 3
back; shot 12-font-130-menu 2
adb shell settings put system font_scale 0.85; sleep 2; act >/dev/null; shot 13-font-085 3
adb shell settings put system font_scale 1.0; sleep 1

step "7. Light and dark"
adb shell cmd uimode night yes >/dev/null; sleep 3; act >/dev/null; shot 14-dark 3
adb shell cmd uimode night no >/dev/null; sleep 3; act >/dev/null; shot 15-light 3

step "8. Turned sideways (phones stay upright)"
adb shell settings put system accelerometer_rotation 0; adb shell settings put system user_rotation 1; sleep 3; shot 16-sideways 2
note "app's orientation: $(adb shell dumpsys window 2>/dev/null | grep -m1 -oE 'mCurrentRotation=[^ ]*|mRotation=[^ ]*' | tr -d '\r')"
adb shell settings put system user_rotation 0; sleep 2

step "9. Text shared into the app (LPNs as manifest numbers or pallets)"
adb shell am start -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT "'VLT004040265 RUN001832813 QUB001899182'" -n "$PKG/.MainActivity" >/dev/null 2>&1
shot 17-shared-text 4; note "on top: $(top)"
back; back

step "10. A saved Excel log and a PDF log opened in the app (old-build test files)"
for f in log.xlsx log.pdf; do
  adb push "tests/fixtures/old/build-64/$f" "/sdcard/Download/qa-$f" >/dev/null 2>&1
  adb shell am broadcast -a android.intent.action.MEDIA_SCANNER_SCAN_FILE -d "file:///sdcard/Download/qa-$f" >/dev/null 2>&1; sleep 2
  id=$(adb shell content query --uri content://media/external/file --projection _id --where "\"_display_name='qa-$f'\"" 2>/dev/null | grep -oE '_id=[0-9]+' | head -1 | cut -d= -f2)
  t=application/pdf; [ "$f" = log.xlsx ] && t=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
  if [ -n "$id" ]; then adb shell am start -a android.intent.action.VIEW -t "$t" -d "content://media/external/file/$id" --grant-read-uri-permission -n "$PKG/.MainActivity" >/dev/null 2>&1; note "$f opened as content://media/external/file/$id"
  else note "$f: couldn't get a content address on this phone"; fi
  shot "18-open-$f" 6; back; back
done

step "11. The home-screen shortcuts"
act -a "$PKG.SCAN" >/dev/null; shot 19-shortcut-scan 5; note "on top: $(top)"; back 2
act -a "$PKG.MANIFEST" >/dev/null; shot 20-shortcut-manifest 3; back
act -a "$PKG.CONTINUE" >/dev/null; shot 21-shortcut-continue 3

step "12. The camera scanner opened and closed 8 times"
i=0; while [ $i -lt 8 ]; do act -a "$PKG.SCAN" >/dev/null; sleep 3; back 2; i=$((i+1)); done
note "open: $(alive), on top: $(top)"; shot 22-after-scanner-loop 1

step "13. Live read manifest opened and closed 5 times"
act -a "$PKG.MANIFEST" >/dev/null; sleep 2
i=0; while [ $i -lt 5 ]; do r=$(tap "Live read manifest" 4); [ "$r" = tapped ] || { note "Live read manifest button: $r"; break; }; [ $i -eq 0 ] && shot 23-live-read 1; back 2; i=$((i+1)); done
note "open: $(alive), on top: $(top)"; shot 24-after-live-read 1

step "14. Volume-down in the log starts Live scan"
act -a "$PKG.CONTINUE" >/dev/null; sleep 2; adb shell input keyevent 25; sleep 4; note "on top: $(top)"; shot 25-volume-down 1; back 2

step "15. Export menu (opened, not saved)"
act -a "$PKG.CONTINUE" >/dev/null; sleep 2; note "Export: $(tap Export 2)"; shot 26-export-menu 1; back

step "16. Back from every page goes back, not out"
act -a "$PKG.MANIFEST" >/dev/null; sleep 2; back; note "Manifest check, Back: on top $(top)"; shot 27-back-manifest 1
act -a "$PKG.CONTINUE" >/dev/null; sleep 2; back; note "Log pallets, Back: on top $(top)"; shot 28-back-log 1

step "17. Five minutes of random taps (monkey, system keys left out)"
adb shell monkey -p "$PKG" --pct-syskeys 0 --pct-appswitch 2 --throttle 150 -s 4242 --ignore-security-exceptions 1800 2>&1 | grep -E "CRASH|ANR|Monkey finished|aborted" | head -5 | while read -r l; do note "monkey: $l"; done
note "open after monkey: $(alive)"; act >/dev/null; shot 29-after-monkey 3

step "Results"
adb logcat -d -b crash > "$OUT/crashes.txt" 2>/dev/null
adb logcat -d > "$OUT/logcat.txt" 2>/dev/null
c=$(grep -c "FATAL EXCEPTION" "$OUT/crashes.txt"); a=$(grep -c "ANR in $PKG" "$OUT/logcat.txt")
j=$(grep -E " E Capacitor/Console| E chromium.*Uncaught|Uncaught " "$OUT/logcat.txt" | grep -c .)
note "app crashes: $c"; note "freezes (ANR): $a"; note "page errors: $j"
grep -A12 "FATAL EXCEPTION" "$OUT/crashes.txt" | head -60 >> "$R"
grep "ANR in $PKG" -A6 "$OUT/logcat.txt" | head -30 >> "$R"
grep -E " E Capacitor/Console| E chromium.*Uncaught|Uncaught " "$OUT/logcat.txt" | sed 's/^.\{19\}//' | sort | uniq -c | sort -rn | head -30 >> "$R"
grep -E "LPNQA|Capacitor/Console" "$OUT/logcat.txt" | grep -E "LPNQA| [EW] Capacitor" > "$OUT/page-messages.txt"
adb shell dumpsys meminfo "$PKG" 2>/dev/null | grep -E "TOTAL PSS|TOTAL:" | head -2 | while read -r l; do note "memory: $l"; done
echo "qa: done"
