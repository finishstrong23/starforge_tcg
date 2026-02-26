#!/usr/bin/env node
/**
 * tune-balance.mjs — Adjust keyword distribution for balance
 * 
 * Balance insights from testing:
 * - DRAIN is the great equalizer (~50% correlates with high DRAIN density)
 * - DOUBLE_STRIKE + LETHAL + BLITZ combo is too strong when stacked
 * - GUARDIAN/BARRIER alone without offense = too passive
 * - Stat changes barely matter, keywords drive 98% of balance
 *
 * Current results (round 1):
 * CHRONOBOUND 77.8% — too many LETHAL+DOUBLE_STRIKE+DRAIN+BLITZ stacked
 * ASTROMANCERS 73.2% — too many DOUBLE_STRIKE+BARRIER+DRAIN stacked  
 * HIVEMIND 71.8% — lots of tokens + LETHAL + DRAIN
 * PYROCLAST 56.7% — aggressive BLITZ+DS ok
 * CRYSTALLINE 46.2% — ok-ish, too defensive
 * PHANTOM_CORSAIRS 45.9% — ok-ish, CLOAK not as impactful
 * VOIDBORN 40.6% — CLOAK + DRAIN but not enough offense
 * COGSMITHS 36.5% — too defensive
 * BIOTITANS 32.4% — too defensive
 * LUMINAR 17.3% — way too much healing, not enough offense
 *
 * Strategy: Give weaker decks more BLITZ and DOUBLE_STRIKE, reduce from strong decks.
 * Add more DRAIN to weak decks. Remove some keyword stacking from top decks.
 */

import { readFileSync, writeFileSync } from 'fs';

const FILE = 'src/data/SampleCards.ts';
let src = readFileSync(FILE, 'utf8');

// ============================================================================
// KEYWORD SWAP RULES per race (to balance)
// ============================================================================

// LUMINAR (17.3% → needs massive offensive boost)
// Replace some GUARDIAN with BLITZ, add DOUBLE_STRIKE
const LUMINAR_FIXES = [
  // Give some minions BLITZ instead of extra GUARDIAN
  { from: "id: 'lum_m1',", kw_from: "['GUARDIAN']", kw_to: "['BLITZ', 'DRAIN']" },
  { from: "id: 'lum_m4',", kw_from: "['DRAIN']", kw_to: "['DOUBLE_STRIKE', 'DRAIN']" },
  { from: "id: 'lum_m5',", kw_from: "['GUARDIAN', 'DRAIN']", kw_to: "['BLITZ', 'DRAIN']" },
  { from: "id: 'lum_m7',", kw_from: "['DRAIN']", kw_to: "['BLITZ', 'DRAIN']" },
  { from: "id: 'lum_m8',", kw_from: "['GUARDIAN', 'BARRIER']", kw_to: "['GUARDIAN', 'DOUBLE_STRIKE', 'DRAIN']" },
  { from: "id: 'lum_m11',", kw_from: "['GUARDIAN', 'DRAIN']", kw_to: "['BLITZ', 'DRAIN', 'GUARDIAN']" },
  { from: "id: 'lum_m15',", kw_from: "['GUARDIAN', 'BARRIER']", kw_to: "['GUARDIAN', 'BLITZ', 'DRAIN']" },
  { from: "id: 'lum_m18',", kw_from: "['GUARDIAN', 'DRAIN', 'SWIFT', 'T:DEPLOY']", kw_to: "['BLITZ', 'DRAIN', 'DOUBLE_STRIKE', 'T:DEPLOY']" },
  { from: "id: 'lum_m20',", kw_from: "['GUARDIAN', 'BARRIER', 'DRAIN', 'T:DEPLOY']", kw_to: "['BLITZ', 'DOUBLE_STRIKE', 'DRAIN', 'T:DEPLOY']" },
];

// BIOTITANS (32.4% → needs offensive boost, less GUARDIAN)
const BIOTITANS_FIXES = [
  { from: "id: 'bio_m2',", kw_from: "['GUARDIAN']", kw_to: "['BLITZ', 'DRAIN']" },
  { from: "id: 'bio_m6',", kw_from: "['GUARDIAN', 'DRAIN']", kw_to: "['DOUBLE_STRIKE', 'DRAIN']" },
  { from: "id: 'bio_m10',", kw_from: "['GUARDIAN', 'BARRIER']", kw_to: "['DOUBLE_STRIKE', 'DRAIN', 'BLITZ']" },
  { from: "id: 'bio_m13',", kw_from: "['GUARDIAN', 'DRAIN', 'T:DEPLOY']", kw_to: "['DOUBLE_STRIKE', 'DRAIN', 'T:DEPLOY']" },
  { from: "id: 'bio_m15',", kw_from: "['GUARDIAN', 'BARRIER', 'T:DEPLOY']", kw_to: "['DOUBLE_STRIKE', 'DRAIN', 'T:DEPLOY']" },
  { from: "id: 'bio_m17',", kw_from: "['GUARDIAN', 'DRAIN', 'BARRIER']", kw_to: "['DOUBLE_STRIKE', 'DRAIN', 'BLITZ']" },
];

// COGSMITHS (36.5% → needs offensive boost, less pure defense)
const COGSMITHS_FIXES = [
  { from: "id: 'cog_m3',", kw_from: "['GUARDIAN']", kw_to: "['BLITZ', 'DRAIN']" },
  { from: "id: 'cog_m5',", kw_from: "['BARRIER', 'GUARDIAN']", kw_to: "['BARRIER', 'DOUBLE_STRIKE', 'DRAIN']" },
  { from: "id: 'cog_m9',", kw_from: "['GUARDIAN', 'DRAIN']", kw_to: "['BLITZ', 'DRAIN']" },
  { from: "id: 'cog_m13',", kw_from: "['GUARDIAN', 'BARRIER', 'T:DEPLOY']", kw_to: "['BLITZ', 'DRAIN', 'T:DEPLOY']" },
  { from: "id: 'cog_m17',", kw_from: "['GUARDIAN', 'DRAIN', 'T:DEPLOY']", kw_to: "['BLITZ', 'DOUBLE_STRIKE', 'DRAIN', 'T:DEPLOY']" },
  { from: "id: 'cog_m21',", kw_from: "['GUARDIAN', 'BARRIER', 'DRAIN', 'T:DEPLOY']", kw_to: "['BLITZ', 'DOUBLE_STRIKE', 'DRAIN', 'T:DEPLOY']" },
];

// VOIDBORN (40.6% → needs a bit more offense)
const VOIDBORN_FIXES = [
  { from: "id: 'void_m7',", kw_from: "['CLOAK']", kw_to: "['CLOAK', 'DRAIN']" },
  { from: "id: 'void_m15',", kw_from: "['BARRIER', 'CLOAK']", kw_to: "['DOUBLE_STRIKE', 'DRAIN', 'CLOAK']" },
  { from: "id: 'void_m20',", kw_from: "['BARRIER', 'DRAIN', 'CLOAK']", kw_to: "['DOUBLE_STRIKE', 'DRAIN', 'CLOAK']" },
];

// CHRONOBOUND (77.8% → too strong, reduce keyword stacking)
const CHRONOBOUND_FIXES = [
  { from: "id: 'chrono_m5',", kw_from: "['LETHAL', 'DOUBLE_STRIKE']", kw_to: "['LETHAL']" },
  { from: "id: 'chrono_m9',", kw_from: "['DOUBLE_STRIKE', 'DRAIN']", kw_to: "['DRAIN']" },
  { from: "id: 'chrono_m12',", kw_from: "['DOUBLE_STRIKE', 'BLITZ']", kw_to: "['BLITZ']" },
  { from: "id: 'chrono_m15',", kw_from: "['DOUBLE_STRIKE', 'DRAIN', 'BLITZ']", kw_to: "['DRAIN', 'BLITZ']" },
  { from: "id: 'chrono_m17',", kw_from: "['DOUBLE_STRIKE', 'DRAIN', 'BLITZ', 'T:DEPLOY']", kw_to: "['DRAIN', 'BLITZ', 'T:DEPLOY']" },
  { from: "id: 'chrono_m19',", kw_from: "['DOUBLE_STRIKE', 'LETHAL', 'DRAIN', 'BLITZ', 'T:DEPLOY']", kw_to: "['DRAIN', 'BLITZ', 'T:DEPLOY']" },
];

// ASTROMANCERS (73.2% → too strong, reduce DOUBLE_STRIKE stacking)
const ASTROMANCERS_FIXES = [
  { from: "id: 'astro_m9',", kw_from: "['DOUBLE_STRIKE', 'DRAIN']", kw_to: "['DRAIN']" },
  { from: "id: 'astro_m12',", kw_from: "['DOUBLE_STRIKE', 'SWIFT']", kw_to: "['SWIFT']" },
  { from: "id: 'astro_m14',", kw_from: "['BLITZ', 'DOUBLE_STRIKE']", kw_to: "['BLITZ']" },
  { from: "id: 'astro_m19',", kw_from: "['DOUBLE_STRIKE', 'BARRIER', 'DRAIN', 'T:DEPLOY']", kw_to: "['BARRIER', 'DRAIN', 'T:DEPLOY']" },
  { from: "id: 'astro_m21',", kw_from: "['DOUBLE_STRIKE', 'BARRIER', 'DRAIN', 'BLITZ', 'T:DEPLOY']", kw_to: "['BARRIER', 'DRAIN', 'T:DEPLOY']" },
];

// HIVEMIND (71.8% → too strong, reduce keyword density)
const HIVEMIND_FIXES = [
  { from: "id: 'hive_m10',", kw_from: "['BLITZ', 'DOUBLE_STRIKE', 'T:LAST_WORDS']", kw_to: "['BLITZ', 'T:LAST_WORDS']" },
  { from: "id: 'hive_m12',", kw_from: "['BLITZ', 'DRAIN', 'T:LAST_WORDS']", kw_to: "['DRAIN', 'T:LAST_WORDS']" },
  { from: "id: 'hive_m19',", kw_from: "['DRAIN', 'LETHAL', 'DOUBLE_STRIKE', 'T:DEPLOY']", kw_to: "['DRAIN', 'T:DEPLOY']" },
];

// Apply fixes
function expandKw(kwStr) {
  // Parse "['BLITZ', 'DRAIN', 'T:DEPLOY']" → keyword array string
  const items = kwStr.slice(1, -1).split(',').map(s => s.trim().replace(/'/g, ''));
  return items.map(k => {
    if (k.startsWith('T:')) return `{ keyword: TriggerKeyword.${k.slice(2)} }`;
    return `{ keyword: CombatKeyword.${k} }`;
  }).join(', ');
}

function applyFixes(fixes, raceName) {
  let count = 0;
  for (const fix of fixes) {
    const cardIdLine = fix.from;
    const idx = src.indexOf(cardIdLine);
    if (idx === -1) {
      console.log(`  WARN: Could not find ${cardIdLine}`);
      continue;
    }
    
    // Find the keywords line near this card
    const searchRegion = src.substring(idx, idx + 500);
    const kwOld = `[${expandKw(fix.kw_from)}]`;
    const kwNew = `[${expandKw(fix.kw_to)}]`;
    
    const kwIdx = searchRegion.indexOf(kwOld);
    if (kwIdx === -1) {
      console.log(`  WARN: Could not find keywords ${kwOld} near ${cardIdLine}`);
      continue;
    }
    
    // Replace just this occurrence
    const globalIdx = idx + kwIdx;
    src = src.substring(0, globalIdx) + kwNew + src.substring(globalIdx + kwOld.length);
    count++;
  }
  console.log(`  ${raceName}: ${count} keyword fixes applied`);
}

console.log('Applying balance fixes...\n');

applyFixes(LUMINAR_FIXES, 'LUMINAR');
applyFixes(BIOTITANS_FIXES, 'BIOTITANS');
applyFixes(COGSMITHS_FIXES, 'COGSMITHS');
applyFixes(VOIDBORN_FIXES, 'VOIDBORN');
applyFixes(CHRONOBOUND_FIXES, 'CHRONOBOUND');
applyFixes(ASTROMANCERS_FIXES, 'ASTROMANCERS');
applyFixes(HIVEMIND_FIXES, 'HIVEMIND');

writeFileSync(FILE, src);
console.log('\nDone! Re-run balance test to check.');
