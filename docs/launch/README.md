# Launch — Week 4 Notes

Living checklist for the week-of-launch (Days 20–27 of the 30–45 day plan).

Update: combat backgrounds now ship as compressed JPGs under 500 KB each.
The original PNG files remain as source art, but production builds only bundle
`.jpg`, `.jpeg`, and `.webp` backgrounds.

## Asset issue resolved

Background PNGs in `src/dungeon/assets/backgrounds/` are kept as source art.
Production builds now bundle compressed JPG/WebP backgrounds only, keeping each
combat scene background under 500 KB.

### Maintenance

When adding new backgrounds, commit a compressed `.jpg` or `.webp` file for
shipping. Keep source PNGs if useful, but do not import them in the loader.

## Code state — Week 4 Day 24

- ✅ `tsc --noEmit` clean
- ✅ `npx jest` — 9 / 9 suites, 128 / 128 tests pass
- ✅ `vite build` succeeds
- ✅ JS bundle: **450 KB raw, 114 KB gzip**. Healthy.
- ✅ CSS bundle: **11 KB raw, 2.9 KB gzip**. Healthy.
- ✅ Backgrounds: compressed shipping assets under 500 KB each.
- ✅ Error boundary logs crashes to telemetry buffer.
- ✅ Save persistence verified (round-trip test).
- ✅ Per-faction Ascension unlocks persisted in localStorage.
- ✅ Tutorial dismissable + auto-stops after combat 3.

## Day-of-launch checklist

Before the URL goes wide:

- [x] Optimise background assets (above).
- [ ] In Vercel dashboard → Analytics tab → enable **Web Analytics**
      (free tier, auto-injects script tag).
- [ ] Smoke-test the live URL in Chrome and on mobile Safari.
- [ ] Run a full Pyroclast playthrough end-to-end — first combat,
      first reward, first shop, first boss, run-end screen,
      "Start New Run" → faction-select.
- [ ] Confirm `?debug=1` shows the telemetry panel and "Copy JSON" works.
- [ ] Confirm the tutorial overlay shows on combat #1 and the
      "Don't show again" button persists across reloads.
- [ ] Confirm save persistence: close tab mid-combat, reopen URL,
      land back in same combat with same hand.

## Reddit post draft (Day 27)

```
Title: I made a free roguelite card game (browser, no signup) — 4 factions, 10 difficulty tiers

Body:
Six weeks of building, finally pushed live. STARFORGE: Dungeon Run is a single-player Slay-the-Spire-likes in the browser. No accounts, no microtransactions, no installer.

Quick facts:
- 4 factions: Pyroclast (Heat / Ignite), Luminar (Channel / Lumens),
  Cogsmiths (Augments / Drones), Warp Riders (Flux / Rifts)
- ~180 cards, 30 enemies, 30 relics, 14 single-use potions
- 10 Ascension levels per faction (40 total endpoints to chase)
- Map gen is randomised every run (3 paths, narrow convergence band)
- Saves locally — close the tab, come back later, pick up where you left off
- Free, no ads, runs in your browser. Mobile works.

Aesthetic is intentional: emoji-as-art. It's the AI-native indie style. Mechanics first, art polish later.

Known limitations:
- Some Cogsmith Power cards (Mecha Form, Warforge, Iron Commandment, Machine God) persist correctly but their cross-card aggregate effects aren't fully wired yet — patch coming.
- No audio yet.

Play: <YOUR_VERCEL_URL>
Bug reports / feedback: reply here, DM, or open an issue at <YOUR_REPO_URL>

Built solo with the Anthropic API as my pair-programmer. Happy to nerd out about how that worked if anyone's curious.
```

Communities to post in (in priority order):
1. r/roguelikes (~75k) — best fit, expects difficulty + replay depth
2. r/roguelites (~25k) — runs-based gameplay focus
3. r/slaythespire (~250k) — only if there's a "made an STS-like" megathread
4. r/incremental_games — secondary, may or may not click
5. r/webgames — broad, expect drive-by traffic
6. Twitter / Discord — your usual channels

## Telemetry pipeline

Already wired end-to-end. Three pieces:

### 1. Client → server

Production builds POST every event to `/api/event`. Disabled in dev so
local work doesn't spam the endpoint. Wiring lives in
`src/ui/main.tsx` (`setTelemetryEndpoint('/api/event')` behind
`import.meta.env.PROD`).

### 2. Server (`api/event.ts`, Vercel Edge Function)

- Validates event shape (allowlist of types, size cap, sane timestamps
  + session ids).
- `console.log`s the event as a single-line JSON object (including
  Vercel-provided country code, no IP stored).
- Returns 204 on success, 4xx on validation failure.

Reading the data (free tier):
1. Vercel dashboard → your project → Logs tab.
2. Filter for `src":"starforge.event"`.
3. Copy the matching lines into a file: `events.ndjson`.
4. Run `npm run telemetry:summary events.ndjson`.

Vercel keeps function logs ~24h on the Hobby (free) tier. For longer
retention, the function body is the right place to swap `console.log`
for a PostHog SDK call, a Vercel KV write, or a webhook to Supabase /
Neon. The client doesn't need to change — it already POSTs to the
same endpoint.

### 3. Aggregation (`scripts/aggregate-telemetry.mjs`)

`npm run telemetry:summary <events.json>`

Accepts either:
- A JSON array of events (the format the in-game `?debug=1` panel's
  "Copy JSON" button produces).
- NDJSON, one event per line (the format Vercel logs export to).

Prints, in order:
- Sessions, total runs, completion rate, avg runs per session.
- Faction-pick distribution.
- Win rate per `faction × ascension`.
- Funnel (% of sessions reaching each milestone — picked → started →
  first combat → won first combat → first elite → won a run).
- Top 10 causes of death, by enemy.
- Most-picked / least-picked cards (top 15 / bottom 10) with tier tags.
- Run-length distribution (avg, min, max combats per run).

This is the day-1 dashboard. Run it daily for the first two weeks
post-launch; the win-rate-per-faction × ascension table is the most
actionable thing — anything outside the 10–25% target band on common
ascension levels is your next balance patch.

### Privacy note

No accounts, no IPs stored, no cookies. The only identifier is a
random per-tab session id. Country comes from a Vercel HTTP header
(geolocation by IP at request time, not stored). Stop reading events
from any test session by adding their session id to a deny-list in
`api/event.ts` if needed.
