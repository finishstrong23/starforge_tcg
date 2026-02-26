/**
 * STARFORGE TCG - Stat Adjuster
 *
 * Adjusts minion health/attack in STARTER_DECK sections to balance win rates.
 * Positive bias = buff (add health), negative bias = nerf (remove health).
 *
 * Usage: node adjust-stats.mjs
 */

import fs from 'fs';
import path from 'path';

const SAMPLE_CARDS_PATH = path.join('src', 'data', 'SampleCards.ts');

// Stat adjustment biases: positive = buff, negative = nerf
// Each point = 1 stat point (health) distributed across starter deck minions.
// Round 2 adjustments (applied on top of baked-in biases from card generation)
const STAT_ADJUSTMENTS = {
  COGSMITHS:          0,  // 57.0% → fine now
  LUMINAR:            0,  // 52.1% → fine
  PYROCLAST:        -12,  // 61.6% → slightly high
  VOIDBORN:          30,  // 35.4% → needs buff (CLOAK is weak keyword)
  BIOTITANS:        -12,  // 62.3% → slightly high
  CRYSTALLINE:        0,  // 53.6% → fine
  PHANTOM_CORSAIRS:  15,  // 41.7% → needs buff
  HIVEMIND:           5,  // 46.8% → slight buff
  ASTROMANCERS:       0,  // 56.4% → fine
  CHRONOBOUND:       30,  // 29.8% → needs significant buff
};

function main() {
  console.log('Reading SampleCards.ts...');
  let content = fs.readFileSync(SAMPLE_CARDS_PATH, 'utf-8');
  const lines = content.split('\n');

  let inStarterDeck = null;  // Current race of starter deck being processed
  let minionLines = [];      // Collect {lineIdx, field} for current card
  let currentCardIsMinion = false;
  let adjustments = {};

  // First pass: identify all starter deck sections and their minion health/attack lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect starter deck section start
    const deckMatch = line.match(/STARTER_DECK_(\w+): CardDefinition\[\] = \[/);
    if (deckMatch) {
      inStarterDeck = deckMatch[1];
      if (!adjustments[inStarterDeck]) {
        adjustments[inStarterDeck] = { healthLines: [], attackLines: [] };
      }
      continue;
    }

    // Detect end of starter deck section (next export or end of array)
    if (inStarterDeck && (line.match(/^export /) || line.match(/^\/\/ ={10,}/))) {
      inStarterDeck = null;
      continue;
    }

    if (!inStarterDeck) continue;

    // Track health and attack lines for minions (cards that have both attack: and health:)
    const healthMatch = line.match(/^(\s*)health: (\d+),/);
    if (healthMatch) {
      adjustments[inStarterDeck].healthLines.push({
        lineIdx: i,
        indent: healthMatch[1],
        value: parseInt(healthMatch[2]),
      });
    }

    const attackMatch = line.match(/^(\s*)attack: (\d+),/);
    if (attackMatch) {
      adjustments[inStarterDeck].attackLines.push({
        lineIdx: i,
        indent: attackMatch[1],
        value: parseInt(attackMatch[2]),
      });
    }
  }

  // Second pass: apply stat adjustments
  for (const [race, bias] of Object.entries(STAT_ADJUSTMENTS)) {
    if (bias === 0) continue;

    const raceData = adjustments[race];
    if (!raceData || raceData.healthLines.length === 0) {
      console.log(`  ${race}: no health lines found, skipping`);
      continue;
    }

    // Only adjust minion health (cards that have both attack and health)
    const healthEntries = raceData.healthLines;
    const direction = bias > 0 ? 1 : -1;
    let remaining = Math.abs(bias);

    // Sort by value: buff lowest first, nerf highest first
    const sorted = [...healthEntries].sort((a, b) =>
      direction > 0 ? a.value - b.value : b.value - a.value
    );

    // Distribute adjustments across minions, cycling if needed
    let adjustCount = 0;
    let pass = 0;
    while (remaining > 0 && pass < 5) {
      for (const entry of sorted) {
        if (remaining <= 0) break;

        const newVal = entry.value + direction;
        if (newVal < 1) continue;  // Don't go below 1 health
        if (newVal > 15) continue; // Don't go above 15 health

        entry.value = newVal;
        lines[entry.lineIdx] = `${entry.indent}health: ${newVal},`;
        remaining--;
        adjustCount++;
      }
      pass++;
    }

    console.log(`  ${race}: ${direction > 0 ? '+' : ''}${bias} bias → adjusted ${adjustCount} stat points across ${healthEntries.length} minions`);
  }

  // Write back
  fs.writeFileSync(SAMPLE_CARDS_PATH, lines.join('\n'), 'utf-8');
  console.log('\nStat adjustments applied to SampleCards.ts!');
}

main();
