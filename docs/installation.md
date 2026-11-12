# Installation

## Prerequisites

- Any static web host served over **HTTPS**. Camera scanning, installing as an app, the service worker and the share sheet all require a secure origin. GitHub Pages provides this.
- A modern browser. Chrome on Android and Safari on iPhone are the targets; live scanning uses `BarcodeDetector` where available and ZXing elsewhere. Reading PDFs needs roughly iOS/Safari 16.4+, Chrome 94+ or Firefox 93+ (pdf.js 6), and reading photos needs iOS 16+ on an iPhone (the security policy allows the photo reader's WebAssembly engine with `'wasm-unsafe-eval'`, which older Safari doesn't understand); older browsers can still type the numbers instead.
- Internet access the first time each export, PDF, photo-reading or barcode-fallback feature is used, so its library can be fetched from cdnjs, jsDelivr or unpkg and cached. After the update to build 30 this is needed once more, as the old library store is cleared.
- For the automatic checks only: Node.js 18+ (CI uses 22). `npm install` fetches Playwright plus ExcelJS, jsPDF, jspdf-autotable, pdf.js, pdf-lib, Tesseract.js and ZXing at the versions the app loads; without network access to npm the real-library checks are skipped (see [testing.md](testing.md)). `tests/advisories.js` and `tests/sri.js` need internet (osv.dev and the CDNs).

There is nothing to compile and no environment variables or database.

## Run locally

```bash
git clone https://github.com/Jamie9904/Jamie9904.github.io.git
cd Jamie9904.github.io
python3 -m http.server 8000
```

Open `http://localhost:8000/`. `localhost` counts as a secure origin, so the service worker and camera work there too. Opening `index.html` straight from disk (`file://`) does not.

## Publish on GitHub Pages

1. Put all files from [structure.md](structure.md) at the root of the repository's `main` branch. `fonts/` must be included.
2. Repository **Settings → Pages → Build and deployment**: Deploy from a branch, `main`, `/ (root)`.
3. Wait for the "pages build and deployment" run in the **Actions** tab to finish (about a minute).

**Publishing at another address.** Since build 50 the address `https://jamie9904.github.io/` is fixed in the app in four places: the Settings QR code `media/share-qr.svg`, `shareApp()` and the `#shareUrl` text and QR `alt` text in `HELP.settings` (`panels.js`). On another host, regenerate the QR code for the new address (it was made with reportlab's QR encoder, version 3, error correction M), check that it decodes to that address, and change the other three. The feedback Worker's `ALLOWED_ORIGIN` in `tools/feedback-worker/wrangler.toml` also names the address (see [Feedback Worker](#feedback-worker-report-a-problem-or-idea)).

## Publishing an update

1. If any app file changed (a change to only `config.js` doesn't need this, see [Site settings](#site-settings-configjs)), increase the cache name at the top of `sw.js`:

   ```js
   const CACHE="lpn-log-v23";   // → "lpn-log-v24"
   ```

   This installs a new service worker, which removes the old cache and triggers the "A new version is available" banner. The number is also the build number printed on every export. If you add a new app file, also add it to the `SHELL` list in `sw.js`.

   `sh tools/release/bump.sh` does this step: it reads the number in `sw.js` and in `origin/main:sw.js` (the live site), and if the working copy isn't already higher it sets it to the live number plus one ("Cache bumped: v53 -> v54"); otherwise it prints "no bump needed" and changes nothing, so running it twice is harmless. Run `git fetch` first so `origin/main` is current.
2. Commit the changed files together with `sw.js`.
3. Push. Pages publishes in about a minute; the **Checks** workflow runs the automatic tests at the same time. In this repository, publishing means fast-forwarding `main` to `updates`, done with `sh tools/release/ship.sh` (see [Working branches](#working-branches)).

Users tap **Refresh** on the banner. The log is kept, because it is stored on the device.

### When a user reports a problem

Ask them to open **Settings → Problem report** on the device where it happened, tap **Download problem report** as soon as possible, and send the file (`lpn-problem-report-<date>.txt`) with a description of what they did and what they saw. The Guide (section 9) tells staff the same.

The report shows the version and build they are running (compare it with `CACHE` in `sw.js` to see whether they have the latest update), the browser and screen, the current Manifest check prefixes, numbers and message, and the last 300 events: each manifest photo, PDF and log photo read with what was found, added and left out by the prefix list, the text the photo reader got, backup restores and script errors. It is kept only on that device (the 300 newest events, not in backups), so a report from another device or after **Clear** won't show the problem. In Claude Code, start with the `lpn-bug-triage` skill. See [usage.md](usage.md#problem-report) for what the file contains.

### Changing a library version

The version of each CDN library is written in three places that must agree: the CDN addresses in `export.js`, `compare.js` or `scan.js`, the exact version in `package.json` `devDependencies`, and (for every library loaded by a script tag) the `sha384` hash in the `SRI` map in `core.js`, for both the cdnjs and jsDelivr address. The checks fail if the first two differ or if an address has no hash, and the browser refuses a file whose hash doesn't match. Run `node tests/sri.js` (needs internet) to confirm the hashes, and `node tests/advisories.js` to check the new version for advisories; remove any entries in `tests/advisories-accepted.json` that no longer apply. In Claude Code, the `lpn-library-upgrade` skill (saved to the user's Claude account, not in the repository) is the step-by-step version.

### Working branches

All work happens on one branch, `updates`; the documentation has its own branch, `docs`.

1. Start of work: `git checkout updates`. If `main` has moved ahead, run `git merge --ff-only origin/main` first.
2. Commit and push to `updates` as often as you like. Pushing it doesn't change the live site, and GitHub runs all the checks on it.
3. To publish ("push it"), run `sh tools/release/ship.sh` from the repository (see [Publishing with the release script](#publishing-with-the-release-script)). By hand, the same publishing step is `git checkout main && git pull --ff-only origin main && git merge --ff-only updates && git push origin main`, then `git checkout updates`. After a release `updates` and `main` point to the same commit.

There is no new branch per change. In Claude Code the git guard enforces this (below); by hand it is up to you.

### Publishing with the release script

`tools/release/ship.sh` puts `updates` live and checks it the same way every time. Run it only when the user has asked to push:

```bash
sh tools/release/ship.sh
```

It needs `git`, the GitHub CLI (`gh`, signed in with access to `Jamie9904/Jamie9904.github.io`) and network access to GitHub. In order, it:

1. Fetches, then checks that you are on `updates`, nothing is uncommitted, `updates` is the same as `origin/updates`, and GitHub's **Checks** run on that commit has passed (it waits for the run if it is still going). It prints `Shipping <commit> (lpn-log-vN)`.
2. Checks out `main`, pulls it with `--ff-only`, fast-forwards it to `updates`, pushes `main` and goes back to `updates`.
3. Waits for the **Checks** run and the **pages build and deployment** run on `main`, and prints the Checks notices (the annotations with a title, cut at 300 characters).
4. Starts the weekly health check (`health.yml`) on `main` straight away and waits for it: the live site serves the new build, the CDN libraries download, the live demo video plays, and the live site reads the user's manifest photos (see [testing.md](testing.md#weekly-health-check)). It prints that run's notices too.
5. If `/mnt/user-data/outputs` exists, copies every file tracked in git except `.claude/`, `docs/`, `tools/` and `.mcp.json` to `/mnt/user-data/outputs/lpn-site`, removes any file in `lpn-site` that is not in that list (printing `removed <file> from the download copy` for each), and updates `lpn-site.zip` (`zip -FS`).

It stops at the first problem with a line starting `STOPPED:` (for example "not on the updates branch", "updates isn't pushed to GitHub yet", "Checks on main: failure" or "live site check failed (run N)", with the health check's notices) and goes back to `updates`. Each wait for a Checks or Pages run gives up after 20 minutes (80 checks, 15 seconds apart; it was 15 minutes before). Since build 45's release `wait_run` also reruns a run that GitHub cancelled (for example a slow browser install hitting the Checks time limit), once: it prints `(<name> was cancelled by GitHub: running it again)`, runs `gh run rerun`, and waits again; a second cancel stops the script as usual. With the waits for Checks, Pages and the health check, a run takes over 10 minutes, so `.claude/CLAUDE.md` says to run it in the background in Claude Code (since the commit after build 58). It ends with `Done: lpn-log-vN is live. Next: docs-updater.`; the `docs` branch is not touched, so update it afterwards. Its first use, on 31 Oct 2026, passed every step.

Because files the app no longer has are removed from `lpn-site`, the download copy and `lpn-site.zip` hold exactly the site files of the release. Like the rest of `tools/`, the script is not part of the site zip.

### Re-recording the Guide demo video

`tools/demo-video/` re-records `media/demo.mp4` and `media/demo-poster.jpg` from the app in the repository, so the video shows the current screens. It needs Node.js with Playwright (a global install is fine), Python 3 and `ffmpeg`. The first run downloads the sherpa-onnx speech engine and the Kokoro voice model from GitHub (about 350 MB) into `~/.cache/lpn-voice`.

```bash
sh tools/demo-video/make.sh
```

1. Change the spoken words in `tools/demo-video/lines.json`, and what is tapped and typed in each scene (and how long it holds) in `SCENES` in `record.mjs`, if needed.
2. Run `make.sh`. Without `SFX_DIR` the video has the voice only; set `SFX_DIR` to a folder with `whoosh.wav`, `ding.wav`, `pop.wav` and `starter-beat.mp3` to add music and sound effects (these files are not in the repository).
3. Look at the check frames in `tools/demo-video/out/check-*.jpg` and play `media/demo.mp4` once.
4. Commit `media/` and `tools/demo-video/screens.json`. `make.sh` rewrites `screens.json` (the fingerprint of the key screens, see [testing.md](testing.md#demo-video-screen-fingerprint)) after recording. The working files in `tools/demo-video/out/` are ignored by git.

How `record.mjs` records:

- The browser context uses the `en-GB` locale and the `Europe/London` time zone, so dates in the video show UK style. Since build 45 Chromium is also started with `--lang=en-GB` and the environment variables `LANG=en_GB.UTF-8` and `LANGUAGE=en_GB`, because the date box follows the browser's language rather than the context locale; without them it showed month/day/year.
- There is no camera, so before the app loads it replaces `navigator.mediaDevices.getUserMedia` with a stream from a drawn canvas (`captureStream(30)`): a grey background with a white label that shows bars and the code in `window.__showCode`, or "…" when that is empty. It also replaces `window.BarcodeDetector` with a stand-in whose `detect()` returns `window.__showCode` while one is set. Everything after the code is reported (adding the pallet with the selected type and the "Added" message) is the app's own `onCode`.
- The scanning scene (8.4 s) taps **FMCG**, **Scan** and **Live scan**, scrolls the camera box and **Stop scanning** into view, shows `VLT004037901` (added as FMCG), taps **BB**, then shows `RUN0001830770` (added as BB). It then taps **Stop scanning** and closes the scan buttons, so the next scene starts with them closed. Its headline is "Log pallets" / "Pick the type, then scan." and its narration is "Pick the pallet type first, then scan. Each pallet is logged with that type, so change it before the next one."

A check in `tests/groups/08-demo-video.js` fails if the video is over 3 MB. Re-record when `npm test` prints that the screens differ from the demo video (on GitHub, the "Demo video may be out of date" warning) and the change shows in the video. The weekly health check also downloads the live video and checks it plays. Since build 65 `voice.py` can be given a folder (`python3 tools/demo-video/voice.py <folder>`): it then reads that folder's `lines.json` and writes its `out/`; with no folder it works on `tools/demo-video/` as before.

### Re-recording the Changelog build history video

`tools/history-video/` (build 65) re-makes `media/history.mp4` and `media/history-poster.jpg`, the one-minute video at the top of the Changelog. It needs Node.js with Playwright, Python 3, `ffmpeg` and the full git history, and uses the same offline voice as the demo video (downloaded into `~/.cache/lpn-voice` on first use).

```bash
sh tools/history-video/make.sh
```

1. `make.sh` runs `../demo-video/voice.py` on the `tools/history-video` folder (its `lines.json`: an intro, one line per build and a closing line), then `capture.js` and `render.js`.
2. `capture.js` takes each milestone build (13, 19, 23, 34, 44, 49, 52, 56, 62 and 65, each pinned to its commit in `ALL`) from git with `git archive`, serves it locally, fills it with the same sample delivery (eight pallets, a twelve-number manifest, trailer `TR 4471`) and screenshots it, with the part of the screen to outline, into `out/shots/`. `node capture.js b65` re-takes only the builds named.
3. `render.js` draws every frame on `stage.html` (1920×1080, 25 frames a second) with each build's date, number and caption from `INFO`, and mixes the voice with a music bed and a whoosh on each change. Those sound files are read from `~/app-demos/lpn-pallet-log/public/sfx` (`whoosh.wav`, `starter-beat.mp3`), which is not in the repository.
4. `make.sh` then writes the web copy `media/history.mp4` (1280×720, H.264 and AAC, `+faststart`) and its poster from the last frame, and prints its size. Watch `tools/history-video/out/lpn-pallet-log-build-history.mp4` before committing `media/`. The working files in `out/` are ignored by git.

To add a milestone, add the build to `ALL` in `capture.js`, its line to `lines.json`, and its entry to `INFO`, `ORDER` and the `RAIL` list in `render.js`, and update the Guide line, the changelog bullet and the video's `aria-label` in `panels.js`, which name "build 13 to build 65". A check in `tests/groups/08-demo-video.js` fails if the video is over 4 MB; there is no screen fingerprint for it, as it shows past builds. The weekly health check downloads the live video and checks it plays (longer than 30 seconds, H.264 and AAC). Like the rest of `tools/`, it is not part of the site zip.

### Checking photo reading on real manifest photos

`tools/ocr-check/` scores the app's photo reading on the user's nine manifest photos (four of 31 Oct 2026 and, since build 57, five of 6 Nov 2026), a sideways copy of `run.jpg` and an upside-down copy of `rby.jpg` (`photos/`, address boxes cut off) against `expected.json` (54 LPNs since build 57; 23 at build 47; 21 at build 46). It needs Node.js with Playwright, and either the Tesseract 5 command (`cli` engine, offline) or internet access to `cdn.jsdelivr.net` and the tessdata download (`js` engine, the app's real `ocrLpns()`):

```bash
NODE_PATH=$(npm root -g) node tools/ocr-check/check.js
NODE_PATH=$(npm root -g) node tools/ocr-check/check.js --prefix=VLT
NODE_PATH=$(npm root -g) node tools/ocr-check/check.js --url=https://jamie9904.github.io/
```

The last line reads the photos with the app at that address (here the live site) instead of the files in the folder. See [testing.md](testing.md#photo-reading-check-toolsocr-check) for the options. On GitHub the checks read the same photos with the real tesseract.js, and the weekly health check reads them with the live site. Like the rest of `tools/`, it is not part of the site zip.

To add a photo, cut off anything that shows an address, name or phone number (the repository is public), put it in `photos/` and add its LPNs to `expected.json`. In Claude Code the git guard then blocks the commit until the photo is confirmed (see [Guards when working with Claude Code](#guards-when-working-with-claude-code)):

```bash
sh tools/release/photo-ok.sh tools/ocr-check/photos/<photo>.jpg
```

### Making the old-build data files

`tools/old-data/` makes the files in `tests/fixtures/old/build-N` that `tests/groups/21-old-data.js` checks the current app against (since commit `f510058`, after build 55): what each older build kept in the browser, its backup file, the cells its Excel export wrote and the hidden data its Email PDF wrote, all made by that build's own code. It needs Node.js with Playwright, the full git history (each build is taken from its commit with `git archive`), and Python 3 with `openpyxl` and `reportlab`:

```bash
node tools/old-data/make.js        # every build in ALL_BUILDS
node tools/old-data/make.js 64     # only the builds named (since build 65); the other folders stay as they are
python3 tools/old-data/files.py
```

`make.js` prints `ok` or `PROBLEM …` for each build; `files.py` prints the `log.xlsx` and `log.pdf` it wrote for each. To add a build (when the shape of saved data or an export changes), add its number and commit to `ALL_BUILDS` in `make.js` (`BUILDS` before build 65) after it is released, run both (`make.js` with just the new number is enough), run `npm test` and commit the new folder. See [testing.md](testing.md#data-saved-by-older-builds-testsfixturesold) for what is in each folder. Like the rest of `tools/`, it is not part of the site zip.

### Guards when working with Claude Code

`.claude/settings.json` also allows two `gh api` commands on `lpn-feedback` issues (see [Skills for Claude Code](#skills-for-claude-code)) and registers hooks that run when a Claude Code session starts, edits files or runs git commands in this repository:

- **Session start:** `.claude/hooks/session_start.py` (`SessionStart`, 90-second limit) finds the repository, either the project folder itself or one folder below it (cloud sessions start in `/home/claude`). If there is an `origin` remote, it sets `remote.origin.fetch` to `+refs/heads/*:refs/remotes/origin/*` so every GitHub branch is tracked, and runs `git fetch --prune` without ever asking for a password. If the current branch has no upstream but GitHub has a branch of the same name, it sets that as the upstream. It adds the global npm folder to `NODE_PATH` for the session (through `CLAUDE_ENV_FILE`) so `npm test` finds a globally installed Playwright. Then it prints one status line: commits ahead and behind GitHub, uncommitted files, the build number here and on the live site (`origin/main:sw.js`, with a reminder to bump on a feature branch that isn't ahead of it), and how many app commits the `docs` branch is behind `main` (commits touching the app files, `qr.js` included since commit `eb6d023`, `config.js`, `tests/run.js`, `tests/lib.js` or `tests/groups/`). When GitHub has an `updates` branch, the line also says so if the session is on any branch other than `updates` or `docs`, and if `updates` is behind `main` (with the `git merge --ff-only origin/main` to run). When `media/demo.mp4` exists, it counts the commits since the video was last committed that changed `index.html` or `styles.css` (script changes are not counted, as they rarely show in the video), and if there are any it says "page or styles changed N time(s) since the demo video: npm test says if the screens differ". The real comparison is the screen fingerprint in `npm test` (see [Re-recording the Guide demo video](#re-recording-the-guide-demo-video)). It never blocks the session; problems such as a failed fetch only appear in the status line.
- **Syntax check:** after a `.js` file is edited or written, `node --check` runs on it and a syntax error is reported straight away.
- **Settings file check:** after a file named `config.js` is edited or written (and only when a `core.js` sits beside it, so other projects' `config.js` files are left alone), `.claude/hooks/config_check.js` (`PostToolUse`, 30-second limit) runs it in a Node `vm` with only `window` and checks it the way `tests/groups/19-site-config.js` does: it sets `window.LPN_CONFIG`, `features` and `testing` are plain `{ … }` lists, every name is in `FEATURES` in `core.js`, every value is `true` or `false`, every `FEATURES` name is in `features`, and the file (outside comments) has no `__proto__`, `constructor` or `prototype`. Problems are shown to Claude straight away ("config.js check: …. Fix config.js (the app would ignore the broken part and keep every feature on)."); a good file gives no output.
- **UK spelling:** since commit `f510058` (after build 55), after `index.html` or one of the app scripts (`core.js`, `qr.js` since commit `eb6d023`, `scan.js`, `export.js`, `compare.js`, `panels.js`) is edited or written (only in a folder with an `sw.js`), `.claude/hooks/uk_spelling.js` (`PostToolUse`, 30-second limit) looks for US spellings in the text people see: quoted and template text in the scripts (not comments, regular expressions or code), and the page text and `placeholder`, `aria-label`, `title` and `alt` values in `index.html` (not `<script>`, `<style>` or comments). Single words that don't start with a capital, CSS declarations, hyphenated names, `#ids`, `.classes` and function calls are skipped as code. Its list covers words such as color, favorite, organize, recognize, analyze, center, canceled, labeled, gray, behavior, toward, catalog, meter and liter. Each hit is shown as `file:line: "word" (UK: …)` and Claude is asked to fix it; clean text gives no output. `node .claude/hooks/uk_spelling.js --all` checks every app file by hand.
- **Cache bump:** a `git commit` is blocked if any app file (`index.html`, `styles.css`, the scripts `core.js`, `qr.js` (added to the list in commit `eb6d023`; before it, a change to `qr.js` alone wasn't held back for a cache bump), `scan.js`, `export.js`, `compare.js` and `panels.js`, `manifest.webmanifest`, the icons or `fonts/`; not `config.js`) changed and the `CACHE` number in `sw.js` is neither changed in this commit nor higher than the one on the live site (`origin/main`). So once a branch has bumped it, later commits before publishing don't need another bump. Because the guard runs before the command, it also lets the commit through when the same command bumps the cache first: `tools/release/bump.sh`, or a `sed` that names `lpn-log-v` and `sw.js`, written before `git commit` (for example `sh tools/release/bump.sh && git commit …`). The block message suggests `bump.sh`.
- **One working branch:** when GitHub has an `updates` branch, a `git commit` on `main` is blocked, and so is creating a new branch (`git checkout -b`/`-B`, `git switch -c`/`-C`/`--create`, or `git branch <name>`; listing, deleting and setting an upstream with `git branch -…` are still allowed). See [Working branches](#working-branches).
- **Only real git commands count:** the guard reacts to `git commit`, `git push`, `git merge … docs` and the new-branch commands above (also with `git -C <path>`), not to other commands that happen to contain those words, such as `git stash push` or an `echo`.
- **Photo privacy:** since commit `f510058` (after build 55), a `git commit` is blocked while it would include a new or changed photo (`.jpg`, `.jpeg`, `.png`, `.webp` or `.heic`) in `tools/ocr-check/photos/` that hasn't been confirmed, because those photos go into the public repository. The message names the photos and asks for each to be opened and checked that no address, name or phone number can be read (cropping it if needed), then confirmed with `sh tools/release/photo-ok.sh <file> …` before committing again. `photo-ok.sh` adds each file's git hash to `.git/lpn-photos-ok`, so a photo changed after it was confirmed has to be confirmed again; that list is local to the clone and never committed.
- **Docs stay off `main`:** a `git commit` on `main` is blocked if it would include files in `docs/`, and merging `docs` into `main` or pushing `docs` to `main` is blocked. The documentation is updated on the `docs` branch instead.
- **Uncommitted changes before push:** since the commit after build 58 (`56e8ce3`), a `git push` is blocked while an app file (the same list as the cache bump), `config.js`, `sw.js` or any file under `tests/` is changed but not committed, staged or not (for a renamed file the new name counts). Since build 59 it reads `git status --porcelain --untracked-files=all`, so brand-new files git doesn't track yet count too (before, they were skipped), and any `.js` file at the top of the repository counts, not only the listed app files. The message names the files and says to commit them (`git add` + `git commit`), or put changed ones back (`git checkout -- <file>`) and delete new ones that aren't wanted, then push again. The reason: the checks below run on the files on disk, not on the commits being pushed, so a file left out of the commit passed here and failed only on GitHub (build 58's `core.js` change was left out of its commit this way). Pushes of only the `docs` branch skip this.
- **Checks before push:** after that, a `git push` runs `node tests/run.js` (the `npm test` checks) first and is blocked if any fail (see [testing.md](testing.md)). Pushes of only the `docs` branch skip this.
- **Docs reminder:** at the end of a Claude Code turn, if `origin/main` has app changes that `origin/docs` does not (commits touching the app files, `qr.js` included since commit `eb6d023`, `config.js`, `tests/run.js`, `tests/lib.js` or `tests/groups/`; the session-start status line counts the same files for its docs lag), Claude is reminded once per `main` commit to update the docs branch. Like the session-start hook, it also finds the repository one folder below the project folder.
- **Download copy reminder:** `.claude/hooks/outputs_reminder.py` (also a `Stop` hook, 60-second limit) compares each site file in `origin/main` (everything except `.claude/`, `docs/`, `tools/` and `.mcp.json`) with the copy in `/mnt/user-data/outputs/lpn-site` by git blob hash. The outputs storage rewrites the metadata of pictures and video after they are saved, so a `.mp4`, `.webm`, `.jpg`, `.jpeg` or `.png` whose bytes differ still counts as matching if `ffmpeg` decodes the same picture from both main's own copy and the outputs copy (an MD5 of the first video stream). Main's copy is taken from git (`git show origin/main:<file>` into a temporary file), not from the working tree, which may hold a newer picture or video that isn't live yet. Since build 51 an `.svg` whose bytes differ also counts as matching if the two are the same once any `<metadata>…</metadata>` block and `xmlns:c2pa="…"` attribute are removed (the outputs storage adds content credentials to SVGs too); main's copy again comes from `git show origin/main:<file>`. It also opens `lpn-site.zip` and compares each site file's bytes with the folder's copy (`lpn-site/<file>` in the zip), naming up to five that differ or are missing (since commit `481425b`, after build 54, a `.mp4`, `.webm`, `.jpg`, `.jpeg`, `.png` or `.svg` only has to be in the zip, because the storage adds metadata to those after saving; the folder copies of them are compared with main by picture as above); it used to compare dates, which the outputs storage changes when it rewrites picture and video metadata, so a good zip looked out of date. A missing zip, or one holding `docs/`, `.claude/` or `.mcp.json`, is reported too. If they don't match it reminds Claude, once per `main` commit, to sync them. It does nothing where there is no outputs folder, such as on your own computer.

### Agents for Claude Code

`.claude/agents/` holds helpers that Claude Code can hand work to (`docs-updater` is the only one given edit tools): `export-reviewer` (export changes), `phone-layout-checker` (layout on phone widths), `release-reviewer` (the diff before a release), `old-data-checker`, `guide-checker`, `docs-updater` (this documentation on the `docs` branch), `security-reviewer`, `ocr-reviewer` and `a11y-reviewer`. `guide-checker` (read-only, Read/Grep/Glob/Bash) checks the words people read against the code when behaviour changed: the Guide, Settings, Saved deliveries help, the privacy section, the newest changelog bullets, `DEMO_HTML`, labels and notes in `index.html`, and messages set in the scripts. It checks both ways for features with `data-f`/`data-nf` lines, treats a privacy mismatch as a blocker, and reports **Wrong**, **Missing** and **Wording** findings with the suggested text, ending with "Text matches the code" when there are none. `docs-updater` works in the worktree `/home/claude/lpn-docs-wt` and runs one at a time: it writes the start time to `/home/claude/lpn-docs-wt.lock`, stops if a lock under 30 minutes old is already there, replaces an older one, and removes it when it finishes. `security-reviewer` checks files and text from outside (supplier PDFs, spreadsheets, backups, photos, presets) and the CDN libraries, and is used when import code, library loading, `package.json` versions or `index.html` change, and before a library upgrade. `ocr-reviewer` (read-only) reviews changes to photo reading (`prep`, `cropScaled`, `ocrLpns`, `tidyReads`, `photoLpns`, `extractLpns` in `compare.js`): it runs `tools/ocr-check` (also with `--prefix=VLT`), reports the score, and checks that no repair turns a right number into a wrong one, that nothing is left out silently, phone memory and time, browser differences, the checks and the wording.

Since commit `f510058` (after build 55), `release-reviewer` also has a **never-build** list of things the user decided against; anything in the diff that adds one, even partly or under another name, is a blocker: timing deliveries (start or finish times, how long a delivery or pallet took, rate per hour), a damage reason for short pallets or torn wrap, anything for shared work phones (sign-in per person, switching users, locking data), the compact Delivery/Manifest layout, a saved zoom level or phone-first export layouts, and asking people to type in or paste tokens or keys. Its last step asks whether `old-data-checker` was run when the diff touches how saved data, backups or exports are read or written.

`old-data-checker` (read-only, Read/Grep/Glob/Bash, since the same commit) checks that a change doesn't break data people already have. It reads the changed parts of `cleanRows`, `cleanDel`, `cleanHist`, `load()` and `save()` (core.js), `checkBackup`, the restore flow and `parseExported` (panels.js), `readLog`, `readLogPdf`, `lpnsFromGrid` and `sheetGrid` (compare.js) and the PDF keywords and Excel layout (export.js); asks for each change what older data looks like (rows without `dmg` or `desc`, PDF hidden data rows of 3, 4 or 5 items and the older `LPNLOG|` list, missing or empty delivery fields, damage text no longer offered such as `Short` or `Wrap torn`, delivery details on one merged Excel line); runs the checks and reports the `21-old-data.js` lines; and says when a new old-build folder should be made. It reports **Blocker**, **Should fix** and **Fine** with the builds affected. `.claude/CLAUDE.md` asks for it when saved data, backups or how exports and imports are read or written change.

These hooks only run inside Claude Code. Commits and pushes made by hand or through the GitHub website are not checked by them, so the cache bump is still your responsibility there.

`a11y-reviewer` (read-only) reviews accessibility after UI changes (new controls, messages or colours) and for an occasional full audit. It opens the app with Playwright at 360×740, 390×844 and 1300×900 in light and dark colour schemes, with the service worker blocked and realistic data, opens each panel, and measures rather than guesses (`getComputedStyle`, `getBoundingClientRect`, the accessibility snapshot). Its checklist: accessible names for every control; contrast (4.5:1 for text, 3:1 for large text, controls and focus rings, also with a user-picked theme colour); tap targets of at least 44×44 px on phones for the controls used while scanning (add pallet, type buttons, undo, remove, the FSDU tick box) and 24×24 elsewhere; keyboard and focus (visible, never hidden under the fixed phone entry bar or the header, kept in open panels, nothing reachable while `inert`); status messages announced without taking focus, and colour never the only signal; structure (one `h1`, headings in order, landmarks, `lang="en-GB"`, `aria-expanded`, table headers); 200% zoom and the Extra large text size at 360 px; reduced motion, and sound and vibration that can be turned off; and subtitles and reachable controls on the demo video. It reports findings most serious first, and ends with the three fixes that would help warehouse users most. It follows the `web-accessibility` skill when that is available.

### Skills for Claude Code

The procedures Claude Code follows (for example `release-lpn`, `lpn-write-check`, `lpn-library-upgrade`, `lpn-demo-video`, `lpn-photo-check`, `lpn-bug-triage`) are skills saved to the user's Claude account, not files in the repository. `release-lpn` publishes with `tools/release/ship.sh` (see [Publishing with the release script](#publishing-with-the-release-script)). `lpn-photo-check` is used with `ocr-reviewer` for photo reading changes; its update after build 58 (proposed to the user) says GitHub's run with the real phone reader decides whether a change is good, attached photos are cropped at full size, `photo-ok.sh` is run as its own command, and no correction is carried from one photo to another; `lpn-old-data-fixtures` (proposed to the user after build 55; `.claude/CLAUDE.md` names it) is for adding a new set of old-build files after a release that changed the shape of saved data; `lpn-bug-triage` is the starting point for reported problems and works from the problem report downloaded in Settings (Claude asks for it if it hasn't been sent). For reports sent with the app's **Report a problem** button (issues in `Jamie9904/lpn-feedback`), `.claude/CLAUDE.md` points to the `lpn-feedback-triage` skill, which reads those issues, sorts them and summarises them; it is saved to the user's account and is not part of the repository. Since its update after build 58 (proposed to the user) it asks before closing a report, and if closing is refused it gives the issue's link so the user can close it on GitHub. `.claude/settings.json` allows `gh api -X POST` and `gh api -X PATCH` on `repos/Jamie9904/lpn-feedback/issues/*` without a prompt, so Claude can comment on and close those issues; `.claude/CLAUDE.md` says to do it only when the user asks. Claude has read access to `lpn-feedback`, and a weekly Claude scheduled task summarises new reports every Monday at 10:13 UK time and sends a push notification; it is set up in the user's Claude account, not in the repository (`.claude/CLAUDE.md` mentions it since the commit after build 58). `lpn-site-settings` is used when the user asks for a site settings change (`config.js`), and `lpn-feature-switch` is the one for giving a feature its own switch; both are saved to the user's account, so their steps are not in the repository (`.claude/CLAUDE.md` names `lpn-site-settings` and gives the steps for a new switch). Three general web quality skills are saved the same way, adapted from [addyosmani/web-quality-skills](https://github.com/addyosmani/web-quality-skills) (MIT licence): `web-accessibility`, `web-performance` and `web-best-practices`.

### Library documentation for Claude Code (Context7)

`.mcp.json` at the root of `main` registers the Context7 MCP server (`"type": "http"`, `https://mcp.context7.com/mcp`) so Claude Code can look up current ExcelJS, jsPDF and pdf.js documentation during export work. No key is needed (a key only raises the rate limit). It only works where `mcp.context7.com` can be reached: on your own computer, or in a Claude cloud session once that host is allowed in the claude.ai network settings. The app doesn't use it; GitHub Pages doesn't publish it (Jekyll leaves out dotfiles), and it is kept out of the site zip like `.claude/`.

### Feedback Worker (Report a problem or idea)

**Report a problem or idea** (the **Report** button, Settings or the Guide) needs the Cloudflare Worker in `tools/feedback-worker/`. It is online at `https://lpn-feedback.jamie9904.workers.dev` (since build 43). If `FEEDBACK_URL` is empty the app's form says "Reporting isn’t set up yet" and points to Download problem report; everything else works without the Worker. The one-time set-up (already done for this site; repeat it only for a new account or a copy of the app) is in `tools/feedback-worker/README.md`:

1. Create a **private** repository `lpn-feedback` on GitHub (with a README).
2. Make a fine-grained GitHub token for that repository only, with **Issues** and **Contents** read and write.
3. On Cloudflare (free plan), note the **Account ID** and create an API token from the **Edit Cloudflare Workers** template. Open **Workers & Pages** in the Cloudflare dashboard once before the first deploy: that creates the account's workers.dev subdomain, and without it the deploy fails with Cloudflare error code 10063.
4. In `Jamie9904.github.io` → Settings → Secrets and variables → Actions, add `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and `FEEDBACK_GITHUB_TOKEN`.
5. Actions → **Deploy feedback Worker** → Run workflow on `main`. The run's notice gives the Worker's address (`https://lpn-feedback.<name>.workers.dev`), and the next step checks it answers `OPTIONS /report` with 204, waiting up to 2 minutes for a new address to start answering (if it still doesn't, run the workflow again a few minutes later). If the deploy itself fails, the error notice shows Cloudflare's reason. Tick **Also send a test report** to also post one test report, which makes a test issue in `lpn-feedback` (safe to close).
6. Set `FEEDBACK_URL` in `panels.js` to that address plus `/report`, add the exact Worker origin to `connect-src` in the security policy in `index.html`, and release as usual. Done in build 43 (`https://lpn-feedback.jamie9904.workers.dev/report`); `tests/groups/12-report.js` fails if the address's origin is missing from `connect-src`.

**If the test report fails with a GitHub 404:** the Worker answers 422 "The report couldn't be saved (404)." GitHub answers 404 when the fine-grained token can't see `lpn-feedback`. Check the token's **Resource owner** is the account that owns `lpn-feedback` and that its **Repository access** includes `lpn-feedback`, then store the new token as `FEEDBACK_GITHUB_TOKEN` and run the workflow again. This is how it was fixed for this site: after the user replaced the token, the test report succeeded and made issue #1 in `lpn-feedback`.

`.github/workflows/feedback-worker.yml` also redeploys on any push to `main` that changes `tools/feedback-worker/` or the workflow; before the secrets exist such a push just skips with a notice ("Feedback Worker not set up"), while running it by hand fails and names the missing secrets. `wrangler.toml` sets `REPO` and `ALLOWED_ORIGIN` (`https://jamie9904.github.io`); the GitHub token is only stored as the Worker secret `GITHUB_TOKEN`, never in the repository. The Worker is not part of the site zip.

**Keeping it working:** since build 45's release, the weekly health check tests the report system: the Worker answers, `FEEDBACK_GITHUB_TOKEN` can still read `lpn-feedback`, the token doesn't run out within 30 days, and the Worker code on `main` hasn't changed since the last successful deploy (see [testing.md](testing.md#weekly-health-check)). When it says the token doesn't work or runs out soon, make a new token (step 2), update `FEEDBACK_GITHUB_TOKEN` and run **Deploy feedback Worker**; when it warns the code changed, run **Deploy feedback Worker**.

## Site settings (`config.js`)

`config.js` at the root of `main` (build 53) switches features on or off for everyone who uses this copy of the app, and can mark a feature as "in testing", which puts a note next to it. It is the only file the site owner needs to edit for this; no other change and no cache bump is needed.

### What the file looks like

```js
window.LPN_CONFIG = {
  features: {
    report: true,          // Report a problem button, and the report links in Settings, the Guide and the Manifest check
    manifestCheck: true,   // the whole Manifest check section
    manifestPhotos: true,  // reading manifests, printed logs and printed LPNs on labels from photos (PDFs and typing still work)
    liveScan: true,        // Live scan with the camera
    scanByPhoto: true,     // Scan by photo (opens the camera and reads the barcode; offers Read the printed LPN when photoUpload and manifestPhotos are on)
    photoUpload: true,     // Upload photo (choose one or more photos already taken; reads the printed LPN when there is no barcode, if manifestPhotos is on; also needed for Read the printed LPN)
    torch: true,           // Torch button in Live scan (only on phones that allow it)
    damage: true,          // marking a pallet as damaged
    refused: true,         // marking a pallet as refused (sent back with the driver)
    noLpn: true,           // No LPN button, for pallets that arrive without an LPN
    fppDesc: true,         // description box for FPP pallets, to say what is on them (e.g. kitchen roll)
    shareMissing: true,    // Share missing list in the Manifest check results
    findLpn: true,         // Find an LPN in Saved deliveries
    shareApp: true,        // Share this app (QR code) in Settings
    welcome: true,         // the welcome card on someone's first visit
    whatsNew: true,        // the card after an update saying what's new
    exportReminder: true,  // reminder when a delivery from an earlier day was never exported
    historyVideo: true,    // the one-minute video at the top of the Changelog showing how the app has grown
    twoPhones: true,       // Share log: send this log's pallets to another person's phone with QR codes, e.g. when two people unload one trailer
    tallySheet: true       // Blank tally sheet in the Export menu, a paper sheet to fill in by hand
  },
  testing: {
    report: false, manifestCheck: true, manifestPhotos: false, liveScan: false, scanByPhoto: false,
    photoUpload: false, torch: false, damage: false, refused: false, noLpn: false, fppDesc: false, shareMissing: false,
    findLpn: false, shareApp: false, exportReminder: false, historyVideo: false, twoPhones: false, tallySheet: false
  }
};
```

(In the repository each `testing` entry is on its own line.) These are the current values: every feature is on, and the Manifest check is currently marked as in testing (`testing.manifestCheck: true`, set by the site owner on 2 Nov 2026), so everyone sees its "In testing" note. `welcome` and `whatsNew` have no `testing` entry, because the cards carry no note. The comment on `report` in the file still says "Report button"; since build 58 the button itself says **Report a problem**.

### How to change it

The preferred way, by the user's decision, is to ask Claude to change the setting: Claude edits `config.js` following the `lpn-site-settings` skill (its steps are on the user's account, not in the repository), and the settings file check above reports any mistake at once. Editing it on GitHub by hand also works:

1. On GitHub, open `config.js` on the `main` branch (or on `updates` and release it as usual) and tap the pencil to edit.
2. Change only the `true`/`false` values. Keep the names, quotes, commas and braces as they are.
   - `features: { liveScan: false, … }` hides Live scan for everyone.
   - `testing: { liveScan: true, … }` keeps it on and adds the note "In testing: Live scan may not always work yet, so check what it gives you, and use Report a problem if something goes wrong." (without the part after "gives you" when `report` is off). The note for `report` itself says reports may not always arrive yet and points to **Download problem report** in Settings. A `testing` value only counts while the feature is on.
3. Commit. GitHub runs the checks (`tests/groups/19-site-config.js`): the first check fails if the file doesn't run, if `features` or `testing` isn't a plain `{ … }` list, if a name isn't in `FEATURES` in `core.js`, if a value isn't exactly `true` or `false`, if a `features` name is missing, or if the file (outside comments) contains `__proto__`, `constructor` or `prototype`.
4. Pages publishes the change in about a minute. The service worker loads the app's own files network-first, so phones pick it up the next time they open the app online; a phone that is offline keeps the copy it last saved (`config.js` is in the `SHELL` list in `sw.js`).

### What each switch does

| Name | When `false` |
|---|---|
| `report` | No **Report** button, report box, or report links in Settings, the Guide and the Manifest check (**Report a problem with these photos**); reports already waiting on a phone are not sent. The Guide's privacy section says there's no Report button in this copy, so nothing leaves the phone. **Download problem report** stays. |
| `manifestCheck` | The Manifest check card is hidden, and manifest numbers already saved on a phone are ignored: no live tracking or "not on the manifest" warnings in the Pallet log. |
| `manifestPhotos` | The photo buttons for manifests and printed logs and the prefix presets are hidden; the step is labelled "2. Manifest PDFs". PDFs and typed numbers still work, and the prefix list is ignored (no numbers are left out because of their prefix). **Upload photo** also stops reading the LPN printed on a label when no barcode is found (it just says "No barcode found…"; in build 63 this applied to **Scan by photo**), Scan by photo doesn't offer **Read the printed LPN** (build 65; in build 64 its no-barcode message no longer pointed to Upload photo), and the Guide's sentences about reading the printed LPN and that part of the changelog bullet are left out. |
| `liveScan` / `scanByPhoto` | That scan button is hidden; with Live scan, Scan by photo and Upload photo all off (and `noLpn` off too, since build 55) the **Scan** button is hidden too. With `liveScan` off, the tip under the buttons is hidden. With `scanByPhoto` off, its Guide line, its part of the build 64 changelog bullet and the build 65 sentence about **Read the printed LPN** are left out, and the tip and the blocked-camera and torch messages name Upload photo instead (or no photo button). |
| `photoUpload` (build 64) | No **Upload photo** button (so no reading of several photos either), and no reading of the printed LPN on a label: since build 65 Scan by photo doesn't offer **Read the printed LPN**, so it reads barcodes only. Its Guide line, the Scan by photo line's sentence about the printed LPN, its part of the build 64 changelog bullet and the whole build 65 photo bullet are left out, and the tip, Scan by photo's no-barcode message and the blocked-camera and torch messages don't mention it. Marked as in testing, the note "In testing: Upload photo may not always work yet…" shows in the camera box while an uploaded photo is read. |
| `torch` | No **Torch** button in Live scan. |
| `damage` | No damage choices when an LPN is tapped (it can still be edited). Damage already noted on pallets stays and still goes on the exports. |
| `refused` (build 62) | No **Refused (sent back)** button when an LPN is tapped, and its Guide paragraph, the "and refused pallets" words in the Guide's totals sentence, the Saved deliveries help sentence and the changelog bullet are left out. Pallets already marked refused keep the mark, stay out of the totals and still go on the exports as refused. Marked as in testing, the note "In testing: Marking pallets as refused may not always work yet…" shows under the button. |
| `noLpn` (build 55) | No **No LPN** button, and its Guide lines and changelog bullet are left out. Pallets already logged as "No LPN n" stay, keep their descriptions and still go on the exports. Marked as in testing, the note "In testing: Logging pallets with no LPN may not always work yet…" shows in a No LPN pallet's description row. |
| `fppDesc` (build 56) | Logging an FPP pallet doesn't open its Description box, and tapping an FPP pallet doesn't offer one (a pallet that already has a description still shows it, and descriptions still go on the exports). The Guide's **FPP pallet:** paragraph and its changelog bullet are left out. Marked as in testing, the note "In testing: Descriptions for FPP pallets may not always work yet…" shows in an FPP pallet's description row. |
| `shareMissing` | No **Share missing list** button in the check results. |
| `findLpn` | No **Find an LPN** box in Saved deliveries. |
| `shareApp` | No **Share this app** section in Settings. |
| `welcome` / `whatsNew` | The welcome card on a first visit, or the what's new card after an update, isn't shown. |
| `exportReminder` (build 62) | No card when the app opens with a delivery from an earlier day that was never exported, and its changelog bullet is left out. Marked as in testing, the note "In testing: The reminder about deliveries not exported may not always work yet…" shows in the card. |
| `twoPhones` (build 66) | No **Share log** button under the log, so no way to show this log's pallets as QR codes; its Guide line (section 9) and changelog bullet are left out. A Share log code read by Live scan is ignored (never logged as a pallet). The name is from the feature's first working title, "Two phones". Marked as in testing, the note "In testing: Sharing the log may not always work yet…" shows at the top of the Share log panel (before the tweak in commit `eb6d023`, also build 66, no note showed). |
| `tallySheet` (build 66) | No **Blank tally sheet** in the Export menu, and its Guide paragraph (section 6) and changelog bullet are left out. Marked as in testing, the note "In testing: The blank tally sheet may not always work yet…" shows in the Export menu, under **Blank tally sheet** (before the tweak in commit `eb6d023`, also build 66, no note showed). |
| `historyVideo` (build 65) | No build history video at the top of the Changelog, and the Guide line about it (section 9) and its changelog bullet are left out. Marked as in testing, the note "In testing: The build history video may not always work yet…" shows under its button. |

The Guide and Settings leave out the lines for switched-off features, and the Guide's numbered sections are renumbered so there are no gaps (with everything off it has 9 sections).

If `config.js` is missing or has a mistake (for example a stray comma), the browser reports a script error for it and the app opens with every feature on and no notes.

### Adding a switch for a new feature

`.claude/CLAUDE.md` (section "Site settings") gives the steps: add the name to `FEATURES` in `core.js` and to `config.js`, hide the feature's controls with `feat("name")` (in `applySite()` in `panels.js` or where the control is made), mark its Guide and Settings lines with `data-f="name"` (or `data-nf="name"` for wording used only when it is off), and add its note with `testNote("name", element)`, with a wording for it in `testNote()`.

## Optional files

- `logo.png`: used as the default logo in the header and on exports. Users can override it per device in **Settings → Logo**.
- `presets.json`: named lists of LPN prefixes for the manifest check, for example:

  ```json
  { "Standard": "RUN, QUB, VLT, RBY, IM, MDW, V, R, Q, M" }
  ```

## Verify it works

1. The page loads and the footer shows the version (for example `LPN Pallet Log v4.0`).
2. Add a pallet, then **Export → Download (Excel)** produces `LPN-log-<date>.xlsx`. The line under its tables and its page footer should name the version and the build you just published, for example "LPN Pallet Log v4.0 (build 53)".
3. In DevTools → Application, a service worker is active and caches named `lpn-log-v…` and (once a library has been used) `lpn-libs-v2` exist. `lpn-libs-v1` should no longer be there.
4. On a phone, the browser offers to install the app.
5. Optionally run the automatic checks: see [testing.md](testing.md).
