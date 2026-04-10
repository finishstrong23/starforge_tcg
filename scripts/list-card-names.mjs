#!/usr/bin/env node
/**
 * List every STARFORGE TCG card name grouped by faction/race.
 *
 * Usage:
 *   node scripts/list-card-names.mjs                 # pretty printed, grouped
 *   node scripts/list-card-names.mjs --plain         # one name per line
 *   node scripts/list-card-names.mjs --filenames     # suggested PNG filenames
 *   node scripts/list-card-names.mjs --check         # report which cards have art
 *
 * Useful when adding custom card art to public/cards/.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const cardsDir = path.join(rootDir, 'public', 'cards');

const args = new Set(process.argv.slice(2));
const MODE =
  args.has('--filenames') ? 'filenames' :
  args.has('--plain') ? 'plain' :
  args.has('--check') ? 'check' :
  'grouped';

/** Parse card definitions from source files using regex — no build required. */
function parseCards() {
  const cards = [];
  const files = [
    path.join(rootDir, 'src', 'data', 'SampleCards.ts'),
    path.join(rootDir, 'src', 'data', 'ExpansionCards.ts'),
  ];

  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, 'utf-8');

    const headerRegex = /\{\s*id:\s*['"`]([^'"`]+)['"`]\s*,\s*name:\s*['"`]([^'"`]+)['"`]/g;
    const positions = [];
    let m;
    while ((m = headerRegex.exec(content)) !== null) {
      positions.push({ index: m.index, id: m[1], name: m[2] });
    }

    for (let i = 0; i < positions.length; i++) {
      const start = positions[i].index;
      const end = i < positions.length - 1 ? positions[i + 1].index : content.length;
      const block = content.substring(start, end);

      const raceMatch = block.match(/\brace:\s*(?:Race\.)?([A-Z_]+)/);
      const typeMatch = block.match(/\btype:\s*(?:CardType\.)?([A-Z_]+)/);
      const costMatch = block.match(/\bcost:\s*(\d+)/);

      cards.push({
        id: positions[i].id,
        name: positions[i].name,
        race: raceMatch ? raceMatch[1] : 'NEUTRAL',
        type: typeMatch ? typeMatch[1] : 'MINION',
        cost: costMatch ? parseInt(costMatch[1]) : 0,
      });
    }
  }

  return cards;
}

/** Return the set of card art filenames already present (without extension, lowercased). */
function readExistingArt() {
  if (!fs.existsSync(cardsDir)) return new Set();
  const entries = fs.readdirSync(cardsDir);
  const set = new Set();
  for (const entry of entries) {
    const ext = path.extname(entry).toLowerCase();
    if (!['.png', '.webp', '.jpg', '.jpeg'].includes(ext)) continue;
    const base = path.basename(entry, path.extname(entry));
    set.add(base.toLowerCase().replace(/[^a-z0-9]/g, ''));
  }
  return set;
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function main() {
  const cards = parseCards();
  if (cards.length === 0) {
    console.error('No cards found. Check src/data/SampleCards.ts and ExpansionCards.ts.');
    process.exit(1);
  }

  cards.sort((a, b) => {
    if (a.race !== b.race) return a.race.localeCompare(b.race);
    if (a.cost !== b.cost) return a.cost - b.cost;
    return a.name.localeCompare(b.name);
  });

  if (MODE === 'plain') {
    for (const c of cards) console.log(c.name);
    return;
  }

  if (MODE === 'filenames') {
    for (const c of cards) console.log(`${c.name}.png`);
    return;
  }

  if (MODE === 'check') {
    const art = readExistingArt();
    const withArt = [];
    const withoutArt = [];
    for (const c of cards) {
      const key = slugify(c.name);
      const idKey = slugify(c.id);
      if (art.has(key) || art.has(idKey)) withArt.push(c);
      else withoutArt.push(c);
    }
    console.log(`Custom art coverage: ${withArt.length} / ${cards.length} cards`);
    console.log('');
    if (withoutArt.length > 0) {
      console.log('Missing art (drop a PNG named after the card into public/cards/):');
      const byRace = {};
      for (const c of withoutArt) {
        (byRace[c.race] ||= []).push(c);
      }
      for (const race of Object.keys(byRace).sort()) {
        console.log(`\n  [${race}]`);
        for (const c of byRace[race]) console.log(`    ${c.name}.png`);
      }
    } else {
      console.log('Every card has custom art. Nice.');
    }
    return;
  }

  // Default: grouped
  const byRace = {};
  for (const c of cards) {
    (byRace[c.race] ||= []).push(c);
  }

  console.log(`STARFORGE TCG — ${cards.length} cards`);
  console.log('To add art, drop a PNG into public/cards/ named after the card.');
  console.log('Example: public/cards/Sparktinkerer.png\n');

  for (const race of Object.keys(byRace).sort()) {
    console.log(`[${race}]  (${byRace[race].length})`);
    for (const c of byRace[race]) {
      const pad = String(c.cost).padStart(2, ' ');
      console.log(`  ${pad}  ${c.name.padEnd(30, ' ')}  (id: ${c.id})`);
    }
    console.log('');
  }
}

main();
