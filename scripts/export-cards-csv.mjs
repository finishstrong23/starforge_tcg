#!/usr/bin/env node
/**
 * Export all STARFORGE TCG cards to CSV format.
 * Usage: node scripts/export-cards-csv.mjs
 * Output: cards.csv in the project root
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// We need to parse the compiled JS or read the TS source directly.
// Let's dynamically import from the built output or use ts evaluation.
// Simplest: build a quick extraction from the source files.

// Helper: read and eval the card data using the project's own build
async function loadCards() {
  // Try importing from compiled output first
  try {
    const indexPath = path.join(rootDir, 'dist', 'index.js');
    if (fs.existsSync(indexPath)) {
      const mod = await import(indexPath);
      if (mod.initializeFullDatabase || mod.initializeSampleDatabase) {
        const init = mod.initializeFullDatabase || mod.initializeSampleDatabase;
        init();
        const db = mod.globalCardDatabase;
        if (db) return db.getAllCards();
      }
    }
  } catch (_e) {
    // fall through
  }

  // Fallback: use tsx or ts-node
  try {
    const { execSync } = await import('child_process');
    const script = `
      const { initializeFullDatabase, initializeSampleDatabase, globalCardDatabase } = require('./src/index.ts');
      try { initializeFullDatabase(); } catch(e) { initializeSampleDatabase(); }
      const cards = globalCardDatabase.getAllCards();
      console.log(JSON.stringify(cards));
    `;
    const result = execSync(`npx tsx -e "${script.replace(/"/g, '\\"')}"`, {
      cwd: rootDir,
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024
    });
    return JSON.parse(result);
  } catch (_e) {
    // fall through
  }

  // Final fallback: parse the TS source files directly with regex
  return parseCardsFromSource();
}

function parseCardsFromSource() {
  const cards = [];

  // Read SampleCards.ts
  const samplePath = path.join(rootDir, 'src', 'data', 'SampleCards.ts');
  const expansionPath = path.join(rootDir, 'src', 'data', 'ExpansionCards.ts');

  for (const filePath of [samplePath, expansionPath]) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf-8');

    // Match card definition objects
    const cardRegex = /\{\s*id:\s*['"`]([^'"`]+)['"`]\s*,\s*name:\s*['"`]([^'"`]+)['"`]/g;
    let match;
    const positions = [];
    while ((match = cardRegex.exec(content)) !== null) {
      positions.push({ index: match.index, id: match[1], name: match[2] });
    }

    for (let i = 0; i < positions.length; i++) {
      const start = positions[i].index;
      const searchEnd = i < positions.length - 1 ? positions[i + 1].index : content.length;
      const block = content.substring(start, searchEnd);

      // Extract fields
      const card = {
        id: positions[i].id,
        name: positions[i].name,
        cost: extractNumber(block, 'cost'),
        type: extractEnum(block, 'type', 'CardType'),
        race: extractEnum(block, 'race', 'Race') || 'NEUTRAL',
        rarity: extractEnum(block, 'rarity', 'CardRarity'),
        attack: extractNumber(block, 'attack'),
        health: extractNumber(block, 'health'),
        tribe: extractEnum(block, 'tribe', 'MinionTribe') || '',
        cardText: extractString(block, 'cardText'),
        flavorText: extractString(block, 'flavorText'),
        collectible: extractBool(block, 'collectible'),
        set: extractString(block, 'set'),
        keywords: extractKeywords(block),
        hasStarforge: block.includes('starforge:') && block.includes('forgedForm') ? 'YES' : 'NO',
        starforgeText: extractString(block, 'transformationText'),
      };

      cards.push(card);
    }
  }

  return cards;
}

function extractNumber(block, field) {
  const m = block.match(new RegExp(`\\b${field}:\\s*(\\d+)`));
  return m ? parseInt(m[1]) : '';
}

function extractEnum(block, field, enumName) {
  const m = block.match(new RegExp(`\\b${field}:\\s*(?:${enumName}\\.)?([A-Z_]+)`));
  return m ? m[1] : '';
}

function extractString(block, field) {
  const m = block.match(new RegExp(`\\b${field}:\\s*['"\`]([^'"\`]*?)['"\`]`));
  return m ? m[1] : '';
}

function extractBool(block, field) {
  const m = block.match(new RegExp(`\\b${field}:\\s*(true|false)`));
  return m ? m[1] : '';
}

function extractKeywords(block) {
  const keywords = [];
  const kwRegex = /keyword:\s*(?:CombatKeyword|TriggerKeyword|OriginalKeyword)\.([A-Z_]+)/g;
  let m;
  while ((m = kwRegex.exec(block)) !== null) {
    // Only match keywords in the top-level keywords array, not in starforge
    keywords.push(m[1]);
  }
  return [...new Set(keywords)].join('; ');
}

function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

async function main() {
  console.log('Loading card data...');
  let cards;
  try {
    cards = await loadCards();
  } catch (e) {
    console.error('Failed to load cards:', e.message);
    process.exit(1);
  }

  if (!cards || cards.length === 0) {
    console.error('No cards found!');
    process.exit(1);
  }

  console.log(`Found ${cards.length} cards. Writing CSV...`);

  const headers = [
    'ID', 'Name', 'Cost', 'Type', 'Race', 'Rarity',
    'Attack', 'Health', 'Tribe', 'Keywords', 'Card Text',
    'Flavor Text', 'Collectible', 'Set', 'Has Starforge', 'Starforge Text'
  ];

  const rows = cards.map(c => {
    // Handle both parsed objects and runtime objects
    const row = [
      c.id,
      c.name,
      c.cost ?? '',
      c.type ?? '',
      c.race ?? 'NEUTRAL',
      c.rarity ?? '',
      c.attack ?? '',
      c.health ?? '',
      c.tribe ?? '',
      c.keywords
        ? (Array.isArray(c.keywords)
            ? c.keywords.map(k => k.keyword || k).join('; ')
            : c.keywords)
        : '',
      c.cardText ?? '',
      c.flavorText ?? '',
      c.collectible ?? '',
      c.set ?? '',
      c.hasStarforge ?? (c.starforge ? 'YES' : 'NO'),
      c.starforgeText ?? (c.starforge?.transformationText || ''),
    ];
    return row.map(escapeCSV).join(',');
  });

  const csv = [headers.join(','), ...rows].join('\r\n');
  const outPath = path.join(rootDir, 'cards.csv');
  fs.writeFileSync(outPath, csv, 'utf-8');
  console.log(`CSV written to: ${outPath}`);
  console.log(`Total cards exported: ${cards.length}`);
}

main();
