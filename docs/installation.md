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

## Publishing an update

1. If any app file changed, increase the cache name at the top of `sw.js`:

   ```js
   const CACHE="lpn-log-v23";   // → "lpn-log-v24"
   ```

   This installs a new service worker, which removes the old cache and triggers the "A new version is available" banner. The number is also the build number printed on every export. If you add a new app file, also add it to the `SHELL` list in `sw.js`.
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

It stops at the first problem with a line starting `STOPPED:` (for example "not on the updates branch", "updates isn't pushed to GitHub yet", "Checks on main: failure" or "live site check failed (run N)", with the health check's notices) and goes back to `updates`. Each wait for a Checks or Pages run gives up after 15 minutes. It ends with `Done: lpn-log-vN is live. Next: docs-updater.`; the `docs` branch is not touched, so update it afterwards. Its first use, on 31 Oct 2026, passed every step.

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

- The browser context uses the `en-GB` locale and the `Europe/London` time zone, so dates in the video show UK style.
- There is no camera, so before the app loads it replaces `navigator.mediaDevices.getUserMedia` with a stream from a drawn canvas (`captureStream(30)`): a grey background with a white label that shows bars and the code in `window.__showCode`, or "…" when that is empty. It also replaces `window.BarcodeDetector` with a stand-in whose `detect()` returns `window.__showCode` while one is set. Everything after the code is reported (adding the pallet with the selected type and the "Added" message) is the app's own `onCode`.
- The scanning scene (8.4 s) taps **FMCG**, **Scan** and **Live scan**, scrolls the camera box and **Stop scanning** into view, shows `VLT004037901` (added as FMCG), taps **BB**, then shows `RUN0001830770` (added as BB). It then taps **Stop scanning** and closes the scan buttons, so the next scene starts with them closed. Its headline is "Log pallets" / "Pick the type, then scan." and its narration is "Pick the pallet type first, then scan. Each pallet is logged with that type, so change it before the next one."

A check in `tests/run.js` fails if the video is over 3 MB. Re-record when `npm test` prints that the screens differ from the demo video (on GitHub, the "Demo video may be out of date" warning) and the change shows in the video. The weekly health check also downloads the live video and checks it plays.

### Checking photo reading on real manifest photos

`tools/ocr-check/` scores the app's photo reading on the user's four manifest photos (`photos/`, address boxes cut off) against `expected.json` (18 LPNs). It needs Node.js with Playwright, and either the Tesseract 5 command (`cli` engine, offline) or internet access to `cdn.jsdelivr.net` and the tessdata download (`js` engine, the app's real `ocrLpns()`):

```bash
NODE_PATH=$(npm root -g) node tools/ocr-check/check.js
NODE_PATH=$(npm root -g) node tools/ocr-check/check.js --prefix=VLT
NODE_PATH=$(npm root -g) node tools/ocr-check/check.js --url=https://jamie9904.github.io/
```

The last line reads the photos with the app at that address (here the live site) instead of the files in the folder. See [testing.md](testing.md#photo-reading-check-toolsocr-check) for the options. On GitHub the checks read the same photos with the real tesseract.js, and the weekly health check reads them with the live site. Like the rest of `tools/`, it is not part of the site zip.

### Guards when working with Claude Code

`.claude/settings.json` registers hooks that run when a Claude Code session starts, edits files or runs git commands in this repository:

- **Session start:** `.claude/hooks/session_start.py` (`SessionStart`, 90-second limit) finds the repository, either the project folder itself or one folder below it (cloud sessions start in `/home/claude`). If there is an `origin` remote, it sets `remote.origin.fetch` to `+refs/heads/*:refs/remotes/origin/*` so every GitHub branch is tracked, and runs `git fetch --prune` without ever asking for a password. If the current branch has no upstream but GitHub has a branch of the same name, it sets that as the upstream. It adds the global npm folder to `NODE_PATH` for the session (through `CLAUDE_ENV_FILE`) so `npm test` finds a globally installed Playwright. Then it prints one status line: commits ahead and behind GitHub, uncommitted files, the build number here and on the live site (`origin/main:sw.js`, with a reminder to bump on a feature branch that isn't ahead of it), and how many app commits the `docs` branch is behind `main`. When GitHub has an `updates` branch, the line also says so if the session is on any branch other than `updates` or `docs`, and if `updates` is behind `main` (with the `git merge --ff-only origin/main` to run). When `media/demo.mp4` exists, it counts the commits since the video was last committed that changed `index.html` or `styles.css` (script changes are not counted, as they rarely show in the video), and if there are any it says "page or styles changed N time(s) since the demo video: npm test says if the screens differ". The real comparison is the screen fingerprint in `npm test` (see [Re-recording the Guide demo video](#re-recording-the-guide-demo-video)). It never blocks the session; problems such as a failed fetch only appear in the status line.
- **Syntax check:** after a `.js` file is edited or written, `node --check` runs on it and a syntax error is reported straight away.
- **Cache bump:** a `git commit` is blocked if any app file (`index.html`, `styles.css`, the five scripts, `manifest.webmanifest`, the icons or `fonts/`) changed and the `CACHE` number in `sw.js` is neither changed in this commit nor higher than the one on the live site (`origin/main`). So once a branch has bumped it, later commits before publishing don't need another bump.
- **One working branch:** when GitHub has an `updates` branch, a `git commit` on `main` is blocked, and so is creating a new branch (`git checkout -b`/`-B`, `git switch -c`/`-C`/`--create`, or `git branch <name>`; listing, deleting and setting an upstream with `git branch -…` are still allowed). See [Working branches](#working-branches).
- **Only real git commands count:** the guard reacts to `git commit`, `git push`, `git merge … docs` and the new-branch commands above (also with `git -C <path>`), not to other commands that happen to contain those words, such as `git stash push` or an `echo`.
- **Docs stay off `main`:** a `git commit` on `main` is blocked if it would include files in `docs/`, and merging `docs` into `main` or pushing `docs` to `main` is blocked. The documentation is updated on the `docs` branch instead.
- **Checks before push:** a `git push` runs `node tests/run.js` (the `npm test` checks) first and is blocked if any fail (see [testing.md](testing.md)). Pushes of only the `docs` branch skip this.
- **Docs reminder:** at the end of a Claude Code turn, if `origin/main` has app changes that `origin/docs` does not, Claude is reminded once per `main` commit to update the docs branch. Like the session-start hook, it also finds the repository one folder below the project folder.
- **Download copy reminder:** `.claude/hooks/outputs_reminder.py` (also a `Stop` hook, 60-second limit) compares each site file in `origin/main` (everything except `.claude/`, `docs/`, `tools/` and `.mcp.json`) with the copy in `/mnt/user-data/outputs/lpn-site` by git blob hash. The outputs storage rewrites the metadata of pictures and video after they are saved, so a `.mp4`, `.webm`, `.jpg`, `.jpeg` or `.png` whose bytes differ still counts as matching if `ffmpeg` decodes the same picture from both main's own copy and the outputs copy (an MD5 of the first video stream). Main's copy is taken from git (`git show origin/main:<file>` into a temporary file), not from the working tree, which may hold a newer picture or video that isn't live yet. It also checks `lpn-site.zip` isn't older than that folder. If they don't match it reminds Claude, once per `main` commit, to sync them. It does nothing where there is no outputs folder, such as on your own computer.

### Agents for Claude Code

`.claude/agents/` holds helpers that Claude Code can hand work to (`docs-updater` is the only one given edit tools): `export-reviewer` (export changes), `phone-layout-checker` (layout on phone widths), `release-reviewer` (the diff before a release), `docs-updater` (this documentation on the `docs` branch), `security-reviewer`, `ocr-reviewer` and `a11y-reviewer`. `security-reviewer` checks files and text from outside (supplier PDFs, spreadsheets, backups, photos, presets) and the CDN libraries, and is used when import code, library loading, `package.json` versions or `index.html` change, and before a library upgrade. `ocr-reviewer` (read-only) reviews changes to photo reading (`prep`, `cropScaled`, `ocrLpns`, `tidyReads`, `photoLpns`, `extractLpns` in `compare.js`): it runs `tools/ocr-check` (also with `--prefix=VLT`), reports the score, and checks that no repair turns a right number into a wrong one, that nothing is left out silently, phone memory and time, browser differences, the checks and the wording.

These hooks only run inside Claude Code. Commits and pushes made by hand or through the GitHub website are not checked by them, so the cache bump is still your responsibility there.

`a11y-reviewer` (read-only) reviews accessibility after UI changes (new controls, messages or colours) and for an occasional full audit. It opens the app with Playwright at 360×740, 390×844 and 1300×900 in light and dark colour schemes, with the service worker blocked and realistic data, opens each panel, and measures rather than guesses (`getComputedStyle`, `getBoundingClientRect`, the accessibility snapshot). Its checklist: accessible names for every control; contrast (4.5:1 for text, 3:1 for large text, controls and focus rings, also with a user-picked theme colour); tap targets of at least 44×44 px on phones for the controls used while scanning (add pallet, type buttons, undo, remove, the FSDU tick box) and 24×24 elsewhere; keyboard and focus (visible, never hidden under the fixed phone entry bar or the header, kept in open panels, nothing reachable while `inert`); status messages announced without taking focus, and colour never the only signal; structure (one `h1`, headings in order, landmarks, `lang="en-GB"`, `aria-expanded`, table headers); 200% zoom and the Extra large text size at 360 px; reduced motion, and sound and vibration that can be turned off; and subtitles and reachable controls on the demo video. It reports findings most serious first, and ends with the three fixes that would help warehouse users most. It follows the `web-accessibility` skill when that is available.

### Skills for Claude Code

The procedures Claude Code follows (for example `release-lpn`, `lpn-write-check`, `lpn-library-upgrade`, `lpn-demo-video`, `lpn-photo-check`, `lpn-bug-triage`) are skills saved to the user's Claude account, not files in the repository. `release-lpn` publishes with `tools/release/ship.sh` (see [Publishing with the release script](#publishing-with-the-release-script)). `lpn-photo-check` is used with `ocr-reviewer` for photo reading changes; `lpn-bug-triage` is the starting point for reported problems and works from the problem report downloaded in Settings (Claude asks for it if it hasn't been sent). Three general web quality skills are saved the same way, adapted from [addyosmani/web-quality-skills](https://github.com/addyosmani/web-quality-skills) (MIT licence): `web-accessibility`, `web-performance` and `web-best-practices`.

### Library documentation for Claude Code (Context7)

`.mcp.json` at the root of `main` registers the Context7 MCP server (`"type": "http"`, `https://mcp.context7.com/mcp`) so Claude Code can look up current ExcelJS, jsPDF and pdf.js documentation during export work. No key is needed (a key only raises the rate limit). It only works where `mcp.context7.com` can be reached: on your own computer, or in a Claude cloud session once that host is allowed in the claude.ai network settings. The app doesn't use it; GitHub Pages doesn't publish it (Jekyll leaves out dotfiles), and it is kept out of the site zip like `.claude/`.

## Optional files

- `logo.png`: used as the default logo in the header and on exports. Users can override it per device in **Settings → Logo**.
- `presets.json`: named lists of LPN prefixes for the manifest check, for example:

  ```json
  { "Standard": "RUN, QUB, VLT, RBY, IM, MDW, V, R, Q, M" }
  ```

## Verify it works

1. The page loads and the footer shows the version (for example `LPN Pallet Log v3.30`).
2. Add a pallet, then **Export → Download (Excel)** produces `LPN-log-<date>.xlsx`. The line under its tables and its page footer should name the version and the build you just published, for example "LPN Pallet Log v3.30 (build 26)".
3. In DevTools → Application, a service worker is active and caches named `lpn-log-v…` and (once a library has been used) `lpn-libs-v2` exist. `lpn-libs-v1` should no longer be there.
4. On a phone, the browser offers to install the app.
5. Optionally run the automatic checks: see [testing.md](testing.md).
