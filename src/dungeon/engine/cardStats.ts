/**
 * Single sanctioned read site for all upgrade-affected card stats.
 *
 * The dungeon engine is regex-driven on card text, so `upgradeText` is
 * the primary effect-override mechanism — most upgrades just swap text.
 * Numeric stat overrides (cost, attack, health) are honored via the
 * optional `upgradedCost` / `upgradedAttack` / `upgradedHealth` fields
 * on CardDefinition.
 *
 * EVERY engine site that needs a card's effective cost / attack / health /
 * text MUST go through `getCardStats(instance)`. Reading those fields
 * directly silently ignores upgrades and is a bug waiting to happen.
 */

import type { CardDefinition, CardInstance } from '../types';

export interface CardStats {
  cost: number;
  attack: number | undefined;
  health: number | undefined;
  /** Effective text — upgradeText if upgraded and present, else cardText. */
  text: string;
}

export function getCardStats(card: CardInstance | CardDefinition): CardStats {
  const upgraded = (card as CardInstance).upgraded === true || card.upgraded === true;
  return {
    cost: upgraded && card.upgradedCost !== undefined ? card.upgradedCost : card.cost,
    attack: upgraded && card.upgradedAttack !== undefined ? card.upgradedAttack : card.attack,
    health: upgraded && card.upgradedHealth !== undefined ? card.upgradedHealth : card.health,
    text: upgraded && card.upgradeText !== undefined ? card.upgradeText : card.cardText,
  };
}

/** Convenience accessor — returns just the active card text (most common need). */
export function getCardText(card: CardInstance | CardDefinition): string {
  return getCardStats(card).text;
}

/** Convenience accessor — returns just the effective cost. */
export function getCardCost(card: CardInstance | CardDefinition): number {
  return getCardStats(card).cost;
}

// ─── Write-side chokepoint ─────────────────────────────────────────────────
//
// Mirrors the read-side rule (`getCardStats` is the only sanctioned reader
// of upgrade-affected stats) for write paths. The Phase 3 applyAugment bug
// proved that direct writes to a CardInstance's text or cost can land on
// the wrong upgrade-aware field — silently no-op'ing on upgraded cards
// while looking correct in the in-memory object.
//
// Rule: any code path that mutates a CardInstance's effective text or cost
// in-combat MUST go through `setActiveCardText` / `setActiveCardCost`. Direct
// `{ ...card, cardText: ... }` writes outside this module are upgrade-
// ignoring bugs waiting to happen.
//
// Both helpers write to BOTH the base field and the upgrade field (when
// upgrade is active). This is intentional: combat-ephemeral patches don't
// need to preserve the original definition values, and writing both fields
// makes the patched card observable via `getCardStats` regardless of
// upgrade state — bulletproofing against future code that reads the wrong
// field.

/**
 * Sanctioned write to a CardInstance's active text. If the card is
 * upgraded, writes to BOTH `cardText` and `upgradeText` so subsequent
 * `getCardText` calls return the new value.
 */
export function setActiveCardText<T extends CardInstance>(card: T, newText: string): T {
  if (card.upgraded) {
    return { ...card, cardText: newText, upgradeText: newText };
  }
  return { ...card, cardText: newText };
}

/**
 * Sanctioned write to a CardInstance's active cost. If the card has a
 * numeric `upgradedCost` override active, writes to BOTH `cost` and
 * `upgradedCost` so subsequent `getCardCost` calls return the new value.
 * Otherwise writes to `cost` only.
 */
export function setActiveCardCost<T extends CardInstance>(card: T, newCost: number): T {
  if (card.upgraded && card.upgradedCost !== undefined) {
    return { ...card, cost: newCost, upgradedCost: newCost };
  }
  return { ...card, cost: newCost };
}
