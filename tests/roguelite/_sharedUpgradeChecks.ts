/**
 * Shared upgrade-text well-formedness checks.
 *
 * Phase 1.5 / Phase 2 surfaced multiple parser-quirk patterns where a
 * card's upgrade text DESCRIBES a behavior but the regex parser silently
 * fails to fire one or more clauses. The 44-card regression net checks
 * "non-trivial state change" and passes if even ONE clause fires — so
 * a multi-clause card whose second clause silently drops would still
 * pass the smoke test.
 *
 * This module collects the discovered partial-fire patterns into a
 * single forbidden-text list. Every faction's deliverable test file
 * runs `assertUpgradeTextWellFormed` against its card pool. When a new
 * partial-fire pattern is discovered in any faction, add it here and
 * every faction's tests will reject it on the next run.
 *
 * Bugs found in one faction become guards for ALL factions.
 */

import { CARD_POOL } from '../../src/dungeon/data/cards';
import type { CardDefinition, Faction } from '../../src/dungeon/types';

interface ForbiddenPattern {
  /** Short slug shown when the pattern is hit. */
  id: string;
  /** Regex that matches the silently-broken text shape. */
  regex: RegExp;
  /** What goes wrong if a card uses this pattern. */
  rationale: string;
  /** Where this pattern was discovered (audit trail). */
  discoveredIn: string;
}

export const FORBIDDEN_UPGRADE_PATTERNS: ForbiddenPattern[] = [
  {
    id: 'and-weak-N',
    regex: /\band Weak \d/,
    rationale:
      'weakMatch regex requires "Apply Weak N" prefix. "and Weak N" silently does not fire.',
    discoveredIn: 'Phase 2 Luminar audit; retroactive fix for Pyroclast P-040.',
  },
  {
    id: 'and-vulnerable-N',
    regex: /\band Vulnerable \d/,
    rationale:
      'vulnMatch regex requires "Apply Vulnerable N" prefix. "and Vulnerable N" silently does not fire.',
    discoveredIn: 'Phase 2 Luminar audit (same pattern family as and-weak).',
  },
  {
    id: 'retain-keyword',
    regex: /\bRetain\b/i,
    rationale:
      'Retain keyword is not implemented in the engine. Hand is unconditionally discarded at end of turn. Any card claiming Retain would lie to the player.',
    discoveredIn: 'Phase 2 Luminar audit (4 cards used Retain — all rewritten).',
  },
  {
    id: 'and-N-block',
    regex: /\band \d+ Block\b/,
    rationale:
      'shieldMatch regex requires "gain N block" prefix. "and N Block" silently does not fire (no exemption like heatGainMatch).',
    discoveredIn: 'Phase 2 Luminar audit (L-019 Molten Skin), Phase 3 Cogsmiths audit (C-037 Machine God) — both rewritten with split sentences.',
  },
  {
    id: 'and-N-strength',
    regex: /\band \d+ Strength\b/,
    rationale:
      'strMatch regex requires "gain N strength" prefix. "and N Strength" silently does not fire.',
    discoveredIn: 'Phase 3 Cogsmiths audit.',
  },
  {
    id: 'and-N-energy',
    regex: /\band \d+ Energy\b/,
    rationale:
      'energyMatch regex requires "gain N energy" prefix. "and N Energy" silently does not fire.',
    discoveredIn: 'Phase 3 Cogsmiths audit.',
  },
];

export interface WellFormednessFailure {
  cardId: string;
  cardName: string;
  faction: Faction;
  field: 'cardText' | 'upgradeText';
  patternId: string;
  rationale: string;
  matchedText: string;
}

/**
 * Scan every card in the pool (or a subset) against the forbidden-text
 * patterns. Returns an array of failures for the test runner to report.
 * Empty array means clean.
 */
export function findWellFormednessFailures(
  pool: CardDefinition[] = CARD_POOL,
): WellFormednessFailure[] {
  const failures: WellFormednessFailure[] = [];
  for (const card of pool) {
    for (const pattern of FORBIDDEN_UPGRADE_PATTERNS) {
      const baseMatch = card.cardText.match(pattern.regex);
      if (baseMatch) {
        failures.push({
          cardId: card.id,
          cardName: card.name,
          faction: card.faction,
          field: 'cardText',
          patternId: pattern.id,
          rationale: pattern.rationale,
          matchedText: baseMatch[0],
        });
      }
      const upgrade = card.upgradeText ?? '';
      const upMatch = upgrade.match(pattern.regex);
      if (upMatch) {
        failures.push({
          cardId: card.id,
          cardName: card.name,
          faction: card.faction,
          field: 'upgradeText',
          patternId: pattern.id,
          rationale: pattern.rationale,
          matchedText: upMatch[0],
        });
      }
    }
  }
  return failures;
}

export function formatFailures(failures: WellFormednessFailure[]): string {
  if (failures.length === 0) return '(clean)';
  return failures
    .map(
      (f) =>
        `  [${f.faction}/${f.cardId} ${f.cardName}] ${f.field} matches "${f.patternId}" (matched: "${f.matchedText}") — ${f.rationale}`,
    )
    .join('\n');
}
