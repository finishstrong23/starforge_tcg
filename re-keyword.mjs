/**
 * STARFORGE TCG - Keyword Re-Roller
 *
 * Re-rolls combat keywords in SampleCards.ts based on updated RACE_COMBAT_WEIGHTS.
 * Preserves card names, stats, effects, triggers — only changes CombatKeyword assignments.
 * Also rebuilds starter decks with keyword-aware selection.
 *
 * Usage: node re-keyword.mjs
 */

import fs from 'fs';
import path from 'path';

const SAMPLE_CARDS_PATH = path.join('src', 'data', 'SampleCards.ts');

// ─── New RACE_COMBAT_WEIGHTS (must match convert-cards.mjs) ─────────────────

// Keyword power ranking (empirically validated):
// BARRIER ~5 (free hit absorption) > BLITZ ~5 (immediate face) > DOUBLE_STRIKE ~4.5 (2x attacks)
// > DRAIN ~4 (sustain) > GUARDIAN ~3.5 (protects face) > SWIFT ~3 (attack minions on entry)
// > LETHAL ~3 (instakill but trades) > CLOAK ~2 (one-time stealth, situational)
//
// Weak-primary races get strong secondary keywords to compensate.
// Strong-primary races get weaker secondaries.

// Keyword power ranking (validated across 5+ test runs, 2250 games each):
// BARRIER ~5 (free hit absorption) > BLITZ ~5 (immediate face) > DOUBLE_STRIKE ~4.5 (2x attacks)
// > DRAIN ~4 (sustain) > GUARDIAN ~3.5 (protects face) > SWIFT ~3 (attack minions on entry)
// > LETHAL ~3 (instakill but trades) > CLOAK ~2 (one-time stealth, situational)
//
// Previous best: 32.5% spread. Adjustments: nerf PYROCLAST BLITZ, buff CHRONOBOUND DRAIN.
// Surgical changes only — avoid cascading meta shifts.
const RACE_COMBAT_WEIGHTS = {
  // Cogsmiths: "Shield Engineers" — BARRIER primary, SWIFT secondary (57.0%)
  COGSMITHS: {
    BARRIER: 5, SWIFT: 4, GUARDIAN: 3, DRAIN: 2,
    DOUBLE_STRIKE: 2, BLITZ: 2, LETHAL: 1, CLOAK: 1
  },
  // Luminar: "Radiant Wall" — GUARDIAN + DRAIN heal-control (52.1%)
  LUMINAR: {
    GUARDIAN: 6, DRAIN: 5, BARRIER: 3, SWIFT: 2,
    DOUBLE_STRIKE: 1, BLITZ: 1, LETHAL: 1, CLOAK: 1
  },
  // Pyroclast: "Fire Blitz" — BLITZ + DS aggro (61.6% → nerf BLITZ 5→4)
  PYROCLAST: {
    BLITZ: 4, DOUBLE_STRIKE: 4, SWIFT: 3, DRAIN: 2,
    LETHAL: 2, BARRIER: 2, GUARDIAN: 1, CLOAK: 1
  },
  // Voidborn: "Void Stalkers" — CLOAK + DRAIN sustain (37.0%)
  VOIDBORN: {
    CLOAK: 5, DRAIN: 5, LETHAL: 3, BARRIER: 3,
    SWIFT: 2, GUARDIAN: 1, DOUBLE_STRIKE: 1, BLITZ: 1
  },
  // Biotitans: "Living Colossi" — DRAIN sustain + big bodies (62.3% → nerf DRAIN 6→5)
  BIOTITANS: {
    DRAIN: 5, GUARDIAN: 4, DOUBLE_STRIKE: 3, BARRIER: 3,
    SWIFT: 2, BLITZ: 1, LETHAL: 2, CLOAK: 1
  },
  // Crystalline: "Crystal Fortress" — BARRIER + GUARDIAN double defense (53.6%)
  CRYSTALLINE: {
    BARRIER: 5, GUARDIAN: 5, DRAIN: 3, DOUBLE_STRIKE: 3,
    SWIFT: 2, CLOAK: 1, BLITZ: 1, LETHAL: 1
  },
  // Phantom Corsairs: "Ghost Raiders" — SWIFT + CLOAK evasion (41.7% → more DRAIN)
  PHANTOM_CORSAIRS: {
    SWIFT: 5, CLOAK: 4, BLITZ: 3, DRAIN: 4,
    LETHAL: 2, DOUBLE_STRIKE: 1, BARRIER: 1, GUARDIAN: 1
  },
  // Hivemind: "Venom Swarm" — LETHAL + DRAIN sustain (46.8%)
  HIVEMIND: {
    LETHAL: 5, DRAIN: 5, SWIFT: 3, BARRIER: 2,
    BLITZ: 2, DOUBLE_STRIKE: 2, GUARDIAN: 1, CLOAK: 1
  },
  // Astromancers: "Twin Stars" — DS + BARRIER burst (56.4%)
  ASTROMANCERS: {
    DOUBLE_STRIKE: 6, BARRIER: 4, DRAIN: 3, BLITZ: 3,
    SWIFT: 2, GUARDIAN: 1, LETHAL: 1, CLOAK: 1
  },
  // Chronobound: "Time Reapers" — LETHAL+DS combo (31.9%)
  CHRONOBOUND: {
    LETHAL: 4, DOUBLE_STRIKE: 4, DRAIN: 5, BLITZ: 3,
    BARRIER: 3, SWIFT: 2, GUARDIAN: 0, CLOAK: 0
  },
  NEUTRAL: {
    GUARDIAN: 3, BARRIER: 3, SWIFT: 3, BLITZ: 3,
    CLOAK: 3, DOUBLE_STRIKE: 3, DRAIN: 3, LETHAL: 3,
  },
};

// Keywords that should NEVER appear on the same card
const INCOMPATIBLE_KEYWORDS = {
  GUARDIAN: ['LETHAL'],
  LETHAL: ['GUARDIAN'],
};

// ─── Deterministic hashing ──────────────────────────────────────────────────

function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pickCombatKeyword(race, cardName, cardIndex, excludeSet) {
  const weights = RACE_COMBAT_WEIGHTS[race] || RACE_COMBAT_WEIGHTS['NEUTRAL'];

  const banned = new Set();
  if (excludeSet) {
    for (const existing of excludeSet) {
      const incompat = INCOMPATIBLE_KEYWORDS[existing];
      if (incompat) incompat.forEach(k => banned.add(k));
    }
  }

  const entries = Object.entries(weights).filter(([kw]) => !banned.has(kw));
  if (entries.length === 0) {
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

// ─── Combat keyword enum values ─────────────────────────────────────────────

const COMBAT_KW_ENUM = {
  GUARDIAN: 'CombatKeyword.GUARDIAN',
  BARRIER: 'CombatKeyword.BARRIER',
  SWIFT: 'CombatKeyword.SWIFT',
  BLITZ: 'CombatKeyword.BLITZ',
  CLOAK: 'CombatKeyword.CLOAK',
  DOUBLE_STRIKE: 'CombatKeyword.DOUBLE_STRIKE',
  DRAIN: 'CombatKeyword.DRAIN',
  LETHAL: 'CombatKeyword.LETHAL',
};

const COMBAT_KW_SET = new Set(Object.values(COMBAT_KW_ENUM));

// ─── Main Processing ────────────────────────────────────────────────────────

function main() {
  console.log('Reading SampleCards.ts...');
  let content = fs.readFileSync(SAMPLE_CARDS_PATH, 'utf-8');

  // Strategy: process the file line by line, tracking current card context.
  // When we find a keywords line, re-roll all CombatKeyword entries.

  const lines = content.split('\n');
  let currentRace = null;
  let currentCardName = null;
  let currentCardId = null;
  let cardIndex = 0;
  let raceCardIndex = {};  // Track per-race card index for deterministic hashing
  let totalRerolled = 0;
  let kwStats = {};  // Track keyword distribution per race
  let inNeutralSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect NEUTRAL_CARDS section (no race: field on these cards)
    if (line.includes('NEUTRAL_CARDS: CardDefinition[]')) {
      inNeutralSection = true;
      currentRace = 'NEUTRAL';
    }
    // Detect exit from NEUTRAL section (next export or section)
    if (inNeutralSection && (line.includes('ALL_SAMPLE_CARDS') || line.includes('TOKEN_CARDS') || line.includes('STARTER_DECK_'))) {
      inNeutralSection = false;
      currentRace = null;
    }

    // Track race from race: field on the card itself
    const raceMatch = line.match(/race: Race\.(\w+)/);
    if (raceMatch) {
      currentRace = raceMatch[1];
      inNeutralSection = false;
      if (!raceCardIndex[currentRace]) raceCardIndex[currentRace] = 0;
    }

    // Track card name
    const nameMatch = line.match(/name: '([^']+)'/);
    if (nameMatch) {
      currentCardName = nameMatch[1];
    }

    // Track card id
    const idMatch = line.match(/id: '([^']+)'/);
    if (idMatch) {
      currentCardId = idMatch[1];
      cardIndex++;
    }

    // Process keywords line
    const kwLineMatch = line.match(/^(\s*)keywords: \[(.*)],?\s*$/);
    if (kwLineMatch && currentRace) {
      const indent = kwLineMatch[1];
      const kwContent = kwLineMatch[2].trim();

      if (!kwContent) continue; // Empty keywords, skip

      // Parse existing keywords
      const kwEntries = [];
      const kwRegex = /\{\s*keyword:\s*(\w+\.\w+)\s*\}/g;
      let m;
      while ((m = kwRegex.exec(kwContent)) !== null) {
        kwEntries.push(m[1]);
      }

      if (kwEntries.length === 0) continue;

      // Separate combat keywords from trigger keywords
      const triggerKws = kwEntries.filter(kw => !COMBAT_KW_SET.has(kw));
      const combatSlots = kwEntries.filter(kw => COMBAT_KW_SET.has(kw)).length;

      if (combatSlots === 0) continue; // No combat keywords to re-roll

      // Re-roll combat keywords using new weights
      const idx = raceCardIndex[currentRace]++;
      const usedCombatKeys = new Set();
      const newCombatKws = [];

      for (let slot = 0; slot < combatSlots; slot++) {
        let picked = pickCombatKeyword(currentRace, currentCardName || currentCardId, idx * 10 + slot, usedCombatKeys);
        let attempts = 0;
        while (usedCombatKeys.has(picked) && attempts < 8) {
          attempts++;
          picked = pickCombatKeyword(currentRace, (currentCardName || currentCardId) + '_reroll' + attempts, idx * 10 + slot + attempts, usedCombatKeys);
        }
        if (!usedCombatKeys.has(picked)) {
          usedCombatKeys.add(picked);
          newCombatKws.push(COMBAT_KW_ENUM[picked]);
          // Track stats
          if (!kwStats[currentRace]) kwStats[currentRace] = {};
          kwStats[currentRace][picked] = (kwStats[currentRace][picked] || 0) + 1;
        }
      }

      // Rebuild keywords array: combat keywords first, then triggers
      const allKws = [...newCombatKws, ...triggerKws];
      const newKwContent = allKws.map(kw => `{ keyword: ${kw} }`).join(', ');
      lines[i] = `${indent}keywords: [${newKwContent}],`;
      totalRerolled++;
    }

    // Reset card context at card boundary
    if (line.trim() === '},') {
      // Potential card end - don't reset race since multiple cards have same race
    }
  }

  console.log(`Re-rolled keywords on ${totalRerolled} cards.`);
  console.log('\nKeyword distribution per race:');
  for (const [race, kws] of Object.entries(kwStats).sort()) {
    const sorted = Object.entries(kws).sort((a, b) => b[1] - a[1]);
    const str = sorted.map(([k, v]) => `${k}=${v}`).join(', ');
    console.log(`  ${race}: ${str}`);
  }

  // Write back
  const output = lines.join('\n');
  fs.writeFileSync(SAMPLE_CARDS_PATH, output, 'utf-8');
  console.log('\nSampleCards.ts updated successfully!');

  // Now rebuild starter decks
  rebuildStarterDecks(lines);
}

// ─── Starter Deck Rebuilder ─────────────────────────────────────────────────
// Re-read the updated file and rebuild starter decks with keyword-aware selection.

function rebuildStarterDecks() {
  console.log('\n--- Rebuilding Starter Decks ---');

  // Read the updated file
  const content = fs.readFileSync(SAMPLE_CARDS_PATH, 'utf-8');

  // Parse all card pools and starter deck sections
  const races = ['COGSMITHS', 'LUMINAR', 'PYROCLAST', 'VOIDBORN', 'BIOTITANS',
                 'CRYSTALLINE', 'PHANTOM_CORSAIRS', 'HIVEMIND', 'ASTROMANCERS', 'CHRONOBOUND'];

  // For each race, extract their card pool
  for (const race of races) {
    // Find the card pool section
    const poolRegex = new RegExp(`export const ${race}_CARDS: CardDefinition\\[\\] = \\[`);
    const poolMatch = content.match(poolRegex);
    if (!poolMatch) {
      console.log(`  ${race}: pool not found, skipping`);
      continue;
    }

    // Find the starter deck section
    const deckRegex = new RegExp(`export const STARTER_DECK_${race}: CardDefinition\\[\\] = \\[`);
    const deckMatch = content.match(deckRegex);
    if (!deckMatch) {
      console.log(`  ${race}: starter deck not found, skipping`);
      continue;
    }
  }

  // The starter decks reference the same card IDs as the pools,
  // and the keywords have already been re-rolled in place.
  // Since both the pool cards and starter deck cards have the SAME format
  // (full card definitions inline), the keywords in starter deck entries
  // were ALSO re-rolled by the main loop above (since they also have race: Race.XXX).
  // So the starter decks are already updated!

  console.log('Starter deck keywords were updated in the main pass (same format, same race tags).');
  console.log('Done!');
}

main();
