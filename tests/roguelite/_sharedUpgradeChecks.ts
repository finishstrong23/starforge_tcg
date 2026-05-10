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

/**
 * Structural checks: positive assertions about the SHAPE of a card's
 * text (vs forbidden patterns, which are negative assertions about
 * substrings). Each check returns either null (clean) or a short
 * description of what's missing.
 */
interface StructuralCheck {
  id: string;
  /** Returns null if the card passes, or a description of the failure. */
  check: (card: CardDefinition) => string | null;
  rationale: string;
  discoveredIn: string;
}

const STRUCTURAL_CHECKS: StructuralCheck[] = [
  {
    id: 'flux-upgrade-must-cover-all-three-variants',
    check: (card) => {
      // Only applies to cards whose base text starts with "Flux." and has
      // explicit A:/B:/C: variant bodies.
      if (!/^\s*flux\.\s*a:/i.test(card.cardText)) return null;
      const upgrade = card.upgradeText ?? '';
      if (!/^\s*flux\./i.test(upgrade)) {
        return 'upgrade text dropped the "Flux." prefix entirely';
      }
      if (!/\ba:/i.test(upgrade)) return 'upgrade text missing A: variant body';
      if (!/\bb:/i.test(upgrade)) return 'upgrade text missing B: variant body';
      if (!/\bc:/i.test(upgrade)) return 'upgrade text missing C: variant body';
      return null;
    },
    rationale:
      'Flux state shifts deterministically per turn. If only one variant is upgraded, two of three flux states silently revert to the base text on play. Players upgrading the card hoping for better A and randomly landing in B with no improvement is a designer trap.',
    discoveredIn: 'Phase 4 Warp Riders audit (the user-flagged "non-negotiable" rule).',
  },
  {
    id: 'flux-variant-must-include-mechanic-keyword',
    check: (card) => {
      // For Flux upgrade text, every variant body should contain a parser-
      // recognized mechanic keyword (damage / block / draw / heat / heal /
      // energy / etc.). Variants that say "Deal 22" without "damage", or
      // "Gain 4" without "block", silently drop their effect on play
      // because the active flux body extracted by `activeFluxText` won't
      // hit any regex.
      const upgrade = card.upgradeText ?? '';
      if (!/^\s*flux\./i.test(upgrade)) return null;
      // Split on uppercase variant labels "A:" / "B:" / "C:" — anything
      // between two labels is the prior variant's body. The trailing slice
      // after the last label is the C: body.
      const parts = upgrade.split(/\b([A-C]):\s*/);
      // parts[0] = "Flux. " preamble; then alternating [label, body]
      const failures: string[] = [];
      for (let i = 1; i < parts.length; i += 2) {
        const label = parts[i];
        const body = (parts[i + 1] ?? '').trim();
        if (!body) continue;
        const hasMechanic =
          /\b(damage|block|draw|heat|heal|energy|burn|ignite|vulnerable|weak|strength|lumen|rift|poison)\b/i.test(body)
          || /(twice|thrice)/i.test(body);
        if (!hasMechanic) {
          failures.push(`${label}: "${body}" — no parser-recognized mechanic keyword`);
        }
      }
      return failures.length > 0 ? failures.join('; ') : null;
    },
    rationale:
      'Flux variant bodies are extracted by activeFluxText() at play time and fed to the same regex parser as normal cards. Variants that drop the mechanic keyword (e.g. "Deal 22" instead of "Deal 22 damage") silently match no regex and fire nothing.',
    discoveredIn: 'Phase 4 Warp Riders audit (W-015, W-024, W-025 all had this bug in upgrade text).',
  },
];

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
    for (const sc of STRUCTURAL_CHECKS) {
      const failure = sc.check(card);
      if (failure) {
        failures.push({
          cardId: card.id,
          cardName: card.name,
          faction: card.faction,
          field: 'upgradeText',
          patternId: sc.id,
          rationale: sc.rationale,
          matchedText: failure,
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
