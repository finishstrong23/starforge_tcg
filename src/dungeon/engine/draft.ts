/**
 * STARFORGE TCG — Dungeon Run Draft System
 * Slay the Spire-style card drafting for run opening screen.
 *
 * Draft flow:
 *   Rounds 1-3:  3 cards from starting faction
 *   Rounds 4-6:  2 from starting faction + 1 wild (any faction)
 *   Rounds 7-9:  3 from any faction (open pool)
 *   Round  10:   Pick 1 of 3 starting relics
 */

import type { DungeonCardDefinition, DungeonFaction, DungeonRelic, RunCard } from '../types';
import { generateId } from '../../utils/ids';

// ─── Helpers ────────────────────────────────────────────────

/** Pick `count` random elements from `arr` without duplicates. */
function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

/** Returns true if the card is low-cost (1-2). */
function isLowCost(card: DungeonCardDefinition): boolean {
  return card.cost >= 0 && card.cost <= 2;
}

/**
 * Filter cards to a pool that respects the "no more than 2 copies" rule.
 * A card is excluded if the player already has 2+ copies of it.
 */
function excludeOverPicked(
  cards: DungeonCardDefinition[],
  alreadyPicked: string[],
): DungeonCardDefinition[] {
  const counts = new Map<string, number>();
  for (const id of alreadyPicked) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return cards.filter((c) => (counts.get(c.id) ?? 0) < 2);
}

/**
 * Ensure at least one card has a different rarity than the others.
 * If all three share the same rarity, swap the last one for a card of
 * a different rarity from the remaining pool (if available).
 */
function ensureRarityVariety(
  selected: DungeonCardDefinition[],
  pool: DungeonCardDefinition[],
): DungeonCardDefinition[] {
  if (selected.length < 2) return selected;

  const rarities = new Set(selected.map((c) => c.rarity));
  if (rarities.size > 1) return selected;

  // All same rarity — try to swap the last card for one with a different rarity
  const sharedRarity = selected[0].rarity;
  const selectedIds = new Set(selected.map((c) => c.id));
  const alternatives = pool.filter(
    (c) => c.rarity !== sharedRarity && !selectedIds.has(c.id),
  );

  if (alternatives.length > 0) {
    const replacement = alternatives[Math.floor(Math.random() * alternatives.length)];
    return [...selected.slice(0, -1), replacement];
  }

  return selected;
}

/**
 * Enforce the "never 3 Legendaries in the same round" rule.
 * If all three are Legendary, downgrade the last to a non-Legendary from the pool.
 */
function capLegendaries(
  selected: DungeonCardDefinition[],
  pool: DungeonCardDefinition[],
): DungeonCardDefinition[] {
  const legendaryCount = selected.filter((c) => c.rarity === 'Legendary').length;
  if (legendaryCount < 3) return selected;

  const selectedIds = new Set(selected.map((c) => c.id));
  const alternatives = pool.filter(
    (c) => c.rarity !== 'Legendary' && !selectedIds.has(c.id),
  );

  if (alternatives.length > 0) {
    const replacement = alternatives[Math.floor(Math.random() * alternatives.length)];
    return [...selected.slice(0, 2), replacement];
  }

  return selected;
}

// ─── Card Selection ─────────────────────────────────────────

/**
 * Select `count` cards from `pool` with early-round low-cost bias.
 * In rounds 1-3, 70% of draws favour cost 1-2 cards.
 */
function selectCards(
  pool: DungeonCardDefinition[],
  count: number,
  biasLowCost: boolean,
): DungeonCardDefinition[] {
  if (pool.length <= count) return [...pool];

  const selected: DungeonCardDefinition[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < count; i++) {
    let candidates = pool.filter((c) => !usedIds.has(c.id));
    if (candidates.length === 0) break;

    // Apply low-cost bias: 70% chance to pick from low-cost subset
    if (biasLowCost && Math.random() < 0.7) {
      const lowCostCandidates = candidates.filter(isLowCost);
      if (lowCostCandidates.length > 0) {
        candidates = lowCostCandidates;
      }
    }

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    selected.push(pick);
    usedIds.add(pick.id);
  }

  return selected;
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Generate draft options for a given round.
 *
 * @param round         1-9 for card picks, 10 for relic pick
 * @param startingFaction  The faction the player chose at run start
 * @param allCards      Full catalogue of dungeon card definitions
 * @param alreadyPicked IDs of cards already drafted into the deck
 * @param allRelics     Full catalogue of dungeon relics
 * @returns Object with `cards` (rounds 1-9) or `relics` (round 10)
 */
export function getDraftOptions(
  round: number,
  startingFaction: DungeonFaction,
  allCards: DungeonCardDefinition[],
  alreadyPicked: string[],
  allRelics: DungeonRelic[],
): { cards: DungeonCardDefinition[]; relics: DungeonRelic[] } {
  // ── Round 10: Relic pick ──
  if (round >= 10) {
    const nonBossRelics = allRelics.filter((r) => !r.isBossRelic);
    return { cards: [], relics: pickRandom(nonBossRelics, 3) };
  }

  const available = excludeOverPicked(allCards, alreadyPicked);
  const biasLowCost = round <= 3;

  let selected: DungeonCardDefinition[];

  if (round <= 3) {
    // Rounds 1-3: 3 cards from starting faction
    const factionPool = available.filter((c) => c.faction === startingFaction);
    selected = selectCards(factionPool, 3, biasLowCost);
  } else if (round <= 6) {
    // Rounds 4-6: 2 from starting faction + 1 wild
    const factionPool = available.filter((c) => c.faction === startingFaction);
    const wildPool = available.filter((c) => c.faction !== startingFaction);

    const factionPicks = selectCards(factionPool, 2, biasLowCost);
    const usedIds = new Set(factionPicks.map((c) => c.id));
    const wildCandidates = wildPool.filter((c) => !usedIds.has(c.id));
    const wildPick = selectCards(wildCandidates, 1, false);

    selected = [...factionPicks, ...wildPick];
  } else {
    // Rounds 7-9: 3 from any faction (open pool)
    selected = selectCards(available, 3, false);
  }

  // Post-processing rules
  selected = capLegendaries(selected, available);
  selected = ensureRarityVariety(selected, available);

  return { cards: selected, relics: [] };
}

/**
 * Convert a DungeonCardDefinition to a RunCard by assigning an
 * instance ID and setting upgraded to false.
 */
export function createRunCard(card: DungeonCardDefinition): RunCard {
  return {
    ...card,
    instanceId: generateId('run_card'),
    upgraded: false,
  };
}
