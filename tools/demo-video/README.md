# Guide demo video

Makes `media/demo.mp4` (and `media/demo-poster.jpg`), the narrated video at the top of the Guide.
It records the real app from this repo at phone size in a vertical 1080×1920 frame, with made-up data,
so it shows exactly what the app looks like now. Nothing here is published by the app or included in the site zip.

    sh tools/demo-video/make.sh

| File | What it does |
|---|---|
| `lines.json` | The spoken line for each scene. Edit the words here. |
| `voice.py` | Speaks the lines with the offline Kokoro "Heart" voice (Apache 2.0). First run downloads ~350 MB from GitHub into `~/.cache/lpn-voice`. |
| `stage.html` | The 1080×1920 stage: headline, phone frame with the live app, subtitles, cards. |
| `record.mjs` | Drives the app scene by scene (`SCENES`: what is tapped and typed, how long each scene holds) and records it. |
| `render.py` | Joins the frames with the narration; adds music and sound effects when `SFX_DIR` is set. |
| `make.sh` | Runs all of the above, makes the 720×1280 web copy and the poster, and saves check frames to look at. |

Re-record when the screens it shows change (the session-start status line says when `index.html`, `styles.css`
or the scripts changed after the video). Check `out/check-*.jpg`, play the result once, then commit `media/`.
The receiver shown is "Jamie"; LPNs are made up.
