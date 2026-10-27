# Installation

## Prerequisites

- Any static web host served over **HTTPS**. Camera scanning, installing as an app, the service worker and the share sheet all require a secure origin. GitHub Pages provides this.
- A modern browser. Chrome on Android and Safari on iPhone are the targets; live scanning uses `BarcodeDetector` where available and ZXing elsewhere.
- Internet access the first time each export or OCR feature is used, so its library can be fetched from cdnjs or jsDelivr and cached.
- For the automatic checks only: Node.js 18+ (CI uses 22).

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

   This installs a new service worker, which removes the old cache and triggers the "A new version is available" banner. If you add a new app file, also add it to the `SHELL` list in `sw.js`.
2. Commit the changed files together with `sw.js`.
3. Push. Pages publishes in about a minute; the **Checks** workflow runs the automatic tests at the same time.

### Guards when working with Claude Code

`.claude/settings.json` registers hooks that run when Claude Code edits files or runs git commands in this repository:

- **Syntax check:** after a `.js` file is edited or written, `node --check` runs on it and a syntax error is reported straight away.
- **Cache bump:** a `git commit` is blocked if any app file (`index.html`, `styles.css`, the five scripts, `manifest.webmanifest`, the icons or `fonts/`) changed but the `CACHE` line in `sw.js` did not.
- **Docs stay off `main`:** a `git commit` on `main` is blocked if it would include files in `docs/`, and merging `docs` into `main` or pushing `docs` to `main` is blocked. The documentation is updated on the `docs` branch instead.
- **Checks before push:** a `git push` runs `node tests/run.js` (the `npm test` checks) first and is blocked if any fail (see [testing.md](testing.md)). Pushes of only the `docs` branch skip this.
- **Docs reminder:** at the end of a Claude Code turn, if `origin/main` has app changes that `origin/docs` does not, Claude is reminded once per `main` commit to update the docs branch.

These hooks only run inside Claude Code. Commits and pushes made by hand or through the GitHub website are not checked by them, so the cache bump is still your responsibility there.

Users tap **Refresh** on the banner. The log is kept, because it is stored on the device.

## Optional files

- `logo.png`: used as the default logo in the header and on exports. Users can override it per device in the app.
- `presets.json`: named lists of LPN prefixes for the manifest check, for example:

  ```json
  { "Standard": "RUN, QUB, VLT, RBY, IM, MDW, V, R, Q, M" }
  ```

## Verify it works

1. The page loads and the footer shows the version (for example `LPN Pallet Log v3.30`).
2. Add a pallet, then **Export → Download (Excel)** produces `LPN-log-<date>.xlsx`.
3. In DevTools → Application, a service worker is active and caches named `lpn-log-v…` and `lpn-libs-v1` exist.
4. On a phone, the browser offers to install the app.
5. Optionally run the automatic checks: see [testing.md](testing.md).
