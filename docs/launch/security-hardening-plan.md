# Security Hardening Plan

Tracked follow-up from the July 2026 security review of `main`. Three phases,
highest risk first. Findings reference the review summary (H = high,
M = medium, L = low).

## Phase 1 — CI/CD pipeline hardening (DONE)

- **H1 — Gate the auto-merge to main.** `auto-deploy.yml` now runs the full
  `release:beta:check` suite (tsc build, ESLint, save/telemetry smoke tests,
  Vite production build, performance budget) as a required job before the
  merge-to-main job runs. A `concurrency` group serializes runs so two
  feature-branch pushes can't race each other into main.
- **H2 — Safer cross-repo sync.** `sync-solana-dex.yml` now fetches the
  target repo and pushes with `--force-with-lease` instead of blind
  `--force`, and runs are serialized with a `concurrency` group.
- **H2 manual step (repo owner):** replace the `SOLANA_DEX_PAT` secret with a
  fine-grained PAT scoped to only `finishstrong23/solana-dex` (contents
  read/write). A classic PAT grants access to every repo on the account and
  is over-privileged for this workflow.
- **Recommended manual step (repo owner):** enable branch protection on
  `main` (require status checks) so nothing — including a compromised
  workflow — can push to main without the checks passing.

## Phase 2 — Telemetry endpoint and privacy (TODO)

- **M1** — Add abuse resistance to `api/event.ts`: per-IP rate limiting
  (Vercel WAF rule or in-function counter), an `Origin` allowlist check, and
  per-event-type payload schema validation. Treat aggregated telemetry as
  untrusted input in `scripts/aggregate-telemetry.mjs`.
- **M2** — Show a one-time in-game notice that anonymous playtest events are
  sent remotely (toggle lives in the Privacy panel), or default the toggle
  off. Correct the "no IP stored" comment in `api/event.ts` — the function
  doesn't log IPs, but Vercel's own request logs do.

## Phase 3 — Dependency and client hardening (TODO)

- **M3** — `npm audit fix`; plan the Vite major upgrade to clear the esbuild
  dev-server advisory (GHSA-67mh-4wv8-2f99). Drop `host: true` from
  `vite.config.ts` now that the Capacitor mobile shell is gone.
- **L1** — Add a root `vercel.json` with security headers (CSP,
  `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`) — mirror
  the header block already in `solana-dex/frontend/vercel.json`.
- **L2** — Tighten `saveCompatibility.ts` normalization: validate array
  element shapes and drop unknown keys instead of spreading `...rawRun`.
- **L3** — Disable production sourcemaps in `vite.config.ts` (the mobile
  debugging need they served is gone).
- **L4** — Pin GitHub Actions to full commit SHAs across all workflows.
- **L5** — Untrack `node_modules/` (found during phase 1: it was committed
  before the `.gitignore` entry existed, so ~130 MB of dependency code and
  stale platform binaries live in the public repo). `git rm -r --cached
  node_modules` in a dedicated commit; CI is unaffected since it runs
  `npm ci` from the lockfile.
