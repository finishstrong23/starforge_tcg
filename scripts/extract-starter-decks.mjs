#!/usr/bin/env node
/**
 * Extracts the 10 starter decks from src/data/SampleCards.ts and writes
 * a clean, copy/paste-friendly markdown file for the art director.
 *
 * Usage: node scripts/extract-starter-decks.mjs
 * Output: STARTER_DECKS_FOR_ART.md (at repo root)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const src = fs.readFileSync(
  path.join(repoRoot, 'src/data/SampleCards.ts'),
  'utf8'
);

const STARTER_DECKS = [
  { key: 'COGSMITHS', label: 'Cogsmiths' },
  { key: 'LUMINAR', label: 'Luminar' },
  { key: 'PYROCLAST', label: 'Pyroclast' },
  { key: 'VOIDBORN', label: 'Voidborn' },
  { key: 'BIOTITANS', label: 'Biotitans' },
  { key: 'CRYSTALLINE', label: 'Crystalline' },
  { key: 'PHANTOM_CORSAIRS', label: 'Phantom Corsairs' },
  { key: 'HIVEMIND', label: 'Hivemind' },
  { key: 'ASTROMANCERS', label: 'Astromancers' },
  { key: 'CHRONOBOUND', label: 'Chronobound' },
];

// Pull a single field value from a one-line card object literal.
// Handles strings (single or escaped quotes) and bare numbers.
function getField(line, field) {
  // Try string value: field: 'value' or field: "value"
  const strRe = new RegExp(`${field}:\\s*(['"\`])((?:\\\\.|(?!\\1).)*)\\1`);
  const strMatch = line.match(strRe);
  if (strMatch) {
    return strMatch[2].replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  // Try number value: field: 123
  const numRe = new RegExp(`${field}:\\s*(-?\\d+)`);
  const numMatch = line.match(numRe);
  if (numMatch) return numMatch[1];
  return null;
}

// Extract all keyword names from the keywords: [...] array on a card line.
function getKeywords(line) {
  const kwMatch = line.match(/keywords:\s*\[([^\]]*)\]/);
  if (!kwMatch) return [];
  // Match things like { keyword: CombatKeyword.SWIFT }
  const names = [];
  const re = /keyword:\s*\w+\.(\w+)/g;
  let m;
  while ((m = re.exec(kwMatch[1])) !== null) {
    names.push(m[1]);
  }
  return names;
}

// Extract the minion tribe (e.g. MECH, ELEMENTAL) if present.
function getTribe(line) {
  const m = line.match(/tribe:\s*\w+\.(\w+)/);
  return m ? m[1] : null;
}

// Extract card type (MINION, SPELL, STRUCTURE).
function getType(line) {
  const m = line.match(/type:\s*CardType\.(\w+)/);
  return m ? m[1] : null;
}

// Extract rarity.
function getRarity(line) {
  const m = line.match(/rarity:\s*CardRarity\.(\w+)/);
  return m ? m[1] : null;
}

function parseCardLine(line) {
  const id = getField(line, 'id');
  if (!id) return null;
  return {
    id,
    name: getField(line, 'name') || '',
    cost: getField(line, 'cost') || '0',
    type: getType(line),
    rarity: getRarity(line),
    attack: getField(line, 'attack'),
    health: getField(line, 'health'),
    tribe: getTribe(line),
    keywords: getKeywords(line),
    cardText: getField(line, 'cardText') || '',
    flavorText: getField(line, 'flavorText') || '',
  };
}

// Find the block for STARTER_DECK_<KEY> = [ ... ];
function extractDeck(key) {
  const startRe = new RegExp(
    `export const STARTER_DECK_${key}:\\s*CardDefinition\\[\\]\\s*=\\s*\\[`
  );
  const startMatch = src.match(startRe);
  if (!startMatch) return [];
  const startIdx = startMatch.index + startMatch[0].length;
  // Find the matching closing `];` by counting brackets at depth 0.
  let depth = 1;
  let i = startIdx;
  while (i < src.length && depth > 0) {
    const ch = src[i];
    if (ch === '[') depth++;
    else if (ch === ']') depth--;
    if (depth === 0) break;
    i++;
  }
  const block = src.slice(startIdx, i);
  const lines = block.split('\n');
  const cards = [];
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith('{')) continue;
    const card = parseCardLine(line);
    if (card) cards.push(card);
  }
  return cards;
}

function formatCard(card) {
  const parts = [];
  parts.push(`### ${card.name}`);
  const statsLine = [];
  statsLine.push(`**Cost:** ${card.cost}`);
  statsLine.push(`**Type:** ${card.type || '-'}`);
  if (card.attack !== null && card.health !== null) {
    statsLine.push(`**ATK/HP:** ${card.attack}/${card.health}`);
  }
  if (card.tribe) statsLine.push(`**Tribe:** ${card.tribe}`);
  if (card.rarity) statsLine.push(`**Rarity:** ${card.rarity}`);
  parts.push(statsLine.join(' \u00b7 '));
  if (card.keywords.length) {
    parts.push(`**Keywords:** ${card.keywords.join(', ')}`);
  }
  parts.push('');
  if (card.cardText) parts.push(`**Text:** ${card.cardText}`);
  if (card.flavorText) parts.push(`*"${card.flavorText}"*`);
  parts.push('');
  parts.push(`\`id: ${card.id}\``);
  parts.push('');
  parts.push('---');
  return parts.join('\n');
}

const out = [];
out.push('# STARFORGE TCG — Starter Decks (Art Reference)');
out.push('');
out.push(
  'This file contains every card in the 10 faction starter decks, formatted for easy copy/paste handoff to the art team. Source of truth: `src/data/SampleCards.ts`.'
);
out.push('');

let totalCards = 0;
for (const { key, label } of STARTER_DECKS) {
  const cards = extractDeck(key);
  totalCards += cards.length;
  out.push('');
  out.push(`## ${label} Starter Deck (${cards.length} cards)`);
  out.push('');
  for (const card of cards) {
    out.push(formatCard(card));
    out.push('');
  }
}

const outPath = path.join(repoRoot, 'STARTER_DECKS_FOR_ART.md');
fs.writeFileSync(outPath, out.join('\n'));
console.log(`Wrote ${totalCards} cards across ${STARTER_DECKS.length} decks to ${outPath}`);
