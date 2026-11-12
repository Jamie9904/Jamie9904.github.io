#!/bin/sh
# Re-records the build-history video shown in the Changelog (media/history.mp4) from the app's own git history.
# Each milestone build in capture.js is run with the same sample delivery; render.js draws the frames from stage.html
# and mixes the voice (the demo video's offline voice) with the demo's music and sound effects.
# Needs: node with Playwright, python3, ffmpeg, git. Not part of the site zip.
set -e
cd "$(dirname "$0")"
python3 ../demo-video/voice.py "$(pwd)"
NODE_PATH="${NODE_PATH:-$(npm root -g)}" node capture.js
NODE_PATH="${NODE_PATH:-$(npm root -g)}" node render.js
ffmpeg -y -loglevel error -i out/lpn-pallet-log-build-history.mp4 -vf scale=1280:720 -c:v libx264 -preset slow -crf 27 -profile:v high \
  -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart ../../media/history.mp4
ffmpeg -y -loglevel error -sseof -3 -i ../../media/history.mp4 -frames:v 1 -q:v 4 ../../media/history-poster.jpg
echo "Done: media/history.mp4 ($(du -k ../../media/history.mp4 | cut -f1) KB). Watch out/lpn-pallet-log-build-history.mp4 before committing."
