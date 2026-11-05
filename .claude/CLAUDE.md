# LPN Pallet Log: working notes for Claude

A static goods-in web app published by GitHub Pages from `main` of `Jamie9904/Jamie9904.github.io`. There is no build step. The full conventions are in the `project-conventions` skill (saved to the user's Claude account, like the other skills named below).

## Branches

- `main` is the live site. Push to it **only when the user asks**.
- `updates` is the one working branch for every change (the git guard blocks commits on `main` and creating new branches). Commit and push there freely (pushing it doesn't change the live site, and GitHub runs all the checks on it). Don't create a new branch per change.
  - Start of work: `git checkout updates`; if `main` has moved ahead, `git merge --ff-only origin/main` first.
  - When the user says "push it": `git checkout main && git pull --ff-only origin main && git merge --ff-only updates && git push origin main`, then `git checkout updates`. After a release `updates` and `main` are the same.
- `docs` holds the documentation (`README.md` and `docs/`). Update it **every time a feature is added or changed**, using the `docs-updater` agent. **Never merge `docs` into `main`**, and never put the docs (or `.claude/`, `tools/` and `.mcp.json`) in the site zip. The hooks below enforce this.

## Releasing a change

Follow the `release-lpn` skill. In short:
1. Syntax check.
2. Bump `CACHE` in `sw.js` (`sh tools/release/bump.sh`, run on its own before the commit).
3. Add a changelog bullet, and update the Guide if needed.
4. Add or update checks (`lpn-write-check` skill) and run `npm test`. The real-library export checks are skipped here and run on GitHub: push the branch (branch pushes are fine) and read the "Checks" notice through the annotations API, as `release-lpn` shows.
5. Check the layout with the `phone-layout-checker` agent.
6. Have `release-reviewer` look at the diff, and `guide-checker` check the Guide, Settings and privacy text against the code when behaviour changed.
7. Push when asked: `sh tools/release/ship.sh` (fast-forwards `main` to `updates` after GitHub's Checks passed on it, waits for Checks and Pages, runs the health check on the live site, and syncs the outputs folder and zip). Check the live site in the built-in browser too when it is connected.
8. Run `docs-updater`.

For export changes, also use `export-reviewer` and the `live-export-check` skill. When saved data, backups or how exports and imports are read or written change, also run `old-data-checker` (and after release, add a new set of old-build files with the `lpn-old-data-fixtures` skill if the data shape changed). For photo reading changes (`prep`, `ocrLpns`, `tidyReads` in compare.js), also use `ocr-reviewer` and the `lpn-photo-check` skill. After UI changes (new controls, messages, colours), also use `a11y-reviewer`. When import code, library loading, `package.json` versions or `index.html` change, also run `security-reviewer`. To upgrade a CDN library, follow the `lpn-library-upgrade` skill. For reports sent from the app's Report button (issues in the private repo `Jamie9904/lpn-feedback`), use the `lpn-feedback-triage` skill. For reported problems, start with the `lpn-bug-triage` skill; ask for the problem report from Settings if the user hasn't sent one. After bigger releases, offer the `lpn-phone-checklist`.

## Automations in this folder

| What | File | Does |
|---|---|---|
| Session start | `hooks/session_start.py` | Tracks every GitHub branch, fetches, gives the branch an upstream, sets `NODE_PATH`, and prints a status line (ahead/behind, build here vs live, docs lag) |
| Syntax check | `hooks/syntax-check.sh` | `node --check` after editing any `.js` file |
| Config check | `hooks/config_check.js` | After editing `config.js`: checks it runs and uses only known feature names with true or false (the same rules as the GitHub check). Settings changes on request use the `lpn-site-settings` skill |
| Git guard | `hooks/lpn_git_guard.py` | Before `git commit`: blocks app changes without a cache bump, `docs/` files on main, and new or changed manifest photos in `tools/ocr-check/photos/` until each has been opened and checked for addresses, names and phone numbers (`sh tools/release/photo-ok.sh <file>` confirms it). Before `git push`: runs the tests and blocks on failure (docs-branch pushes skip the tests). Blocks merging or pushing docs into main. |
| UK spelling | `hooks/uk_spelling.js` | After editing `index.html` or an app `.js` file: flags US spellings (color, organize, center, canceled…) in text people see, not in CSS or code names. `node .claude/hooks/uk_spelling.js --all` checks every app file |
| Docs reminder | `hooks/docs_reminder.py` | At the end of a turn, reminds once per main commit if the docs branch is behind |
| Download copy reminder | `hooks/outputs_reminder.py` | At the end of a turn, reminds once per main commit if the outputs folder or `lpn-site.zip` doesn't match main |
| Context7 | `../.mcp.json` | Live ExcelJS, jsPDF and pdf.js documentation lookup for export work (no key needed; a key only raises the rate limit). Works where `mcp.context7.com` is reachable: on your computer, or in cloud sessions once that host is allowed in the claude.ai network settings |
| Demo video | `../tools/demo-video/` | Re-records the Guide's narrated demo (`media/demo.mp4`) from the current app: `sh tools/demo-video/make.sh` (the `lpn-demo-video` skill). Not part of the site zip. The checks compare the key screens with the video's fingerprint (`screens.json`) and warn when they differ; `health.yml` checks every week that the live video downloads and plays |
| Photo check | `../tools/ocr-check/` | Runs the app's photo reading on the user's real manifest photos (address boxes cut off) and scores them against `expected.json`: `node tools/ocr-check/check.js [folder] [--prefix=VLT]`. Not part of the site zip. On GitHub the checks read the same photos with the real phone reader and fail if any LPN is wrong, missing or extra; `health.yml` also reads them with the live site every week (`--url=`) |
| Old data | `../tools/old-data/` | Makes the saved files in `tests/fixtures/old/` from older builds' own code (log and saved deliveries in the browser, backup, Excel cells, PDF hidden data): `node tools/old-data/make.js && python3 tools/old-data/files.py`. `tests/groups/21-old-data.js` checks the current app opens them all; the real .xlsx and .pdf only on GitHub. Not part of the site zip |
| Release | `../tools/release/ship.sh` | Puts `updates` live and checks it (see step 7). Only when the user asks to push. Reruns a GitHub run that was cancelled once. Not part of the site zip |
| Report system | `../tools/feedback-worker/` | Cloudflare Worker that turns Report-button reports into issues in `Jamie9904/lpn-feedback`; deployed by `.github/workflows/feedback-worker.yml` (run by hand, tick "test report" to check end to end). `health.yml` checks every week that it answers and that its GitHub token works, and warns 30 days before the token runs out |
| Agents | `agents/*.md` | `export-reviewer`, `phone-layout-checker`, `docs-updater` (one at a time, using the lock file `/home/claude/lpn-docs-wt.lock`), `release-reviewer` (includes a never-build list of things the user decided against), `old-data-checker`, `guide-checker`, `security-reviewer`, `ocr-reviewer`, `a11y-reviewer` |

`.github/workflows/test.yml` runs the tests on every push, including the real ExcelJS, jsPDF and pdf.js round trips (their versions are pinned in `package.json` to match the CDN copies the app loads; change both together). `.github/workflows/health.yml` checks the live site and the CDN libraries every week, including `tests/advisories.js`: it asks osv.dev about the four pinned library versions and fails on a new high or critical advisory. Advisories checked and found not to affect the app are listed with reasons in `tests/advisories-accepted.json`; keep those reasons true when the code changes. The same advisory check runs on every push without blocking it.

## Site settings

`config.js` (loaded before `core.js`) switches features on or off for everyone and can mark any of them as "in testing", which adds a note to that feature. Keys are listed in `FEATURES` in `core.js`; a check (`tests/groups/19-site-config.js`) fails on GitHub if config.js has a mistake or an unknown name. The app loads its files network-first, so a config edit on GitHub reaches phones the next time they open the app online, without a cache bump. When adding a feature that people may want to switch off, add its key to `FEATURES` and `config.js`, hide it with `feat("key")`, mark its Guide lines with `data-f="key"`, and give it a `testNote("key", …)`.

## Things the user decided

- Exports are mainly printed and used on desktop. Phones opening sheets zoomed in is fine, and there should be no saved zoom level.
- Don't reintroduce the compact Delivery/Manifest layout.
- UK English and plain wording in the app.
