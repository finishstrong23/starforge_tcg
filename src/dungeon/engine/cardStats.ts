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
