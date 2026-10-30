# LPN Pallet Log: working notes for Claude

A static goods-in web app published by GitHub Pages from `main` of `Jamie9904/Jamie9904.github.io`. There is no build step. The full conventions are in the `project-conventions` skill (saved to the user's Claude account, like the other skills named below).

## Branches

- `main` is the live site. Push to it **only when the user asks**.
- `docs` holds the documentation (`README.md` and `docs/`). Update it **every time a feature is added or changed**, using the `docs-updater` agent. **Never merge `docs` into `main`**, and never put the docs (or `.claude/` and `.mcp.json`) in the site zip. The hooks below enforce this.

## Releasing a change

Follow the `release-lpn` skill. In short:
1. Syntax check.
2. Bump `CACHE` in `sw.js`.
3. Add a changelog bullet, and update the Guide if needed.
4. Add or update checks (`lpn-write-check` skill) and run `npm test`. The real-library export checks are skipped here and run on GitHub: push the branch (branch pushes are fine) and read the "Checks" notice through the annotations API, as `release-lpn` shows.
5. Check the layout with the `phone-layout-checker` agent.
6. Have `release-reviewer` look at the diff.
7. Push when asked, then check the live site in the built-in browser, sync the outputs folder and zip, and list merged branches for the user to delete on GitHub (this session can't).
8. Run `docs-updater`.

For export changes, also use `export-reviewer` and the `live-export-check` skill. When import code, library loading, `package.json` versions or `index.html` change, also run `security-reviewer`. To upgrade a CDN library, follow the `lpn-library-upgrade` skill. For reported problems, start with the `lpn-bug-triage` skill. After bigger releases, offer the `lpn-phone-checklist`.

## Automations in this folder

| What | File | Does |
|---|---|---|
| Session start | `hooks/session_start.py` | Tracks every GitHub branch, fetches, gives the branch an upstream, sets `NODE_PATH`, and prints a status line (ahead/behind, build here vs live, docs lag) |
| Syntax check | `hooks/syntax-check.sh` | `node --check` after editing any `.js` file |
| Git guard | `hooks/lpn_git_guard.py` | Before `git commit`: blocks app changes without a cache bump, and `docs/` files on main. Before `git push`: runs the tests and blocks on failure (docs-branch pushes skip the tests). Blocks merging or pushing docs into main. |
| Docs reminder | `hooks/docs_reminder.py` | At the end of a turn, reminds once per main commit if the docs branch is behind |
| Download copy reminder | `hooks/outputs_reminder.py` | At the end of a turn, reminds once per main commit if the outputs folder or `lpn-site.zip` doesn't match main |
| Context7 | `../.mcp.json` | Live ExcelJS, jsPDF and pdf.js documentation lookup for export work (no key needed; a key only raises the rate limit). Works where `mcp.context7.com` is reachable: on your computer, or in cloud sessions once that host is allowed in the claude.ai network settings |
| Agents | `agents/*.md` | `export-reviewer`, `phone-layout-checker`, `docs-updater`, `release-reviewer`, `security-reviewer` |

`.github/workflows/test.yml` runs the tests on every push, including the real ExcelJS, jsPDF and pdf.js round trips (their versions are pinned in `package.json` to match the CDN copies the app loads; change both together). `.github/workflows/health.yml` checks the live site and the CDN libraries every week, including `tests/advisories.js`: it asks osv.dev about the four pinned library versions and fails on a new high or critical advisory. Advisories checked and found not to affect the app are listed with reasons in `tests/advisories-accepted.json`; keep those reasons true when the code changes. The same advisory check runs on every push without blocking it.

## Things the user decided

- Exports are mainly printed and used on desktop. Phones opening sheets zoomed in is fine, and there should be no saved zoom level.
- Don't reintroduce the compact Delivery/Manifest layout.
- UK English and plain wording in the app.
