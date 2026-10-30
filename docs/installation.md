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
3. Push. Pages publishes in about a minute; the **Checks** workflow runs the automatic tests at the same time.

Users tap **Refresh** on the banner. The log is kept, because it is stored on the device.

### Changing a library version

The version of each CDN library is written in three places that must agree: the CDN addresses in `export.js`, `compare.js` or `scan.js`, the exact version in `package.json` `devDependencies`, and (for every library loaded by a script tag) the `sha384` hash in the `SRI` map in `core.js`, for both the cdnjs and jsDelivr address. The checks fail if the first two differ or if an address has no hash, and the browser refuses a file whose hash doesn't match. Run `node tests/sri.js` (needs internet) to confirm the hashes, and `node tests/advisories.js` to check the new version for advisories; remove any entries in `tests/advisories-accepted.json` that no longer apply. In Claude Code, the `lpn-library-upgrade` skill (saved to the user's Claude account, not in the repository) is the step-by-step version.

### Guards when working with Claude Code

`.claude/settings.json` registers hooks that run when a Claude Code session starts, edits files or runs git commands in this repository:

- **Session start:** `.claude/hooks/session_start.py` (`SessionStart`, 90-second limit) finds the repository, either the project folder itself or one folder below it (cloud sessions start in `/home/claude`). If there is an `origin` remote, it sets `remote.origin.fetch` to `+refs/heads/*:refs/remotes/origin/*` so every GitHub branch is tracked, and runs `git fetch --prune` without ever asking for a password. If the current branch has no upstream but GitHub has a branch of the same name, it sets that as the upstream. It adds the global npm folder to `NODE_PATH` for the session (through `CLAUDE_ENV_FILE`) so `npm test` finds a globally installed Playwright. Then it prints one status line: commits ahead and behind GitHub, uncommitted files, the build number here and on the live site (`origin/main:sw.js`, with a reminder to bump on a feature branch that isn't ahead of it), and how many app commits the `docs` branch is behind `main`. It never blocks the session; problems such as a failed fetch only appear in the status line.
- **Syntax check:** after a `.js` file is edited or written, `node --check` runs on it and a syntax error is reported straight away.
- **Cache bump:** a `git commit` is blocked if any app file (`index.html`, `styles.css`, the five scripts, `manifest.webmanifest`, the icons or `fonts/`) changed and the `CACHE` number in `sw.js` is neither changed in this commit nor higher than the one on the live site (`origin/main`). So once a branch has bumped it, later commits before publishing don't need another bump.
- **Only real git commands count:** the guard reacts to `git commit`, `git push` and `git merge … docs` (also with `git -C <path>`), not to other commands that happen to contain those words, such as `git stash push` or an `echo`.
- **Docs stay off `main`:** a `git commit` on `main` is blocked if it would include files in `docs/`, and merging `docs` into `main` or pushing `docs` to `main` is blocked. The documentation is updated on the `docs` branch instead.
- **Checks before push:** a `git push` runs `node tests/run.js` (the `npm test` checks) first and is blocked if any fail (see [testing.md](testing.md)). Pushes of only the `docs` branch skip this.
- **Docs reminder:** at the end of a Claude Code turn, if `origin/main` has app changes that `origin/docs` does not, Claude is reminded once per `main` commit to update the docs branch. Like the session-start hook, it also finds the repository one folder below the project folder.
- **Download copy reminder:** `.claude/hooks/outputs_reminder.py` (also a `Stop` hook, 60-second limit) compares each site file in `origin/main` (everything except `.claude/`, `docs/` and `.mcp.json`) with the copy in `/mnt/user-data/outputs/lpn-site` by git blob hash, and checks `lpn-site.zip` isn't older than that folder. If they don't match it reminds Claude, once per `main` commit, to sync them. It does nothing where there is no outputs folder, such as on your own computer.

### Agents for Claude Code

`.claude/agents/` holds helpers that Claude Code can hand work to (`docs-updater` is the only one given edit tools): `export-reviewer` (export changes), `phone-layout-checker` (layout on phone widths), `release-reviewer` (the diff before a release), `docs-updater` (this documentation on the `docs` branch) and `security-reviewer`. `security-reviewer` checks files and text from outside (supplier PDFs, spreadsheets, backups, photos, presets) and the CDN libraries, and is used when import code, library loading, `package.json` versions or `index.html` change, and before a library upgrade.

These hooks only run inside Claude Code. Commits and pushes made by hand or through the GitHub website are not checked by them, so the cache bump is still your responsibility there.

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
