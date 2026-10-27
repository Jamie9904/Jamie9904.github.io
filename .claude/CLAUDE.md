# LPN Pallet Log: working notes for Claude

A static goods-in web app published by GitHub Pages from `main` of `Jamie9904/Jamie9904.github.io`. There is no build step. The full conventions are in the `project-conventions` skill.

## Branches

- `main` is the live site. Push to it **only when the user asks**.
- `docs` holds the documentation (`README.md` and `docs/`). Update it **every time a feature is added or changed**, using the `docs-updater` agent. **Never merge `docs` into `main`**, and never put the docs in the site zip. The hooks below enforce this.

## Releasing a change

Follow the `release-lpn` skill. In short:
1. Syntax check.
2. Bump `CACHE` in `sw.js`.
3. Add a changelog bullet, and update the Guide if needed.
4. Add or update checks (`lpn-write-check` skill) and run `npm test`.
5. Check the layout with the `phone-layout-checker` agent.
6. Have `release-reviewer` look at the diff.
7. Push when asked, then check the live site in the built-in browser.
8. Run `docs-updater`.

For export changes, also use `export-reviewer` and the `live-export-check` skill. For reported problems, start with the `lpn-bug-triage` skill. After bigger releases, offer the `lpn-phone-checklist`.

## Automations in this folder

| What | File | Does |
|---|---|---|
| Syntax check | `hooks/syntax-check.sh` | `node --check` after editing any `.js` file |
| Git guard | `hooks/lpn_git_guard.py` | Before `git commit`: blocks app changes without a cache bump, and `docs/` files on main. Before `git push`: runs the tests and blocks on failure (docs-branch pushes skip the tests). Blocks merging or pushing docs into main. |
| Docs reminder | `hooks/docs_reminder.py` | At the end of a turn, reminds once per main commit if the docs branch is behind |
| Agents | `agents/*.md` | `export-reviewer`, `phone-layout-checker`, `docs-updater`, `release-reviewer` |

`.github/workflows/test.yml` runs the tests on every push. `.github/workflows/health.yml` checks the live site and the CDN libraries every week.

## Things the user decided

- Exports are mainly printed and used on desktop. Phones opening sheets zoomed in is fine, and there should be no saved zoom level.
- Don't reintroduce the compact Delivery/Manifest layout.
- UK English and plain wording in the app.
