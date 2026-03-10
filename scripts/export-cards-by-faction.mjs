#!/usr/bin/env node
/**
 * Export all cards by faction into separate JSON files for art generation.
 *
 * Output: art-export/<FactionName>/cards.json
 *
 * Each card includes fields useful for art prompts:
 *   name, faction, type, tribe, rarity, cost, attack, health,
 *   keywords, cardText, flavorText, artPrompt (blank for you to fill)
 *
 * Usage:
 *   node scripts/export-cards-by-faction.mjs
 *   node scripts/export-cards-by-faction.mjs --outdir my-folder
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SAMPLE_CARDS = path.join(ROOT, 'src/data/SampleCards.ts');

// Parse CLI args
const args = process.argv.slice(2);
let outdir = path.join(ROOT, 'art-export');
const odIdx = args.indexOf('--outdir');
if (odIdx !== -1 && args[odIdx + 1]) {
  outdir = path.resolve(args[odIdx + 1]);
}

// ── Read source ──────────────────────────────────────────────────────────────
const src = fs.readFileSync(SAMPLE_CARDS, 'utf-8');

// ── Enum maps (mirror the TypeScript enums) ──────────────────────────────────
const CardType    = { MINION: 'Minion', SPELL: 'Spell', STRUCTURE: 'Structure' };
const CardRarity  = { COMMON: 'Common', RARE: 'Rare', EPIC: 'Epic', LEGENDARY: 'Legendary' };
const MinionTribe = {
  MECH: 'Mech', BEAST: 'Beast', ELEMENTAL: 'Elemental', DRAGON: 'Dragon',
  PIRATE: 'Pirate', DEMON: 'Demon', INSECT: 'Insect', CONSTRUCT: 'Construct',
  VOID: 'Void', NONE: 'None',
};
const Race = {
  COGSMITHS: 'Cogsmiths', LUMINAR: 'Luminar', PYROCLAST: 'Pyroclast',
  VOIDBORN: 'Voidborn', BIOTITANS: 'Biotitans', CRYSTALLINE: 'Crystalline',
  PHANTOM_CORSAIRS: 'Phantom Corsairs', HIVEMIND: 'Hivemind',
  ASTROMANCERS: 'Astromancers', CHRONOBOUND: 'Chronobound', NEUTRAL: 'Neutral',
};
const Keywords = {
  GUARDIAN: 'Guardian', BARRIER: 'Barrier', SWIFT: 'Swift', BLITZ: 'Blitz',
  CLOAK: 'Cloak', DOUBLE_STRIKE: 'Double Strike', DRAIN: 'Drain', LETHAL: 'Lethal',
  DEPLOY: 'Deploy', LAST_WORDS: 'Last Words',
};

// Resolve an enum reference like "CardType.MINION" → "Minion"
function resolveEnum(val) {
  if (!val || typeof val !== 'string') return val;
  const maps = { CardType, CardRarity, MinionTribe, Race, CombatKeyword: Keywords, TriggerKeyword: Keywords };
  const dot = val.indexOf('.');
  if (dot === -1) return val;
  const ns = val.slice(0, dot);
  const key = val.slice(dot + 1);
  if (maps[ns] && maps[ns][key] !== undefined) return maps[ns][key];
  return key; // fallback to raw key
}

// ── Extract faction arrays ───────────────────────────────────────────────────
// Match each "export const FACTION_CARDS: CardDefinition[] = [ ... ];"
const factionPattern = /export\s+const\s+(\w+)_CARDS\s*:\s*CardDefinition\[\]\s*=\s*\[/g;
const factionStarts = [];
let m;
while ((m = factionPattern.exec(src)) !== null) {
  factionStarts.push({ name: m[1], start: m.index + m[0].length });
}

// Find the closing "];" for each faction array
function findArrayEnd(str, startIdx) {
  let depth = 1;
  let i = startIdx;
  while (i < str.length && depth > 0) {
    if (str[i] === '[') depth++;
    else if (str[i] === ']') depth--;
    i++;
  }
  return i;
}

// Parse a single card object from its text block
function parseCard(block) {
  const card = {};

  // Simple string fields
  for (const field of ['id', 'name', 'flavorText', 'cardText', 'set']) {
    const re = new RegExp(`${field}:\\s*'((?:[^'\\\\]|\\\\.)*)'`);
    const match = block.match(re);
    if (match) card[field] = match[1].replace(/\\'/g, "'");
  }

  // Numeric fields
  for (const field of ['cost', 'attack', 'health']) {
    const re = new RegExp(`${field}:\\s*(\\d+)`);
    const match = block.match(re);
    if (match) card[field] = parseInt(match[1], 10);
  }

  // Enum fields
  for (const field of ['type', 'race', 'rarity', 'tribe']) {
    const re = new RegExp(`${field}:\\s*(\\w+\\.\\w+)`);
    const match = block.match(re);
    if (match) card[field] = resolveEnum(match[1]);
  }

  // Boolean
  const collMatch = block.match(/collectible:\s*(true|false)/);
  if (collMatch) card.collectible = collMatch[1] === 'true';

  // Keywords array
  card.keywords = [];
  const kwPattern = /keyword:\s*(\w+\.\w+)/g;
  let kwm;
  while ((kwm = kwPattern.exec(block)) !== null) {
    const resolved = resolveEnum(kwm[1]);
    if (resolved) card.keywords.push(resolved);
  }

  return card;
}

// Split array text into individual card blocks (top-level { ... } objects)
function splitCards(arrayText) {
  const cards = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < arrayText.length; i++) {
    if (arrayText[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (arrayText[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        cards.push(arrayText.slice(start, i + 1));
        start = -1;
      }
    }
  }
  return cards;
}

// ── Process each faction ─────────────────────────────────────────────────────
const allFactions = {};
const skipFactions = new Set(['TOKEN', 'ALL_SAMPLE', 'STARTER']);

for (const { name, start } of factionStarts) {
  // Skip non-faction arrays
  if (skipFactions.has(name) || name.startsWith('STARTER')) continue;

  const end = findArrayEnd(src, start);
  const arrayText = src.slice(start, end - 1); // between [ and ]
  const cardBlocks = splitCards(arrayText);

  const factionName = Race[name] || name;
  const cards = cardBlocks.map(block => {
    const c = parseCard(block);
    return {
      id: c.id || '',
      name: c.name || '',
      faction: factionName,
      type: c.type || 'Unknown',
      tribe: c.tribe || null,
      rarity: c.rarity || 'Common',
      cost: c.cost ?? 0,
      attack: c.attack ?? null,
      health: c.health ?? null,
      keywords: c.keywords || [],
      cardText: c.cardText || '',
      flavorText: c.flavorText || '',
      collectible: c.collectible ?? true,
      set: c.set || 'CORE',
      // Blank field for you to fill with art generation prompts
      artPrompt: '',
    };
  });

  allFactions[factionName] = cards;
}

// ── Write output ─────────────────────────────────────────────────────────────
let totalCards = 0;

for (const [faction, cards] of Object.entries(allFactions)) {
  const safeName = faction.replace(/\s+/g, '_');
  const dir = path.join(outdir, safeName);
  fs.mkdirSync(dir, { recursive: true });

  const outFile = path.join(dir, 'cards.json');
  fs.writeFileSync(outFile, JSON.stringify(cards, null, 2));
  totalCards += cards.length;
  console.log(`  ${faction.padEnd(20)} → ${cards.length} cards → ${path.relative(ROOT, outFile)}`);
}

// Also write a single combined file
const combinedFile = path.join(outdir, 'all-cards.json');
fs.writeFileSync(combinedFile, JSON.stringify(allFactions, null, 2));

console.log(`\nTotal: ${totalCards} cards exported to ${path.relative(ROOT, outdir)}/`);
console.log(`Combined file: ${path.relative(ROOT, combinedFile)}`);
console.log(`\nEach card has a blank "artPrompt" field you can fill before feeding to your AI.`);
