#!/bin/sh
# Raises the cache name in sw.js (lpn-log-vN -> vN+1) so phones pick up changed app files.
# Only bumps when the number isn't already higher than the live site's (origin/main), so running it
# twice before a release is harmless. Run it on its own before committing app changes:
#   sh tools/release/bump.sh
set -e
cd "$(dirname "$0")/../.."
here=$(grep -o 'lpn-log-v[0-9]*' sw.js | head -1 | tr -dc 0-9)
live=$(git show origin/main:sw.js 2>/dev/null | grep -o 'lpn-log-v[0-9]*' | head -1 | tr -dc 0-9)
[ -n "$live" ] || live=0
if [ "$here" -gt "$live" ]; then echo "Cache is already v$here (live v$live): no bump needed."; exit 0; fi
new=$((live + 1))
sed -i "s/lpn-log-v$here\"/lpn-log-v$new\"/" sw.js
echo "Cache bumped: v$here -> v$new"
