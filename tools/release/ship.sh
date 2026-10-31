#!/bin/sh
# Puts the updates branch live, the same way every time. Run it only when the user has asked to push.
#   sh tools/release/ship.sh
# 1. Checks: on updates, nothing uncommitted, updates pushed, and GitHub's Checks passed on it.
# 2. Fast-forwards main to updates and pushes main (the live site).
# 3. Waits for GitHub's Checks and Pages runs on main and prints the Checks notices.
# 4. Starts the weekly health check now, which checks that the live site serves the new build and reads the user's
#    manifest photos with the live app, and waits for it.
# 5. Copies the site to the download folder and rebuilds lpn-site.zip (when /mnt/user-data/outputs exists).
# Stops at the first problem. The docs branch is separate: run docs-updater afterwards.
set -e
cd "$(dirname "$0")/../.."
REPO=Jamie9904/Jamie9904.github.io
say() { printf '%s\n' "$*"; }
die() { say "STOPPED: $*"; git checkout -q updates 2>/dev/null || true; exit 1; }

# Waits for the named workflow run on a commit and prints "id conclusion".
wait_run() { # name sha branch
  i=0
  while [ $i -lt 60 ]; do
    r=$(gh run list -R $REPO --branch "$3" --limit 10 --json databaseId,headSha,name,status,conclusion \
      -q ".[]|select(.name==\"$1\" and (.headSha|startswith(\"$2\")))|\"\(.databaseId) \(.status) \(.conclusion)\"" | head -1)
    case "$r" in *" completed "*) say "$r" | awk '{print $1, $3}'; return 0;; esac
    i=$((i+1)); sleep 15
  done
  say "none timeout"
}
notices() { # run id
  j=$(gh api repos/$REPO/actions/runs/$1/jobs -q '.jobs[0].id')
  gh api repos/$REPO/check-runs/$j/annotations -q '.[]|select(.title!="")|"  \(.title): \(.message[0:300])"'
}

git fetch -q origin
[ "$(git rev-parse --abbrev-ref HEAD)" = updates ] || die "not on the updates branch"
[ -z "$(git status --porcelain)" ] || die "uncommitted changes"
[ "$(git rev-parse updates)" = "$(git rev-parse origin/updates)" ] || die "updates isn't pushed to GitHub yet"
sha=$(git rev-parse --short=7 updates)
build=$(grep -o 'lpn-log-v[0-9]*' sw.js | head -1)
say "Shipping $sha ($build)"
set -- $(wait_run Checks $sha updates)
[ "$2" = success ] || die "GitHub's Checks on updates $sha: $2"

git checkout -q main
git pull -q --ff-only origin main
git merge -q --ff-only updates || die "main can't fast-forward to updates"
git push -q origin main
git checkout -q updates
say "main is now $sha"

set -- $(wait_run Checks $sha main); [ "$2" = success ] || die "Checks on main: $2"
say "Checks passed:"; notices $1
set -- $(wait_run "pages build and deployment" $sha main); [ "$2" = success ] || die "Pages publish: $2"
say "Pages published"

since=$(date -u +%Y-%m-%dT%H:%M:%SZ)
gh workflow run health.yml -R $REPO --ref main >/dev/null
sleep 10
hid=""; i=0
while [ -z "$hid" ] && [ $i -lt 12 ]; do
  hid=$(gh run list -R $REPO --workflow health.yml --limit 5 --json databaseId,createdAt -q ".[]|select(.createdAt>=\"$since\")|.databaseId" | head -1)
  i=$((i+1)); [ -n "$hid" ] || sleep 5
done
[ -n "$hid" ] || die "the health check didn't start"
gh run watch -R $REPO "$hid" --exit-status >/dev/null 2>&1 || { say "Health check failed:"; notices "$hid"; die "live site check failed (run $hid)"; }
say "Live site checked:"; notices "$hid"

OUT=/mnt/user-data/outputs
if [ -d "$OUT" ]; then
  S=$OUT/lpn-site; mkdir -p "$S"
  list=$(mktemp); git ls-files | grep -Ev '^(\.claude/|docs/|tools/|\.mcp\.json$)' > "$list"
  while read -r f; do mkdir -p "$S/$(dirname "$f")"; cp -f "$f" "$S/$f"; done < "$list"
  # Files the app no longer has are removed from the copy too.
  (cd "$S" && find . -type f | sed 's|^\./||') | while read -r f; do grep -qxF "$f" "$list" || { rm -f "$S/$f"; say "removed $f from the download copy"; }; done
  rm -f "$list"
  (cd "$OUT" && zip -qrFS lpn-site.zip lpn-site)
  say "Download copy and lpn-site.zip updated"
fi
say "Done: $build is live. Next: docs-updater."
