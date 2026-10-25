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
2. If you add a file, add it to the list at the top of `sw.js`. If you change `sw.js` or any icon, also change the cache name at the top of `sw.js` (for example `lpn-log-v3` to `lpn-log-v4`) so phones pick up the new files.
3. Wait a minute for Pages to publish.

Phones that already have the app open will show a "A new version is available" banner. Tap Refresh to load it. Nothing in the log is lost, because it is saved on the device as you work.

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
