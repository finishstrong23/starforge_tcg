#!/usr/bin/env node
/**
 * tune-balance4.mjs — Fine-tune: bring LUMINAR up, nudge ASTROMANCERS down
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
    if (kwIdx === -1) { console.log(`  WARN: kw not found near ${fix.from}`); continue; }
    const gIdx = idx + kwIdx;
    src = src.substring(0, gIdx) + kwNew + src.substring(gIdx + kwOld.length);
    count++;
  }
  console.log(`  ${raceName}: ${count} fixes`);
}

// LUMINAR 39% → needs DOUBLE_STRIKE on more minions for offense
applyFixes([
  { from: "id: 'lum_m5',", kw_from: "['BLITZ', 'DRAIN']", kw_to: "['BLITZ', 'DRAIN', 'DOUBLE_STRIKE']" },
  { from: "id: 'lum_m7',", kw_from: "['BLITZ', 'DRAIN']", kw_to: "['BLITZ', 'DRAIN', 'DOUBLE_STRIKE']" },
], 'LUMINAR');

// ASTROMANCERS 59% → nudge down slightly
applyFixes([
  { from: "id: 'astro_m7',", kw_from: "['SWIFT']", kw_to: "['GUARDIAN']" },
  { from: "id: 'astro_m15',", kw_from: "['BARRIER', 'DRAIN']", kw_to: "['GUARDIAN', 'DRAIN']" },
], 'ASTROMANCERS');

// COGSMITHS 44% → slight buff
applyFixes([
  { from: "id: 'cog_m6',", kw_from: "['SWIFT', 'T:DEPLOY']", kw_to: "['BLITZ', 'DRAIN', 'T:DEPLOY']" },
], 'COGSMITHS');

writeFileSync(FILE, src);
console.log('\nDone!');
