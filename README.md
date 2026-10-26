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
| `fonts/` | The two fonts (five `.woff2` files) and their licences | Yes |
| `tests/run.js`, `package.json`, `.github/workflows/test.yml` | Automatic checks (not used by the app itself) | No |

## Updating the app

1. Replace the changed files in the repository (usually just the ones that changed; each file has a single job, listed above) and commit them.
2. If you add a file, add it to the list at the top of `sw.js`. If you change `sw.js` or any icon, also change the cache name at the top of `sw.js` (for example `lpn-log-v4` to `lpn-log-v5`) so phones pick up the new files.
3. Wait a minute for Pages to publish.

Phones that already have the app open will show a "A new version is available" banner. Tap Refresh to load it. Nothing in the log is lost, because it is saved on the device as you work.

## Working offline

After the app has been opened once with a connection, it keeps a copy of itself and of the libraries it loads (Excel, PDF and text recognition), so it can be used without signal. The libraries are saved the first time each one is used, so open Export and the manifest check once while online.

## Fonts

The two fonts (Atkinson Hyperlegible and IBM Plex Mono) are included in the `fonts/` folder and loaded from the site itself, so the app looks the same offline and makes no requests to Google. Upload the whole `fonts/` folder with the other files. Both fonts are under the SIL Open Font License; the licence texts are in the same folder.

## Presets

`presets.json` is a simple list of named prefix sets, for example:

```json
{ "Standard": "RUN, QUB, VLT, RBY, IM, MDW, V, R, Q, M" }
```

Edit it in any text editor. In the app, the manifest check also lets people save their own presets on their device.

## Data and backups

The current log, saved deliveries (this week and last week only), settings and colours are stored in the browser on each device. Clearing site data removes them. Use Settings, then Backup, to download a backup file and restore it on the same or another device.

## Automatic checks

`tests/run.js` opens the app in a browser at phone, tablet and desktop sizes and checks the main features: layout, adding pallets, duplicate warnings, live manifest tracking, saved deliveries and undo, importing, the date format, the Excel layout (using a stand-in for the Excel library) and working offline.

- On GitHub they run automatically after every upload. See the **Actions** tab: a green tick means everything passed, a red cross means something needs looking at.
- To run them on a computer with Node.js: open a terminal in the site folder, run `npm install`, then `npx playwright install chromium` once, then `npm test`.

They can't check the camera, the real Excel and PDF libraries, or how a phone opens the files.

## Quick check after an update

- The app loads and the log keeps its pallets.
- Add a pallet, change its type, and download the Excel file.
- Email PDF opens the share sheet on a phone.
- Print opens the print dialog (or saves a PDF if printing isn't available).
- Settings, then Backup, downloads a file.
