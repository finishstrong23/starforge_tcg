/**
 * STARFORGE TCG — Dungeon Run Card Upgrade System
 * Handles card upgrades at Rest Sites and Shops.
 *
 * Upgrade priority rules (applied in order):
 *  1. Already upgraded → cannot upgrade
 *  2. Cost >= 2 → reduce cost by 1
 *  3. Cost 1 Minion → add SWIFT keyword
 *  4. Cost 1 Spell → add "Draw 1 card" to text
 *  5. Cost 0 → +1/+1 for Minions, +1 damage for Spells
 *  6. Has LAST_WORDS with damage number → +2 to that damage
 *  7. Has IMMOLATE with damage number → +2 to that damage
 *  8. Minion with no keywords → add SWIFT
 *  9. Spell with no keywords → add "Draw 1 card"
 * 10. Structure → reduce cost by 1
 */

import type { RunCard } from '../types';

// ─── Helpers ────────────────────────────────────────────────

/** Increment the first number found in a string by `amount`. */
function bumpFirstNumber(text: string, amount: number): string {
  return text.replace(/\d+/, (match) => String(Number(match) + amount));
}

/** Check whether the card text contains a keyword trigger with a damage number. */
function hasKeywordWithDamage(card: RunCard, keyword: string): boolean {
  const kw = keyword.toUpperCase();
  const hasKw = card.keywords.some((k) => k.toUpperCase() === kw);
  if (!hasKw) return false;
  // Check that the card text contains at least one number (damage value)
  return /\d+/.test(card.cardText);
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Check if a card can be upgraded.
 * A card that is already upgraded cannot be upgraded again.
 */
export function canUpgrade(card: RunCard): boolean {
  return !card.upgraded;
}

/**
 * Get a preview of the upgraded version of a card without mutating
 * the original. Returns a new RunCard with upgrade fields set.
 */
export function getUpgradePreview(card: RunCard): RunCard {
  if (!canUpgrade(card)) return { ...card };

  const preview: RunCard = {
    ...card,
    keywords: [...card.keywords],
    upgraded: true,
  };

  const effectiveCost = card.upgradedCost ?? card.cost;

  // Rule 2: Cost >= 2 → reduce cost by 1
  if (effectiveCost >= 2) {
    preview.upgradedCost = effectiveCost - 1;
    preview.upgradedText = card.cardText;
    return preview;
  }

  // Rule 3: Cost 1 Minion → add SWIFT
  if (effectiveCost === 1 && card.type === 'Minion') {
    const newKeywords = [...card.keywords];
    if (!newKeywords.some((k) => k.toUpperCase() === 'SWIFT')) {
      newKeywords.push('SWIFT');
    }
    preview.upgradedKeywords = newKeywords;
    preview.upgradedText = card.cardText;
    return preview;
  }

  // Rule 4: Cost 1 Spell → add "Draw 1 card"
  if (effectiveCost === 1 && card.type === 'Spell') {
    const suffix = card.cardText ? `${card.cardText} Draw 1 card.` : 'Draw 1 card.';
    preview.upgradedText = suffix;
    return preview;
  }

  // Rule 5: Cost 0 → +1/+1 for Minions, +1 damage for Spells
  if (effectiveCost === 0) {
    if (card.type === 'Minion') {
      preview.attack = (card.attack ?? 0) + 1;
      preview.health = (card.health ?? 0) + 1;
      preview.upgradedText = card.cardText;
      return preview;
    }
    if (card.type === 'Spell') {
      if (/\d+/.test(card.cardText)) {
        preview.upgradedText = bumpFirstNumber(card.cardText, 1);
      } else {
        preview.upgradedText = card.cardText;
      }
      return preview;
    }
  }

  // Rule 6: Has LAST_WORDS with damage number → +2 to that damage
  if (hasKeywordWithDamage(card, 'LAST_WORDS')) {
    preview.upgradedText = bumpFirstNumber(card.cardText, 2);
    return preview;
  }

  // Rule 7: Has IMMOLATE with damage number → +2 to that damage
  if (hasKeywordWithDamage(card, 'IMMOLATE')) {
    preview.upgradedText = bumpFirstNumber(card.cardText, 2);
    return preview;
  }

  // Rule 8: Minion with no keywords → add SWIFT
  if (card.type === 'Minion' && card.keywords.length === 0) {
    preview.upgradedKeywords = ['SWIFT'];
    preview.upgradedText = card.cardText;
    return preview;
  }

  // Rule 9: Spell with no keywords → add "Draw 1 card"
  if (card.type === 'Spell' && card.keywords.length === 0) {
    const suffix = card.cardText ? `${card.cardText} Draw 1 card.` : 'Draw 1 card.';
    preview.upgradedText = suffix;
    return preview;
  }

  // Rule 10: Structure → reduce cost by 1
  if (card.type === 'Structure') {
    preview.upgradedCost = Math.max(0, effectiveCost - 1);
    preview.upgradedText = card.cardText;
    return preview;
  }

  // Fallback: mark as upgraded with no stat changes
  preview.upgradedText = card.cardText;
  return preview;
}

/**
 * Apply an upgrade to a card in-place and return it.
 * Mutates the original card object.
 */
export function applyUpgrade(card: RunCard): RunCard {
  if (!canUpgrade(card)) return card;

  const preview = getUpgradePreview(card);

  card.upgraded = preview.upgraded;
  if (preview.upgradedCost !== undefined) card.upgradedCost = preview.upgradedCost;
  if (preview.upgradedText !== undefined) card.upgradedText = preview.upgradedText;
  if (preview.upgradedKeywords !== undefined) card.upgradedKeywords = preview.upgradedKeywords;
  if (preview.attack !== undefined) card.attack = preview.attack;
  if (preview.health !== undefined) card.health = preview.health;

  return card;
}
