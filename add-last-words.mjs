#!/usr/bin/env node
/**
 * add-last-words.mjs — Give HIVEMIND the "Last Words bomb" identity.
 *
 * V2: Targeted approach — only add LAST_WORDS to cards that DON'T already
 * have DEPLOY. No double-dipping on value. ~8 cards get Last Words as their
 * PRIMARY mechanic.
 *
 * Theme: "Kill a bug, get punished."
 */

import { readFileSync, writeFileSync } from 'fs';

const FILE = 'src/data/SampleCards.ts';
let src = readFileSync(FILE, 'utf8');

// ============================================================================
// LAST WORDS CARDS — Only cards WITHOUT existing DEPLOY effects
// ============================================================================

const LAST_WORDS_CARDS = {
  // --- 1-COST: EGGS ---
  'Egg Sac': {
    // 0/3 body — THE iconic Last Words card. Egg hatches when broken.
    // Currently has DEPLOY (summon drones), change to LAST_WORDS instead
    effect: `{ id: 'lw0', type: EffectType.SUMMON, trigger: EffectTrigger.ON_DEATH, targetType: TargetType.NONE, data: { cardId: 'token_generated', count: 2 } as SummonEffectData, isMandatory: true }`,
    cardTextSuffix: 'LAST WORDS: Summon two 1/1 Drones',
    removeExistingDeploy: true,  // Replace DEPLOY with LAST_WORDS
  },

  // --- 2-COST: ACID BOMBS (no DEPLOY on these) ---
  'Swarm Striker': {
    // 2/2 with SWIFT+DRAIN, no DEPLOY — small parting-shot bomb
    effect: `{ id: 'lw0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_DEATH, targetType: TargetType.RANDOM_ENEMY, data: { amount: 1 } as DamageEffectData, isMandatory: true }`,
    cardTextSuffix: 'LAST WORDS: Deal 1 damage to a random enemy',
  },

  // --- 3-COST: VENOM AND RAGE (no DEPLOY on these) ---
  'Venomsting': {
    // 2/3 with BLITZ+LETHAL, no DEPLOY — venom AoE burst
    effect: `{ id: 'lw0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_DEATH, targetType: TargetType.ALL_ENEMY_MINIONS, data: { amount: 1 } as DamageEffectData, isMandatory: true }`,
    cardTextSuffix: 'LAST WORDS: Deal 1 damage to all enemy minions',
  },
  'Hive Warrior': {
    // 3/3 with LETHAL+DRAIN, no DEPLOY — dying warrior empowers ally
    effect: `{ id: 'lw0', type: EffectType.BUFF, trigger: EffectTrigger.ON_DEATH, targetType: TargetType.RANDOM_FRIENDLY_MINION, data: { attack: 1, health: 1 } as BuffEffectData, isMandatory: true }`,
    cardTextSuffix: 'LAST WORDS: Give a random friendly minion +1/+1',
  },
  'Tunnel Burrower': {
    // 2/5 with BARRIER+DRAIN, no DEPLOY — burrower leaves behind drones
    effect: `{ id: 'lw0', type: EffectType.SUMMON, trigger: EffectTrigger.ON_DEATH, targetType: TargetType.NONE, data: { cardId: 'token_generated', count: 1 } as SummonEffectData, isMandatory: true }`,
    cardTextSuffix: 'LAST WORDS: Summon a 1/1 Drone',
  },

  // --- 4-COST: MID BOMBS (no DEPLOY on these) ---
  'Chitin Charger': {
    // 4/4 with LETHAL+BLITZ, no DEPLOY — charges in and explodes
    effect: `{ id: 'lw0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_DEATH, targetType: TargetType.RANDOM_ENEMY, data: { amount: 2 } as DamageEffectData, isMandatory: true }`,
    cardTextSuffix: 'LAST WORDS: Deal 2 damage to a random enemy',
  },

  // --- 6-COST: BIG BOMB ---
  'Titan Beetle': {
    // 6/7 with LETHAL+BARRIER+DEPLOY — this one already has DEPLOY but is
    // the BIG signature card. Make the Last Words flashy.
    effect: `{ id: 'lw0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_DEATH, targetType: TargetType.RANDOM_ENEMY, data: { amount: 3 } as DamageEffectData, isMandatory: true }`,
    cardTextSuffix: 'LAST WORDS: Deal 3 damage to a random enemy',
  },
};

// ============================================================================
// PROCESSING
// ============================================================================

let totalModified = 0;
let totalSkipped = 0;

for (const [cardName, config] of Object.entries(LAST_WORDS_CARDS)) {
  const escapedName = cardName.replace(/'/g, "\\'").replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const cardBlockRegex = new RegExp(
    `(\\{[^}]*?name:\\s*'${escapedName}'[^}]*?race:\\s*Race\\.HIVEMIND[^}]*?keywords:\\s*\\[)([^\\]]*?)(\\][^}]*?effects:\\s*\\[)([^\\]]*?)(\\][^}]*?cardText:\\s*')([^']*?)('[^}]*?\\})`,
    'gs'
  );

  let matchCount = 0;
  src = src.replace(cardBlockRegex, (match, preKw, kw, preEff, eff, preText, text, postText) => {
    matchCount++;

    if (kw.includes('LAST_WORDS')) {
      console.log(`  SKIP ${cardName} (already has LAST_WORDS)`);
      totalSkipped++;
      return match;
    }

    // 1. Add LAST_WORDS keyword
    let newKw = kw.trim();
    if (config.removeExistingDeploy) {
      // Replace all keywords with just LAST_WORDS (for Egg Sac)
      newKw = '{ keyword: TriggerKeyword.LAST_WORDS }';
    } else {
      if (newKw.length > 0 && !newKw.endsWith(',')) {
        newKw += ', ';
      } else if (newKw.length > 0) {
        newKw += ' ';
      }
      newKw += '{ keyword: TriggerKeyword.LAST_WORDS }';
    }

    // 2. Add ON_DEATH effect
    let newEff = eff.trim();
    if (config.removeExistingDeploy) {
      newEff = config.effect;
    } else if (newEff.length > 0 && !newEff.endsWith(',')) {
      newEff += ', ' + config.effect;
    } else if (newEff.length > 0) {
      newEff += ' ' + config.effect;
    } else {
      newEff = config.effect;
    }

    // 3. Update cardText
    let newText = config.removeExistingDeploy ? config.cardTextSuffix : text;
    if (!config.removeExistingDeploy && !newText.includes('LAST WORDS')) {
      if (newText.length > 0 && !newText.endsWith('. ') && !newText.endsWith('.')) {
        newText += '. ';
      } else if (newText.endsWith('.')) {
        newText += ' ';
      }
      newText += config.cardTextSuffix;
    }

    return preKw + newKw + preEff + newEff + preText + newText + postText;
  });

  if (matchCount === 0) {
    console.log(`  WARN: No match found for "${cardName}" in HIVEMIND`);
  } else {
    console.log(`  OK: Modified ${matchCount} instance(s) of "${cardName}"`);
    totalModified += matchCount;
  }
}

writeFileSync(FILE, src);
console.log(`\nDone! Modified ${totalModified} cards, skipped ${totalSkipped}`);
console.log(`\n7 unique HIVEMIND Last Words cards (~14 instances across pool + deck):`);
console.log(`  - Egg Sac: Summon 2 Drones (1-cost egg — the iconic deathrattle)`);
console.log(`  - Swarm Striker: Deal 1 random (2-cost small bomb)`);
console.log(`  - Venomsting: Deal 1 AoE (3-cost venom burst)`);
console.log(`  - Hive Warrior: +1/+1 to random ally (3-cost dying rage)`);
console.log(`  - Tunnel Burrower: Summon 1 Drone (3-cost sticky body)`);
console.log(`  - Chitin Charger: Deal 2 random (4-cost charge + bomb)`);
console.log(`  - Titan Beetle: Deal 3 random (6-cost BIG bomb)`);
