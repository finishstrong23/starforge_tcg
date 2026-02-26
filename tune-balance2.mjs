#!/usr/bin/env node
/**
 * tune-balance2.mjs — Round 2 of keyword balancing
 * 
 * Round 2 results:
 * ASTROMANCERS 72.0% → nerf harder (remove more DOUBLE_STRIKE and BLITZ)
 * CHRONOBOUND 67.8% → nerf harder (remove more LETHAL stacking)
 * HIVEMIND 63.4% → slight nerf
 * PYROCLAST 57.6% → slight nerf
 * PHANTOM_CORSAIRS 47.1% → ok
 * CRYSTALLINE 46.1% → slight buff
 * COGSMITHS 41.4% → needs buff
 * VOIDBORN 40.9% → needs buff  
 * BIOTITANS 34.7% → needs more buff
 * LUMINAR 28.7% → needs major buff
 */

import { readFileSync, writeFileSync } from 'fs';

const FILE = 'src/data/SampleCards.ts';
let src = readFileSync(FILE, 'utf8');

function expandKw(kwStr) {
  const items = kwStr.slice(1, -1).split(',').map(s => s.trim().replace(/'/g, ''));
  return items.map(k => {
    if (k.startsWith('T:')) return `{ keyword: TriggerKeyword.${k.slice(2)} }`;
    return `{ keyword: CombatKeyword.${k} }`;
  }).join(', ');
}

function applyFixes(fixes, raceName) {
  let count = 0;
  for (const fix of fixes) {
    const idx = src.indexOf(fix.from);
    if (idx === -1) { console.log(`  WARN: ${fix.from} not found`); continue; }
    const region = src.substring(idx, idx + 500);
    const kwOld = `[${expandKw(fix.kw_from)}]`;
    const kwNew = `[${expandKw(fix.kw_to)}]`;
    const kwIdx = region.indexOf(kwOld);
    if (kwIdx === -1) { console.log(`  WARN: keywords not found near ${fix.from}`); continue; }
    const gIdx = idx + kwIdx;
    src = src.substring(0, gIdx) + kwNew + src.substring(gIdx + kwOld.length);
    count++;
  }
  console.log(`  ${raceName}: ${count} fixes`);
}

// ASTROMANCERS: 72% → remove more keywords
applyFixes([
  { from: "id: 'astro_m1',", kw_from: "['DOUBLE_STRIKE']", kw_to: "['SWIFT']" },
  { from: "id: 'astro_m5',", kw_from: "['DOUBLE_STRIKE', 'T:DEPLOY']", kw_to: "['SWIFT', 'T:DEPLOY']" },
  { from: "id: 'astro_m13',", kw_from: "['DOUBLE_STRIKE', 'DRAIN', 'T:DEPLOY']", kw_to: "['DRAIN', 'T:DEPLOY']" },
  { from: "id: 'astro_m16',", kw_from: "['DOUBLE_STRIKE', 'DRAIN', 'SWIFT']", kw_to: "['DRAIN', 'SWIFT']" },
  { from: "id: 'astro_m17',", kw_from: "['DOUBLE_STRIKE', 'BARRIER', 'T:DEPLOY']", kw_to: "['BARRIER', 'T:DEPLOY']" },
  { from: "id: 'astro_m22',", kw_from: "['DOUBLE_STRIKE', 'DRAIN', 'BARRIER', 'SWIFT', 'T:DEPLOY']", kw_to: "['DRAIN', 'BARRIER', 'SWIFT', 'T:DEPLOY']" },
], 'ASTROMANCERS');

// CHRONOBOUND: 67.8% → remove more offensive keywords
applyFixes([
  { from: "id: 'chrono_m6',", kw_from: "['DRAIN', 'BLITZ']", kw_to: "['DRAIN']" },
  { from: "id: 'chrono_m10',", kw_from: "['BLITZ', 'DRAIN']", kw_to: "['DRAIN']" },
  { from: "id: 'chrono_m11',", kw_from: "['LETHAL', 'SWIFT', 'T:DEPLOY']", kw_to: "['SWIFT', 'T:DEPLOY']" },
  { from: "id: 'chrono_m13',", kw_from: "['LETHAL', 'DRAIN', 'T:DEPLOY']", kw_to: "['DRAIN', 'T:DEPLOY']" },
  { from: "id: 'chrono_m16',", kw_from: "['BARRIER', 'DRAIN', 'LETHAL', 'T:DEPLOY']", kw_to: "['BARRIER', 'DRAIN', 'T:DEPLOY']" },
  { from: "id: 'chrono_m18',", kw_from: "['LETHAL', 'BARRIER', 'DRAIN', 'T:DEPLOY']", kw_to: "['BARRIER', 'DRAIN', 'T:DEPLOY']" },
], 'CHRONOBOUND');

// HIVEMIND: 63.4% → reduce some LETHAL
applyFixes([
  { from: "id: 'hive_m2',", kw_from: "['LETHAL']", kw_to: "['SWIFT']" },
  { from: "id: 'hive_m15',", kw_from: "['DRAIN', 'LETHAL', 'T:DEPLOY']", kw_to: "['DRAIN', 'T:DEPLOY']" },
  { from: "id: 'hive_m18',", kw_from: "['DRAIN', 'LETHAL', 'T:DEPLOY']", kw_to: "['DRAIN', 'T:DEPLOY']" },
], 'HIVEMIND');

// PYROCLAST: 57.6% → reduce a bit
applyFixes([
  { from: "id: 'pyro_m9',", kw_from: "['BLITZ', 'DOUBLE_STRIKE']", kw_to: "['BLITZ']" },
  { from: "id: 'pyro_m16',", kw_from: "['BLITZ', 'DOUBLE_STRIKE', 'T:DEPLOY']", kw_to: "['BLITZ', 'T:DEPLOY']" },
], 'PYROCLAST');

// LUMINAR: 28.7% → add more offense aggressively
applyFixes([
  { from: "id: 'lum_m3',", kw_from: "['SWIFT']", kw_to: "['BLITZ', 'DOUBLE_STRIKE']" },
  { from: "id: 'lum_m6',", kw_from: "['GUARDIAN', 'T:DEPLOY']", kw_to: "['BLITZ', 'DRAIN', 'T:DEPLOY']" },
  { from: "id: 'lum_m9',", kw_from: "['GUARDIAN', 'BARRIER', 'T:DEPLOY']", kw_to: "['BLITZ', 'DRAIN', 'T:DEPLOY']" },
  { from: "id: 'lum_m10',", kw_from: "['DRAIN', 'SWIFT']", kw_to: "['BLITZ', 'DRAIN', 'DOUBLE_STRIKE']" },
  { from: "id: 'lum_m13',", kw_from: "['GUARDIAN', 'DRAIN', 'T:DEPLOY']", kw_to: "['BLITZ', 'DRAIN', 'DOUBLE_STRIKE', 'T:DEPLOY']" },
  { from: "id: 'lum_m16',", kw_from: "['GUARDIAN', 'DRAIN', 'BARRIER', 'T:DEPLOY']", kw_to: "['BLITZ', 'DRAIN', 'DOUBLE_STRIKE', 'T:DEPLOY']" },
  { from: "id: 'lum_m17',", kw_from: "['GUARDIAN', 'SWIFT', 'T:DEPLOY']", kw_to: "['BLITZ', 'DRAIN', 'T:DEPLOY']" },
  { from: "id: 'lum_m19',", kw_from: "['BARRIER', 'DRAIN', 'T:DEPLOY']", kw_to: "['BLITZ', 'DRAIN', 'DOUBLE_STRIKE', 'T:DEPLOY']" },
  { from: "id: 'lum_m21',", kw_from: "['GUARDIAN', 'BARRIER', 'DRAIN', 'SWIFT', 'T:DEPLOY']", kw_to: "['BLITZ', 'DRAIN', 'DOUBLE_STRIKE', 'SWIFT', 'T:DEPLOY']" },
], 'LUMINAR');

// BIOTITANS: 34.7% → more offense
applyFixes([
  { from: "id: 'bio_m1',", kw_from: "['SWIFT']", kw_to: "['BLITZ', 'DRAIN']" },
  { from: "id: 'bio_m4',", kw_from: "['DOUBLE_STRIKE']", kw_to: "['DOUBLE_STRIKE', 'DRAIN']" },
  { from: "id: 'bio_m8',", kw_from: "['DRAIN', 'T:DEPLOY']", kw_to: "['DRAIN', 'BLITZ', 'T:DEPLOY']" },
  { from: "id: 'bio_m9',", kw_from: "['DOUBLE_STRIKE', 'DRAIN']", kw_to: "['DOUBLE_STRIKE', 'DRAIN', 'BLITZ']" },
  { from: "id: 'bio_m14',", kw_from: "['DOUBLE_STRIKE', 'DRAIN']", kw_to: "['DOUBLE_STRIKE', 'DRAIN', 'BLITZ']" },
  { from: "id: 'bio_m18',", kw_from: "['GUARDIAN', 'DOUBLE_STRIKE', 'DRAIN', 'T:DEPLOY']", kw_to: "['BLITZ', 'DOUBLE_STRIKE', 'DRAIN', 'T:DEPLOY']" },
], 'BIOTITANS');

// COGSMITHS: 41.4% → add more BLITZ
applyFixes([
  { from: "id: 'cog_m1',", kw_from: "['BARRIER']", kw_to: "['BLITZ', 'DRAIN']" },
  { from: "id: 'cog_m7',", kw_from: "['DRAIN']", kw_to: "['DRAIN', 'BLITZ']" },
  { from: "id: 'cog_m15',", kw_from: "['BARRIER', 'DRAIN']", kw_to: "['BLITZ', 'DRAIN', 'DOUBLE_STRIKE']" },
  { from: "id: 'cog_m16',", kw_from: "['SWIFT', 'BARRIER', 'T:DEPLOY']", kw_to: "['BLITZ', 'DRAIN', 'T:DEPLOY']" },
  { from: "id: 'cog_m19',", kw_from: "['GUARDIAN', 'BARRIER', 'T:DEPLOY']", kw_to: "['BLITZ', 'DRAIN', 'T:DEPLOY']" },
], 'COGSMITHS');

// VOIDBORN: 40.9% → add some offense
applyFixes([
  { from: "id: 'void_m3',", kw_from: "['DRAIN']", kw_to: "['DRAIN', 'DOUBLE_STRIKE']" },
  { from: "id: 'void_m11',", kw_from: "['BARRIER', 'DRAIN']", kw_to: "['DOUBLE_STRIKE', 'DRAIN']" },
  { from: "id: 'void_m16',", kw_from: "['CLOAK', 'DRAIN', 'SWIFT']", kw_to: "['BLITZ', 'DRAIN', 'SWIFT']" },
], 'VOIDBORN');

writeFileSync(FILE, src);
console.log('\nDone!');
