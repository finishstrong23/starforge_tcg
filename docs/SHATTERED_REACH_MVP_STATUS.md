# Shattered Reach — MVP Status Report

Date: 2026-07-05 · Branch: `claude/shattered-reach-mvp-60gzqq`
Verification: **753 tests / 39 suites passing** (verified stable across 12+ consecutive runs), `tsc --noEmit` clean, `eslint src` clean, `vite build` clean, `beta-readiness` CI gate passing.

Each Definition-of-Done item, with evidence (test, file, or commit).

## 1. Full run playable end-to-end — DONE

Draft → blessing → Act 1 → Act 2 → Act 3 → final boss → victory screen, or death → run summary. Certified by `tests/roguelite/fullRunSimulation.test.ts`, which drives complete runs through the **live reducer** (`src/dungeon/engine/runReducer.ts`) for all four factions: runs terminate in `run_end_win` or `run_end_loss` with no dead ends and no stalls; victories record all 3 bosses defeated. Non-combat death (events) also ends the run correctly (`actContent.test.ts` › "event damage can kill").

## 2. All node types functional — DONE

combat / elite / boss / rest (heal OR upgrade w/ preview) / shop (cards, relics, potions, 1× removal) / event / treasure all resolve through reducer actions and return to the map (`fullRunSimulation.test.ts` walks every type; `nodeRewards.test.ts` covers claims per type). Treasure chests now guarantee a relic. Acts 2–3 previously recycled one Act 1 event — each act now has 8 unique events (`actContent.test.ts`), all ids validated, ≥2 choices available to every faction.

## 3. Combat engine complete and correct — DONE

Core loop (energy, block timing, StS damage multipliers, draw/discard/exhaust, visible intents) existed; the enemy side was largely flavor text and is now real (commit `340e6bc`, `tests/roguelite/enemyBehaviors.test.ts`, 24 cases):
- summon intents spawn real enemy minions (incl. both later bosses); GUARDIAN sentries gate minion attacks; summons attack and expire
- debuff intents apply what they say (Vulnerable, compound clauses)
- specials work: steal-a-card, skip-your-draw, shuffle-hand, skip-your-turn, self-stun (intent telegraph freezes while stunned)
- elite onDeath effects execute (death-burst can kill you — loss wins the tie)
- player debuffs expire; poison decays 1/turn both sides; AoE hits minions; player GUARDIANs intercept single-target enemy damage; hand capped at 10; win-check ordering fixed for post-turn lethal ticks

## 4. Content minimums — DONE

- **Enemies**: 21 standard + 4 elites + 3 act bosses = 28 (`actContent.test.ts` › content minimums), all with executing behaviors.
- **Relics**: 26 defined, **all implemented and acquirable**. The trigger system now fires turn_start/turn_end/on_card_play/on_kill and acquisition effects (commit `e049e89`, `relicSystem.test.ts`, 17 behavioral cases). The 7 data-only relics were implemented; 3 lying log-stubs fixed.
- **Potions**: 3-slot inventory with swap-picker everywhere (shop, reward, events); drop rates per spec (`nodeRewards.test.ts`).
- **Draft**: all four factions selectable and draftable (`config/mvp.ts`, commit `9095334`); per-faction pools verified by draft/reward rollers and the four-faction certification runs.

## 5. Rewards loop closed — DONE

Post-combat card choice (skippable), gold per tier (10-18 / 25-35 / 45-60, A7-scaled), **guaranteed relics from elites, bosses, and chests** (was: blind every-3rd-combat cadence only), potions on elite/boss, owned relics excluded from all offers, shop pricing sane vs. income (~130-190g by mid-Act 1 vs 50-100g prices), card removal capped 1/shop. Evidence: `nodeRewards.test.ts` (26 cases), `rewardRoller.test.ts`.

## 6. Run persistence — DONE

State saves on every reducer transition; a run resumes after refresh at any point including mid-combat. The refresh save-scum family is closed (commit `92a9d4d`): reward/shop/blessing offers are rolled once, seeded from (run seed, act, node id), persisted with claim flags — F5 re-awards nothing and rerolls nothing. In-combat randomness draws from a persisted rng stream (`CombatState.rngState`), so refreshing during the enemy-turn window replays identically. Full runs are reproducible from the seed (last `Math.random` in the run path removed). Evidence: `nodeRewards.test.ts` refresh round-trips; `fullRunSimulation.test.ts` › "a run survives save/load round-trips at every step".

## 7. UI playable and clear on desktop — DONE (MVP bar)

No placeholder/debug text in the player path (audited). Added (commit `501c985`): intent numbers show live modified damage (enemy Strength / player Vulnerable) with a `*` marker; board minions expose full rules text via tooltip; rest-site upgrades show upgrade text + exact stat deltas before choosing. Known post-MVP polish (not clarity blockers): richer inspect panels outside combat, win-beat animation on combat end.

## 8. All tests green, new systems covered — DONE

753 passing (baseline was 663; +90 covering every new system): seeded rewards/persistence (26), enemy behaviors (24), relics (17), act content (9), live mapgen 3000-seed stress (7), full-run certification (7). The coverage inversion is closed: the live 9-row map generator has its own stress suite (`liveMapgen.test.ts`), and certification drives the shipped reducer through all 3 acts instead of a reimplementation capped at Act 1. One pre-existing flaky test fixed (L-016, shuffle-dependent).

## 9. No regressions to the 1v1 mode — N/A

The 1v1 TCG no longer exists in this repository; the codebase is dungeon-only (`package.json` → `starforge-dungeon`, `App.tsx` boots directly into `DungeonRoot`). Nothing to regress. Note: root `CLAUDE.md` still describes the old TCG and is stale.

## Deliberate decisions (flagged in commit messages)

- **Four-faction unlock reverses the 2026-06-22 Pyroclast lock** (`fef3296`). Re-locking is one line in `config/mvp.ts`.
- Lumen cap (5, +1 with Suncaller's Lens) and augment slot cap (2, +1 with Modular Heart) introduced — both were designed but unenforced, and their relics were unimplementable without them.
- Card removal limited to 1 per shop visit (StS standard; unlimited removals trivialized deck-thinning).
- Rift Warden's on-death "-1 Energy next combat" reduces max energy for that whole combat (existing modifier plumbing) rather than turn 1 only.

## Felt-quality signals from certification

Simple-bot winrate at Ascension 0 is ~8% (1 win / 12 runs), with deaths distributed across all three acts — no trivial-fight, dead-branch, or unwinnable-seed signals in the certification batches. Economy affords 1-2 shop purchases by mid-Act 1. Bosses now use their full mechanical kit (summons, specials, compound debuffs).
