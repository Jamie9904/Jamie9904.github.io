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

1. Commit the changed files.
2. If any app file changed, increase the cache name at the top of `sw.js`:

   ```js
   const CACHE="lpn-log-v22";   // → "lpn-log-v23"
   ```

   This installs a new service worker, which removes the old cache and triggers the "A new version is available" banner. If you add a new app file, also add it to the `SHELL` list in `sw.js`.
3. Push. Pages publishes in about a minute; the **Checks** workflow runs the automatic tests at the same time.

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
