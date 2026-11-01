# Feedback Worker

Turns **Report a problem or idea** from the app (Settings, and a link in the Guide) into issues in the private repo
`Jamie9904/lpn-feedback`. The app can't hold a GitHub key because the site is public, so this small Cloudflare
Worker holds it and checks every report first. Not part of the site zip.

- `worker.mjs`: the Worker (POST `/report`). Only the app's address may send; at most 10 reports an hour from one
  address and 50 reports (20 with photos) a day in total; text shown in the issue as plain text (no links, mentions or formatting); photos saved in the repo under
  `photos/` and shown in the issue.
- `wrangler.toml`: name, repo and the app's address.
- `.github/workflows/feedback-worker.yml`: puts it online (by hand from the Actions tab, and when this folder
  changes on `main`) and checks it answers.
- `tests/groups/11-feedback-worker.js` runs it with a stand-in for GitHub on every push.

## One-time set-up (about 15 minutes)

1. **Private repo:** on GitHub, create a new **private** repository named `lpn-feedback` (tick "Add a README").
2. **GitHub token:** GitHub > Settings > Developer settings > Fine-grained tokens > Generate new token.
   Repository access: *Only select repositories* > `lpn-feedback`. Permissions: **Issues: Read and write**,
   **Contents: Read and write**. Copy the token.
3. **Cloudflare:** sign up at dash.cloudflare.com (free plan). Note the **Account ID** (Workers & Pages overview,
   right-hand side). My Profile > API Tokens > Create Token > template **Edit Cloudflare Workers** > Create. Copy it.
4. **Secrets:** in `Jamie9904.github.io` on GitHub > Settings > Secrets and variables > Actions > New repository
   secret, add `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and `FEEDBACK_GITHUB_TOKEN`.
5. **Deploy:** Actions > *Deploy feedback Worker* > Run workflow (branch `main`). The run's notice gives the
   Worker's address, e.g. `https://lpn-feedback.<name>.workers.dev`.
6. **Connect the app:** set `FEEDBACK_URL` in `panels.js` to that address plus `/report`, and add the address to
   `connect-src` in the security policy in `index.html`. Then release as usual.

The tokens only ever live in GitHub's and Cloudflare's secret stores, never in the site or this repo.
