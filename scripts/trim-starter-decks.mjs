#!/usr/bin/env node
/**
 * Trims specified STARTER_DECK_<KEY> arrays in src/data/SampleCards.ts
 * down to exactly N cards (keeps the first N, drops the rest).
 *
 * Usage: node scripts/trim-starter-decks.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const FILE = path.join(repoRoot, 'src/data/SampleCards.ts');
const TARGET = 25;
const DECKS_TO_TRIM = ['COGSMITHS', 'LUMINAR', 'PYROCLAST', 'PHANTOM_CORSAIRS'];

let src = fs.readFileSync(FILE, 'utf8');

function trimDeck(source, key, target) {
  const header = `export const STARTER_DECK_${key}: CardDefinition[] = [`;
  const headerIdx = source.indexOf(header);
  if (headerIdx === -1) {
    throw new Error(`Could not find STARTER_DECK_${key} in source`);
  }
  // Find the closing `];` that terminates this array at depth 0.
  let depth = 1;
  let i = headerIdx + header.length;
  while (i < source.length && depth > 0) {
    const ch = source[i];
    if (ch === '[') depth++;
    else if (ch === ']') depth--;
    if (depth === 0) break;
    i++;
  }
  if (depth !== 0) throw new Error(`Unterminated array for ${key}`);
  const closingIdx = i; // position of the final ]

  // Body is everything between the [ and the final ].
  const bodyStart = headerIdx + header.length;
  const body = source.slice(bodyStart, closingIdx);

  // Each card is one line beginning with `  {`.
  // We only want to count top-level card lines — lines starting with `  {`
  // at column 0 (two spaces + `{`).
  const lines = body.split('\n');
  let cardCount = 0;
  let cutLineIdx = -1;
  for (let idx = 0; idx < lines.length; idx++) {
    if (/^  \{/.test(lines[idx])) {
      cardCount++;
      if (cardCount === target) {
        cutLineIdx = idx; // keep this line
        break;
      }
    }
  }
  if (cutLineIdx === -1) {
    console.log(`  ${key}: only ${cardCount} cards, no trim needed`);
    return source;
  }

  // Count original total cards for reporting.
  const originalTotal = (body.match(/^  \{/gm) || []).length;
  if (originalTotal <= target) {
    console.log(`  ${key}: ${originalTotal} cards, already at or below ${target}`);
    return source;
  }

  // Keep lines[0..cutLineIdx]. Everything after becomes just a blank closing.
  const keptLines = lines.slice(0, cutLineIdx + 1);
  // Reassemble: keptLines joined by \n, then a newline before the closing `]`.
  const newBody = keptLines.join('\n') + '\n';
  const newSource =
    source.slice(0, bodyStart) + newBody + source.slice(closingIdx);
  console.log(`  ${key}: trimmed ${originalTotal} -> ${target}`);
  return newSource;
}

console.log(`Trimming starter decks to ${TARGET} cards each:`);
for (const key of DECKS_TO_TRIM) {
  src = trimDeck(src, key, TARGET);
}

fs.writeFileSync(FILE, src);
console.log(`\nWrote ${FILE}`);
