#!/bin/sh
# Confirms that manifest photos have been looked at and have no address, name or phone number left on them,
# so the git guard lets them be committed. Only run this after opening each photo and checking it.
#   sh tools/release/photo-ok.sh tools/ocr-check/photos/abc.jpg [more files]
# A photo changed after this needs confirming again (the guard checks its exact content).
set -e
cd "$(dirname "$0")/../.."
[ $# -gt 0 ] || { echo "Name the photo files you checked."; exit 1; }
for f in "$@"; do
  [ -f "$f" ] || { echo "No such file: $f"; exit 1; }
  git hash-object "$f" >> .git/lpn-photos-ok
  echo "Confirmed: $f"
done
