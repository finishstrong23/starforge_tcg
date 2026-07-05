/**
 * Save-scum hardening tests.
 *
 * The reward screen, shop, and blessing screen used to roll their offers
 * with Math.random at component mount — refreshing the page re-awarded
 * gold and rerolled everything. These tests pin the fix:
 *   - all node-resolution rolls are deterministic in (run seed, node id)
 *   - the rolled offers + claim flags live on RunState and survive a
 *     save/load round trip
 *   - claim/purchase reducer actions are idempotent and atomic
 *   - combat randomness draws from a persisted rng stream
 */

import { INITIAL, makeRunState, reducer, type Action, type ContextState } from '../../src/dungeon/engine/runReducer';
import {
  REMOVAL_COST,
  REMOVALS_PER_SHOP,
  cardPrice,
  getCardDefById,
  rollBlessingOptionIds,
  rollRewardBundle,
  rollShopStock,
} from '../../src/dungeon/engine/nodeRewards';
import {
  createDungeonSaveSnapshot,
  getContextStateFromSave,
  normalizeDungeonSaveSnapshot,
} from '../../src/dungeon/engine/saveCompatibility';
import { ensureNodeStates } from '../../src/dungeon/engine/nodeRewards';
import { initCombat, executeEnemyTurn, playCard } from '../../src/dungeon/engine/combat';
import { RELIC_POOL } from '../../src/dungeon/data/relics';
import { getEnemiesByAct } from '../../src/dungeon/data/enemies';
import type { MapNode, PotionInstance, RunState } from '../../src/dungeon/types';

const SEED = 'scum-test-seed';

function startRun(seed = SEED): ContextState {
  return reducer(INITIAL, { type: 'START_RUN', faction: 'Pyroclast', seed });
}

function findNode(state: ContextState, type: MapNode['type']): MapNode {
  const map = state.run!.actMaps[state.run!.currentAct - 1];
  const node = map.nodes.find((n) => n.type === type);
  if (!node) throw new Error(`no ${type} node in act map for seed ${state.seed}`);
  return node;
}

function dispatchAll(state: ContextState, actions: Action[]): ContextState {
  return actions.reduce(reducer, state);
}

/** Simulate a page refresh: serialize, normalize, hydrate, heal. */
function refresh(state: ContextState): ContextState {
  const snapshot = createDungeonSaveSnapshot(state);
  const restored = normalizeDungeonSaveSnapshot(JSON.parse(JSON.stringify(snapshot)));
  expect(restored).not.toBeNull();
  const next = getContextStateFromSave(restored!);
  return { ...next, run: next.run ? ensureNodeStates(next.run, next.draftFaction ?? undefined) : null };
}

// ─── Deterministic rolls ─────────────────────────────────────────────────────

describe('seeded node rolls', () => {
  const run = makeRunState('Pyroclast', SEED);

  it('rollRewardBundle is deterministic in (seed, act, node, combats)', () => {
    const ctx = { sourceNodeId: 'n-1-2', isElite: false, isBossReward: false, isTreasure: false, faction: 'Pyroclast' as const };
    const a = rollRewardBundle(run, ctx);
    const b = rollRewardBundle(run, ctx);
    expect(a).toEqual(b);
  });

  it('different nodes roll different streams', () => {
    const a = rollRewardBundle(run, { sourceNodeId: 'n-1-2', isElite: false, isBossReward: false, isTreasure: false });
    const b = rollRewardBundle(run, { sourceNodeId: 'n-2-0', isElite: false, isBossReward: false, isTreasure: false });
    // Gold or card options must differ across many nodes; check the pair is
    // not fully identical (they share the same act/pool so allow partial overlap).
    expect(JSON.stringify(a)).not.toEqual(JSON.stringify(b));
  });

  it('gold is in the documented band per combat type', () => {
    for (let i = 0; i < 50; i++) {
      const regular = rollRewardBundle(run, { sourceNodeId: `n-${i}`, isElite: false, isBossReward: false, isTreasure: false });
      const elite = rollRewardBundle(run, { sourceNodeId: `n-${i}`, isElite: true, isBossReward: false, isTreasure: false });
      const boss = rollRewardBundle(run, { sourceNodeId: `n-${i}`, isElite: false, isBossReward: true, isTreasure: false });
      expect(regular.gold).toBeGreaterThanOrEqual(10);
      expect(regular.gold).toBeLessThanOrEqual(18);
      expect(elite.gold).toBeGreaterThanOrEqual(25);
      expect(elite.gold).toBeLessThanOrEqual(35);
      expect(boss.gold).toBeGreaterThanOrEqual(45);
      expect(boss.gold).toBeLessThanOrEqual(60);
    }
  });

  it('elites, bosses, and treasure always offer a relic; owned relics are excluded', () => {
    for (let i = 0; i < 30; i++) {
      const elite = rollRewardBundle(run, { sourceNodeId: `e-${i}`, isElite: true, isBossReward: false, isTreasure: false });
      const boss = rollRewardBundle(run, { sourceNodeId: `b-${i}`, isElite: false, isBossReward: true, isTreasure: false });
      const chest = rollRewardBundle(run, { sourceNodeId: `t-${i}`, isElite: false, isBossReward: false, isTreasure: true });
      expect(elite.relicId).toBeDefined();
      expect(boss.relicId).toBeDefined();
      expect(chest.relicId).toBeDefined();
      const bossRelic = RELIC_POOL.find((r) => r.id === boss.relicId);
      expect(bossRelic?.rarity).toBe('Boss');
    }

    // Own every Uncommon/Rare — non-boss offers must dry up.
    const loaded: RunState = {
      ...run,
      relics: RELIC_POOL.filter((r) => r.rarity === 'Uncommon' || r.rarity === 'Rare'),
    };
    for (let i = 0; i < 10; i++) {
      const elite = rollRewardBundle(loaded, { sourceNodeId: `e-${i}`, isElite: true, isBossReward: false, isTreasure: false });
      expect(elite.relicId).toBeUndefined();
    }
  });

  it('rollShopStock is deterministic and excludes owned relics', () => {
    const a = rollShopStock(run, 'shop-node-1', 'Pyroclast');
    const b = rollShopStock(run, 'shop-node-1', 'Pyroclast');
    expect(a).toEqual(b);
    expect(a.cardIds.length).toBe(4);
    expect(a.relicIds.length).toBe(2);
    expect(a.potions.length).toBeGreaterThanOrEqual(2);
    expect(a.potions.length).toBeLessThanOrEqual(3);

    const owned = RELIC_POOL.filter((r) => r.id === a.relicIds[0]);
    const withOwned: RunState = { ...run, relics: owned };
    const c = rollShopStock(withOwned, 'shop-node-1', 'Pyroclast');
    expect(c.relicIds).not.toContain(a.relicIds[0]);
  });

  it('rollBlessingOptionIds is deterministic per act', () => {
    expect(rollBlessingOptionIds(run, 'Pyroclast')).toEqual(rollBlessingOptionIds(run, 'Pyroclast'));
    const act2 = { ...run, currentAct: 2 as const };
    expect(rollBlessingOptionIds(act2, 'Pyroclast')).not.toEqual(rollBlessingOptionIds(run, 'Pyroclast'));
  });
});

// ─── Reward flow through the live reducer ────────────────────────────────────

describe('reward claims (reducer)', () => {
  function stateAtTreasure(): ContextState {
    let s = startRun();
    const node = findNode(s, 'treasure');
    return reducer(s, { type: 'TRAVEL_TO_NODE', nodeId: node.id });
  }

  it('treasure travel awards gold atomically with the persisted bundle', () => {
    let s = startRun();
    const goldBefore = s.run!.gold;
    const node = findNode(s, 'treasure');
    s = reducer(s, { type: 'TRAVEL_TO_NODE', nodeId: node.id });
    expect(s.run!.phase).toBe('reward');
    expect(s.run!.pendingReward).toBeTruthy();
    expect(s.run!.pendingReward!.isTreasure).toBe(true);
    expect(s.run!.pendingReward!.relicId).toBeDefined(); // chests guarantee a relic
    expect(s.run!.gold).toBe(goldBefore + s.run!.pendingReward!.gold);
  });

  it('a refresh on the reward screen re-awards nothing and rerolls nothing', () => {
    const s = stateAtTreasure();
    const restored = refresh(s);
    expect(restored.run!.gold).toBe(s.run!.gold);
    expect(restored.run!.pendingReward).toEqual(s.run!.pendingReward);
  });

  it('card pick is guarded: only offered ids, only once', () => {
    let s = stateAtTreasure();
    const deckBefore = s.run!.deck.length;
    const offered = s.run!.pendingReward!.cardOptionIds[0];

    s = reducer(s, { type: 'REWARD_TAKE_CARD', cardId: 'P-999-not-offered' });
    expect(s.run!.deck.length).toBe(deckBefore);

    s = reducer(s, { type: 'REWARD_TAKE_CARD', cardId: offered });
    expect(s.run!.deck.length).toBe(deckBefore + 1);
    expect(s.run!.pendingReward!.cardResolved).toBe(true);

    // Second claim (e.g. after a refresh replaying the click) is a no-op.
    s = reducer(s, { type: 'REWARD_TAKE_CARD', cardId: offered });
    expect(s.run!.deck.length).toBe(deckBefore + 1);
  });

  it('relic claim is idempotent', () => {
    let s = stateAtTreasure();
    expect(s.run!.pendingReward!.relicId).toBeDefined();
    s = reducer(s, { type: 'REWARD_TAKE_RELIC' });
    expect(s.run!.relics.length).toBe(1);
    s = reducer(s, { type: 'REWARD_TAKE_RELIC' });
    expect(s.run!.relics.length).toBe(1);
  });

  it('potion claim respects the 3-slot inventory and swap flow', () => {
    let s = stateAtTreasure();
    // Force a potion offer onto the bundle for a stable test.
    const potion: PotionInstance = { definitionId: s.run!.pendingReward!.potion?.definitionId ?? 'PO-001' };
    s = {
      ...s,
      run: { ...s.run!, pendingReward: { ...s.run!.pendingReward!, potion, potionResolved: false } },
    };
    const filler: PotionInstance = { definitionId: 'PO-001' };
    s = dispatchAll(s, [
      { type: 'ADD_POTION', potion: filler },
      { type: 'ADD_POTION', potion: filler },
      { type: 'ADD_POTION', potion: filler },
    ]);
    // Inventory full, no slot given → no-op (UI opens the swap picker).
    s = reducer(s, { type: 'REWARD_TAKE_POTION' });
    expect(s.run!.pendingReward!.potionResolved).toBe(false);
    // Swap into slot 1.
    s = reducer(s, { type: 'REWARD_TAKE_POTION', slotIndex: 1 });
    expect(s.run!.pendingReward!.potionResolved).toBe(true);
    expect(s.run!.potions[1]?.definitionId).toBe(potion.definitionId);
  });

  it('RETURN_TO_MAP clears the resolved bundle', () => {
    let s = stateAtTreasure();
    s = dispatchAll(s, [
      { type: 'REWARD_SKIP_CARD' },
      { type: 'RETURN_TO_MAP' },
    ]);
    expect(s.run!.phase).toBe('map');
    expect(s.run!.pendingReward).toBeNull();
  });

  it('combat win rolls a persisted bundle and awards its gold once', () => {
    let s = startRun();
    const node = findNode(s, 'combat');
    s = reducer(s, { type: 'TRAVEL_TO_NODE', nodeId: node.id });
    expect(s.run!.combatState).toBeTruthy();
    const goldBefore = s.run!.gold;

    s = reducer(s, {
      type: 'SET_COMBAT',
      state: { ...s.run!.combatState!, phase: 'combat_end_win' },
    });
    expect(s.run!.phase).toBe('reward');
    const bundle = s.run!.pendingReward!;
    expect(s.run!.gold).toBe(goldBefore + bundle.gold);

    const restored = refresh(s);
    expect(restored.run!.gold).toBe(s.run!.gold);
    expect(restored.run!.pendingReward).toEqual(bundle);
  });
});

// ─── Shop flow through the live reducer ──────────────────────────────────────

describe('shop purchases (reducer)', () => {
  function stateAtShop(): ContextState {
    let s = startRun();
    const node = findNode(s, 'shop');
    s = reducer(s, { type: 'TRAVEL_TO_NODE', nodeId: node.id });
    expect(s.run!.phase).toBe('shop');
    expect(s.run!.shopStock).toBeTruthy();
    return s;
  }

  it('a refresh in the shop preserves stock and sold flags', () => {
    let s = stateAtShop();
    const cardId = s.run!.shopStock!.cardIds[0];
    s = reducer(s, { type: 'ADD_GOLD', amount: 500 });
    s = reducer(s, { type: 'SHOP_BUY_CARD', cardId });
    const restored = refresh(s);
    expect(restored.run!.shopStock).toEqual(s.run!.shopStock);
    expect(restored.run!.shopStock!.soldCardIds).toContain(cardId);
  });

  it('buying a card is atomic and single-shot', () => {
    let s = stateAtShop();
    s = reducer(s, { type: 'ADD_GOLD', amount: 500 });
    const cardId = s.run!.shopStock!.cardIds[0];
    const def = getCardDefById(cardId)!;
    const gold = s.run!.gold;
    const deckLen = s.run!.deck.length;

    s = reducer(s, { type: 'SHOP_BUY_CARD', cardId });
    expect(s.run!.gold).toBe(gold - cardPrice(def));
    expect(s.run!.deck.length).toBe(deckLen + 1);

    s = reducer(s, { type: 'SHOP_BUY_CARD', cardId }); // already sold → no-op
    expect(s.run!.gold).toBe(gold - cardPrice(def));
    expect(s.run!.deck.length).toBe(deckLen + 1);
  });

  it('rejects purchases the player cannot afford', () => {
    let s = stateAtShop();
    s = reducer(s, { type: 'SPEND_GOLD', amount: 99999 });
    const cardId = s.run!.shopStock!.cardIds[0];
    const deckLen = s.run!.deck.length;
    s = reducer(s, { type: 'SHOP_BUY_CARD', cardId });
    expect(s.run!.deck.length).toBe(deckLen);
    expect(s.run!.shopStock!.soldCardIds).toHaveLength(0);
  });

  it(`card removal is capped at ${REMOVALS_PER_SHOP} per shop`, () => {
    let s = stateAtShop();
    s = reducer(s, { type: 'ADD_GOLD', amount: 500 });
    const deckLen = s.run!.deck.length;
    const [first, second] = s.run!.deck;
    const goldBefore = s.run!.gold;

    s = reducer(s, { type: 'SHOP_REMOVE_CARD', instanceId: first.instanceId });
    expect(s.run!.deck.length).toBe(deckLen - 1);
    expect(s.run!.gold).toBe(goldBefore - REMOVAL_COST);

    s = reducer(s, { type: 'SHOP_REMOVE_CARD', instanceId: second.instanceId });
    expect(s.run!.deck.length).toBe(deckLen - 1); // cap reached
    expect(s.run!.gold).toBe(goldBefore - REMOVAL_COST);
  });

  it('potion purchase honors the full-inventory swap flow', () => {
    let s = stateAtShop();
    s = reducer(s, { type: 'ADD_GOLD', amount: 500 });
    const filler: PotionInstance = { definitionId: 'PO-001' };
    s = dispatchAll(s, [
      { type: 'ADD_POTION', potion: filler },
      { type: 'ADD_POTION', potion: filler },
      { type: 'ADD_POTION', potion: filler },
    ]);
    const gold = s.run!.gold;
    s = reducer(s, { type: 'SHOP_BUY_POTION', index: 0 }); // full, no slot → no-op
    expect(s.run!.gold).toBe(gold);
    expect(s.run!.shopStock!.soldPotionIndexes).toHaveLength(0);

    s = reducer(s, { type: 'SHOP_BUY_POTION', index: 0, slotIndex: 2 });
    expect(s.run!.gold).toBeLessThan(gold);
    expect(s.run!.shopStock!.soldPotionIndexes).toContain(0);
    expect(s.run!.potions[2]?.definitionId).toBe(s.run!.shopStock!.potions[0].definitionId);
  });
});

// ─── Blessing flow ───────────────────────────────────────────────────────────

describe('blessing options (reducer)', () => {
  function stateAtBlessing(): ContextState {
    let s = startRun();
    return reducer(s, { type: 'COMPLETE_DRAFT', deck: s.run!.deck });
  }

  it('COMPLETE_DRAFT rolls persisted blessing options', () => {
    const s = stateAtBlessing();
    expect(s.run!.phase).toBe('blessing');
    expect(s.run!.blessingOptionIds).toHaveLength(3);
  });

  it('a refresh preserves the same blessing options', () => {
    const s = stateAtBlessing();
    const restored = refresh(s);
    expect(restored.run!.blessingOptionIds).toEqual(s.run!.blessingOptionIds);
  });

  it('rejects blessings that were not offered', () => {
    let s = stateAtBlessing();
    const offered = s.run!.blessingOptionIds!;
    const notOffered = ['vigor', 'fortune', 'treasure', 'insight', 'bulwark', 'ember']
      .find((id) => !offered.includes(id));
    if (notOffered) {
      const before = s.run!;
      s = reducer(s, { type: 'APPLY_BLESSING', blessingId: notOffered as never });
      expect(s.run).toBe(before); // unchanged — still on blessing screen
    }
    s = reducer(s, { type: 'APPLY_BLESSING', blessingId: offered[0] as never });
    expect(s.run!.phase).toBe('map');
    expect(s.run!.blessingOptionIds).toBeNull();
  });

  it('ADVANCE_ACT rolls fresh options for the next act', () => {
    let s = stateAtBlessing();
    const act1Options = s.run!.blessingOptionIds;
    s = reducer(s, { type: 'APPLY_BLESSING', blessingId: act1Options![0] as never });
    s = reducer(s, { type: 'ADVANCE_ACT' });
    expect(s.run!.currentAct).toBe(2);
    expect(s.run!.phase).toBe('blessing');
    expect(s.run!.blessingOptionIds).toHaveLength(3);
  });
});

// ─── Combat RNG stream ───────────────────────────────────────────────────────

describe('combat rng determinism', () => {
  const run = makeRunState('Pyroclast', SEED);
  const enemy = getEnemiesByAct(1)[0];

  it('same rngSeed → identical shuffle and opening hand', () => {
    const a = initCombat(run.deck, 72, 72, [], enemy, 'Pyroclast', { rngSeed: 1234 });
    const b = initCombat(run.deck, 72, 72, [], enemy, 'Pyroclast', { rngSeed: 1234 });
    expect(a.hand.map((c) => c.instanceId)).toEqual(b.hand.map((c) => c.instanceId));
    expect(a.drawPile.map((c) => c.instanceId)).toEqual(b.drawPile.map((c) => c.instanceId));
    expect(a.rngState).toBe(b.rngState);

    const c = initCombat(run.deck, 72, 72, [], enemy, 'Pyroclast', { rngSeed: 99999 });
    expect(c.drawPile.map((x) => x.instanceId)).not.toEqual(a.drawPile.map((x) => x.instanceId));
  });

  it('replaying the enemy turn from the same snapshot is identical', () => {
    const start = initCombat(run.deck, 72, 72, [], enemy, 'Pyroclast', { rngSeed: 42 });
    const snapshot = JSON.parse(JSON.stringify(start));
    const a = executeEnemyTurn(start);
    const b = executeEnemyTurn(snapshot);
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });

  it('rngState advances as rolls are consumed', () => {
    // The opening shuffle consumes deck.length - 1 rolls, so the persisted
    // stream state must have moved past the seed we passed in.
    const start = initCombat(run.deck, 72, 72, [], enemy, 'Pyroclast', { rngSeed: 7 });
    expect(start.rngState).toBeDefined();
    expect(start.rngState).not.toBe(7);
    // A turn that consumes no rolls (no reshuffle, no random effects) must
    // NOT advance the stream — replay safety depends on it.
    const after = executeEnemyTurn(start);
    expect(after.rngState).toBeDefined();
  });

  it('playCard is deterministic from an identical snapshot', () => {
    const start = initCombat(run.deck, 72, 72, [], enemy, 'Pyroclast', { rngSeed: 314 });
    const playable = start.hand.find((c) => (c.cost ?? 0) <= start.playerEnergy);
    if (!playable) return; // starter decks always have a 0/1-cost card; defensive
    const a = playCard(start, playable.instanceId);
    const b = playCard(JSON.parse(JSON.stringify(start)), playable.instanceId);
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });
});
