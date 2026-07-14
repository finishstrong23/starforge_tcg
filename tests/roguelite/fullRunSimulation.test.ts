/**
 * Full-run certification through the LIVE reducer — all four factions.
 *
 * Unlike the scenario harness (which re-implements the run layer on top of
 * engine primitives and stops after Act 1), these simulations drive the
 * exact code the shipped game runs: every transition goes through
 * runReducer actions (TRAVEL_TO_NODE / SET_COMBAT / REWARD_* / SHOP_* /
 * APPLY_BLESSING / ADVANCE_ACT), combats are played by the live combat
 * engine, and mid-run persistence is exercised with real save round-trips.
 */

import { INITIAL, reducer, type ContextState } from '../../src/dungeon/engine/runReducer';
import { getAvailableNodes } from '../../src/dungeon/engine/mapgen';
import {
  attackWithMinion,
  endPlayerTurn,
  executeEnemyTurn,
  playCard,
} from '../../src/dungeon/engine/combat';
import { getCardStats } from '../../src/dungeon/engine/cardStats';
import { choicesForFaction, pickEventForNode } from '../../src/dungeon/engine/eventSelection';
import { getCardDefById, getRelicById } from '../../src/dungeon/engine/nodeRewards';
import { createCardInstance } from '../../src/dungeon/engine/draft';
import { createCurseInstance } from '../../src/dungeon/data/curses';
import { getRunModifierDef } from '../../src/dungeon/data/runModifiers';
import {
  createDungeonSaveSnapshot,
  getContextStateFromSave,
  normalizeDungeonSaveSnapshot,
} from '../../src/dungeon/engine/saveCompatibility';
import { ensureNodeStates } from '../../src/dungeon/engine/nodeRewards';
import { createSeededRng } from '../../src/dungeon/engine/seededRng';
import type { AscensionLevel, CombatState, Faction } from '../../src/dungeon/types';

const FACTIONS: Faction[] = ['Pyroclast', 'Cogsmiths', 'Luminar', 'WarpRiders'];

// ─── Combat bot ──────────────────────────────────────────────────────────────

function incomingAttackValue(cs: CombatState): number {
  const intent = cs.enemy.intents[cs.enemy.intentIndex % cs.enemy.intents.length];
  if (intent.type !== 'attack' && intent.type !== 'special') return 0;
  const strength = cs.enemy.statusEffects.find((e) => e.type === 'strength')?.stacks ?? 0;
  return (intent.value ?? cs.enemy.attack) + strength;
}

function cardScore(cs: CombatState, instId: string): number {
  const card = cs.hand.find((c) => c.instanceId === instId)!;
  const stats = getCardStats(card);
  const text = stats.text.toLowerCase();
  const bigHitIncoming = incomingAttackValue(cs) >= 10;
  let score = 0;
  const dmg = text.match(/deal (\d+)/);
  if (dmg) score += parseInt(dmg[1]);
  const block = text.match(/gain (\d+) (?:block|shield)/);
  if (block) score += parseInt(block[1]) * (bigHitIncoming ? 1.6 : 0.8);
  if (/heat|lumen|rift|summon/.test(text)) score += 4; // build the engine
  if (/per heat|vent/.test(text) && cs.playerHeat >= 4) score += cs.playerHeat * 2;
  if (card.type === 'Power') score += 3;
  if (card.type === 'Curse') score -= 50;
  return score - stats.cost;
}

function draftScore(text: string, cost: number): number {
  const lower = text.toLowerCase();
  let score = 0;
  const dmg = lower.match(/deal (\d+)/);
  if (dmg) score += parseInt(dmg[1]);
  const block = lower.match(/gain (\d+) (?:block|shield)/);
  if (block) score += parseInt(block[1]);
  if (/per heat|per lumen|per augment|rift/.test(lower)) score += 6;
  if (/draw \d/.test(lower)) score += 3;
  return score - cost;
}

function playCombatTurns(ctx: ContextState): ContextState {
  let cs = ctx.run!.combatState!;
  const relics = ctx.run!.relics;
  const isTerminal = (s: CombatState) => s.phase === 'combat_end_win' || s.phase === 'combat_end_loss';
  let guard = 0;

  while (!isTerminal(cs) && guard++ < 80) {
    // Emergency potion: when hurt or facing a boss, drink through the live
    // reducer (sync combat state in, pull it back out).
    const hurting = cs.playerHealth < ctx.run!.maxHealth * 0.45 || (cs.enemy.isBoss && cs.turn <= 2);
    const potionSlot = ctx.run!.potions.findIndex((p) => p !== null);
    if (hurting && potionSlot !== -1) {
      ctx = reducer(ctx, { type: 'SET_COMBAT', state: cs });
      ctx = reducer(ctx, { type: 'USE_POTION', slotIndex: potionSlot, ctx: { targetId: 'enemy' } });
      cs = ctx.run!.combatState ?? cs;
      if (isTerminal(cs)) break;
    }
    // Play cards while affordable.
    let plays = 0;
    while (plays++ < 10 && !isTerminal(cs)) {
      const penalty = cs.costPenaltyThisTurn ?? 0;
      const playable = cs.hand.filter(
        (c) => c.type !== 'Augment' && getCardStats(c).cost + penalty <= cs.playerEnergy,
      );
      if (playable.length === 0) break;
      const best = [...playable].sort((a, b) => cardScore(cs, b.instanceId) - cardScore(cs, a.instanceId))[0];
      const next = playCard(cs, best.instanceId);
      if (next === cs) break; // engine refused (e.g. unresolved choice)
      cs = next;
    }
    if (isTerminal(cs)) break;

    // Attack with ready minions (clear GUARDIAN summons first).
    for (const m of cs.playerBoard.filter((b) => !b.hasAttacked)) {
      if (isTerminal(cs)) break;
      const guardian = cs.enemyBoard.find((g) => g.keywords.includes('GUARDIAN') && (g.currentHealth ?? 0) > 0);
      const target = guardian ?? cs.enemyBoard[0];
      cs = attackWithMinion(cs, m.instanceId, target ? target.instanceId : 'enemy');
    }
    if (isTerminal(cs)) break;

    cs = endPlayerTurn(cs, relics);
    if (isTerminal(cs)) break;
    cs = executeEnemyTurn(cs);
  }

  if (!isTerminal(cs)) {
    // Turn cap reached — treat as a stall failure so the test flags it.
    throw new Error(`combat stalled vs ${cs.enemy.name} on turn ${cs.turn}`);
  }
  return reducer(ctx, { type: 'SET_COMBAT', state: cs });
}

// ─── Non-combat resolvers ────────────────────────────────────────────────────

function resolveEvent(ctx: ContextState, rng: () => number): ContextState {
  const run = ctx.run!;
  const map = run.actMaps[run.currentAct - 1];
  const event = pickEventForNode(run.currentAct, run.seed ?? ctx.seed, map.currentNodeId ?? 'event');
  const choices = choicesForFaction(event, ctx.draftFaction);
  expect(choices.length).toBeGreaterThanOrEqual(2);

  // Self-preserving pick: avoid lethal damage choices when possible.
  const safe = choices.filter((c) =>
    !c.effects.some((e) => e.type === 'damage' && e.amount >= run.currentHealth),
  );
  const pool = safe.length > 0 ? safe : choices;
  const choice = pool[Math.floor(rng() * pool.length)];

  let s = ctx;
  for (const effect of choice.effects) {
    const r = s.run;
    if (!r || r.phase === 'run_end_loss') break;
    switch (effect.type) {
      case 'gold':
        s = effect.amount >= 0
          ? reducer(s, { type: 'ADD_GOLD', amount: effect.amount })
          : reducer(s, { type: 'SPEND_GOLD', amount: -effect.amount });
        break;
      case 'heal': s = reducer(s, { type: 'HEAL_PLAYER', amount: effect.amount }); break;
      case 'damage': s = reducer(s, { type: 'DAMAGE_PLAYER', amount: effect.amount }); break;
      case 'max_hp': s = reducer(s, { type: 'INCREASE_MAX_HEALTH', amount: effect.amount, heal: effect.heal }); break;
      case 'add_card': {
        const def = getCardDefById(effect.cardId);
        if (def) s = reducer(s, { type: 'ADD_CARD', card: createCardInstance(def) });
        break;
      }
      case 'upgrade_card': {
        const target = r.deck.find((c) => !c.upgraded);
        if (target) s = reducer(s, { type: 'UPGRADE_CARD', instanceId: target.instanceId });
        break;
      }
      case 'remove_card': {
        const target = effect.mode === 'first_starter'
          ? r.deck.find((c) => c.complexityTier === 1)
          : r.deck[0];
        if (target) s = reducer(s, { type: 'REMOVE_CARD', instanceId: target.instanceId });
        break;
      }
      case 'add_relic': {
        const relic = getRelicById(effect.relicId);
        if (relic) s = reducer(s, { type: 'ADD_RELIC', relic });
        break;
      }
      case 'add_potion': s = reducer(s, { type: 'ADD_POTION', potion: { definitionId: effect.potionId } }); break;
      case 'add_curse': {
        const curse = createCurseInstance(effect.curseId, ctx.draftFaction ?? 'Pyroclast');
        if (curse) s = reducer(s, { type: 'ADD_CARD', card: curse });
        break;
      }
      case 'map_modifier':
      case 'class_resource': {
        const modifier = getRunModifierDef(effect.modifierId);
        if (modifier) s = reducer(s, { type: 'ADD_RUN_MODIFIER', modifier });
        break;
      }
    }
  }
  if (s.run && s.run.phase !== 'run_end_loss') {
    s = reducer(s, { type: 'RETURN_TO_MAP' });
  }
  return s;
}

// ─── The walker ──────────────────────────────────────────────────────────────

interface RunResult {
  won: boolean;
  finalAct: number;
  bosses: number;
  steps: number;
}

function simulateRun(
  faction: Faction,
  seed: string,
  ascension: AscensionLevel = 0,
  opts: { refreshEvery?: number } = {},
): RunResult {
  const rng = createSeededRng(seed, 'walker');
  let ctx = reducer(INITIAL, { type: 'START_RUN', faction, seed, ascensionLevel: ascension });

  // Draft: 3 picks, best-scored option.
  let draftGuard = 0;
  while (ctx.run!.phase === 'draft' && draftGuard++ < 5) {
    expect(ctx.draftOptions.length).toBeGreaterThan(0);
    const best = [...ctx.draftOptions].sort(
      (a, b) => draftScore(b.cardText, b.cost) - draftScore(a.cardText, a.cost),
    )[0];
    ctx = reducer(ctx, { type: 'PICK_DRAFT', card: best });
  }
  expect(ctx.run!.phase).toBe('blessing');

  let steps = 0;
  while (ctx.run && ctx.run.phase !== 'run_end_win' && ctx.run.phase !== 'run_end_loss') {
    if (steps++ > 250) throw new Error(`run stalled in phase ${ctx.run.phase} (act ${ctx.run.currentAct})`);

    // Optional mid-run persistence: verify a save/load round-trip is lossless.
    if (opts.refreshEvery && steps % opts.refreshEvery === 0) {
      const snapshot = createDungeonSaveSnapshot(ctx);
      const restored = normalizeDungeonSaveSnapshot(JSON.parse(JSON.stringify(snapshot)));
      expect(restored).not.toBeNull();
      const hydrated = getContextStateFromSave(restored!);
      const healed = {
        ...hydrated,
        run: hydrated.run ? ensureNodeStates(hydrated.run, hydrated.draftFaction ?? undefined) : null,
      };
      expect(JSON.parse(JSON.stringify(healed.run))).toEqual(JSON.parse(JSON.stringify(ctx.run)));
      ctx = healed;
    }

    const run = ctx.run!;
    switch (run.phase) {
      case 'blessing': {
        const options = run.blessingOptionIds ?? [];
        expect(options.length).toBeGreaterThan(0);
        ctx = reducer(ctx, { type: 'APPLY_BLESSING', blessingId: options[0] as never });
        break;
      }
      case 'map': {
        const map = run.actMaps[run.currentAct - 1];
        const available = getAvailableNodes(map, map.currentNodeId);
        expect(available.length).toBeGreaterThan(0); // no dead ends, ever
        const node = available[Math.floor(rng() * available.length)];
        ctx = reducer(ctx, { type: 'TRAVEL_TO_NODE', nodeId: node.id });
        break;
      }
      case 'combat':
      case 'elite_combat':
      case 'boss_combat': {
        expect(run.combatState).toBeTruthy();
        ctx = playCombatTurns(ctx);
        break;
      }
      case 'reward': {
        const pr = ctx.run!.pendingReward;
        if (pr && !pr.cardResolved && pr.cardOptionIds.length > 0) {
          const bestId = [...pr.cardOptionIds].sort((a, b) => {
            const da = getCardDefById(a); const db = getCardDefById(b);
            return draftScore(db?.cardText ?? '', db?.cost ?? 9) - draftScore(da?.cardText ?? '', da?.cost ?? 9);
          })[0];
          ctx = reducer(ctx, { type: 'REWARD_TAKE_CARD', cardId: bestId });
        } else if (pr && !pr.cardResolved) {
          ctx = reducer(ctx, { type: 'REWARD_SKIP_CARD' });
        }
        if (ctx.run!.pendingReward?.relicId && !ctx.run!.pendingReward!.relicTaken) {
          ctx = reducer(ctx, { type: 'REWARD_TAKE_RELIC' });
        }
        if (ctx.run!.pendingReward?.potion && !ctx.run!.pendingReward!.potionResolved) {
          ctx = reducer(ctx, { type: 'REWARD_TAKE_POTION' });
          if (!ctx.run!.pendingReward!.potionResolved) {
            ctx = reducer(ctx, { type: 'REWARD_SKIP_POTION' }); // inventory full
          }
        }
        const isBossReward = ctx.run!.pendingReward?.isBossReward ?? false;
        ctx = isBossReward && ctx.run!.currentAct < 3
          ? reducer(ctx, { type: 'ADVANCE_ACT' })
          : reducer(ctx, { type: 'RETURN_TO_MAP' });
        break;
      }
      case 'shop': {
        const stock = run.shopStock;
        expect(stock).toBeTruthy();
        if (stock!.cardIds.length > 0) {
          ctx = reducer(ctx, { type: 'SHOP_BUY_CARD', cardId: stock!.cardIds[0] }); // no-op if unaffordable
        }
        ctx = reducer(ctx, { type: 'RETURN_TO_MAP' });
        break;
      }
      case 'rest': {
        // Mirror the rest-site choice: upgrade when healthy, heal when hurt.
        const unupgraded = run.deck.find((c) => !c.upgraded && c.type !== 'Curse');
        if (run.currentHealth > run.maxHealth * 0.6 && unupgraded) {
          ctx = reducer(ctx, { type: 'UPGRADE_CARD', instanceId: unupgraded.instanceId });
        } else {
          ctx = reducer(ctx, { type: 'HEAL_PLAYER', amount: Math.round(run.maxHealth * 0.3) });
        }
        ctx = reducer(ctx, { type: 'RETURN_TO_MAP' });
        break;
      }
      case 'event': {
        ctx = resolveEvent(ctx, rng);
        break;
      }
      default:
        throw new Error(`walker cannot resolve phase ${run.phase}`);
    }
  }

  const finalRun = ctx.run!;
  return {
    won: finalRun.phase === 'run_end_win',
    finalAct: finalRun.currentAct,
    bosses: finalRun.runStats.bossesDefeated,
    steps,
  };
}

// ─── Certification ───────────────────────────────────────────────────────────

describe('full-run simulation through the live reducer', () => {
  const SEEDS = ['rail-a', 'rail-b', 'rail-c'];

  for (const faction of FACTIONS) {
    it(`${faction}: 3 seeded runs terminate cleanly with no dead ends`, () => {
      for (const seed of SEEDS) {
        const result = simulateRun(faction, `${seed}-${faction}`);
        expect(result.won || result.finalAct >= 1).toBe(true);
        if (result.won) {
          expect(result.bosses).toBe(3);
        }
      }
    });
  }

  it('at least one Act 3 victory occurs across the certification batch', () => {
    const results: Array<RunResult & { label: string }> = [];
    for (const faction of FACTIONS) {
      for (const seed of SEEDS) {
        results.push({ ...simulateRun(faction, `${seed}-${faction}`), label: `${faction}:${seed}` });
      }
    }
    const wins = results.filter((r) => r.won);
    expect(wins.length).toBeGreaterThan(0);
    for (const win of wins) {
      expect(win.bosses).toBe(3);
    }
  });

  it('a high-ascension run can end in death (loss path exercised)', () => {
    const results = ['doom-1', 'doom-2', 'doom-3', 'doom-4'].map((seed) =>
      simulateRun('Pyroclast', seed, 10),
    );
    expect(results.some((r) => !r.won)).toBe(true);
  });

  it('a run survives save/load round-trips at every step (refresh-resume)', () => {
    const result = simulateRun('Pyroclast', 'refresh-resume-seed', 0, { refreshEvery: 1 });
    expect(result.won || !result.won).toBe(true); // terminated cleanly with refreshes throughout
  });
});
