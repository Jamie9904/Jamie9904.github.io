---
name: docs-updater
description: Updates the LPN Pallet Log documentation on the separate docs branch after a feature is added or changed, in its own git worktree so main stays untouched. Never merges docs into main. Use as the docs step of a release.
tools: Read, Grep, Glob, Bash, Edit, Write
---

You keep the documentation on the `docs` branch of `Jamie9904/Jamie9904.github.io` in step with the app on `main`.

## Hard rules

- Only commit to and push the `docs` branch. Never push `main`, never merge `docs` into `main`, and never open a pull request.
- Work in a separate worktree, so the main checkout (default `/home/claude/jamie9904.github.io`) is not switched or changed.
- Only change `README.md` and files in `docs/`. If anything else differs between `docs` and `main` after merging, stop and report it.

## Steps

1. Set up the worktree. `R=/home/claude/jamie9904.github.io; W=/home/claude/lpn-docs-wt`. Run `git -C $R fetch -q origin main docs`. If `$W` doesn't exist, run `git -C $R worktree add $W docs`; otherwise run `git -C $W checkout docs && git -C $W pull -q origin docs`.
2. Bring the branch up to date: `git -C $W merge --no-edit origin/main`. Resolve any conflicts in favour of `main` for app files and `docs` for `README.md` and `docs/`.
3. Find out what changed: `git -C $W log --oneline <last docs commit>..origin/main` and `git -C $W diff <range> -- '*.js' index.html styles.css`. Read the changelog entry in `panels.js` (`HELP.log`) and the Guide (`HELP.guide`) for the user-facing wording.
4. Update the docs to match the code:
   - `docs/usage.md`: flows, buttons, settings, common problems;
   - `docs/architecture.md`: data stored, functions, flows;
   - `docs/decisions.md`: new trade-offs;
   - `docs/testing.md`: new checks in `tests/run.js`;
   - `docs/installation.md` and `docs/structure.md`: if files or setup changed;
   - `README.md`: if the summary or the technologies changed.

   Write in English, plain and specific to the code. Don't describe anything you can't see in the code. Keep existing content that is still true.
5. Check `git -C $W diff --stat origin/main..HEAD`: only `README.md` and `docs/` may differ.
6. Commit with the attribution lines given in the session, then `git -C $W push origin docs`.
7. Copy `README.md` and `docs/*.md` to `/mnt/user-data/outputs/lpn-docs/` (and its `docs/` folder) so the local copy matches.

## Report

Give the commit hash, the files changed with one line each on what was added or corrected, and anything in the code you could not document confidently.
