/**
 * Ascension — STS-style difficulty tiers (0–10).
 *
 * Each Ascension level layers one modifier on top of the previous ones.
 * The full ladder, per the launch plan:
 *
 *    A0  Baseline — no modifiers.
 *    A1  Enemies have +10 % HP.
 *    A2  Each act gets +1 elite node.
 *    A3  Shop prices +25 %.
 *    A4  Bosses start with +2 Strength.
 *    A5  Player starts with -10 max HP.
 *    A6  Enemies deal +10 % damage.
 *    A7  Combat gold rewards -25 %.
 *    A8  Rare relic drop rate halved.
 *    A9  You draw 4 cards per turn (instead of 5).
 *    A10 Bosses get the A4 buff *and* enemies get the A6 damage buff
 *        (combine + amplify).
 *
 * This module exposes:
 *   - getAscensionMods(level) → flags + numeric multipliers.
 *   - getUnlockedAscension(faction) / unlockAscension(faction, level) for
 *     persistent per-faction high-water marks in localStorage.
 */

import type { AscensionLevel, Faction } from '../types';

export interface AscensionMods {
  /** Multiplier on enemy maxHealth at combat init. */
  enemyHpMul: number;
  /** Extra elite nodes added to each act's mid section. */
  extraEliteNodes: number;
  /** Multiplier on shop card / relic / potion prices. */
  shopPriceMul: number;
  /** Strength stacks granted to bosses on combat init. */
  bossStrength: number;
  /** Flat HP penalty to the player's starting maxHealth. */
  startingHpPenalty: number;
  /** Multiplier on enemy attack values at combat init. */
  enemyDamageMul: number;
  /** Multiplier on combat-end gold rewards. */
  goldRewardMul: number;
  /** Multiplier on rare relic drop weight. */
  rareRelicMul: number;
  /** Cards drawn at start of each player turn (default 5). */
  drawPerTurn: number;
}

const BASE_MODS: AscensionMods = {
  enemyHpMul: 1,
  extraEliteNodes: 0,
  shopPriceMul: 1,
  bossStrength: 0,
  startingHpPenalty: 0,
  enemyDamageMul: 1,
  goldRewardMul: 1,
  rareRelicMul: 1,
  drawPerTurn: 5,
};

export function getAscensionMods(level: AscensionLevel): AscensionMods {
  // Each level is additive on the prior ones — the ladder accumulates.
  const m: AscensionMods = { ...BASE_MODS };
  if (level >= 1)  m.enemyHpMul       = 1.1;
  if (level >= 2)  m.extraEliteNodes  = 1;
  if (level >= 3)  m.shopPriceMul     = 1.25;
  if (level >= 4)  m.bossStrength     = 2;
  if (level >= 5)  m.startingHpPenalty = 10;
  if (level >= 6)  m.enemyDamageMul   = 1.1;
  if (level >= 7)  m.goldRewardMul    = 0.75;
  if (level >= 8)  m.rareRelicMul     = 0.5;
  if (level >= 9)  m.drawPerTurn      = 4;
  if (level >= 10) {
    // A10 = "combine A4 + A6 + amplify". Boss strength bumped, enemy damage
    // bumped further. Already-set values get overwritten with stronger ones.
    m.bossStrength    = 4;
    m.enemyDamageMul  = 1.2;
  }
  return m;
}

/** Human-readable summary, one line per active modifier. Used in the UI. */
export function describeAscension(level: AscensionLevel): string[] {
  const lines: string[] = [];
  if (level >= 1)  lines.push('A1 · Enemies have +10 % HP');
  if (level >= 2)  lines.push('A2 · Each act has one extra elite node');
  if (level >= 3)  lines.push('A3 · Shop prices +25 %');
  if (level >= 4)  lines.push('A4 · Bosses start with +2 Strength');
  if (level >= 5)  lines.push('A5 · You start with -10 max HP');
  if (level >= 6)  lines.push('A6 · Enemies deal +10 % damage');
  if (level >= 7)  lines.push('A7 · Combat gold rewards -25 %');
  if (level >= 8)  lines.push('A8 · Rare relic drop rate halved');
  if (level >= 9)  lines.push('A9 · You draw 4 cards per turn (was 5)');
  if (level >= 10) lines.push('A10 · Bosses +4 Str (was +2), enemies deal +20 % damage (was +10 %)');
  return lines;
}

// ─── Persistent unlocks ──────────────────────────────────────────────────────

const UNLOCK_KEY = 'sf:ascension:unlocks:v1';

type UnlockMap = Partial<Record<Faction, AscensionLevel>>;

function readUnlocks(): UnlockMap {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(UNLOCK_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeUnlocks(map: UnlockMap): void {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(UNLOCK_KEY, JSON.stringify(map)); } catch { /* swallow */ }
}

/** Highest Ascension level the player can choose for this faction. */
export function getMaxUnlockedAscension(faction: Faction): AscensionLevel {
  const cur = readUnlocks()[faction];
  return (cur ?? 0) as AscensionLevel;
}

/**
 * Mark `level` (and below) as unlocked for `faction`. Idempotent: never
 * lowers an existing unlock. Call after a victorious run.
 */
export function unlockAscension(faction: Faction, level: AscensionLevel): void {
  const map = readUnlocks();
  const cur = map[faction] ?? 0;
  if (level > cur) {
    map[faction] = level;
    writeUnlocks(map);
  }
}

/**
 * After a winning run at ascension N, the player unlocks N+1 (capped at 10).
 * Convenience wrapper for the run-end screen.
 */
export function recordWin(faction: Faction, levelBeaten: AscensionLevel): AscensionLevel | null {
  if (levelBeaten >= 10) return null; // already at max
  const next = (levelBeaten + 1) as AscensionLevel;
  const cur = getMaxUnlockedAscension(faction);
  if (next > cur) {
    unlockAscension(faction, next);
    return next;
  }
  return null;
}
