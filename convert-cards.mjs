/**
 * STARFORGE TCG - XLSX to TypeScript Card Converter
 *
 * Reads STARFORGE_Card_Collection.xlsx and generates SampleCards.ts
 * with all 800+ cards in the proper CardDefinition format.
 *
 * COMBAT KEYWORDS ONLY: All cards use only the 8 Core Combat Keywords:
 * GUARDIAN, BARRIER, SWIFT, BLITZ, CLOAK, DOUBLE STRIKE, DRAIN, LETHAL
 * Each planet gets a thematic distribution for unique flavor.
 */

import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// ─── Configuration ──────────────────────────────────────────────────────────

const XLSX_PATH = path.join(process.env.USERPROFILE || '', 'Downloads', 'STARFORGE_Card_Collection.xlsx');
const OUTPUT_PATH = path.join('src', 'data', 'SampleCards.ts');

// ─── Mappings ───────────────────────────────────────────────────────────────

const RACE_SHEETS = {
  'Cogsmiths': 'COGSMITHS',
  'Luminar': 'LUMINAR',
  'Pyroclast': 'PYROCLAST',
  'Voidborn': 'VOIDBORN',
  'Biotitans': 'BIOTITANS',
  'Crystalline': 'CRYSTALLINE',
  'Phantom Corsairs': 'PHANTOM_CORSAIRS',
  'Hivemind': 'HIVEMIND',
  'Astromancers': 'ASTROMANCERS',
  'Chronobound': 'CHRONOBOUND',
};

const RACE_PREFIXES = {
  'COGSMITHS': 'cog',
  'LUMINAR': 'lum',
  'PYROCLAST': 'pyr',
  'VOIDBORN': 'void',
  'BIOTITANS': 'bio',
  'CRYSTALLINE': 'crys',
  'PHANTOM_CORSAIRS': 'pc',
  'HIVEMIND': 'hive',
  'ASTROMANCERS': 'astro',
  'CHRONOBOUND': 'chrono',
  'NEUTRAL': 'neutral',
};

// ─── Allowed Keywords: 8 Combat + 2 Triggers ───────────────────────────────

const COMBAT_KEYWORDS = {
  'GUARDIAN': 'CombatKeyword.GUARDIAN',
  'BARRIER': 'CombatKeyword.BARRIER',
  'SWIFT': 'CombatKeyword.SWIFT',
  'BLITZ': 'CombatKeyword.BLITZ',
  'CLOAK': 'CombatKeyword.CLOAK',
  'DOUBLE_STRIKE': 'CombatKeyword.DOUBLE_STRIKE',
  'DRAIN': 'CombatKeyword.DRAIN',
  'LETHAL': 'CombatKeyword.LETHAL',
};

const TRIGGER_KEYWORDS = {
  'DEPLOY': 'TriggerKeyword.DEPLOY',
  'LAST_RITES': 'TriggerKeyword.LAST_RITES',
};

// Map from XLSX text → internal key
const XLSX_COMBAT_MAP = {
  'GUARDIAN': 'GUARDIAN',
  'BARRIER': 'BARRIER',
  'SWIFT': 'SWIFT',
  'BLITZ': 'BLITZ',
  'CLOAK': 'CLOAK',
  'DOUBLE STRIKE': 'DOUBLE_STRIKE',
  'DRAIN': 'DRAIN',
  'LETHAL': 'LETHAL',
};

// Map from XLSX text → trigger keyword key
const XLSX_TRIGGER_MAP = {
  'DEPLOY': 'DEPLOY',
  'LAST WORDS': 'LAST_RITES',
};

// Original keywords that will be REPLACED with combat keywords
const REPLACEABLE_KEYWORDS = new Set([
  'SALVAGE',
  'UPGRADE', 'ILLUMINATE', 'IMMOLATE', 'BANISH', 'ADAPT',
  'RESONATE', 'PHASE', 'SWARM', 'SCRY', 'ECHO',
]);

const TRIBE_MAP = {
  'Mech': 'MinionTribe.MECH',
  'Beast': 'MinionTribe.BEAST',
  'Elemental': 'MinionTribe.ELEMENTAL',
  'Dragon': 'MinionTribe.DRAGON',
  'Pirate': 'MinionTribe.PIRATE',
  'Demon': 'MinionTribe.DEMON',
  'Insect': 'MinionTribe.INSECT',
  'Construct': 'MinionTribe.CONSTRUCT',
  'Void': 'MinionTribe.VOID',
};

const TYPE_MAP = {
  'Minion': 'CardType.MINION',
  'Spell': 'CardType.SPELL',
  'Structure': 'CardType.STRUCTURE',
};

const RARITY_MAP = {
  'Common': 'CardRarity.COMMON',
  'Rare': 'CardRarity.RARE',
  'Epic': 'CardRarity.EPIC',
  'Legendary': 'CardRarity.LEGENDARY',
};

// ─── PLANET COMBAT KEYWORD FLAVORS ──────────────────────────────────────────
// Each planet gets ALL 8 combat keywords but with thematic weighting.
// Primary (weight 5): Core identity keywords
// Secondary (weight 3): Supporting keywords
// Tertiary (weight 1): Rare but present for diversity

const RACE_COMBAT_WEIGHTS = {
  // === ACTIVE PHASE 1 RACES (balanced for 4-race meta) ===
  // R14: Archetype detection uses: BLITZ*3 + SWIFT + DS (aggro) vs GUARDIAN*2 + BARRIER*2 + DRAIN + LETHAL (control).
  // Key fix: Pyroclast stripped of sustain (DRAIN/DS), Luminar gets more GUARDIAN walls,
  // Voidborn gets LETHAL identity (counts as control signal) to avoid AGGRO misclassification.

  // Cogsmiths: MIDRANGE — balanced keywords, moderate curve
  COGSMITHS: {
    BARRIER: 3, DOUBLE_STRIKE: 3,  // Primary: shields + efficient output
    SWIFT: 3, DRAIN: 3,            // R15m: DRAIN 2→3 for sustain vs Biotitans (41/59 matchup)
    GUARDIAN: 2, BLITZ: 2,         // Secondary: protection + rush
    LETHAL: 1, CLOAK: 1            // Tertiary
  },
  // Luminar: CONTROL — flat weights to prevent pool starvation (only 30 minions in pool).
  // Luminar still classifies as CONTROL because defensive CAPS (GUARDIAN:7, BARRIER:7, DRAIN:8)
  // are higher than offensive caps (BLITZ:4), so the deck naturally skews defensive.
  LUMINAR: {
    DRAIN: 2, GUARDIAN: 2, BARRIER: 2, SWIFT: 2,
    DOUBLE_STRIKE: 2, BLITZ: 2, LETHAL: 2, CLOAK: 2  // Flat: every keyword = 2
  },
  // Pyroclast: AGGRO — R13 spiked weights restored. Accepts 22 minions (pool starvation)
  // but keeps BARRIER=2 and GUARDIAN=1. Flat weights gave BARRIER=5 → 82.8% win rate.
  PYROCLAST: {
    BLITZ: 3, SWIFT: 3,           // Primary: charge + rush (max aggro signal)
    DOUBLE_STRIKE: 3, DRAIN: 3,   // Secondary: burst + sustain
    LETHAL: 2, BARRIER: 2, GUARDIAN: 1, CLOAK: 1  // Tertiary: minimal defense
  },
  // Voidborn: DISRUPTION/CONTROL — LETHAL+CLOAK identity, stat-independent power
  // R14g: Was 38.1% at LETHAL:3/CLOAK:3 + bias +20. Stats useless (proven).
  // Spike identity keywords: LETHAL kills anything, CLOAK prevents targeting.
  VOIDBORN: {
    LETHAL: 7, CLOAK: 5,          // Primary: spiked identity keywords (stat-independent!)
    DRAIN: 3, SWIFT: 2,           // Secondary: sustain + some speed
    DOUBLE_STRIKE: 1, BLITZ: 1,   // Minimal burst — Voidborn wins through removal, not damage
    BARRIER: 2, GUARDIAN: 2        // Some defense vs aggro
  },
  // Biotitans: Ramp midrange — big creatures with sustain. Stat-DEPENDENT primary.
  // R15: Redesigned for 6-race meta. Identity = DRAIN + SWIFT + DS on big bodies.
  BIOTITANS: {
    DRAIN: 5, SWIFT: 4,             // Primary: sustain + big creatures attacking
    GUARDIAN: 3, DOUBLE_STRIKE: 3,   // Secondary: big walls + double-hit
    BARRIER: 2,                      // Some shields
    BLITZ: 1, LETHAL: 1, CLOAK: 1   // Minimal — big creatures don't need these
  },
  // Crystalline: Energy crystals, spell synergy, arcane power — less aggro
  CRYSTALLINE: {
    BARRIER: 4, DRAIN: 4,          // Primary: crystal shields & energy siphon
    DOUBLE_STRIKE: 3, CLOAK: 3,    // Secondary: energy bursts, refraction
    SWIFT: 2, BLITZ: 2, GUARDIAN: 1, LETHAL: 1  // Tertiary: more diversity
  },
  // Phantom Corsairs: Aggro-tempo pirates — evasion + assassination.
  // R15l: CLOAK 4→3 only (no other changes). Total weight 21→20 = less starvation.
  // Previous CLOAK reductions failed because we also added GUARDIAN/DS simultaneously.
  PHANTOM_CORSAIRS: {
    SWIFT: 4, CLOAK: 3,            // R15l: CLOAK 4→3 (weak keyword, free up selection)
    BLITZ: 3, LETHAL: 3,           // Secondary: ambush + assassination
    DRAIN: 3, DOUBLE_STRIKE: 2,    // Sustain + burst
    BARRIER: 1, GUARDIAN: 1        // Minimal defense
  },
  // Hivemind: VENOMOUS SWARM — stat-independent power via LETHAL.
  // R16d: flat weights + DRAIN=7 + bias +40 = 34.5% (DRAIN sustain but no kill power).
  // R16e: aggro spike + DRAIN=2 + bias +40 = 28.9% (DRAIN essential, but aggro stats weak).
  // Root cause: Hivemind pool has 5 token spells (dead weight) + weak base cards.
  // Fix: Copy Voidborn strategy — LETHAL is stat-INDEPENDENT. 1/1 with LETHAL kills anything.
  // "Venomous swarm" = LETHAL bugs + DRAIN sustain. Lower bias since LETHAL doesn't need stats.
  HIVEMIND: {
    LETHAL: 6, DRAIN: 4,           // Primary: venom kills + sustain (Voidborn-proven combo)
    SWIFT: 3, BARRIER: 2,          // Secondary: speed + some shields
    DOUBLE_STRIKE: 2, BLITZ: 2,    // Tertiary: burst
    GUARDIAN: 1, CLOAK: 1           // Minimal
  },
  // Astromancers: Cosmic magic, mysterious, arcane power — buffed tempo
  ASTROMANCERS: {
    BARRIER: 5, DOUBLE_STRIKE: 5,  // Primary: arcane shields & twin stars
    BLITZ: 3, DRAIN: 3,            // Secondary: cosmic rush & siphon
    SWIFT: 2, CLOAK: 1, GUARDIAN: 1, LETHAL: 1  // Tertiary
  },
  // Chronobound: BARRIER hard-counters LETHAL (blocks damage → LETHAL never fires).
  // R17c: 27.2% — LETHAL=7 dominant but BARRIER blocks it. Bias +45/+65 both same = stats useless.
  // R17d: 20.0% — BLITZ:8 cap STOLE LETHAL slots (LETHAL 7→5). Rush without LETHAL = worse.
  // R17e: Keep LETHAL dominant (cap 8), ADD DS (cap 7) to pop BARRIER. No BLITZ cap raise.
  CHRONOBOUND: {
    LETHAL: 4, DRAIN: 3,           // Primary: temporal assassins + sustain
    DOUBLE_STRIKE: 3, BLITZ: 3,    // Secondary: DS pops BARRIER for LETHAL, BLITZ for tempo
    SWIFT: 2, BARRIER: 1,          // Tertiary: pool caps SWIFT at 2, minimal defense
    GUARDIAN: 1, CLOAK: 1           // Minimal
  },
  // Neutral: Even distribution
  NEUTRAL: {
    GUARDIAN: 3, BARRIER: 3, SWIFT: 3, BLITZ: 3,
    CLOAK: 3, DOUBLE_STRIKE: 3, DRAIN: 3, LETHAL: 3,
  },
};

// ─── Deterministic hashing ──────────────────────────────────────────────────

function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// Keywords that should NEVER appear on the same card (overpowered combos)
const INCOMPATIBLE_KEYWORDS = {
  GUARDIAN: ['LETHAL'],  // GUARDIAN+LETHAL = unkillable blocker that kills everything
  LETHAL: ['GUARDIAN'],  // Same pair from the other direction
};

// Pick a combat keyword from the planet's weighted distribution
// excludeSet: keywords already on this card (to avoid incompatible combos)
function pickCombatKeyword(race, cardName, cardIndex, excludeSet) {
  const weights = RACE_COMBAT_WEIGHTS[race] || RACE_COMBAT_WEIGHTS['NEUTRAL'];

  // Build banned set from incompatible keywords
  const banned = new Set();
  if (excludeSet) {
    for (const existing of excludeSet) {
      const incompat = INCOMPATIBLE_KEYWORDS[existing];
      if (incompat) incompat.forEach(k => banned.add(k));
    }
  }

  // Filter out banned keywords
  const entries = Object.entries(weights).filter(([kw]) => !banned.has(kw));
  if (entries.length === 0) {
    // Fallback: use all keywords if everything is banned
    const allEntries = Object.entries(weights);
    const totalWeight = allEntries.reduce((sum, [_, w]) => sum + w, 0);
    const hash = hashString(cardName + '_' + cardIndex + '_' + race);
    let target = hash % totalWeight;
    for (const [keyword, weight] of allEntries) {
      target -= weight;
      if (target <= 0) return keyword;
    }
    return allEntries[0][0];
  }

  const totalWeight = entries.reduce((sum, [_, w]) => sum + w, 0);
  const hash = hashString(cardName + '_' + cardIndex + '_' + race);
  let target = hash % totalWeight;

  for (const [keyword, weight] of entries) {
    target -= weight;
    if (target <= 0) return keyword;
  }
  return entries[0][0];
}

// ─── Convert keywords to allowed set (combat + triggers) ────────────────────

function convertKeywords(cards, race) {
  return cards.map((card, idx) => {
    const newKeywords = [];
    const usedCombatKeys = new Set(); // Prevent duplicate combat keywords

    for (const kwInst of card.keywords) {
      if (kwInst.type === 'combat') {
        // Combat keyword — RE-ROLL through RACE_COMBAT_WEIGHTS instead of keeping original.
        // This ensures pool keyword distribution matches our configured weights,
        // preventing keyword saturation that causes emergency fill cap bypasses.
        const offset = newKeywords.length;
        let picked = pickCombatKeyword(race, card.name, idx * 10 + offset, usedCombatKeys);
        let attempts = 0;
        while (usedCombatKeys.has(picked) && attempts < 8) {
          attempts++;
          picked = pickCombatKeyword(race, card.name + '_combat' + attempts, idx * 10 + offset + attempts, usedCombatKeys);
        }
        if (!usedCombatKeys.has(picked)) {
          usedCombatKeys.add(picked);
          newKeywords.push({ keyword: COMBAT_KEYWORDS[picked] });
        }
      } else if (kwInst.type === 'trigger') {
        // DEPLOY & LAST_RITES: Add a themed combat keyword alongside.
        // The trigger keyword itself (DEPLOY/LAST_RITES) will be re-added by
        // cardToTypeScript if the card has parsed effects.
        const triggerOffset = newKeywords.length;
        let triggerPicked = pickCombatKeyword(race, card.name, idx * 10 + triggerOffset, usedCombatKeys);
        let triggerAttempts = 0;
        while (usedCombatKeys.has(triggerPicked) && triggerAttempts < 8) {
          triggerAttempts++;
          triggerPicked = pickCombatKeyword(race, card.name + '_trig' + triggerAttempts, idx * 10 + triggerOffset + triggerAttempts, usedCombatKeys);
        }
        if (!usedCombatKeys.has(triggerPicked)) {
          usedCombatKeys.add(triggerPicked);
          newKeywords.push({ keyword: COMBAT_KEYWORDS[triggerPicked] });
        }
      } else if (kwInst.type === 'replaceable') {
        // Original keyword — replace with a themed combat keyword
        const offset = newKeywords.length;
        let picked = pickCombatKeyword(race, card.name, idx * 10 + offset, usedCombatKeys);

        // Avoid duplicates
        let attempts = 0;
        while (usedCombatKeys.has(picked) && attempts < 8) {
          attempts++;
          picked = pickCombatKeyword(race, card.name + '_alt' + attempts, idx * 10 + offset + attempts, usedCombatKeys);
        }

        if (!usedCombatKeys.has(picked)) {
          usedCombatKeys.add(picked);
          newKeywords.push({ keyword: COMBAT_KEYWORDS[picked] });
        }
      }
    }

    // Update card text: strip only the REPLACED original keyword references
    let cardText = card.cardText;
    cardText = cardText.replace(/(?:DEPLOY|LAST WORDS|LAST RITES|UPGRADE|ILLUMINATE|IMMOLATE|BANISH|ADAPT|RESONATE|PHASE|SWARM|SCRY|ECHO|SALVAGE)\s*(?:\(\d+\))?\s*:?\s*/gi, '');
    // Clean up leftover punctuation/whitespace
    cardText = cardText.replace(/^\s*[.,;:]\s*/, '').replace(/\s*[.,;:]\s*$/, '').trim();
    // If card text is now empty, generate from keywords
    if (!cardText || cardText.length < 3) {
      const kwNames = newKeywords.map(kw => {
        const name = kw.keyword.split('.')[1];
        return name.replace('_', ' ');
      });
      cardText = kwNames.join(', ') + '.';
    }

    return {
      ...card,
      keywords: newKeywords,
      cardText,
    };
  });
}

// ─── Stat Normalization ─────────────────────────────────────────────────────
// Ensures each race's minions have similar average stat efficiency.
// Target: (attack + health) should average about (cost * 2 + 1) per minion.
// This prevents some races being inherently stronger just from raw stats.

const TARGET_STAT_EFFICIENCY = 0.0; // 0 = exactly on vanilla curve

function normalizeStats(cards, race) {
  // Calculate current average stat efficiency for minions
  const minions = cards.filter(c => c.attack !== undefined && !isNaN(c.attack));
  if (minions.length === 0) return cards;

  let totalEfficiency = 0;
  for (const m of minions) {
    const expected = (m.cost || 1) * 2 + 1;
    const actual = (m.attack || 0) + (m.health || 0);
    totalEfficiency += actual - expected;
  }
  const avgEfficiency = totalEfficiency / minions.length;

  // If this race is within ±0.5 of target, don't adjust
  if (Math.abs(avgEfficiency - TARGET_STAT_EFFICIENCY) <= 0.5) {
    console.log(`    Stats: balanced (efficiency=${avgEfficiency.toFixed(2)})`);
    return cards;
  }

  // Calculate adjustment needed
  const adjustment = TARGET_STAT_EFFICIENCY - avgEfficiency;
  const direction = adjustment > 0 ? 'buffing' : 'nerfing';
  console.log(`    Stats: ${direction} by ~${Math.abs(adjustment).toFixed(1)} (was ${avgEfficiency.toFixed(2)})`);

  // Distribute adjustment across minions
  // For each minion, adjust health (preferred) or attack
  let adjustmentsRemaining = Math.round(Math.abs(adjustment) * minions.length);
  let adjustDir = adjustment > 0 ? 1 : -1;

  return cards.map(card => {
    if (card.attack === undefined || isNaN(card.attack) || adjustmentsRemaining <= 0) return card;

    const expected = (card.cost || 1) * 2 + 1;
    const actual = (card.attack || 0) + (card.health || 0);
    const cardEfficiency = actual - expected;

    // Prioritize adjusting cards that are most over/under the curve
    let needsAdjust = false;
    if (adjustDir > 0 && cardEfficiency < 0) needsAdjust = true; // Buff understatted
    if (adjustDir < 0 && cardEfficiency > 0) needsAdjust = true; // Nerf overstatted
    if (!needsAdjust && adjustmentsRemaining > minions.length / 2) needsAdjust = true; // Still need more adjustments

    if (needsAdjust && adjustmentsRemaining > 0) {
      adjustmentsRemaining--;
      const newCard = { ...card };

      if (adjustDir > 0) {
        // Buff: prefer adding health
        newCard.health = (card.health || 0) + 1;
      } else {
        // Nerf: prefer reducing health (min 1), or attack
        if ((card.health || 0) > 1) {
          newCard.health = (card.health || 0) - 1;
        } else if ((card.attack || 0) > 1) {
          newCard.attack = (card.attack || 0) - 1;
        }
      }

      return newCard;
    }

    return card;
  });
}

// ─── STARFORGE condition parsers ────────────────────────────────────────────

const STARFORGE_CONDITION_PATTERNS = [
  { regex: /After UPGRADING (\d+) times/i, type: 'StarforgeConditionType.UPGRADE_COUNT' },
  { regex: /After (\d+) Mechs are UPGRADED/i, type: 'StarforgeConditionType.UPGRADE_COUNT' },
  { regex: /After healing (\d+) total/i, type: 'StarforgeConditionType.HEALING_DONE' },
  { regex: /After ILLUMINATEing (\d+) times/i, type: 'StarforgeConditionType.ILLUMINATE_COUNT' },
  { regex: /After dealing (\d+) IMMOLATE damage/i, type: 'StarforgeConditionType.IMMOLATE_DAMAGE' },
  { regex: /After dealing (\d+) damage to the enemy Hero/i, type: 'StarforgeConditionType.DAMAGE_DONE' },
  { regex: /After dealing (\d+) total damage/i, type: 'StarforgeConditionType.DAMAGE_DONE' },
  { regex: /After BANISHing (\d+) cards/i, type: 'StarforgeConditionType.BANISH_COUNT' },
  { regex: /After (\d+) cards are BANISHed/i, type: 'StarforgeConditionType.BANISH_COUNT' },
  { regex: /After ADAPTing (\d+) times/i, type: 'StarforgeConditionType.ADAPT_COUNT' },
  { regex: /After surviving (\d+) combats/i, type: 'StarforgeConditionType.ATTACK_COUNT' },
  { regex: /After casting (\d+) spells/i, type: 'StarforgeConditionType.SPELLS_CAST' },
  { regex: /After playing (\d+) stolen cards/i, type: 'StarforgeConditionType.CARDS_STOLEN' },
  { regex: /After stealing (\d+) cards/i, type: 'StarforgeConditionType.CARDS_STOLEN' },
  { regex: /After summoning (\d+) Drones/i, type: 'StarforgeConditionType.SUMMON_COUNT' },
  { regex: /After summoning (\d+) minions/i, type: 'StarforgeConditionType.SUMMON_COUNT' },
  { regex: /After drawing (\d+) cards/i, type: 'StarforgeConditionType.CARDS_DRAWN' },
  { regex: /After SCRYing (\d+) total/i, type: 'StarforgeConditionType.SCRY_COUNT' },
  { regex: /After playing (\d+) ECHO cards/i, type: 'StarforgeConditionType.ECHO_CARDS_PLAYED' },
  { regex: /After (\d+) minions die/i, type: 'StarforgeConditionType.MINIONS_DIED' },
  { regex: /After (\d+) friendly minions die/i, type: 'StarforgeConditionType.MINIONS_DIED' },
  { regex: /After attacking (\d+) times/i, type: 'StarforgeConditionType.ATTACK_COUNT' },
  { regex: /After using Hero Power (\d+) times/i, type: 'StarforgeConditionType.HERO_POWER_COUNT' },
  { regex: /After your opponent discards (\d+) cards/i, type: 'StarforgeConditionType.OPPONENT_DISCARDS' },
  { regex: /After gaining (\d+) Crystals/i, type: 'StarforgeConditionType.CRYSTALS_GAINED' },
  { regex: /After dying (\d+) times/i, type: 'StarforgeConditionType.DEATH_COUNT' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

function makeId(prefix, name) {
  return `${prefix}_${slugify(name)}`;
}

function escapeString(str) {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n');
}

function parseKeywords(keywordStr) {
  if (!keywordStr || keywordStr.trim() === '') return [];

  const results = [];
  const raw = keywordStr.trim();

  // Match keywords with optional (X) value
  const kwRegex = /(?:DOUBLE STRIKE|LAST WORDS|SCRY\s*\(\s*\d+\s*\)|UPGRADE\s*\(\s*\d+\s*\)|IMMOLATE\s*\(\s*\d+\s*\)|[A-Z]+)/g;
  let match;
  while ((match = kwRegex.exec(raw)) !== null) {
    let kw = match[0].trim();

    // Strip value like SCRY (2) → SCRY
    const valueMatch = kw.match(/^(\w+)\s*\(\s*(\d+)\s*\)$/);
    if (valueMatch) {
      kw = valueMatch[1].trim();
    }

    const xlsxKey = kw;

    // 1. Combat keyword?
    const combatKey = XLSX_COMBAT_MAP[xlsxKey];
    if (combatKey) {
      results.push({ type: 'combat', internalKey: combatKey });
      continue;
    }

    // 2. Trigger keyword? (DEPLOY, LAST WORDS → LAST_RITES)
    const triggerKey = XLSX_TRIGGER_MAP[xlsxKey];
    if (triggerKey) {
      results.push({ type: 'trigger', internalKey: triggerKey });
      continue;
    }

    // 3. Replaceable original keyword? → will be swapped with combat keyword
    if (REPLACEABLE_KEYWORDS.has(xlsxKey)) {
      results.push({ type: 'replaceable', originalName: xlsxKey });
      continue;
    }
    // else: unknown keyword, skip
  }

  return results;
}

function parseStarforge(starforgeText, cardCost) {
  if (!starforgeText || starforgeText.trim() === '') return null;

  const text = starforgeText.trim();

  // Parse condition
  let conditionType = 'StarforgeConditionType.SPELLS_CAST';
  let targetValue = 10;
  for (const pattern of STARFORGE_CONDITION_PATTERNS) {
    const match = text.match(pattern.regex);
    if (match) {
      conditionType = pattern.type;
      targetValue = parseInt(match[1]);
      break;
    }
  }

  // Parse forged form
  let forgedName = 'Forged Form';
  let forgedAttack = undefined;
  let forgedHealth = undefined;
  let forgedText = text;

  const transformMatch = text.match(/Transform into\s+(.+?)\s*(?:—|--|-)\s*(\d+)\/(\d+)/i);
  if (transformMatch) {
    forgedName = transformMatch[1].trim().replace(/[,.]$/, '');
    forgedAttack = parseInt(transformMatch[2]);
    forgedHealth = parseInt(transformMatch[3]);

    const statsIdx = text.indexOf(transformMatch[0]) + transformMatch[0].length;
    forgedText = text.substring(statsIdx).replace(/^[\s.,]+/, '').trim();
    if (!forgedText) forgedText = text;
  }

  // Parse forged keywords — only keep combat keywords
  const forgedKeywords = [];
  for (const [xlsxName, internalKey] of Object.entries(XLSX_COMBAT_MAP)) {
    if (forgedText.includes(xlsxName)) {
      forgedKeywords.push({ keyword: COMBAT_KEYWORDS[internalKey] });
    }
  }

  return {
    conditionType,
    targetValue,
    forgedName,
    forgedAttack,
    forgedHealth,
    forgedKeywords,
    forgedText,
    rawText: text,
  };
}

function formatKeywordInstance(kwInst) {
  return `{ keyword: ${kwInst.keyword} }`;
}

function formatStarforge(sf, cardCost) {
  if (!sf) return '';

  const forgedKeywordsStr = sf.forgedKeywords.map(formatKeywordInstance).join(', ');

  let attackLine = sf.forgedAttack !== undefined ? `      attack: ${sf.forgedAttack},\n` : '';
  let healthLine = sf.forgedHealth !== undefined ? `      health: ${sf.forgedHealth},\n` : '';

  return `{
    type: StarforgeType.PROGRESSIVE,
    conditions: [{
      type: ${sf.conditionType},
      targetValue: ${sf.targetValue},
      persistsAcrossZones: true,
      persistsIfSilenced: true,
    }],
    forgedForm: {
      name: '${escapeString(sf.forgedName)}',
      cost: ${cardCost},
${attackLine}${healthLine}      keywords: [${forgedKeywordsStr}],
      effects: [],
      cardText: '${escapeString(sf.forgedText)}',
    },
    isReversible: false,
    transformationText: '${escapeString(sf.rawText)}',
  }`;
}

// ─── Sheet parsing ──────────────────────────────────────────────────────────

function parseSheet(sheet, raceName) {
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (rows.length < 2) return [];

  let headerIdx = 0;
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i];
    if (row && row[0] === '#' || (typeof row[0] === 'string' && row[0].includes('#'))) {
      headerIdx = i;
      break;
    }
    if (typeof row[1] === 'string' && row[1].length > 2 && typeof rows[0][0] === 'string') {
      headerIdx = 0;
      break;
    }
  }

  const cards = [];
  const prefix = RACE_PREFIXES[raceName] || 'unk';

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[1]) continue;

    const name = String(row[1] || '').trim();
    const cost = parseInt(row[2]) || 0;
    const atk = row[3] !== '' && row[3] !== undefined ? parseInt(row[3]) : undefined;
    const hp = row[4] !== '' && row[4] !== undefined ? parseInt(row[4]) : undefined;
    const type = String(row[5] || '').trim();
    const subtype = String(row[6] || '').trim();
    const rarity = String(row[7] || '').trim();
    const keywords = String(row[8] || '').trim();
    const cardText = String(row[9] || '').trim();
    const flavorText = String(row[10] || '').trim();
    const starforgeText = String(row[11] || '').trim();

    if (!name || !type) continue;

    cards.push({
      id: makeId(prefix, name),
      name,
      cost,
      attack: atk,
      health: hp,
      type,
      subtype,
      rarity,
      keywords: parseKeywords(keywords),
      cardText,
      flavorText,
      starforge: parseStarforge(starforgeText, cost),
      race: raceName,
    });
  }

  return cards;
}

// ─── Card Text → Effect Parsing ─────────────────────────────────────────────
// Parses cardText strings into Effect[] arrays so spells and DEPLOY actually DO things.

function parseCardTextToEffects(cardText, cardType, cardCost) {
  if (!cardText) return [];
  const text = cardText.toLowerCase();
  const effects = [];
  let eid = 0;
  const trigger = 'EffectTrigger.ON_PLAY';

  // ── AoE damage patterns (check before single-target) ──────────────────
  let m;
  if ((m = text.match(/deal (\d+) damage to all enem/))) {
    effects.push(`{ id: 'e${eid++}', type: EffectType.DAMAGE, trigger: ${trigger}, targetType: TargetType.ALL_ENEMY_MINIONS, data: { amount: ${m[1]} } as DamageEffectData, isMandatory: true }`);
  } else if ((m = text.match(/deal (\d+) damage to all minion/))) {
    effects.push(`{ id: 'e${eid++}', type: EffectType.DAMAGE, trigger: ${trigger}, targetType: TargetType.ALL_MINIONS, data: { amount: ${m[1]} } as DamageEffectData, isMandatory: true }`);
  } else if ((m = text.match(/deal (\d+) damage to a random enem/))) {
    effects.push(`{ id: 'e${eid++}', type: EffectType.DAMAGE, trigger: ${trigger}, targetType: TargetType.RANDOM_ENEMY, data: { amount: ${m[1]} } as DamageEffectData, isMandatory: true }`);
  } else if ((m = text.match(/deal (\d+) damage to a random enemy minion/))) {
    effects.push(`{ id: 'e${eid++}', type: EffectType.DAMAGE, trigger: ${trigger}, targetType: TargetType.RANDOM_ENEMY_MINION, data: { amount: ${m[1]} } as DamageEffectData, isMandatory: true }`);
  } else if ((m = text.match(/deal (\d+) damage/))) {
    effects.push(`{ id: 'e${eid++}', type: EffectType.DAMAGE, trigger: ${trigger}, targetType: TargetType.CHOSEN, data: { amount: ${m[1]} } as DamageEffectData, isMandatory: true }`);
  }

  // ── Destroy patterns ─────────────────────────────────────────────────
  if (text.includes('destroy all minion') || text.includes('destroy all enem')) {
    effects.push(`{ id: 'e${eid++}', type: EffectType.DESTROY, trigger: ${trigger}, targetType: TargetType.ALL_MINIONS, data: {} as GenericEffectData, isMandatory: true }`);
  } else if (/destroy (?:a|an) (?:enemy )?minion/.test(text)) {
    effects.push(`{ id: 'e${eid++}', type: EffectType.DESTROY, trigger: ${trigger}, targetType: TargetType.CHOSEN, data: {} as GenericEffectData, isMandatory: true }`);
  }

  // ── Banish → Destroy (functional equivalent) ─────────────────────────
  if (!effects.length && (text.includes('banish') || text.includes('remove from game') || text.includes('exile'))) {
    if (text.includes('all')) {
      effects.push(`{ id: 'e${eid++}', type: EffectType.DESTROY, trigger: ${trigger}, targetType: TargetType.ALL_ENEMY_MINIONS, data: {} as GenericEffectData, isMandatory: true }`);
    } else {
      effects.push(`{ id: 'e${eid++}', type: EffectType.DESTROY, trigger: ${trigger}, targetType: TargetType.CHOSEN, data: {} as GenericEffectData, isMandatory: true }`);
    }
  }

  // ── Take control / Mind control → Destroy the target ──────────────────
  if (!effects.length && (text.includes('take control') || text.includes('mind control') || text.includes('steal a minion'))) {
    effects.push(`{ id: 'e${eid++}', type: EffectType.DESTROY, trigger: ${trigger}, targetType: TargetType.CHOSEN, data: {} as GenericEffectData, isMandatory: true }`);
  }

  // ── Buff patterns ────────────────────────────────────────────────────
  if ((m = text.match(/give all (?:friendly |your )?minions? \+(\d+)\/\+(\d+)/))) {
    effects.push(`{ id: 'e${eid++}', type: EffectType.BUFF, trigger: ${trigger}, targetType: TargetType.ALL_FRIENDLY_MINIONS, data: { attack: ${m[1]}, health: ${m[2]} } as BuffEffectData, isMandatory: true }`);
  } else if ((m = text.match(/give a (?:friendly )?minion \+(\d+)\/\+(\d+)/))) {
    effects.push(`{ id: 'e${eid++}', type: EffectType.BUFF, trigger: ${trigger}, targetType: TargetType.CHOSEN, data: { attack: ${m[1]}, health: ${m[2]} } as BuffEffectData, isMandatory: true }`);
  } else if ((m = text.match(/give a minion \+(\d+)\/\+(\d+)/))) {
    effects.push(`{ id: 'e${eid++}', type: EffectType.BUFF, trigger: ${trigger}, targetType: TargetType.CHOSEN, data: { attack: ${m[1]}, health: ${m[2]} } as BuffEffectData, isMandatory: true }`);
  } else if ((m = text.match(/give (?:a )?(?:friendly )?(?:minion )?\+(\d+)\/\+(\d+)/))) {
    effects.push(`{ id: 'e${eid++}', type: EffectType.BUFF, trigger: ${trigger}, targetType: TargetType.CHOSEN, data: { attack: ${m[1]}, health: ${m[2]} } as BuffEffectData, isMandatory: true }`);
  } else if ((m = text.match(/\+(\d+)\/\+(\d+)/)) && !effects.length) {
    // Catch-all for +X/+Y patterns that didn't match above
    effects.push(`{ id: 'e${eid++}', type: EffectType.BUFF, trigger: ${trigger}, targetType: TargetType.CHOSEN, data: { attack: ${m[1]}, health: ${m[2]} } as BuffEffectData, isMandatory: true }`);
  } else if ((m = text.match(/give a minion \+0\/\+(\d+)/))) {
    effects.push(`{ id: 'e${eid++}', type: EffectType.BUFF, trigger: ${trigger}, targetType: TargetType.CHOSEN, data: { attack: 0, health: ${m[1]} } as BuffEffectData, isMandatory: true }`);
  } else if ((m = text.match(/give a minion \+(\d+) attack/))) {
    effects.push(`{ id: 'e${eid++}', type: EffectType.BUFF, trigger: ${trigger}, targetType: TargetType.CHOSEN, data: { attack: ${m[1]}, health: 0 } as BuffEffectData, isMandatory: true }`);
  }

  // ── Heal patterns ────────────────────────────────────────────────────
  if ((m = text.match(/restore (\d+) health to your hero/))) {
    effects.push(`{ id: 'e${eid++}', type: EffectType.HEAL, trigger: ${trigger}, targetType: TargetType.FRIENDLY_HERO, data: { amount: ${m[1]} } as HealEffectData, isMandatory: true }`);
  } else if ((m = text.match(/restore (\d+) health to all friendly/))) {
    effects.push(`{ id: 'e${eid++}', type: EffectType.HEAL, trigger: ${trigger}, targetType: TargetType.ALL_FRIENDLY_MINIONS, data: { amount: ${m[1]} } as HealEffectData, isMandatory: true }`);
  } else if ((m = text.match(/restore (\d+) health/))) {
    effects.push(`{ id: 'e${eid++}', type: EffectType.HEAL, trigger: ${trigger}, targetType: TargetType.CHOSEN, data: { amount: ${m[1]} } as HealEffectData, isMandatory: true }`);
  }

  // ── Draw patterns ────────────────────────────────────────────────────
  if ((m = text.match(/draw (\d+) card/))) {
    effects.push(`{ id: 'e${eid++}', type: EffectType.DRAW, trigger: ${trigger}, targetType: TargetType.NONE, data: { count: ${m[1]} } as DrawEffectData, isMandatory: true }`);
  } else if (text.includes('draw a card')) {
    effects.push(`{ id: 'e${eid++}', type: EffectType.DRAW, trigger: ${trigger}, targetType: TargetType.NONE, data: { count: 1 } as DrawEffectData, isMandatory: true }`);
  }

  // ── Steal / Copy → Draw cards (functional equivalent) ──────────────
  if (!effects.some(e => e.includes('DRAW')) && (
    text.includes('steal') || text.includes('copy') || text.includes('discover')
  )) {
    const count = (m = text.match(/steal (\d+)/)) ? parseInt(m[1]) : 1;
    effects.push(`{ id: 'e${eid++}', type: EffectType.DRAW, trigger: ${trigger}, targetType: TargetType.NONE, data: { count: ${count} } as DrawEffectData, isMandatory: true }`);
  }

  // ── Discard / opponent discards → Damage to enemy hero (functional equivalent) ─
  if (!effects.length && (text.includes('discard') || text.includes('opponent discard'))) {
    const dmg = Math.max(2, Math.floor(cardCost * 1.5));
    effects.push(`{ id: 'e${eid++}', type: EffectType.DAMAGE, trigger: ${trigger}, targetType: TargetType.RANDOM_ENEMY, data: { amount: ${dmg} } as DamageEffectData, isMandatory: true }`);
  }

  // ── Keyword grant patterns ───────────────────────────────────────────
  const kwMap = {
    'guardian': 'CombatKeyword.GUARDIAN',
    'barrier': 'CombatKeyword.BARRIER',
    'lethal': 'CombatKeyword.LETHAL',
    'drain': 'CombatKeyword.DRAIN',
    'blitz': 'CombatKeyword.BLITZ',
    'double strike': 'CombatKeyword.DOUBLE_STRIKE',
    'cloak': 'CombatKeyword.CLOAK',
    'swift': 'CombatKeyword.SWIFT',
  };
  for (const [kwName, kwEnum] of Object.entries(kwMap)) {
    if (text.includes(`give`) && text.includes(kwName)) {
      effects.push(`{ id: 'e${eid++}', type: EffectType.GRANT_KEYWORD, trigger: ${trigger}, targetType: TargetType.CHOSEN, data: { keywords: [{ keyword: ${kwEnum} }] } as GrantKeywordData, isMandatory: true }`);
      break;
    }
  }

  // ── Silence patterns (single + AoE) ───────────────────────────────────
  if (text.includes('silence all') && (text.includes('enemy') || text.includes('minion'))) {
    effects.push(`{ id: 'e${eid++}', type: EffectType.SILENCE, trigger: ${trigger}, targetType: TargetType.ALL_ENEMY_MINIONS, data: {} as GenericEffectData, isMandatory: true }`);
  } else if (text.includes('silence a minion') || text.includes('silence an enemy') || text.includes('silence a target')) {
    effects.push(`{ id: 'e${eid++}', type: EffectType.SILENCE, trigger: ${trigger}, targetType: TargetType.CHOSEN, data: {} as GenericEffectData, isMandatory: true }`);
  }

  // ── Gain crystals (expanded: handles "empty" before crystal) ──────────
  if ((m = text.match(/gain (\d+) (?:empty )?(?:crystal|mana)/))) {
    effects.push(`{ id: 'e${eid++}', type: EffectType.GAIN_CRYSTALS, trigger: ${trigger}, targetType: TargetType.NONE, data: { amount: ${m[1]} } as GainCrystalsData, isMandatory: true }`);
  }

  // ── Freeze → Deal 1 damage to all enemies (functional equivalent) ───
  if (!effects.length && (text.includes('freeze all') || text.includes('freeze each'))) {
    effects.push(`{ id: 'e${eid++}', type: EffectType.DAMAGE, trigger: ${trigger}, targetType: TargetType.ALL_ENEMY_MINIONS, data: { amount: 1 } as DamageEffectData, isMandatory: true }`);
  } else if (!effects.length && text.includes('freeze')) {
    effects.push(`{ id: 'e${eid++}', type: EffectType.DAMAGE, trigger: ${trigger}, targetType: TargetType.CHOSEN, data: { amount: 1 } as DamageEffectData, isMandatory: true }`);
  }

  // ── Return / Bounce to hand ───────────────────────────────────────────
  if (!effects.length && (text.includes('return') || text.includes('bounce')) && text.includes('hand')) {
    if (text.includes('enemy') || text.includes('opponent')) {
      effects.push(`{ id: 'e${eid++}', type: EffectType.RETURN_TO_HAND, trigger: ${trigger}, targetType: TargetType.CHOSEN, data: {} as GenericEffectData, isMandatory: true }`);
    } else {
      effects.push(`{ id: 'e${eid++}', type: EffectType.RETURN_TO_HAND, trigger: ${trigger}, targetType: TargetType.CHOSEN, data: {} as GenericEffectData, isMandatory: true }`);
    }
  }

  // ── Summon tokens ────────────────────────────────────────────────────
  if (!effects.length && (m = text.match(/summon (?:a |two |three |(\d+) )?(\d+)\/(\d+)/))) {
    const countWord = text.includes('two') ? 2 : text.includes('three') ? 3 : (m[1] ? parseInt(m[1]) : 1);
    effects.push(`{ id: 'e${eid++}', type: EffectType.SUMMON, trigger: ${trigger}, targetType: TargetType.NONE, data: { cardId: 'token_generated', count: ${countWord} } as SummonEffectData, isMandatory: true }`);
  }

  // ── Cards that cost more / cost manipulation → Damage fallback ──────
  if (!effects.length && (text.includes('cost') && (text.includes('more') || text.includes('less') || text.includes('increase') || text.includes('reduce')))) {
    const dmg = Math.max(1, Math.floor(cardCost));
    effects.push(`{ id: 'e${eid++}', type: EffectType.DAMAGE, trigger: ${trigger}, targetType: TargetType.RANDOM_ENEMY, data: { amount: ${dmg} } as DamageEffectData, isMandatory: true }`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FALLBACK: If a spell STILL has no effects, generate a cost-proportional one.
  // This ensures NO spell is a dead card (wasted mana for zero impact).
  // ═══════════════════════════════════════════════════════════════════════
  if (effects.length === 0 && cardType === 'Spell') {
    const cost = cardCost || 1;
    if (cost <= 2) {
      // Cheap spell fallback: deal cost+1 damage to a random enemy
      effects.push(`{ id: 'e${eid++}', type: EffectType.DAMAGE, trigger: ${trigger}, targetType: TargetType.RANDOM_ENEMY, data: { amount: ${cost + 1} } as DamageEffectData, isMandatory: true }`);
    } else if (cost <= 4) {
      // Mid spell fallback: deal cost-1 damage to chosen + draw 1
      effects.push(`{ id: 'e${eid++}', type: EffectType.DAMAGE, trigger: ${trigger}, targetType: TargetType.CHOSEN, data: { amount: ${cost - 1} } as DamageEffectData, isMandatory: true }`);
      effects.push(`{ id: 'e${eid++}', type: EffectType.DRAW, trigger: ${trigger}, targetType: TargetType.NONE, data: { count: 1 } as DrawEffectData, isMandatory: true }`);
    } else {
      // Expensive spell fallback: AoE damage to all enemy minions
      effects.push(`{ id: 'e${eid++}', type: EffectType.DAMAGE, trigger: ${trigger}, targetType: TargetType.ALL_ENEMY_MINIONS, data: { amount: ${Math.floor(cost / 2) + 1} } as DamageEffectData, isMandatory: true }`);
    }
  }

  // FALLBACK for minions/structures with card text but no parsed effects:
  // Give them a small DEPLOY effect so they're not vanilla
  if (effects.length === 0 && cardType !== 'Spell' && cardText && cardText.length > 10) {
    const cost = cardCost || 1;
    if (cost <= 2) {
      effects.push(`{ id: 'e${eid++}', type: EffectType.DAMAGE, trigger: ${trigger}, targetType: TargetType.RANDOM_ENEMY, data: { amount: 1 } as DamageEffectData, isMandatory: true }`);
    } else if (cost <= 4) {
      effects.push(`{ id: 'e${eid++}', type: EffectType.DRAW, trigger: ${trigger}, targetType: TargetType.NONE, data: { count: 1 } as DrawEffectData, isMandatory: true }`);
    } else {
      effects.push(`{ id: 'e${eid++}', type: EffectType.DAMAGE, trigger: ${trigger}, targetType: TargetType.RANDOM_ENEMY, data: { amount: ${Math.floor(cost / 2)} } as DamageEffectData, isMandatory: true }`);
    }
  }

  return effects;
}

// ─── Card to TypeScript ─────────────────────────────────────────────────────

function cardToTypeScript(card) {
  const typeStr = TYPE_MAP[card.type] || 'CardType.MINION';
  const rarityStr = RARITY_MAP[card.rarity] || 'CardRarity.COMMON';
  const tribeStr = card.subtype ? TRIBE_MAP[card.subtype] : null;

  const keywordsStr = card.keywords.map(formatKeywordInstance).join(', ');

  let lines = [];
  lines.push(`  {`);
  lines.push(`    id: '${escapeString(card.id)}',`);
  lines.push(`    name: '${escapeString(card.name)}',`);
  lines.push(`    cost: ${card.cost},`);
  lines.push(`    type: ${typeStr},`);

  if (card.race !== 'NEUTRAL') {
    lines.push(`    race: Race.${card.race},`);
  }

  lines.push(`    rarity: ${rarityStr},`);

  if (card.attack !== undefined && !isNaN(card.attack)) {
    lines.push(`    attack: ${card.attack},`);
  }
  if (card.health !== undefined && !isNaN(card.health)) {
    lines.push(`    health: ${card.health},`);
  }
  if (tribeStr) {
    lines.push(`    tribe: ${tribeStr},`);
  }

  // Parse card text into actual Effect[] arrays
  const parsedEffects = parseCardTextToEffects(card.cardText, card.type, card.cost);
  const isMinion = card.type === 'Minion' || card.type === 'Structure';

  // If a minion has parsed effects, add DEPLOY keyword so the engine triggers them
  let finalKeywordsStr = keywordsStr;
  if (isMinion && parsedEffects.length > 0) {
    const hasDeploy = card.keywords.some(k => k.keyword === 'DEPLOY' || k.keyword === 'TriggerKeyword.DEPLOY');
    if (!hasDeploy) {
      const deployKw = 'TriggerKeyword.DEPLOY';
      finalKeywordsStr = keywordsStr
        ? `${keywordsStr}, { keyword: ${deployKw} }`
        : `{ keyword: ${deployKw} }`;
    }
  }

  lines.push(`    keywords: [${finalKeywordsStr}],`);

  if (parsedEffects.length > 0) {
    lines.push(`    effects: [${parsedEffects.join(', ')}],`);
  } else {
    lines.push(`    effects: [],`);
  }

  if (card.starforge) {
    lines.push(`    starforge: ${formatStarforge(card.starforge, card.cost)},`);
  }

  if (card.flavorText) {
    lines.push(`    flavorText: '${escapeString(card.flavorText)}',`);
  }

  lines.push(`    cardText: '${escapeString(card.cardText)}',`);
  lines.push(`    collectible: true,`);
  lines.push(`    set: 'CORE',`);
  lines.push(`  }`);

  return lines.join('\n');
}

// ─── Starter Deck Builder ─────────────────────────────────────────────────
// Race-only decks: exactly 25 minions/structures + 5 spells from each race's pool.
// NO neutral cards. Each race gets ONE unique 30-card starter deck.
// BALANCE CONSTRAINTS:
//   - Exactly 5 spells per deck (with working effects via EffectResolver)
//   - Exactly 25 minions/structures per deck
//   - Maximum 5 of any single keyword (prevents stacking e.g. 9x LETHAL)
//   - Mana curve enforcement for minions
//   - Post-build deck-level stat normalization to equalize total power
//   - Aggressive keyword value weighting (LETHAL=6, BLITZ=5, etc.)

const DECK_KW_VALUES = {
  GUARDIAN: 3,       // Stat-independent — don't over-pick
  BARRIER: 3,        // Stat-independent — don't over-pick
  SWIFT: 2.5,        // Can attack MINIONS only on summon turn
  BLITZ: 5,          // Can attack ANYTHING immediately — very strong
  CLOAK: 1.5,        // One-time stealth, breaks on attack — situational
  DOUBLE_STRIKE: 5,  // TWO attacks per turn — massive board control
  DRAIN: 3,          // Heals hero by damage dealt — moderate
  LETHAL: 3,         // Stat-independent — don't over-pick (capped at 3/deck)
  DEPLOY: 3,         // Battlecry — works via EffectResolver
  LAST_RITES: 2,     // Deathrattle — works via EffectResolver
};

const MAX_SPELLS_IN_DECK = 5;   // Exactly 5 spells per deck
const MAX_KEYWORD_COPIES = 4;   // Global cap for ALL keywords. Stat-dependent KWs also need caps — BLITZ=9 proved too strong at volume.
const MAX_STRUCTURES_IN_DECK = 2; // Max structures — they can't attack, dead board slots
const MIN_RACE_CARDS = 30;      // All 30 cards from race pool only
const MAX_NEUTRAL_CARDS = 0;    // No neutral cards at all

// Per-keyword hard caps enforced through ALL steps including emergency fills.
// Keywords at high volume dominate regardless of minion stats.
const KEYWORD_MAX_OVERRIDES = {
  GUARDIAN: 5,       // R14: 3→5. Control decks need more walls. Cap 7 tested but broke archetype detection.
  LETHAL: 5,         // R16h: Reverted to 5. Race caps now override in either direction.
  BARRIER: 5,        // Cap 7 tested but made every race too defensive. Keep at 5.
  BLITZ: 4,          // R13: 3→4. Pyroclast starved at 22/25 with cap 3.
  SWIFT: 5,          // R9: 6→5. Three races hit cap=6, homogenizing speed.
  DRAIN: 8,          // R11: 6 starved Luminar (19/25). Generous cap.
  DOUBLE_STRIKE: 5,  // R11: Luminar had DS=8. Even stat-dep keywords need caps at volume.
  CLOAK: 5,          // R15d: was uncapped (default 4). Raised to 5 for Corsairs/Voidborn identity.
  // Total cap slots: 5+5+5+4+5+8+5+5 = 42. 25 minions × ~2kw = 50 slots → ok.
};

// Per-RACE keyword caps: tighter limits for specific races to enforce archetype identity.
// Stat biases proved useless (Luminar -8 bias only moved 0.5%) — keywords dominate.
// Race caps ensure control decks can't ALSO be great aggro, and vice versa.
const RACE_KEYWORD_CAP_OVERRIDES = {
  // COGSMITHS: No race caps needed — global caps suffice for midrange identity.
  LUMINAR: {
    BLITZ: 2,          // Control shouldn't charge much
    SWIFT: 3,          // Limited speed
    DOUBLE_STRIKE: 3,  // Less burst damage — control wins through sustain, not burst
    LETHAL: 2,         // R14e: was 5, crushes everything. 2 LETHAL is enough for removal.
    DRAIN: 4,          // R14e: was 5. Slightly less healing to make games closer.
  },
  PYROCLAST: {
    BARRIER: 2,        // Aggro shouldn't have shields (flat weights gave 5, led to 82.8%)
    GUARDIAN: 1,       // No walls for aggro
    DRAIN: 3,          // Limited healing
    // LETHAL: no cap needed — global is 5, Pyroclast weight is 2 so won't exceed
  },
  BIOTITANS: {
    BLITZ: 2,          // Not a rush deck — big creatures take time to ramp
    LETHAL: 2,         // Big creatures overpower, don't need LETHAL
    CLOAK: 1,          // Not sneaky
    DRAIN: 5,          // R15b: was 7, too much sustain. Cap at 5.
    DOUBLE_STRIKE: 3,  // R15b: was 5, too much burst on big bodies. Cap at 3.
  },
  PHANTOM_CORSAIRS: {
    BARRIER: 2,        // R15f: raised from 1.
    GUARDIAN: 1,       // GUARDIAN anti-synergy with CLOAK (R15h=33%). Keep minimal.
    DRAIN: 4,          // R15b: raised from 2. Cap 5 was no-op (weight 3 → 4 naturally).
    // LETHAL: no cap needed — global is back to 5
  },
  CRYSTALLINE: {
    BLITZ: 2,          // R16: spell deck, not aggro
    SWIFT: 3,          // Limited speed — wins through spells not tempo
    LETHAL: 2,         // Not an assassin faction
  },
  // Hivemind: RAISE LETHAL cap above global (venomous swarm identity).
  // R16i: DRAIN 5→6 (31% at DRAIN:5, 38% at DRAIN:8 — compromise).
  //        LETHAL 7→8 (one more assassin).
  HIVEMIND: {
    LETHAL: 8,         // RAISE above global 5 — venomous swarm needs max LETHAL
    DRAIN: 6,          // R16i: 5 killed sustain (31%). 8 = stalemate. Try 6.
  },
  // R17e: Keep LETHAL dominant. Add DS cap to counter BARRIER. No BLITZ cap (stole LETHAL slots in R17d).
  CHRONOBOUND: {
    LETHAL: 8,         // RAISE above global 5 — temporal assassins need max LETHAL
    DRAIN: 6,          // Need sustain but cap to prevent stalemates
    DOUBLE_STRIKE: 7,  // RAISE above global 5 — DS+LETHAL: 1st hit pops BARRIER, 2nd kills
  },
};

function getCardKeywords(card) {
  return (card.keywords || []).map(kw => {
    const kwStr = kw.keyword || '';
    return kwStr.includes('.') ? kwStr.split('.')[1] : kwStr;
  });
}

function isMinion(card) {
  return card.attack !== undefined && !isNaN(card.attack);
}

function scoreDeckCard(card) {
  const cost = card.cost || 1;

  if (isMinion(card)) {
    const atk = card.attack || 0;
    const hp = card.health || 0;
    const statTotal = atk + hp;
    const expected = cost * 2 + 1;
    let score = statTotal - expected + 5;

    for (const kwName of getCardKeywords(card)) {
      score += DECK_KW_VALUES[kwName] || 1;
    }

    if (cost <= 2 && (card.keywords || []).length > 0) score += 1;
    if (cost >= 6 && (card.keywords || []).length > 0) score += 1;
    return Math.max(0, score);
  } else {
    // Spells: score based on cost (higher cost = more impact)
    // All spells now have effects via parser + fallbacks
    const cost = card.cost || 1;
    const text = (card.cardText || '').toLowerCase();
    let score = cost + 3;
    if (text.includes('all enem') || text.includes('all minion')) score += 3; // AoE
    if (text.includes('destroy')) score += 2;
    if (text.includes('draw')) score += 2;
    return Math.max(1, score);
  }
}

const DECK_MANA_CURVE = {
  1: { min: 2, max: 4 },
  2: { min: 3, max: 6 },
  3: { min: 4, max: 7 },
  4: { min: 3, max: 5 },
  5: { min: 2, max: 4 },
  6: { min: 1, max: 3 },
  7: { min: 1, max: 3 },
};

function buildStarterDeck(raceCards, _neutralCards, raceEnum) {
  // ── RACE-ONLY: exactly 25 board entities (minions/structures) + 5 spells ──
  const BOARD_TARGET = 25;
  const SPELL_TARGET = 5;
  const isSpellCard = (c) => c.type === 'Spell';

  // Separate and score
  const boardEntities = raceCards
    .filter(c => !isSpellCard(c))
    .map(c => ({ card: c, score: scoreDeckCard(c) }))
    .sort((a, b) => b.score - a.score);

  const spells = raceCards.filter(c => isSpellCard(c));

  const deckCards = [];
  const usedIds = new Set();
  const costBuckets = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  const kwCounts = {};

  function getBucket(cost) { return Math.min(Math.max(cost, 1), 7); }
  function isFull(cost) {
    const b = getBucket(cost);
    return costBuckets[b] >= (DECK_MANA_CURVE[b]?.max || 3);
  }
  // Get effective cap for a keyword, considering race-specific overrides
  function getEffectiveCap(kwName) {
    const raceCaps = RACE_KEYWORD_CAP_OVERRIDES[raceEnum];
    if (raceCaps && raceCaps[kwName] !== undefined) {
      // R16h: Race cap overrides global in EITHER direction (higher or lower).
      // This lets Hivemind get LETHAL=7 without raising global cap for all races.
      return raceCaps[kwName];
    }
    return KEYWORD_MAX_OVERRIDES[kwName] ?? MAX_KEYWORD_COPIES;
  }
  function wouldExceedKeywordCap(card) {
    for (const kwName of getCardKeywords(card)) {
      const cap = getEffectiveCap(kwName);
      if ((kwCounts[kwName] || 0) >= cap) return true;
    }
    return false;
  }
  function addCard(card) {
    deckCards.push(card);
    usedIds.add(card.id);
    costBuckets[getBucket(card.cost)]++;
    for (const kwName of getCardKeywords(card)) {
      kwCounts[kwName] = (kwCounts[kwName] || 0) + 1;
    }
  }

  // Track structure count separately
  let structureCount = 0;
  const origAddCard = addCard;
  addCard = function(card) {
    origAddCard(card);
    if (card.type === 'Structure') structureCount++;
  };

  function wouldExceedStructureCap(card) {
    return card.type === 'Structure' && structureCount >= MAX_STRUCTURES_IN_DECK;
  }

  // Hard ceiling for expensive cards — persists through ALL steps (even emergency).
  // Top-heavy decks lose to aggro because they can't play cards early enough.
  const HIGH_COST_HARD_MAX = { 6: 4, 7: 3 }; // Max 4 at 6-cost, max 3 at 7-cost
  function wouldExceedHighCostCap(card) {
    const b = getBucket(card.cost);
    const hardMax = HIGH_COST_HARD_MAX[b];
    if (hardMax !== undefined && costBuckets[b] >= hardMax) return true;
    return false;
  }

  // ── Step 1: Pick 5 spells spread across mana costs for variety ──
  const spellBuckets = {};
  for (const spell of spells) {
    const b = getBucket(spell.cost);
    if (!spellBuckets[b]) spellBuckets[b] = [];
    spellBuckets[b].push(spell);
  }

  let spellsPicked = 0;
  // Prefer mid-cost spells first for curve variety
  for (const bucket of [2, 3, 4, 5, 1, 6, 7]) {
    if (spellsPicked >= SPELL_TARGET) break;
    const bucketSpells = spellBuckets[bucket];
    if (!bucketSpells || bucketSpells.length === 0) continue;
    const spell = bucketSpells.shift();
    if (!usedIds.has(spell.id)) {
      addCard(spell);
      spellsPicked++;
    }
  }
  // Fill remaining spells from any cost
  if (spellsPicked < SPELL_TARGET) {
    for (const spell of spells) {
      if (spellsPicked >= SPELL_TARGET) break;
      if (usedIds.has(spell.id)) continue;
      addCard(spell);
      spellsPicked++;
    }
  }

  // ── Step 2: Pick 25 board entities with keyword caps + mana curve + structure cap ──
  for (const entry of boardEntities) {
    if (deckCards.length >= 30) break;
    if (usedIds.has(entry.card.id)) continue;
    if (wouldExceedKeywordCap(entry.card)) continue;
    if (wouldExceedStructureCap(entry.card)) continue;
    if (isFull(entry.card.cost)) continue;
    addCard(entry.card);
  }
  const step2Count = deckCards.filter(c => c.type !== 'Spell').length;
  const step2KW = {...kwCounts};
  console.log(`    [Step2] ${step2Count} minions | KW: ${Object.entries(step2KW).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}=${v}`).join(' ')}`);

  // ── Step 3: Relax mana curve constraint if not at 30 (keep keyword + structure + high-cost caps) ──
  if (deckCards.length < 30) {
    for (const entry of boardEntities) {
      if (deckCards.length >= 30) break;
      if (usedIds.has(entry.card.id)) continue;
      if (wouldExceedKeywordCap(entry.card)) continue;
      if (wouldExceedStructureCap(entry.card)) continue;
      if (wouldExceedHighCostCap(entry.card)) continue;
      addCard(entry.card);
    }
    const step3Count = deckCards.filter(c => c.type !== 'Spell').length;
    const step3KW = {...kwCounts};
    console.log(`    [Step3] ${step3Count} minions | KW: ${Object.entries(step3KW).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}=${v}`).join(' ')}`);
  }

  // Helper: check if card would violate any hard keyword override cap
  function wouldExceedHardKeywordCaps(card) {
    for (const kwName of getCardKeywords(card)) {
      const cap = getEffectiveCap(kwName);
      if ((kwCounts[kwName] || 0) >= cap) return true;
    }
    return false;
  }

  // ── Step 4: Relax curve + keyword caps to soft cap 6, keep hard overrides + structure + high-cost ──
  const SOFT_KEYWORD_CAP = 6;
  if (deckCards.length < 30) {
    for (const entry of boardEntities) {
      if (deckCards.length >= 30) break;
      if (usedIds.has(entry.card.id)) continue;
      if (wouldExceedStructureCap(entry.card)) continue;
      if (wouldExceedHighCostCap(entry.card)) continue;
      if (wouldExceedHardKeywordCaps(entry.card)) continue;
      // Soft cap: no keyword above 6 even in relaxed mode
      let exceedsSoft = false;
      for (const kwName of getCardKeywords(entry.card)) {
        if ((kwCounts[kwName] || 0) >= SOFT_KEYWORD_CAP) { exceedsSoft = true; break; }
      }
      if (exceedsSoft) continue;
      addCard(entry.card);
    }
    const step4Count = deckCards.filter(c => c.type !== 'Spell').length;
    const step4KW = {...kwCounts};
    console.log(`    [Step4] ${step4Count} minions | KW: ${Object.entries(step4KW).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}=${v}`).join(' ')}`);
  }

  // ── Step 5: EMERGENCY — reach 25 minions if needed. NEVER add extra spells. ──
  // Layered relaxation: keyword soft cap → high-cost cap → structure → everything
  const minionCount = deckCards.filter(c => c.type !== 'Spell').length;
  if (minionCount < 25) {
    console.warn(`    WARNING: Only ${minionCount} minions after Step 4, entering emergency fill`);

    // 5a: Relax keyword soft cap to 8, keep hard overrides + structure + high-cost
    for (const entry of boardEntities) {
      if (deckCards.filter(c => c.type !== 'Spell').length >= 25) break;
      if (deckCards.length >= 30) break;
      if (usedIds.has(entry.card.id)) continue;
      if (wouldExceedStructureCap(entry.card)) continue;
      if (wouldExceedHighCostCap(entry.card)) continue;
      if (wouldExceedHardKeywordCaps(entry.card)) continue;
      // Allow non-capped keywords up to 8 (but respect race-specific caps via getEffectiveCap)
      let exceedsCap = false;
      for (const kwName of getCardKeywords(entry.card)) {
        const raceCaps = RACE_KEYWORD_CAP_OVERRIDES[raceEnum];
        const hasHardCap = KEYWORD_MAX_OVERRIDES[kwName] !== undefined || (raceCaps && raceCaps[kwName] !== undefined);
        if (!hasHardCap && (kwCounts[kwName] || 0) >= 8) { exceedsCap = true; break; }
      }
      if (exceedsCap) continue;
      addCard(entry.card);
    }

    // 5b: Relax high-cost cap, keep hard keyword overrides
    if (deckCards.filter(c => c.type !== 'Spell').length < 25) {
      for (const entry of boardEntities) {
        if (deckCards.filter(c => c.type !== 'Spell').length >= 25) break;
        if (deckCards.length >= 30) break;
        if (usedIds.has(entry.card.id)) continue;
        if (wouldExceedHardKeywordCaps(entry.card)) continue;
        addCard(entry.card);
      }
    }

    // 5c: Last resort — relax everything EXCEPT hard keyword caps
    // NEVER violate KEYWORD_MAX_OVERRIDES. A smaller deck is better than keyword-broken balance.
    if (deckCards.filter(c => c.type !== 'Spell').length < 25) {
      for (const entry of boardEntities) {
        if (deckCards.filter(c => c.type !== 'Spell').length >= 25) break;
        if (deckCards.length >= 30) break;
        if (usedIds.has(entry.card.id)) continue;
        if (wouldExceedHardKeywordCaps(entry.card)) continue;
        addCard(entry.card);
      }
    }
  }

  return deckCards.slice(0, 30);
}

// ─── Deck-Level Power Normalization ────────────────────────────────────────
// After building all starter decks, compute each deck's total power score
// and adjust minion stats to equalize them. This is the final balance pass.

function computeDeckPower(deck) {
  let totalPower = 0;
  let minionCount = 0;
  for (const card of deck) {
    if (isMinion(card)) {
      const atk = card.attack || 0;
      const hp = card.health || 0;
      const cost = card.cost || 1;
      const expected = cost * 2 + 1;
      const statEff = (atk + hp) - expected;
      let kwPower = 0;
      for (const kwName of getCardKeywords(card)) {
        kwPower += DECK_KW_VALUES[kwName] || 1;
      }
      totalPower += statEff + kwPower;
      minionCount++;
    }
  }
  return { totalPower, minionCount };
}

// Win-rate bias: Based on Round 9 results (spread 58.1%, 6 races in 40-60%).
// Round 9: Pyroclast fixed (74→59), Phantom Corsairs fixed (34→51).
// Problems: Biotitans 77.5% (GUARDIAN/LETHAL overflow), Chronobound 19.4% (top-heavy curve),
// Luminar 36.5% (needs buff), Crystalline 63.8% (still high).
// Structural fixes: Biotitans weights diversified (GUARDIAN 2→1, LETHAL 3→1),
// Chronobound weights diversified (more SWIFT/DRAIN for early game).
const WIN_RATE_BALANCE_BIAS = {
  // R14f: 3 of 4 in target! Voidborn 40.7% still low — push bias harder.
  // Voidborn has fewest keywords (0.8/minion) so needs raw stat advantage to compete.
  PYROCLAST:        -10,  // Reverted from -12 (nerf didn't help Corsairs matchup).
  COGSMITHS:          5,  // R16e: 56.0% too high. +7→+5 to bring down ~2%.
  LUMINAR:            0,
  VOIDBORN:           8,
  // R15: Biotitans + Phantom Corsairs activated. Reset biases to 0 for fresh 6-race meta.
  BIOTITANS:          0,
  PHANTOM_CORSAIRS:  26,  // R15k: +24→+26. Bias curve: +18=42.6, +22=43.4, +24=44.0. Try +26.
  // R16: Crystalline + Hivemind activated.
  CRYSTALLINE:        0,  // 49.6% first try — perfect, no change needed.
  HIVEMIND:          50,  // R16i: 31% at bias 35/DRAIN:5. Try 50 + DRAIN:6 + LETHAL:8.
  ASTROMANCERS:      40,  // R17f: 39.7% at +35. Nudge +5 to cross 40%.
  CHRONOBOUND:       55,  // R17f: 39.2% at +50 (DS+LETHAL breakthrough!). Nudge +5 to cross 40%.
};

function normalizeDeckPower(allDecks) {
  // Compute power for each deck
  const deckPowers = {};
  for (const [race, deck] of Object.entries(allDecks)) {
    deckPowers[race] = computeDeckPower(deck);
  }

  // Find the average power
  const powers = Object.values(deckPowers);
  const avgPower = powers.reduce((s, d) => s + d.totalPower, 0) / powers.length;

  console.log(`\n  Power normalization target: ${avgPower.toFixed(1)}`);

  for (const [race, deck] of Object.entries(allDecks)) {
    const { totalPower, minionCount } = deckPowers[race];
    const bias = WIN_RATE_BALANCE_BIAS[race] || 0;
    const raceTarget = avgPower + bias;
    const diff = raceTarget - totalPower;

    if (Math.abs(diff) < 1) {
      console.log(`    ${race}: power ${totalPower.toFixed(1)} — balanced`);
      continue;
    }

    // Distribute stat adjustments across minions
    const adjustPerMinion = diff / minionCount;
    let adjustmentsToMake = Math.round(Math.abs(diff));
    const direction = diff > 0 ? 1 : -1;

    console.log(`    ${race}: power ${totalPower.toFixed(1)} → target ${raceTarget.toFixed(1)} (bias ${bias >= 0 ? '+' : ''}${bias}) → adjusting ${direction > 0 ? '+' : ''}${diff.toFixed(1)} (${adjustmentsToMake} stat points across ${minionCount} minions)`);

    // Sort minions by how much they deviate from vanilla curve
    // Buff understatted minions first; nerf overstatted first
    const minionIndices = [];
    for (let i = 0; i < deck.length; i++) {
      if (isMinion(deck[i])) {
        const c = deck[i];
        const eff = (c.attack + c.health) - (c.cost * 2 + 1);
        minionIndices.push({ idx: i, efficiency: eff });
      }
    }

    if (direction > 0) {
      minionIndices.sort((a, b) => a.efficiency - b.efficiency); // Buff least efficient first
    } else {
      minionIndices.sort((a, b) => b.efficiency - a.efficiency); // Nerf most efficient first
    }

    for (const { idx } of minionIndices) {
      if (adjustmentsToMake <= 0) break;
      const card = deck[idx];

      if (direction > 0) {
        // Buff: add health
        deck[idx] = { ...card, health: card.health + 1 };
        adjustmentsToMake--;
      } else {
        // Nerf: remove health (min 1), or attack (min 0)
        if (card.health > 2) {
          deck[idx] = { ...card, health: card.health - 1 };
          adjustmentsToMake--;
        } else if (card.attack > 1) {
          deck[idx] = { ...card, attack: card.attack - 1 };
          adjustmentsToMake--;
        }
      }
    }

    // Additional passes if we still have adjustments to make
    for (let pass = 0; pass < 3 && adjustmentsToMake > 0; pass++) {
      for (const { idx } of minionIndices) {
        if (adjustmentsToMake <= 0) break;
        const card = deck[idx];
        if (direction > 0) {
          // Buff: alternate between attack and health
          if (pass % 2 === 0) {
            deck[idx] = { ...card, attack: card.attack + 1 };
          } else {
            deck[idx] = { ...card, health: card.health + 1 };
          }
          adjustmentsToMake--;
        } else {
          if (card.health > 2) {
            deck[idx] = { ...card, health: card.health - 1 };
            adjustmentsToMake--;
          } else if (card.attack > 1) {
            deck[idx] = { ...card, attack: card.attack - 1 };
            adjustmentsToMake--;
          }
        }
      }
    }
  }
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main() {
  console.log(`Reading XLSX from: ${XLSX_PATH}`);
  const workbook = XLSX.readFile(XLSX_PATH);
  console.log(`Sheets: ${workbook.SheetNames.join(', ')}`);

  const allCards = {};
  let totalCards = 0;

  // Process race sheets
  for (const [sheetName, raceEnum] of Object.entries(RACE_SHEETS)) {
    if (!workbook.SheetNames.includes(sheetName)) {
      console.warn(`Sheet not found: ${sheetName}`);
      continue;
    }
    const sheet = workbook.Sheets[sheetName];
    let cards = parseSheet(sheet, raceEnum);

    // *** CONVERT ALL KEYWORDS TO COMBAT-ONLY ***
    cards = convertKeywords(cards, raceEnum);

    // *** NORMALIZE STATS FOR BALANCE ***
    cards = normalizeStats(cards, raceEnum);

    allCards[raceEnum] = cards;
    totalCards += cards.length;
    console.log(`  ${sheetName}: ${cards.length} cards`);

    // Log keyword distribution for this race
    const kwDist = {};
    for (const card of cards) {
      for (const kwInst of card.keywords) {
        const kwName = kwInst.keyword.split('.')[1] || kwInst.keyword;
        kwDist[kwName] = (kwDist[kwName] || 0) + 1;
      }
    }
    const distStr = Object.entries(kwDist)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}=${v}`)
      .join(', ');
    console.log(`    Keywords: ${distStr}`);
  }

  // Process neutral sheets
  const neutralCards = [];
  for (const sheetName of workbook.SheetNames) {
    if (sheetName.toLowerCase().includes('neutral')) {
      const sheet = workbook.Sheets[sheetName];
      const cards = parseSheet(sheet, 'NEUTRAL');
      neutralCards.push(...cards);
      console.log(`  ${sheetName}: ${cards.length} cards`);
    }
  }

  // Neutral cards also get combat-only conversion + normalization
  let processedNeutrals = convertKeywords(neutralCards, 'NEUTRAL');
  processedNeutrals = normalizeStats(processedNeutrals, 'NEUTRAL');

  // De-duplicate neutral cards
  const neutralById = new Map();
  for (const card of processedNeutrals) {
    if (neutralById.has(card.id)) {
      let suffix = 2;
      while (neutralById.has(`${card.id}_${suffix}`)) suffix++;
      card.id = `${card.id}_${suffix}`;
    }
    neutralById.set(card.id, card);
  }
  allCards['NEUTRAL'] = Array.from(neutralById.values());
  totalCards += allCards['NEUTRAL'].length;
  console.log(`  Total neutrals (deduplicated): ${allCards['NEUTRAL'].length}`);
  console.log(`Total cards: ${totalCards}`);

  // ─── Generate TypeScript ──────────────────────────────────────────────

  let output = `/**
 * STARFORGE TCG - Complete Card Collection
 *
 * Auto-generated from STARFORGE_Card_Collection.xlsx
 * ${totalCards} cards across ${Object.keys(allCards).length} factions.
 * Keywords: 8 Combat (GUARDIAN, BARRIER, SWIFT, BLITZ, CLOAK, DOUBLE STRIKE, DRAIN, LETHAL)
 *         + 2 Triggers (DEPLOY, LAST RITES)
 * Includes STARTER_DECK_[RACE] arrays for fixed starter decks.
 *
 * DO NOT EDIT MANUALLY - regenerate with: node convert-cards.mjs
 */

import { CardType, CardRarity, MinionTribe } from '../types/Card';
import type { CardDefinition } from '../types/Card';
import { Race } from '../types/Race';
import { CombatKeyword, TriggerKeyword } from '../types/Keywords';
import { StarforgeType, StarforgeConditionType } from '../types/Starforge';
import { EffectType, EffectTrigger, TargetType } from '../types/Effects';
import type { DamageEffectData, HealEffectData, BuffEffectData, DrawEffectData, SummonEffectData, GrantKeywordData, GainCrystalsData, GenericEffectData } from '../types/Effects';

`;

  // Emit race card arrays
  const raceArrayNames = {};
  for (const [raceEnum, cards] of Object.entries(allCards)) {
    const arrayName = `${raceEnum}_CARDS`;
    raceArrayNames[raceEnum] = arrayName;

    output += `// ${'='.repeat(76)}\n`;
    output += `// ${raceEnum} (${cards.length} cards)\n`;
    output += `// ${'='.repeat(76)}\n`;
    output += `export const ${arrayName}: CardDefinition[] = [\n`;
    output += cards.map(cardToTypeScript).join(',\n');
    output += `\n];\n\n`;
  }

  // Emit TOKEN_CARDS
  output += `// ${'='.repeat(76)}\n`;
  output += `// TOKENS (generated at runtime)\n`;
  output += `// ${'='.repeat(76)}\n`;
  output += `export const TOKEN_CARDS: CardDefinition[] = [];\n\n`;

  // Emit ALL_SAMPLE_CARDS
  const allArrayRefs = Object.values(raceArrayNames).map(n => `...${n}`).join(', ');
  output += `// ${'='.repeat(76)}\n`;
  output += `// Combined exports\n`;
  output += `// ${'='.repeat(76)}\n`;
  output += `export const ALL_SAMPLE_CARDS: CardDefinition[] = [\n  ${allArrayRefs},\n  ...TOKEN_CARDS,\n];\n\n`;

  // ─── BUILD & NORMALIZE STARTER DECKS ────────────────────────────────
  console.log('\n=== Building Starter Decks ===');
  const starterDeckNames = {};
  const starterDecks = {};  // Collect all decks first for cross-deck normalization
  const neutralCardsForDecks = allCards['NEUTRAL'] || [];

  for (const [raceEnum, cards] of Object.entries(allCards)) {
    if (raceEnum === 'NEUTRAL') continue;
    const starterCards = buildStarterDeck(cards, neutralCardsForDecks, raceEnum);
    starterDecks[raceEnum] = starterCards;
    const deckArrayName = `STARTER_DECK_${raceEnum}`;
    starterDeckNames[raceEnum] = deckArrayName;

    const minionCt = starterCards.filter(c => c.type !== 'Spell').length;
    const spellCt = starterCards.filter(c => c.type === 'Spell').length;
    const curveCounts = {};
    for (const c of starterCards) {
      const b = Math.min(Math.max(c.cost, 1), 7);
      curveCounts[b] = (curveCounts[b] || 0) + 1;
    }
    const curveStr = Object.entries(curveCounts).sort((a,b) => a[0]-b[0]).map(([c,n]) => `${c}:${n}`).join(' ');

    // Log keyword distribution
    const kwDist = {};
    const kwMinion = {};
    const kwSpell = {};
    for (const c of starterCards) {
      for (const kwName of getCardKeywords(c)) {
        kwDist[kwName] = (kwDist[kwName] || 0) + 1;
        if (c.type === 'Spell') {
          kwSpell[kwName] = (kwSpell[kwName] || 0) + 1;
        } else {
          kwMinion[kwName] = (kwMinion[kwName] || 0) + 1;
        }
      }
    }
    const kwStr = Object.entries(kwDist).sort((a,b) => b[1]-a[1]).map(([k,v]) => `${k}=${v}`).join(' ');
    const kwMinionStr = Object.entries(kwMinion).sort((a,b) => b[1]-a[1]).map(([k,v]) => `${k}=${v}`).join(' ');
    const kwSpellStr = Object.entries(kwSpell).sort((a,b) => b[1]-a[1]).map(([k,v]) => `${k}=${v}`).join(' ');

    console.log(`  ${raceEnum}: ${starterCards.length} cards (${minionCt} minions/${spellCt} spells, race-only) | Curve: ${curveStr}`);
    console.log(`    KW total:  ${kwStr}`);
    console.log(`    KW minion: ${kwMinionStr}`);
    console.log(`    KW spell:  ${kwSpellStr}`);
  }

  // *** CROSS-DECK POWER NORMALIZATION ***
  console.log('\n=== Normalizing Deck Power ===');
  normalizeDeckPower(starterDecks);

  // Log post-normalization stats
  console.log('\n  Post-normalization verification:');
  for (const [raceEnum, deck] of Object.entries(starterDecks)) {
    const { totalPower, minionCount } = computeDeckPower(deck);
    const minions = deck.filter(c => isMinion(c));
    const avgAtk = minions.reduce((s, c) => s + (c.attack || 0), 0) / minions.length;
    const avgHp = minions.reduce((s, c) => s + (c.health || 0), 0) / minions.length;
    console.log(`    ${raceEnum}: power=${totalPower.toFixed(1)}, avgAtk=${avgAtk.toFixed(1)}, avgHP=${avgHp.toFixed(1)}`);
  }

  // Now emit starter decks with potentially adjusted stats (inline cards, not references)
  for (const [raceEnum, starterCards] of Object.entries(starterDecks)) {
    const deckArrayName = starterDeckNames[raceEnum];

    output += `// ${'='.repeat(76)}\n`;
    output += `// STARTER DECK: ${raceEnum} (${starterCards.length} cards)\n`;
    output += `// ${'='.repeat(76)}\n`;
    output += `export const ${deckArrayName}: CardDefinition[] = [\n`;
    output += starterCards.map(cardToTypeScript).join(',\n');
    output += `\n];\n\n`;
  }

  // Emit getStarterDeck helper
  output += `/**
 * Get the fixed starter deck for a race (30 curated cards)
 */
export function getStarterDeck(race: Race): CardDefinition[] {
  switch (race) {
${Object.entries(starterDeckNames).map(([raceEnum, deckName]) =>
    `    case Race.${raceEnum}: return [...${deckName}];`
  ).join('\n')}
    default: return [];
  }
}

`;

  // Emit helper functions
  output += `/**
 * Get all cards for a specific race (includes neutral)
 */
export function getSampleCardsByRace(race: Race): CardDefinition[] {
  switch (race) {
${Object.entries(raceArrayNames).map(([raceEnum, arrayName]) =>
    `    case Race.${raceEnum}: return ${arrayName};`
  ).join('\n')}
    default: return [];
  }
}

/**
 * Get all collectible cards
 */
export function getCollectibleSampleCards(): CardDefinition[] {
  return ALL_SAMPLE_CARDS.filter(c => c.collectible);
}

/**
 * Build a 30-card faction deck (race cards + neutrals)
 * @deprecated Use getStarterDeck() for the curated starter decks
 */
export function getFactionDeck(race: Race): CardDefinition[] {
  return getStarterDeck(race);
}
`;

  // Write output
  fs.writeFileSync(OUTPUT_PATH, output, 'utf8');
  console.log(`\nGenerated: ${OUTPUT_PATH}`);
  console.log(`File size: ${(Buffer.byteLength(output) / 1024).toFixed(1)} KB`);
}

main();
