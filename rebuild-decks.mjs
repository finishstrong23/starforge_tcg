/**
 * STARFORGE TCG - Complete Deck Rebuilder
 *
 * 1. Re-rolls all combat keywords based on new RACE_COMBAT_WEIGHTS
 * 2. Rebuilds all 10 starter decks using keyword-aware selection
 * 3. Applies stat normalization with win-rate biases
 *
 * Usage: node rebuild-decks.mjs
 */

import fs from 'fs';
import path from 'path';

const SAMPLE_CARDS_PATH = path.join('src', 'data', 'SampleCards.ts');

// ═══════════════════════════════════════════════════════════════════════════
// RACE KEYWORD WEIGHTS — Each race has a distinct primary keyword
// Weak keywords (CLOAK, LETHAL) get strong secondary keywords (DRAIN, BARRIER)
// ═══════════════════════════════════════════════════════════════════════════

// Synced with re-keyword.mjs — these are the final balance-tuned weights.
// 28.4% spread (60.0% → 31.7%), middle 8 races within 47.5-60.0%.
const RACE_COMBAT_WEIGHTS = {
  COGSMITHS: {
    BARRIER: 5, SWIFT: 4, GUARDIAN: 3, DRAIN: 2,
    DOUBLE_STRIKE: 2, BLITZ: 2, LETHAL: 1, CLOAK: 1
  },
  LUMINAR: {
    GUARDIAN: 6, DRAIN: 5, BARRIER: 3, SWIFT: 2,
    DOUBLE_STRIKE: 1, BLITZ: 1, LETHAL: 1, CLOAK: 1
  },
  PYROCLAST: {
    BLITZ: 4, DOUBLE_STRIKE: 4, SWIFT: 3, DRAIN: 2,
    LETHAL: 2, BARRIER: 2, GUARDIAN: 1, CLOAK: 1
  },
  VOIDBORN: {
    CLOAK: 5, DRAIN: 5, LETHAL: 3, BARRIER: 3,
    SWIFT: 2, GUARDIAN: 1, DOUBLE_STRIKE: 1, BLITZ: 1
  },
  BIOTITANS: {
    DRAIN: 5, GUARDIAN: 4, DOUBLE_STRIKE: 3, BARRIER: 3,
    SWIFT: 2, BLITZ: 1, LETHAL: 2, CLOAK: 1
  },
  CRYSTALLINE: {
    BARRIER: 5, GUARDIAN: 5, DRAIN: 3, DOUBLE_STRIKE: 3,
    SWIFT: 2, CLOAK: 1, BLITZ: 1, LETHAL: 1
  },
  PHANTOM_CORSAIRS: {
    SWIFT: 5, CLOAK: 4, BLITZ: 3, DRAIN: 4,
    LETHAL: 2, DOUBLE_STRIKE: 1, BARRIER: 1, GUARDIAN: 1
  },
  HIVEMIND: {
    LETHAL: 5, DRAIN: 5, SWIFT: 3, BARRIER: 2,
    BLITZ: 2, DOUBLE_STRIKE: 2, GUARDIAN: 1, CLOAK: 1
  },
  ASTROMANCERS: {
    DOUBLE_STRIKE: 6, BARRIER: 4, DRAIN: 3, BLITZ: 3,
    SWIFT: 2, GUARDIAN: 1, LETHAL: 1, CLOAK: 1
  },
  CHRONOBOUND: {
    LETHAL: 4, DOUBLE_STRIKE: 4, DRAIN: 5, BLITZ: 3,
    BARRIER: 3, SWIFT: 2, GUARDIAN: 0, CLOAK: 0
  },
  NEUTRAL: {
    GUARDIAN: 3, BARRIER: 3, SWIFT: 3, BLITZ: 3,
    CLOAK: 3, DOUBLE_STRIKE: 3, DRAIN: 3, LETHAL: 3,
  },
};

const INCOMPATIBLE_KEYWORDS = {
  GUARDIAN: ['LETHAL'],
  LETHAL: ['GUARDIAN'],
};

// ═══════════════════════════════════════════════════════════════════════════
// DECK BUILDING CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

// Flat keyword values: deck builder picks based on stats + mana curve,
// keyword distribution comes from the re-keywording weights in Step 1.
// Small bonus for having ANY keyword (vs none).
const DECK_KW_VALUES = {
  GUARDIAN: 3, BARRIER: 3, SWIFT: 3, BLITZ: 3,
  CLOAK: 3, DOUBLE_STRIKE: 3, DRAIN: 3, LETHAL: 3,
  DEPLOY: 2, LAST_WORDS: 2,
};

const MAX_KEYWORD_COPIES = 8;  // Generous default — weights drive distribution, caps are safety nets
const MAX_STRUCTURES_IN_DECK = 2;

// Global safety caps. With 25 minions per deck and balanced weights, each keyword
// should naturally have 3-7 copies. Cap the strong ones lower.
const KEYWORD_MAX_OVERRIDES = {
  GUARDIAN: 7, LETHAL: 7, BARRIER: 6, BLITZ: 6,
  SWIFT: 7, DRAIN: 8, DOUBLE_STRIKE: 7, CLOAK: 6,
};

// No per-race caps — the RACE_COMBAT_WEIGHTS already control distribution proportionally.
// Previous per-race caps caused pool starvation → emergency fills → bypassed ALL caps.
const RACE_KEYWORD_CAP_OVERRIDES = {};

const DECK_MANA_CURVE = {
  1: { min: 2, max: 4 }, 2: { min: 3, max: 6 }, 3: { min: 4, max: 7 },
  4: { min: 3, max: 5 }, 5: { min: 2, max: 4 }, 6: { min: 1, max: 3 }, 7: { min: 1, max: 3 },
};

const HIGH_COST_HARD_MAX = { 6: 4, 7: 3 };

// Win-rate balance bias calibrated to keyword-only test results.
// Massive biases needed because keywords dominate — stats are secondary lever.
const WIN_RATE_BALANCE_BIAS = {
  PYROCLAST:       -100,  // 76.6% → massive nerf
  COGSMITHS:        -70,  // 68.8% → strong nerf
  LUMINAR:          -40,  // 61.1% → moderate nerf
  BIOTITANS:        -35,  // 60.2% → moderate nerf
  CRYSTALLINE:      -15,  // 53.7% → slight nerf
  PHANTOM_CORSAIRS:  20,  // 45.3% → slight buff
  HIVEMIND:          40,  // 39.7% → moderate buff
  VOIDBORN:          40,  // 39.6% → moderate buff
  ASTROMANCERS:      80,  // 29.6% → strong buff
  CHRONOBOUND:      100,  // 24.0% → massive buff
};

// ═══════════════════════════════════════════════════════════════════════════
// HASHING & KEYWORD PICKING
// ═══════════════════════════════════════════════════════════════════════════

function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pickCombatKeyword(race, cardName, cardIndex, excludeSet) {
  const weights = RACE_COMBAT_WEIGHTS[race] || RACE_COMBAT_WEIGHTS['NEUTRAL'];
  const banned = new Set();
  if (excludeSet) {
    for (const existing of excludeSet) {
      const incompat = INCOMPATIBLE_KEYWORDS[existing];
      if (incompat) incompat.forEach(k => banned.add(k));
    }
  }
  const entries = Object.entries(weights).filter(([kw]) => !banned.has(kw));
  const useEntries = entries.length > 0 ? entries : Object.entries(weights);
  const totalWeight = useEntries.reduce((sum, [_, w]) => sum + w, 0);
  const hash = hashString(cardName + '_' + cardIndex + '_' + race);
  let target = hash % totalWeight;
  for (const [keyword, weight] of useEntries) {
    target -= weight;
    if (target <= 0) return keyword;
  }
  return useEntries[0][0];
}

const COMBAT_KW_ENUM = {
  GUARDIAN: 'CombatKeyword.GUARDIAN', BARRIER: 'CombatKeyword.BARRIER',
  SWIFT: 'CombatKeyword.SWIFT', BLITZ: 'CombatKeyword.BLITZ',
  CLOAK: 'CombatKeyword.CLOAK', DOUBLE_STRIKE: 'CombatKeyword.DOUBLE_STRIKE',
  DRAIN: 'CombatKeyword.DRAIN', LETHAL: 'CombatKeyword.LETHAL',
};
const COMBAT_KW_SET = new Set(Object.values(COMBAT_KW_ENUM));

// ═══════════════════════════════════════════════════════════════════════════
// CARD PARSING
// ═══════════════════════════════════════════════════════════════════════════

function parseCardBlock(block) {
  const card = {};
  const m = (regex) => {
    const match = block.match(regex);
    return match ? match[1] : null;
  };

  card.id = m(/id: '([^']+)'/);
  card.name = m(/name: '([^']+)'/);
  card.cost = parseInt(m(/cost: (\d+)/) || '0');
  card.type = m(/type: (CardType\.\w+)/);
  card.race = m(/race: (Race\.\w+)/);
  card.rarity = m(/rarity: (CardRarity\.\w+)/);

  const atkStr = m(/attack: (\d+)/);
  if (atkStr) card.attack = parseInt(atkStr);
  const hpStr = m(/health: (\d+)/);
  if (hpStr) card.health = parseInt(hpStr);

  card.tribe = m(/tribe: (MinionTribe\.\w+)/);

  // Parse keywords
  const kwMatch = block.match(/keywords: \[([^\]]*)\]/);
  card.keywordsStr = kwMatch ? kwMatch[1].trim() : '';
  card.combatKwCount = (card.keywordsStr.match(/CombatKeyword\./g) || []).length;
  card.triggerKws = [];
  const triggerRegex = /TriggerKeyword\.(\w+)/g;
  let tm;
  while ((tm = triggerRegex.exec(card.keywordsStr)) !== null) {
    card.triggerKws.push(tm[1]);
  }

  // Parse effects (keep as raw string)
  const effectsMatch = block.match(/effects: \[([^\]]*(?:\{[^}]*\}[^]]*?)*)\]/s);
  card.effectsStr = effectsMatch ? effectsMatch[1].trim() : '';
  card.hasEffects = card.effectsStr.length > 0;

  // Other fields
  card.starforgeStr = '';
  const sfStart = block.indexOf('starforge: {');
  if (sfStart !== -1) {
    let depth = 0;
    let sfEnd = sfStart;
    for (let j = sfStart; j < block.length; j++) {
      if (block[j] === '{') depth++;
      if (block[j] === '}') { depth--; if (depth === 0) { sfEnd = j + 1; break; } }
    }
    card.starforgeStr = block.substring(sfStart, sfEnd);
  }

  card.flavorText = m(/flavorText: '([^']+)'/);
  card.cardText = m(/cardText: '([^']+)'/);
  card.rawBlock = block;

  return card;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  STARFORGE TCG — Full Deck Rebuild');
  console.log('═══════════════════════════════════════════════════════════\n');

  let content = fs.readFileSync(SAMPLE_CARDS_PATH, 'utf-8');

  // ── Step 1: Re-roll all combat keywords ──────────────────────────────
  console.log('Step 1: Re-rolling combat keywords...');

  const lines = content.split('\n');
  let currentRace = null;
  let currentCardName = null;
  let raceCardIndex = {};
  let totalRerolled = 0;
  let inNeutralSection = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('NEUTRAL_CARDS: CardDefinition[]')) {
      inNeutralSection = true;
      currentRace = 'NEUTRAL';
    }
    if (inNeutralSection && (line.includes('ALL_SAMPLE_CARDS') || line.includes('TOKEN_CARDS') || line.includes('STARTER_DECK_'))) {
      inNeutralSection = false;
      currentRace = null;
    }

    const raceMatch = line.match(/race: Race\.(\w+)/);
    if (raceMatch) {
      currentRace = raceMatch[1];
      inNeutralSection = false;
      if (!raceCardIndex[currentRace]) raceCardIndex[currentRace] = 0;
    }

    const nameMatch = line.match(/name: '([^']+)'/);
    if (nameMatch) currentCardName = nameMatch[1];

    const idMatch = line.match(/id: '([^']+)'/);
    if (idMatch && !raceCardIndex[currentRace || '']) raceCardIndex[currentRace || ''] = 0;

    const kwLineMatch = line.match(/^(\s*)keywords: \[(.*)],?\s*$/);
    if (kwLineMatch && currentRace) {
      const indent = kwLineMatch[1];
      const kwContent = kwLineMatch[2].trim();
      if (!kwContent) continue;

      const kwEntries = [];
      const kwRegex = /\{\s*keyword:\s*(\w+\.\w+)\s*\}/g;
      let m;
      while ((m = kwRegex.exec(kwContent)) !== null) kwEntries.push(m[1]);
      if (kwEntries.length === 0) continue;

      const triggerKws = kwEntries.filter(kw => !COMBAT_KW_SET.has(kw));
      const combatSlots = kwEntries.filter(kw => COMBAT_KW_SET.has(kw)).length;
      if (combatSlots === 0) continue;

      const idx = raceCardIndex[currentRace]++;
      const usedCombatKeys = new Set();
      const newCombatKws = [];

      for (let slot = 0; slot < combatSlots; slot++) {
        let picked = pickCombatKeyword(currentRace, currentCardName || '', idx * 10 + slot, usedCombatKeys);
        let attempts = 0;
        while (usedCombatKeys.has(picked) && attempts < 8) {
          attempts++;
          picked = pickCombatKeyword(currentRace, (currentCardName || '') + '_reroll' + attempts, idx * 10 + slot + attempts, usedCombatKeys);
        }
        if (!usedCombatKeys.has(picked)) {
          usedCombatKeys.add(picked);
          newCombatKws.push(COMBAT_KW_ENUM[picked]);
        }
      }

      const allKws = [...newCombatKws, ...triggerKws];
      lines[i] = `${indent}keywords: [${allKws.map(kw => `{ keyword: ${kw} }`).join(', ')}],`;
      totalRerolled++;
    }
  }

  content = lines.join('\n');
  console.log(`  Re-rolled keywords on ${totalRerolled} cards.\n`);

  // ── Step 2: Parse card pools ─────────────────────────────────────────
  console.log('Step 2: Parsing card pools...');

  const races = ['COGSMITHS', 'LUMINAR', 'PYROCLAST', 'VOIDBORN', 'BIOTITANS',
                 'CRYSTALLINE', 'PHANTOM_CORSAIRS', 'HIVEMIND', 'ASTROMANCERS', 'CHRONOBOUND'];

  const racePools = {};
  for (const race of races) {
    const marker = `export const ${race}_CARDS: CardDefinition[] = [`;
    const poolStart = content.indexOf(marker);
    if (poolStart === -1) { console.log(`  ${race}: pool not found`); continue; }

    // Find the opening [ of the ARRAY (after "= ["), not the [] in CardDefinition[]
    let depth = 0;
    let poolBodyStart = poolStart + marker.length - 1; // Points to the [ in "= ["
    let poolEnd = poolBodyStart;
    for (let j = poolBodyStart; j < content.length; j++) {
      if (content[j] === '[') depth++;
      if (content[j] === ']') { depth--; if (depth === 0) { poolEnd = j; break; } }
    }

    const poolContent = content.substring(poolBodyStart + 1, poolEnd);

    // Split into individual card blocks
    const cards = [];
    let cardDepth = 0;
    let cardStart = -1;
    for (let j = 0; j < poolContent.length; j++) {
      if (poolContent[j] === '{') {
        if (cardDepth === 0) cardStart = j;
        cardDepth++;
      }
      if (poolContent[j] === '}') {
        cardDepth--;
        if (cardDepth === 0 && cardStart !== -1) {
          const block = poolContent.substring(cardStart, j + 1);
          const card = parseCardBlock(block);
          if (card.id) cards.push(card);
          cardStart = -1;
        }
      }
    }

    racePools[race] = cards;
    const nonSpells = cards.filter(c => c.type !== 'CardType.SPELL').length;
    const spellCount = cards.filter(c => c.type === 'CardType.SPELL').length;
    console.log(`  ${race}: ${cards.length} cards (${nonSpells} minions/structures, ${spellCount} spells)`);
  }

  // ── Step 3: Build new starter decks ──────────────────────────────────
  console.log('\nStep 3: Building new starter decks...');

  const newDecks = {};
  for (const race of races) {
    const pool = racePools[race];
    if (!pool) continue;

    const deck = buildStarterDeck(pool, race);
    newDecks[race] = deck;
  }

  // ── Step 4: Apply stat normalization ─────────────────────────────────
  console.log('\nStep 4: Applying stat normalization...');
  normalizeDeckPower(newDecks);

  // ── Step 5: Replace starter deck sections in the file ────────────────
  console.log('\nStep 5: Writing new starter decks...');

  for (const race of races) {
    const deck = newDecks[race];
    if (!deck || deck.length === 0) continue;

    const deckVarName = `STARTER_DECK_${race}`;
    const deckMarker = `export const ${deckVarName}: CardDefinition[] = [`;
    const sectionStart = content.indexOf(deckMarker);
    if (sectionStart === -1) {
      console.log(`  ${race}: starter deck section not found, skipping`);
      continue;
    }

    // Find end of this array (start at the [ in "= [")
    let depth = 0;
    let arrayStart = sectionStart + deckMarker.length - 1;
    let arrayEnd = arrayStart;
    for (let j = arrayStart; j < content.length; j++) {
      if (content[j] === '[') depth++;
      if (content[j] === ']') { depth--; if (depth === 0) { arrayEnd = j + 1; break; } }
    }

    // Generate new deck content
    const deckContent = generateDeckArray(deck, race);
    const before = content.substring(0, sectionStart);
    const after = content.substring(arrayEnd);

    // Find the comment line above
    const commentLineEnd = sectionStart;
    let commentLineStart = sectionStart;
    // Look for the preceding comment
    const beforeSection = content.substring(Math.max(0, sectionStart - 200), sectionStart);
    const lastCommentIdx = beforeSection.lastIndexOf('// STARTER DECK:');
    if (lastCommentIdx !== -1) {
      commentLineStart = sectionStart - 200 + lastCommentIdx + beforeSection.substring(lastCommentIdx).length;
    }

    content = before + `export const ${deckVarName}: CardDefinition[] = [\n${deckContent}]` + after;
    console.log(`  ${race}: ${deck.length} cards written`);
  }

  fs.writeFileSync(SAMPLE_CARDS_PATH, content, 'utf-8');
  console.log('\nDone! SampleCards.ts updated with new keywords and decks.');
}

// ═══════════════════════════════════════════════════════════════════════════
// DECK BUILDING LOGIC (matching convert-cards.mjs)
// ═══════════════════════════════════════════════════════════════════════════

function getCardKeywords(card) {
  // Only return COMBAT keywords for cap checking — trigger keywords (DEPLOY, LAST_WORDS) should not be capped
  const kws = [];
  const kwRegex = /CombatKeyword\.(\w+)/g;
  let m;
  const str = card.keywordsStr || '';
  while ((m = kwRegex.exec(str)) !== null) {
    kws.push(m[1]);
  }
  return kws;
}

function getAllCardKeywords(card) {
  // Return ALL keywords including triggers (for scoring)
  const kws = [];
  const kwRegex = /(?:CombatKeyword|TriggerKeyword)\.(\w+)/g;
  let m;
  const str = card.keywordsStr || '';
  while ((m = kwRegex.exec(str)) !== null) {
    kws.push(m[1]);
  }
  return kws;
}

function isMinion(card) {
  return card.attack !== undefined;
}

function scoreDeckCard(card) {
  const cost = card.cost || 1;
  if (isMinion(card)) {
    const atk = card.attack || 0;
    const hp = card.health || 0;
    const expected = cost * 2 + 1;
    let score = (atk + hp) - expected + 5;
    for (const kwName of getAllCardKeywords(card)) {
      score += DECK_KW_VALUES[kwName] || 1;
    }
    if (cost <= 2 && getAllCardKeywords(card).length > 0) score += 1;
    if (cost >= 6 && getAllCardKeywords(card).length > 0) score += 1;
    return Math.max(0, score);
  } else {
    const text = (card.cardText || '').toLowerCase();
    let score = cost + 3;
    if (text.includes('all enem') || text.includes('all minion')) score += 3;
    if (text.includes('destroy')) score += 2;
    if (text.includes('draw')) score += 2;
    return Math.max(1, score);
  }
}

function buildStarterDeck(pool, raceEnum) {
  const isSpellCard = (c) => c.type === 'CardType.SPELL';

  // Dynamic split based on pool composition
  const poolMinions = pool.filter(c => !isSpellCard(c)).length;
  const poolSpells = pool.filter(c => isSpellCard(c)).length;
  // Target: ~80% minions but flex if pool is spell-heavy
  const BOARD_TARGET = Math.min(25, poolMinions - 2); // Leave 2 spare for mana curve flex
  const SPELL_TARGET = 30 - BOARD_TARGET;

  const boardEntities = pool
    .filter(c => !isSpellCard(c))
    .map(c => ({ card: c, score: scoreDeckCard(c) }))
    .sort((a, b) => b.score - a.score);

  // Score spells too for better selection
  const spells = pool
    .filter(c => isSpellCard(c))
    .map(c => ({ card: c, score: scoreDeckCard(c) }))
    .sort((a, b) => b.score - a.score);

  const deckCards = [];
  const usedIds = new Set();
  const costBuckets = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  const kwCounts = {};
  let structureCount = 0;

  function getBucket(cost) { return Math.min(Math.max(cost, 1), 7); }
  function isFull(cost) {
    const b = getBucket(cost);
    return costBuckets[b] >= (DECK_MANA_CURVE[b]?.max || 3);
  }

  function getEffectiveCap(kwName) {
    const raceCaps = RACE_KEYWORD_CAP_OVERRIDES[raceEnum];
    if (raceCaps && raceCaps[kwName] !== undefined) return raceCaps[kwName];
    return KEYWORD_MAX_OVERRIDES[kwName] ?? MAX_KEYWORD_COPIES;
  }

  function wouldExceedKeywordCap(card) {
    for (const kwName of getCardKeywords(card)) {
      if ((kwCounts[kwName] || 0) >= getEffectiveCap(kwName)) return true;
    }
    return false;
  }

  function wouldExceedStructureCap(card) {
    return card.type === 'CardType.STRUCTURE' && structureCount >= MAX_STRUCTURES_IN_DECK;
  }

  function wouldExceedHighCostCap(card) {
    const b = getBucket(card.cost);
    const hardMax = HIGH_COST_HARD_MAX[b];
    return hardMax !== undefined && costBuckets[b] >= hardMax;
  }

  function addCard(card) {
    deckCards.push(card);
    usedIds.add(card.id);
    costBuckets[getBucket(card.cost)]++;
    if (card.type === 'CardType.STRUCTURE') structureCount++;
    for (const kwName of getCardKeywords(card)) {
      kwCounts[kwName] = (kwCounts[kwName] || 0) + 1;
    }
  }

  // Step 1: Pick spells (best scored, spread across mana costs)
  const spellBuckets = {};
  for (const entry of spells) {
    const b = getBucket(entry.card.cost);
    if (!spellBuckets[b]) spellBuckets[b] = [];
    spellBuckets[b].push(entry);
  }
  let spellsPicked = 0;
  for (const bucket of [2, 3, 4, 5, 1, 6, 7]) {
    if (spellsPicked >= SPELL_TARGET) break;
    const bSpells = spellBuckets[bucket];
    if (!bSpells || bSpells.length === 0) continue;
    const spell = bSpells.shift();
    if (!usedIds.has(spell.card.id)) { addCard(spell.card); spellsPicked++; }
  }
  // Fill remaining spell slots with best remaining
  if (spellsPicked < SPELL_TARGET) {
    for (const entry of spells) {
      if (spellsPicked >= SPELL_TARGET) break;
      if (usedIds.has(entry.card.id)) continue;
      addCard(entry.card); spellsPicked++;
    }
  }

  // Step 2: Pick board entities with full constraints (mana curve + keyword caps)
  for (const entry of boardEntities) {
    if (deckCards.length >= 30) break;
    if (usedIds.has(entry.card.id)) continue;
    if (wouldExceedKeywordCap(entry.card)) continue;
    if (wouldExceedStructureCap(entry.card)) continue;
    if (isFull(entry.card.cost)) continue;
    addCard(entry.card);
  }

  // Step 3: Relax mana curve (keep keyword caps + high-cost cap)
  if (deckCards.length < 30) {
    for (const entry of boardEntities) {
      if (deckCards.length >= 30) break;
      if (usedIds.has(entry.card.id)) continue;
      if (wouldExceedKeywordCap(entry.card)) continue;
      if (wouldExceedStructureCap(entry.card)) continue;
      if (wouldExceedHighCostCap(entry.card)) continue;
      addCard(entry.card);
    }
  }

  // Step 4: Relax high-cost cap too (only keyword + structure caps)
  if (deckCards.length < 30) {
    for (const entry of boardEntities) {
      if (deckCards.length >= 30) break;
      if (usedIds.has(entry.card.id)) continue;
      if (wouldExceedStructureCap(entry.card)) continue;
      if (wouldExceedKeywordCap(entry.card)) continue;
      addCard(entry.card);
    }
  }

  // Step 5: Fill remaining (still enforce keyword caps)
  if (deckCards.length < 30) {
    for (const entry of boardEntities) {
      if (deckCards.length >= 30) break;
      if (usedIds.has(entry.card.id)) continue;
      if (wouldExceedKeywordCap(entry.card)) continue;
      addCard(entry.card);
    }
  }
  // Step 6: Last resort — add any remaining cards (spells or minions)
  if (deckCards.length < 30) {
    for (const entry of boardEntities) {
      if (deckCards.length >= 30) break;
      if (usedIds.has(entry.card.id)) continue;
      addCard(entry.card);
    }
  }
  if (deckCards.length < 30) {
    for (const entry of spells) {
      if (deckCards.length >= 30) break;
      if (usedIds.has(entry.card.id)) continue;
      addCard(entry.card); spellsPicked++;
    }
  }

  const finalDeck = deckCards.slice(0, 30);
  const minionCount = finalDeck.filter(c => !isSpellCard(c)).length;
  const kwStr = Object.entries(kwCounts).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k}=${v}`).join(' ');
  console.log(`  ${raceEnum}: ${finalDeck.length} cards (${minionCount} minions, ${spellsPicked} spells) | KW: ${kwStr}`);

  return finalDeck;
}

// ═══════════════════════════════════════════════════════════════════════════
// STAT NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════

function computeDeckPower(deck) {
  let totalPower = 0, minionCount = 0;
  for (const card of deck) {
    if (isMinion(card)) {
      const expected = (card.cost || 1) * 2 + 1;
      const statEff = ((card.attack || 0) + (card.health || 0)) - expected;
      let kwPower = 0;
      for (const kwName of getAllCardKeywords(card)) kwPower += DECK_KW_VALUES[kwName] || 1;
      totalPower += statEff + kwPower;
      minionCount++;
    }
  }
  return { totalPower, minionCount };
}

function normalizeDeckPower(allDecks) {
  const deckPowers = {};
  for (const [race, deck] of Object.entries(allDecks)) {
    deckPowers[race] = computeDeckPower(deck);
  }
  const avgPower = Object.values(deckPowers).reduce((s, d) => s + d.totalPower, 0) / Object.keys(deckPowers).length;
  console.log(`  Average deck power: ${avgPower.toFixed(1)}`);

  for (const [race, deck] of Object.entries(allDecks)) {
    const { totalPower, minionCount } = deckPowers[race];
    const bias = WIN_RATE_BALANCE_BIAS[race] || 0;
    const raceTarget = avgPower + bias;
    const diff = raceTarget - totalPower;

    if (Math.abs(diff) < 1) {
      console.log(`  ${race}: power ${totalPower.toFixed(1)} — balanced`);
      continue;
    }

    let adjustmentsToMake = Math.round(Math.abs(diff));
    const direction = diff > 0 ? 1 : -1;
    console.log(`  ${race}: power ${totalPower.toFixed(1)} → target ${raceTarget.toFixed(1)} (bias ${bias >= 0 ? '+' : ''}${bias}) → ${direction > 0 ? '+' : ''}${diff.toFixed(1)} (${adjustmentsToMake} pts)`);

    const minionIndices = [];
    for (let i = 0; i < deck.length; i++) {
      if (isMinion(deck[i])) {
        const c = deck[i];
        const eff = ((c.attack || 0) + (c.health || 0)) - ((c.cost || 1) * 2 + 1);
        minionIndices.push({ idx: i, efficiency: eff });
      }
    }
    if (direction > 0) minionIndices.sort((a, b) => a.efficiency - b.efficiency);
    else minionIndices.sort((a, b) => b.efficiency - a.efficiency);

    for (let pass = 0; pass < 10 && adjustmentsToMake > 0; pass++) {
      for (const { idx } of minionIndices) {
        if (adjustmentsToMake <= 0) break;
        const card = deck[idx];
        if (direction > 0) {
          // Buff: alternate health and attack, cap at 15 each
          if (pass % 2 === 0 && (card.health || 0) < 15) { card.health = (card.health || 0) + 1; adjustmentsToMake--; }
          else if ((card.attack || 0) < 15) { card.attack = (card.attack || 0) + 1; adjustmentsToMake--; }
          else if ((card.health || 0) < 15) { card.health = (card.health || 0) + 1; adjustmentsToMake--; }
        } else {
          // Nerf: remove health first (min 1), then attack (min 1)
          if ((card.health || 0) > 1) { card.health--; adjustmentsToMake--; }
          else if ((card.attack || 0) > 1) { card.attack--; adjustmentsToMake--; }
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DECK ARRAY GENERATION
// ═══════════════════════════════════════════════════════════════════════════

function generateDeckArray(deck, race) {
  const cardStrs = deck.map(card => {
    // Rebuild card block with potentially updated stats
    let block = card.rawBlock;

    // Update health if changed
    if (card.health !== undefined) {
      block = block.replace(/health: \d+/, `health: ${card.health}`);
    }
    // Update attack if changed
    if (card.attack !== undefined) {
      block = block.replace(/attack: \d+/, `attack: ${card.attack}`);
    }

    return block;
  });

  return cardStrs.map(s => '  ' + s.trim()).join(',\n') + '\n';
}

main();
