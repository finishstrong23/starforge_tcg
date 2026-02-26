#!/usr/bin/env node
/**
 * tune-balance3.mjs — Round 3: Focus on ASTROMANCERS nerf + LUMINAR/COGSMITHS buff
 *
 * Current: ASTROMANCERS 67.3% (too high), LUMINAR 40.1%, COGSMITHS 42.4%
 * Everyone else is 46-54% — pretty good!
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
    if (kwIdx === -1) { console.log(`  WARN: kw not found near ${fix.from}: ${kwOld}`); continue; }
    const gIdx = idx + kwIdx;
    src = src.substring(0, gIdx) + kwNew + src.substring(gIdx + kwOld.length);
    count++;
  }
  console.log(`  ${raceName}: ${count} fixes`);
}

// ASTROMANCERS 67.3% → remove more offensive keywords, add defensive
applyFixes([
  { from: "id: 'astro_m4',", kw_from: "['BLITZ', 'T:DEPLOY']", kw_to: "['SWIFT', 'T:DEPLOY']" },
  { from: "id: 'astro_m6',", kw_from: "['BARRIER', 'BLITZ']", kw_to: "['BARRIER']" },
  { from: "id: 'astro_m10',", kw_from: "['BLITZ', 'T:DEPLOY']", kw_to: "['SWIFT', 'T:DEPLOY']" },
  { from: "id: 'astro_m18',", kw_from: "['BLITZ', 'DRAIN', 'T:DEPLOY']", kw_to: "['DRAIN', 'T:DEPLOY']" },
  { from: "id: 'astro_m20',", kw_from: "['DOUBLE_STRIKE', 'BLITZ', 'T:DEPLOY']", kw_to: "['SWIFT', 'T:DEPLOY']" },
], 'ASTROMANCERS');

// LUMINAR 40.1% → add a bit more
applyFixes([
  { from: "id: 'lum_m2',", kw_from: "['DRAIN', 'T:DEPLOY']", kw_to: "['DRAIN', 'BLITZ', 'T:DEPLOY']" },
  { from: "id: 'lum_m12',", kw_from: "['SWIFT', 'T:DEPLOY']", kw_to: "['BLITZ', 'DRAIN', 'T:DEPLOY']" },
  { from: "id: 'lum_m14',", kw_from: "['BARRIER', 'DRAIN', 'T:DEPLOY']", kw_to: "['BLITZ', 'DRAIN', 'T:DEPLOY']" },
], 'LUMINAR');

// COGSMITHS 42.4% → add more offense
applyFixes([
  { from: "id: 'cog_m4',", kw_from: "['SWIFT']", kw_to: "['BLITZ', 'DRAIN']" },
  { from: "id: 'cog_m11',", kw_from: "['BARRIER', 'T:DEPLOY']", kw_to: "['BLITZ', 'DRAIN', 'T:DEPLOY']" },
  { from: "id: 'cog_m12',", kw_from: "['DRAIN', 'T:DEPLOY']", kw_to: "['DRAIN', 'BLITZ', 'T:DEPLOY']" },
], 'COGSMITHS');

writeFileSync(FILE, src);
console.log('\nDone!');
