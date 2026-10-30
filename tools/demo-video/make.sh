#!/bin/sh
# Re-records the Guide demo video from the current app and puts the web copy in media/. See README.md.
# Needs: node with Playwright (global is fine), python3, ffmpeg. Optional: SFX_DIR for music and sound effects.
set -e
cd "$(dirname "$0")"
python3 voice.py
NODE_PATH="${NODE_PATH:-$(npm root -g)}" node record.mjs
python3 render.py
ffmpeg -y -loglevel error -i out/demo-full.mp4 -vf scale=720:1280 -c:v libx264 -preset slow -crf 26 -profile:v high -pix_fmt yuv420p \
  -c:a aac -b:a 96k -movflags +faststart ../../media/demo.mp4
ffmpeg -y -loglevel error -ss 9.5 -i ../../media/demo.mp4 -frames:v 1 -q:v 4 ../../media/demo-poster.jpg
NODE_PATH="${NODE_PATH:-$(npm root -g)}" node screens.js --write
for t in 1.6 12 16.5 23.6 28.5 35; do ffmpeg -y -loglevel error -ss $t -i out/demo-full.mp4 -frames:v 1 -vf scale=270:480 out/check-$t.jpg; done
echo "Done: media/demo.mp4 ($(du -k ../../media/demo.mp4 | cut -f1) KB). Look at out/check-*.jpg before committing."
