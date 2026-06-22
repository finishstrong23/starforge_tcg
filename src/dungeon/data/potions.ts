// ─── Potion Pool ─────────────────────────────────────────────────────────────
// All 14 single-use combat consumables for the roguelite mode.
//
// Each potion exposes a pure `onUse(state, ctx?) -> state` function so the UI
// can call it without going through the card-play pipeline. Potion drinks do
// NOT trigger card-play relic hooks - they're a separate action type.
//
// Source of truth: docs/roguelite/potions-design.md (root-level potions-design.md).

import type {
  CardInstance,
  CombatState,
  PotionContext,
  PotionDefinition,
  PotionInstance,
} from '../types';
import {
  addEffect,
  applyShieldedDamage,
  drawCards,
  gainBlock,
  getStack,
  isChannelCard,
} from '../engine/combat';
import { addHeat } from '../engine/heat';

// ─── Helpers shared across multiple potions ──────────────────────────────────

/** AoE: apply a status effect to the main enemy + every enemy minion on board. */
function applyStatusToAllEnemies(
  state: CombatState,
  type: 'burn' | 'poison' | 'weak' | 'vulnerable',
  stacks: number,
): CombatState {
  let s: CombatState = {
    ...state,
    enemy: {
      ...state.enemy,
      statusEffects: addEffect(state.enemy.statusEffects, type, stacks),
    },
  };
  s = {
    ...s,
    enemyBoard: s.enemyBoard.map((m) => ({
      ...m,
      statusEffects: addEffect(m.statusEffects, type, stacks),
    })),
  };
  return s;
}

/** AoE: deal raw damage (after Strength/Vulnerable/Weak math) to the main enemy + every enemy minion. */
function dealAoeDamage(state: CombatState, raw: number): CombatState {
  let s = { ...state };

  // Main enemy
  const mainDmg = scaledDamage(raw, s.playerStatusEffects, s.enemy.statusEffects);
  const mainResult = applyShieldedDamage(s.enemy.currentShield, s.enemy.currentHealth, mainDmg);
  s = { ...s, enemy: { ...s.enemy, currentHealth: mainResult.health, currentShield: mainResult.shield } };

  // Minions on board
  s = {
    ...s,
    enemyBoard: s.enemyBoard.map((m) => {
      const dmg = scaledDamage(raw, s.playerStatusEffects, m.statusEffects);
      const r = applyShieldedDamage(0, m.currentHealth ?? 0, dmg);
      return { ...m, currentHealth: r.health };
    }).filter((m) => (m.currentHealth ?? 0) > 0),
  };

  return s;
}

/**
 * Damage scaling - replicates the calcDamage logic from combat.ts so potions
 * benefit from Strength and pay the Vulnerable / Weak modifiers exactly like
 * cards do. Inlined here to avoid an export ping-pong with combat.ts.
 */
function scaledDamage(
  raw: number,
  attackerEffects: CombatState['playerStatusEffects'],
  defenderEffects: CombatState['playerStatusEffects'],
): number {
  let n = raw + getStack(attackerEffects, 'strength');
  if (getStack(attackerEffects, 'weak') > 0) n = Math.floor(n * 0.75);
  if (getStack(defenderEffects, 'vulnerable') > 0) n = Math.floor(n * 1.5);
  return Math.max(0, n);
}

/** Single-target damage - accepts ctx.targetId. 'enemy' = main enemy, otherwise a minion instanceId. */
function dealTargetedDamage(state: CombatState, raw: number, targetId: string): CombatState {
  let s = { ...state };
  if (targetId === 'enemy' || targetId === undefined) {
    const dmg = scaledDamage(raw, s.playerStatusEffects, s.enemy.statusEffects);
    const r = applyShieldedDamage(s.enemy.currentShield, s.enemy.currentHealth, dmg);
    s = { ...s, enemy: { ...s.enemy, currentHealth: r.health, currentShield: r.shield } };
  } else {
    s = {
      ...s,
      enemyBoard: s.enemyBoard.map((m) => {
        if (m.instanceId !== targetId) return m;
        const dmg = scaledDamage(raw, s.playerStatusEffects, m.statusEffects);
        const r = applyShieldedDamage(0, m.currentHealth ?? 0, dmg);
        return { ...m, currentHealth: r.health };
      }).filter((m) => (m.currentHealth ?? 0) > 0),
    };
  }
  return s;
}

const DEBUFF_TYPES = new Set(['weak', 'vulnerable', 'burn', 'poison']);

// ─── Pool ────────────────────────────────────────────────────────────────────

export const POTION_POOL: PotionDefinition[] = [
  // ── Commons (7) ─────────────────────────────────────────────────────────
  {
    id: 'block_draught',
    name: 'Block Draught',
    rarity: 'common',
    category: 'Defense',
    targeting: 'self',
    effect: 'Gain 12 Block.',
    flavorText: 'Thick, gray, tastes like iron shavings.',
    onUse: (state) => gainBlock(state, 12),
  },
  {
    id: 'swift_brew',
    name: 'Swift Brew',
    rarity: 'common',
    category: 'Tempo',
    targeting: 'self',
    effect: 'Draw 3 cards.',
    flavorText: 'A wisp of pale smoke rises continuously from the bottle.',
    onUse: (state) => drawCards(state, 3),
  },
  {
    id: 'surge_vial',
    name: 'Surge Vial',
    rarity: 'common',
    category: 'Tempo',
    targeting: 'self',
    effect: 'Gain 2 Energy.',
    flavorText: 'Fizzes when uncorked. Tastes like copper.',
    onUse: (state) => ({ ...state, playerEnergy: state.playerEnergy + 2 }),
  },
  {
    id: 'kindling_flask',
    name: 'Kindling Flask',
    rarity: 'common',
    category: 'Damage',
    targeting: 'self',
    effect: 'Apply Ignite 4 to all enemies.',
    flavorText: 'Sealed Pyroclast firestarter.',
    onUse: (state) => applyStatusToAllEnemies(state, 'burn', 4),
  },
  {
    id: 'focus_tincture',
    name: 'Focus Tincture',
    rarity: 'common',
    category: 'Buff',
    targeting: 'self',
    effect: 'Gain 2 Strength this combat.',
    flavorText: 'Cool, blue-green, faintly luminescent.',
    onUse: (state) => ({
      ...state,
      playerStatusEffects: addEffect(state.playerStatusEffects, 'strength', 2),
    }),
  },
  {
    id: 'stoneblood_elixir',
    name: 'Stoneblood Elixir',
    rarity: 'common',
    category: 'Buff',
    targeting: 'self',
    effect: 'Gain 2 Dexterity this combat.',
    flavorText: 'Heavy bottle, rust-colored contents.',
    onUse: (state) => ({
      ...state,
      playerStatusEffects: addEffect(state.playerStatusEffects, 'dexterity', 2),
    }),
  },
  {
    id: 'cleansing_draft',
    name: 'Cleansing Draft',
    rarity: 'common',
    category: 'Recovery',
    targeting: 'self',
    effect: 'Remove all debuffs from yourself.',
    flavorText: 'Smells like ozone before a storm.',
    onUse: (state) => ({
      ...state,
      playerStatusEffects: state.playerStatusEffects.filter((e) => !DEBUFF_TYPES.has(e.type)),
    }),
  },

  // ── Uncommons (5) ───────────────────────────────────────────────────────
  {
    id: 'forgefire_flask',
    name: 'Forgefire Flask',
    rarity: 'uncommon',
    category: 'Damage',
    targeting: 'enemy',
    effect: 'Deal 20 damage to target enemy. Gain 3 Heat.',
    flavorText: 'Glows from within. Warm even through the glass.',
    onUse: (state, ctx) => {
      const targetId = ctx?.targetId ?? 'enemy';
      let s = dealTargetedDamage(state, 20, targetId);
      s = { ...s, playerHeat: addHeat(s.playerHeat, 3).next };
      return s;
    },
  },
  {
    id: 'lumen_infusion',
    name: 'Lumen Infusion',
    rarity: 'uncommon',
    category: 'Buff',
    targeting: 'lumen-allocation',
    effect: 'Add 3 Lumens distributed across Channel cards in hand. If none, gain 12 Block instead.',
    flavorText: 'A bottle of captured sunrise.',
    onUse: (state, ctx) => {
      const channels = state.hand.filter(isChannelCard);
      // Fallback: no Channel cards -> 12 Block (so the potion is never dead).
      if (channels.length === 0) return gainBlock(state, 12);

      // If the UI provided an explicit allocation, use it.
      if (ctx?.lumenAllocation) {
        return {
          ...state,
          hand: state.hand.map((c) => {
            const add = ctx.lumenAllocation![c.instanceId] ?? 0;
            return add > 0 ? { ...c, lumens: (c.lumens ?? 0) + add } : c;
          }),
        };
      }

      // Default: spread 3 evenly with leftmost-gets-the-remainder.
      const per = Math.floor(3 / channels.length);
      const remainder = 3 % channels.length;
      let firstAssigned = false;
      return {
        ...state,
        hand: state.hand.map((c) => {
          if (!isChannelCard(c)) return c;
          const extra = !firstAssigned ? remainder : 0;
          firstAssigned = true;
          return { ...c, lumens: (c.lumens ?? 0) + per + extra };
        }),
      };
    },
  },
  {
    id: 'wyrmfire_breath',
    name: 'Wyrmfire Breath',
    rarity: 'uncommon',
    category: 'Damage',
    targeting: 'self',
    effect: 'Deal 10 damage to all enemies. Apply Ignite 2 to all.',
    flavorText: 'Do not inhale.',
    onUse: (state) => {
      let s = dealAoeDamage(state, 10);
      s = applyStatusToAllEnemies(s, 'burn', 2);
      return s;
    },
  },
  {
    id: 'aegis_mixture',
    name: 'Aegis Mixture',
    rarity: 'uncommon',
    category: 'Defense',
    targeting: 'self',
    effect: 'Gain 20 Block. Next turn, gain 20 Block.',
    flavorText: 'Thick silver liquid, reflects no light.',
    onUse: (state) => {
      const s = gainBlock(state, 20);
      return { ...s, pendingTurnStartBlock: (s.pendingTurnStartBlock ?? 0) + 20 };
    },
  },
  {
    id: 'tacticians_brew',
    name: "Tactician's Brew",
    rarity: 'uncommon',
    category: 'Tempo',
    targeting: 'self',
    effect: 'Draw 4 cards. Gain 1 Energy.',
    flavorText: 'Clear liquid, smells like nothing.',
    onUse: (state) => {
      const drawn = drawCards(state, 4);
      return { ...drawn, playerEnergy: drawn.playerEnergy + 1 };
    },
  },

  // ── Rares (2) ───────────────────────────────────────────────────────────
  {
    id: 'phoenix_vial',
    name: 'Phoenix Vial',
    rarity: 'rare',
    category: 'Recovery',
    targeting: 'self',
    effect: 'Heal to full HP. Exhaust all cards in your hand.',
    flavorText: 'The bottle is warm. A single spark moves inside it, never dying.',
    onUse: (state) => {
      const exhausted: CardInstance[] = [...state.exhaustPile, ...state.hand];
      return {
        ...state,
        playerHealth: state.playerMaxHealth,
        hand: [],
        exhaustPile: exhausted,
      };
    },
  },
  {
    id: 'chronoshift_philter',
    name: 'Chronoshift Philter',
    rarity: 'rare',
    category: 'Extreme',
    targeting: 'self',
    effect: 'Take another turn. Hand is replaced with a fresh draw.',
    flavorText: 'Liquid that seems to flow backward in the bottle.',
    onUse: (state) => {
      // MVP: discard hand -> draw 5 fresh -> +1 Energy -> enemy skips next turn.
      // Functionally equivalent to a second turn without restructuring the
      // turn loop. The skip flag is consumed by executeEnemyTurn.
      let s: CombatState = { ...state };
      s = { ...s, discardPile: [...s.discardPile, ...s.hand], hand: [] };
      s = drawCards(s, 5);
      s = { ...s, playerEnergy: s.playerEnergy + 1, skipNextEnemyTurn: true };
      return s;
    },
  },
];

// ─── Lookup helpers ──────────────────────────────────────────────────────────

const POTION_BY_ID = new Map(POTION_POOL.map((p) => [p.id, p]));

export function getPotionDef(id: string): PotionDefinition | undefined {
  return POTION_BY_ID.get(id);
}

export function getPotionsByRarity(rarity: PotionDefinition['rarity']): PotionDefinition[] {
  return POTION_POOL.filter((p) => p.rarity === rarity);
}

// ─── Acquisition rolls ───────────────────────────────────────────────────────

const RARITY_WEIGHTS: { rarity: PotionDefinition['rarity']; weight: number }[] = [
  { rarity: 'common',   weight: 65 },
  { rarity: 'uncommon', weight: 28 },
  { rarity: 'rare',     weight: 7 },
];

function pickWeighted<T extends { weight: number }>(items: T[], rng: () => number): T {
  const total = items.reduce((sum, x) => sum + x.weight, 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

function pickFromArray<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Pick any potion at the rarity-weighted distribution. */
export function rollPotion(rng: () => number = Math.random): PotionInstance {
  const { rarity } = pickWeighted(RARITY_WEIGHTS, rng);
  const pool = POTION_POOL.filter((p) => p.rarity === rarity);
  const def = pickFromArray(pool, rng);
  return { definitionId: def.id };
}

/**
 * Roll a potion drop after a combat win. Per spec:
 *   - Boss combats -> always drop a potion
 *   - Elite combats -> always drop a potion
 *   - Regular combats -> 40% chance
 */
export function rollPotionDrop(opts: {
  isElite: boolean;
  isBoss: boolean;
  rng?: () => number;
}): PotionInstance | null {
  const rng = opts.rng ?? Math.random;
  if (opts.isElite || opts.isBoss) return rollPotion(rng);
  if (rng() < 0.40) return rollPotion(rng);
  return null;
}

/**
 * Pick `count` distinct potions for a shop's stock. Rarity-weighted, no
 * duplicates within the same shop's inventory.
 */
export function rollShopPotions(count: number, rng: () => number = Math.random): PotionInstance[] {
  const out: PotionInstance[] = [];
  const used = new Set<string>();
  let attempts = 0;
  while (out.length < count && attempts++ < 100) {
    const inst = rollPotion(rng);
    if (used.has(inst.definitionId)) continue;
    used.add(inst.definitionId);
    out.push(inst);
  }
  return out;
}

/** Per-act gold price for a single potion in shops. */
export function potionShopPrice(act: 1 | 2 | 3): number {
  return act === 1 ? 50 : act === 2 ? 75 : 100;
}

/**
 * Drink a potion. Returns the new state and whether the drink succeeded
 * (false if the potion id is unknown). Does NOT touch the inventory - the
 * caller is responsible for clearing the slot. Also does NOT trigger any
 * card-play relic hook (which is correct - potions are a distinct action).
 */
export function applyPotion(
  state: CombatState,
  potionId: string,
  ctx?: PotionContext,
): { state: CombatState; ok: boolean } {
  const def = POTION_BY_ID.get(potionId);
  if (!def) return { state, ok: false };
  const next = def.onUse(state, ctx);
  return {
    state: {
      ...next,
      combatLog: [...next.combatLog, `Drank ${def.name}`].slice(-8),
      lastAction: `Drank ${def.name}`,
    },
    ok: true,
  };
}
