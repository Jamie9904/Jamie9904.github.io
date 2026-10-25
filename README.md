# LPN Pallet Log

A goods-in web app for logging pallet LPNs, exporting the log, and checking a delivery against its manifest. It runs entirely in the browser: there is no server, and data is stored on the device.

## Files

Keep these together in the same folder (the root of the GitHub Pages site):

| File | Purpose | Required |
| --- | --- | --- |
| `index.html` | The page layout and structure | Yes |
| `styles.css` | All styling and themes | Yes |
| `core.js` | Logging, the pallet table, duplicate checks, undo, settings values | Yes |
| `scan.js` | Barcode scanning (live and by photo) | Yes |
| `export.js` | Excel, PDF and print output, and the logo | Yes |
| `compare.js` | Manifest check, text recognition and prefix presets | Yes |
| `panels.js` | Guide, changelog, Settings, saved deliveries, install pop-up and update banner | Yes |
| `manifest.webmanifest` | Lets the app be installed on a phone | For install |
| `sw.js` | Service worker: offline copy and the "new version available" banner | For install |
| `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | App icons | For install |
| `presets.json` | Shared LPN prefix presets for the manifest check | Optional |
| `logo.png` | Default logo shown in the app and on exports | Optional |

## Publishing on GitHub Pages

1. Create a repository and upload all the files above to the main branch.
2. In the repository go to Settings, then Pages, choose "Deploy from a branch", pick the main branch and the root folder, and save.
3. After a minute or two the site is live at `https://<username>.github.io/<repository>/`.

The page must be served over https for the camera, installing and sharing to work. GitHub Pages does this for you.

## Updating the app

1. Replace the changed files in the repository (usually just the ones that changed; each file has a single job, listed above) and commit them.
2. If you add a file, add it to the list at the top of `sw.js`. If you change `sw.js` or any icon, also change the cache name at the top of `sw.js` (for example `lpn-log-v4` to `lpn-log-v5`) so phones pick up the new files.
3. Wait a minute for Pages to publish.

Phones that already have the app open will show a "A new version is available" banner. Tap Refresh to load it. Nothing in the log is lost, because it is saved on the device as you work.

## Working offline

After the app has been opened once with a connection, it keeps a copy of itself and of the libraries it loads (Excel, PDF and text recognition, plus fonts), so it can be used without signal. The libraries are saved the first time each one is used, so open Export and the manifest check once while online.

## Self-hosting the fonts (optional)

The app loads two fonts from Google Fonts (Atkinson Hyperlegible and IBM Plex Mono). They are saved for offline use after the first load, and the app falls back to the system font if they can't be loaded. To remove the dependency on Google completely:

1. Download the `.woff2` files for Atkinson Hyperlegible (regular and bold) and IBM Plex Mono (regular, medium and semibold), for example from fontsource.org, into a `fonts/` folder in the repository.
2. Add a matching `@font-face` rule for each to the top of `styles.css`, with `font-display:swap`.
3. Delete the three Google Fonts lines (two `preconnect` links and the `stylesheet` link) from `index.html`.
4. Add the `fonts/...` files to the list at the top of `sw.js` and change the cache name.

## Presets

`presets.json` is a simple list of named prefix sets, for example:

```json
{ "Standard": "RUN, QUB, VLT, RBY, IM, MDW, V, R, Q, M" }
```

Edit it in any text editor. In the app, the manifest check also lets people save their own presets on their device.

## Data and backups

The current log, saved deliveries (this week and last week only), settings and colours are stored in the browser on each device. Clearing site data removes them. Use Settings, then Backup, to download a backup file and restore it on the same or another device.

## Quick check after an update

- The app loads and the log keeps its pallets.
- Add a pallet, change its type, and download the Excel file.
- Email PDF opens the share sheet on a phone.
- Print opens the print dialog (or saves a PDF if printing isn't available).
- Settings, then Backup, downloads a file.
