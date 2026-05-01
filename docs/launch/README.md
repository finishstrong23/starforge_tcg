# Launch — Week 4 Notes

Living checklist for the week-of-launch (Days 20–27 of the 30–45 day plan).

## ⚠ Known asset issue (review before launch)

Background PNGs in `src/dungeon/assets/backgrounds/` are unoptimised — each
file is **2.2–2.6 MB**, total ~12 MB. Vite splits them, so a player only
downloads the one their current encounter rolled, but **2.5 MB per combat
scene is too much for mobile / slow connections**.

### Fix options (pick one before going wide)

1. **Quick & free**: drop each PNG into [Squoosh.app](https://squoosh.app),
   re-export as **WebP, quality 75**. Expect ~200–400 KB per file.
   Replace the `.png` with `.webp` in the same folder. Vite will pick
   them up automatically (`index.ts`'s glob already accepts `webp`).
2. **Slightly nicer quality**: TinyPNG.com on the originals — ~500 KB
   each, still PNG. Drop-in replacement.
3. **Acceptable but lazy**: ship as-is. First combat is a 2.5 MB
   download, subsequent combats with the same encounter are cached.
   Mobile players will hate this.

Recommendation: do option 1 today. Five files, fifteen minutes.

## Code state — Week 4 Day 24

- ✅ `tsc --noEmit` clean
- ✅ `npx jest` — 9 / 9 suites, 128 / 128 tests pass
- ✅ `vite build` succeeds
- ✅ JS bundle: **450 KB raw, 114 KB gzip**. Healthy.
- ✅ CSS bundle: **11 KB raw, 2.9 KB gzip**. Healthy.
- ⚠ Backgrounds: 12 MB total, see above.
- ✅ Error boundary logs crashes to telemetry buffer.
- ✅ Save persistence verified (round-trip test).
- ✅ Per-faction Ascension unlocks persisted in localStorage.
- ✅ Tutorial dismissable + auto-stops after combat 3.

## Day-of-launch checklist

Before the URL goes wide:

- [ ] Optimise background assets (above).
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

## Telemetry endpoint (post-launch task)

Right now telemetry is localStorage only. To get aggregate data:

1. Add a Vercel Function at `/api/event` that POSTs incoming events
   somewhere durable (PostHog / a Supabase table / a Neon DB / etc.).
2. In `src/ui/main.tsx`, after `App` mount, call
   `setTelemetryEndpoint('/api/event')`.

That's a one-day follow-up after the URL is up, not a day-zero blocker.
