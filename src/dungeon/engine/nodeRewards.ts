/**
 * Seeded node-resolution rolls: post-combat/treasure rewards, shop stock,
 * and blessing options.
 *
 * All rolls are deterministic in (run seed, act, node id) and the results
 * are persisted on RunState by the run reducer. This closes the refresh
 * save-scum family of exploits: reloading on the reward screen used to
 * re-award gold and reroll every offer, and shops/blessings rerolled stock.
 *
 * Shop pricing lives here too so the reducer (which validates purchases)
 * and the shop UI (which displays prices) share one source of truth.
 */

import type {
  CardDefinition,
  Faction,
  PendingReward,
  RelicDefinition,
  RunState,
  ShopStock,
} from '../types';
import { CARD_POOL } from '../data/cards';
import { RELIC_POOL } from '../data/relics';
import { rollPotionDrop, rollShopPotions } from '../data/potions';
import { BLESSING_POOL, rollBlessings } from '../data/blessings';
import { generateRewardOptions } from './draft';
import { getAscensionMods } from './ascension';
import { createSeededRng } from './seededRng';

// ─── Pricing (shared by reducer + ShopView) ─────────────────────────────────

export const CARD_PRICE: Record<string, number> = {
  Common: 50, Uncommon: 75, Rare: 100, Epic: 140, Legendary: 175,
};

export const REMOVAL_COST = 75;

/** Card removals purchasable per shop visit (STS-style single purge). */
export const REMOVALS_PER_SHOP = 1;

export function relicPrice(relic: RelicDefinition): number {
  return relic.rarity === 'Boss' ? 200 : relic.rarity === 'Rare' ? 150 : relic.rarity === 'Uncommon' ? 120 : 100;
}

export function cardPrice(def: CardDefinition): number {
  return CARD_PRICE[def.rarity] ?? 75;
}

// ─── Lookups ────────────────────────────────────────────────────────────────

export function getCardDefById(id: string): CardDefinition | undefined {
  return CARD_POOL.find((c) => c.id === id);
}

export function getRelicById(id: string): RelicDefinition | undefined {
  return RELIC_POOL.find((r) => r.id === id);
}

// ─── Reward bundle ──────────────────────────────────────────────────────────

function pickWith<T>(rng: () => number, arr: T[]): T | undefined {
  return arr.length ? arr[Math.floor(rng() * arr.length)] : undefined;
}

/**
 * Roll a relic offer. Boss rewards draw from the Boss pool; elites, treasure
 * chests, and the every-3rd-combat cadence draw a weighted Uncommon/Rare.
 * Relics the player already owns are never offered (duplicates are dead —
 * relic effects are boolean has-checks).
 */
function rollRelicOffer(
  rng: () => number,
  ownedIds: Set<string>,
  isBoss: boolean,
  rareWeightMul: number,
): RelicDefinition | undefined {
  if (isBoss) {
    const bosses = RELIC_POOL.filter((r) => r.rarity === 'Boss' && !ownedIds.has(r.id));
    const boss = pickWith(rng, bosses);
    if (boss) return boss;
    // All boss relics owned — fall through to the standard pool.
  }
  const uncommons = RELIC_POOL.filter((r) => r.rarity === 'Uncommon' && !ownedIds.has(r.id));
  const rares = RELIC_POOL.filter((r) => r.rarity === 'Rare' && !ownedIds.has(r.id));
  if (uncommons.length === 0 && rares.length === 0) return undefined;

  const totalW = uncommons.length + rares.length * rareWeightMul;
  if (totalW <= 0) return pickWith(rng, uncommons);
  const roll = rng() * totalW;
  if (roll < uncommons.length) return pickWith(rng, uncommons) ?? pickWith(rng, rares);
  return pickWith(rng, rares) ?? pickWith(rng, uncommons);
}

export interface RewardRollContext {
  sourceNodeId: string | null;
  isElite: boolean;
  isBossReward: boolean;
  isTreasure: boolean;
  faction?: Faction;
}

/**
 * Roll the full reward bundle for a combat win or treasure node. Deterministic
 * in (run seed, act, node id, combat count). Gold amounts: regular 10-18,
 * elite 25-35, boss 45-60, scaled by the A7 gold multiplier. Relics are
 * guaranteed from elites, bosses, and treasure chests; regular combats keep
 * the every-3rd-combat cadence.
 */
export function rollRewardBundle(run: RunState, ctx: RewardRollContext): PendingReward {
  const rng = createSeededRng(
    run.seed ?? 'legacy', 'reward', run.currentAct,
    ctx.sourceNodeId ?? 'unknown', run.runStats.totalCombats,
  );
  const mods = getAscensionMods(run.ascensionLevel);

  const baseGold = ctx.isBossReward ? 45 + Math.floor(rng() * 16)
    : ctx.isElite ? 25 + Math.floor(rng() * 11)
    : 10 + Math.floor(rng() * 9);
  const gold = Math.max(1, Math.round(baseGold * mods.goldRewardMul));

  const currentMap = run.actMaps[run.currentAct - 1];
  const roomNumber = currentMap?.nodes.filter((n) => n.visited).length ?? 1;

  const cardOptionIds = generateRewardOptions(
    roomNumber,
    run.currentAct,
    ctx.faction,
    rng,
    run.deck,
  ).map((def) => def.id);

  const showRelic = ctx.isBossReward || ctx.isElite || ctx.isTreasure
    || run.runStats.totalCombats % 3 === 0;
  const ownedIds = new Set(run.relics.map((r) => r.id));
  const relic = showRelic
    ? rollRelicOffer(rng, ownedIds, ctx.isBossReward, mods.rareRelicMul)
    : undefined;

  // Elites and bosses always drop a potion; regular combats roll 40%.
  // Treasure chests roll like a regular combat.
  const potion = rollPotionDrop({ isElite: ctx.isElite, isBoss: ctx.isBossReward, rng });

  return {
    sourceNodeId: ctx.sourceNodeId,
    isBossReward: ctx.isBossReward,
    isElite: ctx.isElite,
    isTreasure: ctx.isTreasure,
    gold,
    cardOptionIds,
    cardResolved: false,
    relicId: relic?.id,
    relicTaken: false,
    potion: potion ?? undefined,
    potionResolved: potion ? false : true,
  };
}

// ─── Shop stock ─────────────────────────────────────────────────────────────

function rollShopCards(
  rng: () => number,
  count: number,
  faction: Faction | undefined,
  deck: RunState['deck'],
): string[] {
  // Faction lock: cross-faction cards are mechanically dead picks. Also skip
  // cards the player already owns in upgraded form — a base copy would be
  // strictly worse than what they have.
  const ownedUpgradedIds = new Set(deck.filter((c) => c.upgraded).map((c) => c.id));
  const pool = (faction ? CARD_POOL.filter((c) => c.faction === faction) : CARD_POOL)
    .filter((c) => !ownedUpgradedIds.has(c.id));
  const used = new Set<string>();
  const out: string[] = [];
  let tries = 0;
  while (out.length < count && tries++ < 200) {
    const c = pickWith(rng, pool);
    if (c && !used.has(c.id)) { used.add(c.id); out.push(c.id); }
  }
  return out;
}

function rollShopRelics(rng: () => number, count: number, ownedIds: Set<string>): string[] {
  const pool = RELIC_POOL.filter(
    (r) => (r.rarity === 'Common' || r.rarity === 'Uncommon' || r.rarity === 'Rare')
      && !ownedIds.has(r.id),
  );
  const used = new Set<string>();
  const out: string[] = [];
  let tries = 0;
  while (out.length < count && tries++ < 100) {
    const r = pickWith(rng, pool);
    if (r && !used.has(r.id)) { used.add(r.id); out.push(r.id); }
  }
  return out;
}

/** Roll a shop's full stock. Deterministic in (run seed, act, node id). */
export function rollShopStock(
  run: RunState,
  nodeId: string | null,
  faction?: Faction,
): ShopStock {
  const rng = createSeededRng(run.seed ?? 'legacy', 'shop', run.currentAct, nodeId ?? 'unknown');
  const ownedRelicIds = new Set(run.relics.map((r) => r.id));
  return {
    cardIds: rollShopCards(rng, 4, faction, run.deck),
    soldCardIds: [],
    relicIds: rollShopRelics(rng, 2, ownedRelicIds),
    soldRelicIds: [],
    potions: rollShopPotions(2 + Math.floor(rng() * 2), rng),
    soldPotionIndexes: [],
    removalsUsed: 0,
  };
}

// ─── Blessings ──────────────────────────────────────────────────────────────

/** Roll the 3 blessing options for the current act's blessing screen. */
export function rollBlessingOptionIds(run: RunState, faction?: Faction): string[] {
  const rng = createSeededRng(run.seed ?? 'legacy', 'blessing', run.currentAct);
  return rollBlessings(3, rng, faction).map((b) => b.id);
}

// ─── Legacy-save healing ────────────────────────────────────────────────────

/**
 * Fill in missing node-resolution state for saves written before these
 * fields existed. Conservative: a legacy save hydrated mid-reward gets a
 * freshly-rolled (deterministic) bundle with gold 0 so nothing is re-awarded.
 */
export function ensureNodeStates(run: RunState, faction?: Faction): RunState {
  let next = run;
  if (next.phase === 'reward' && !next.pendingReward) {
    const currentMap = next.actMaps[next.currentAct - 1];
    const lastNode = currentMap?.nodes.find((n) => n.id === currentMap.currentNodeId);
    const bundle = rollRewardBundle(next, {
      sourceNodeId: currentMap?.currentNodeId ?? null,
      isElite: lastNode?.type === 'elite',
      isBossReward: currentMap?.completed ?? false,
      isTreasure: lastNode?.type === 'treasure',
      faction,
    });
    next = { ...next, pendingReward: { ...bundle, gold: 0 } };
  }
  if (next.phase === 'shop' && !next.shopStock) {
    const currentMap = next.actMaps[next.currentAct - 1];
    next = { ...next, shopStock: rollShopStock(next, currentMap?.currentNodeId ?? null, faction) };
  }
  if (next.phase === 'blessing' && (!next.blessingOptionIds || next.blessingOptionIds.length === 0)) {
    next = { ...next, blessingOptionIds: rollBlessingOptionIds(next, faction) };
  }
  return next;
}

export { BLESSING_POOL };
