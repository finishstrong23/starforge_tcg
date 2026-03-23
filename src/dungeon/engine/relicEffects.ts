/**
 * STARFORGE TCG — Dungeon Run Relic Effect System
 * Processes passive and triggered relic effects during combat.
 */

import type { DungeonRelic, RunCard, BoardMinion, DungeonEnemy, StatusEffect } from '../types';

// ─── Helper ────────────────────────────────────────────────

function hasRelic(relics: DungeonRelic[], id: string): boolean {
  return relics.some((r) => r.id === id);
}

// ─── ON_COMBAT_START ───────────────────────────────────────

export function processRelicsCombatStart(relics: DungeonRelic[]): {
  extraDraw: number;
  extraEnergy: number;
  damageToEnemies: number;
  extraBlock: number;
} {
  let extraDraw = 0;
  let extraEnergy = 0;
  let damageToEnemies = 0;
  let extraBlock = 0;

  // Star Compass — Draw 2 extra cards at combat start
  if (hasRelic(relics, 'relic_star_compass')) {
    extraDraw += 2;
  }

  // Kess's Compass (boss) — Start every combat with 2 extra draws
  if (hasRelic(relics, 'relic_kess_compass')) {
    extraDraw += 2;
  }

  // Ancient Star Chart — +1 energy on first turn
  if (hasRelic(relics, 'relic_ancient_star_chart')) {
    extraEnergy += 1;
  }

  // Devourer's Eye (boss) — Deal 5 damage to all enemies at combat start
  if (hasRelic(relics, 'relic_devourers_eye')) {
    damageToEnemies += 5;
  }

  // Cursed Gold — Take 3 damage at combat start (handled as negative block / separate)
  // Note: damage to hero is tracked via getPassiveModifiers().cursedGoldDamage

  return { extraDraw, extraEnergy, damageToEnemies, extraBlock };
}

// ─── ON_TURN_START ─────────────────────────────────────────

export function processRelicsTurnStart(
  relics: DungeonRelic[],
  turn: number,
  relicCount: number,
): {
  damageToEnemy: number;
  block: number;
  strength: number;
} {
  let damageToEnemy = 0;
  let block = 0;
  let strength = 0;

  // Pyroclast Ember Core — Deal 2 damage to the enemy at the start of your turn
  if (hasRelic(relics, 'relic_pyroclast_ember_core')) {
    damageToEnemy += 2;
  }

  // Void Lens — Gain 1 Block per relic owned at the start of each turn
  if (hasRelic(relics, 'relic_void_lens')) {
    block += relicCount;
  }

  // Temporal Gear — Every 3rd combat turn, gain 3 Block
  if (hasRelic(relics, 'relic_temporal_gear') && turn > 0 && turn % 3 === 0) {
    block += 3;
  }

  // Admiral's Coat (boss) — Gain 3 Block at the start of each turn
  if (hasRelic(relics, 'relic_admirals_coat')) {
    block += 3;
  }

  // Star Core (boss) — Gain 1 Strength every 2 turns
  if (hasRelic(relics, 'relic_star_core') && turn > 0 && turn % 2 === 0) {
    strength += 1;
  }

  return { damageToEnemy, block, strength };
}

// ─── ON_CARD_PLAYED ────────────────────────────────────────

export function processRelicsCardPlayed(
  relics: DungeonRelic[],
  card: RunCard,
  cardsPlayedThisTurn: number,
  hasHealedThisTurn: boolean,
): {
  extraDraw: number;
  costReduction: number;
  damageToEnemy: number;
  mechBuff: boolean;
} {
  let extraDraw = 0;
  let costReduction = 0;
  let damageToEnemy = 0;
  let mechBuff = false;

  // Crystal Resonator — Every 4th card played costs 0
  // (cost reduction is applied before play via getCardCostWithRelics)
  // This hook tracks the counter side-effect if needed

  // Warpstone — Playing a Legendary card draws 1
  if (hasRelic(relics, 'relic_warpstone') && card.rarity === 'Legendary') {
    extraDraw += 1;
  }

  // Mech Capacitor — Playing a Mech gives all Mechs +1 Attack
  if (hasRelic(relics, 'relic_mech_capacitor') && card.tribe === 'Mech') {
    mechBuff = true;
  }

  // Living Flame — After 3 spells in one turn, deal 5 damage to the enemy
  if (
    hasRelic(relics, 'relic_living_flame') &&
    card.type === 'Spell' &&
    cardsPlayedThisTurn >= 3
  ) {
    damageToEnemy += 5;
  }

  // Forge Hammer (boss) — First card each turn deals +3 damage
  if (hasRelic(relics, 'relic_forge_hammer') && cardsPlayedThisTurn === 1) {
    damageToEnemy += 3;
  }

  return { extraDraw, costReduction, damageToEnemy, mechBuff };
}

// ─── ON_KILL ───────────────────────────────────────────────

export function processRelicsOnKill(relics: DungeonRelic[]): {
  healHero: number;
  givePhase: boolean;
} {
  let healHero = 0;
  let givePhase = false;

  // Forgeborn Core — Heal 4 when you kill an enemy
  if (hasRelic(relics, 'relic_forgeborn_core')) {
    healHero += 4;
  }

  // Spectral Anchor — After killing an enemy, give a random friendly minion PHASE
  if (hasRelic(relics, 'relic_spectral_anchor')) {
    givePhase = true;
  }

  return { healHero, givePhase };
}

// ─── ON_HERO_HEAL ──────────────────────────────────────────

export function processRelicsOnHeal(
  relics: DungeonRelic[],
  healedToFull: boolean,
): {
  extraDraw: number;
  illuminateTwice: boolean;
  strengthGain: number;
} {
  let extraDraw = 0;
  let illuminateTwice = false;
  let strengthGain = 0;

  // Luminar Chalice — Draw 1 card the first time you heal each combat
  // (caller should only invoke once per combat)
  if (hasRelic(relics, 'relic_luminar_chalice')) {
    extraDraw += 1;
  }

  // Illuminate Crystal — First heal each turn triggers ILLUMINATE twice
  if (hasRelic(relics, 'relic_illuminate_crystal')) {
    illuminateTwice = true;
  }

  // Ember Heart — Gain +1 Strength when healed to full HP
  if (hasRelic(relics, 'relic_ember_heart') && healedToFull) {
    strengthGain += 1;
  }

  return { extraDraw, illuminateTwice, strengthGain };
}

// ─── ON_MINION_DEATH ───────────────────────────────────────

export function processRelicsOnMinionDeath(
  relics: DungeonRelic[],
  minion: BoardMinion,
): {
  energyGain: number;
  blockGain: number;
  addCopyToDeck: boolean;
} {
  let energyGain = 0;
  let blockGain = 0;
  let addCopyToDeck = false;

  // Cogsmith's Wrench — Gain 1 energy when a friendly minion dies
  if (hasRelic(relics, 'relic_cogsmiths_wrench')) {
    energyGain += 1;
  }

  // Blast Residue — Death effect damage gives hero +1 Block
  if (hasRelic(relics, 'relic_blast_residue')) {
    blockGain += 1;
  }

  // Scrap Compactor — When a Mech dies, add a 1-cost copy to your draw pile
  if (hasRelic(relics, 'relic_scrap_compactor') && minion.card.tribe === 'Mech') {
    addCopyToDeck = true;
  }

  return { energyGain, blockGain, addCopyToDeck };
}

// ─── ON_HERO_DEATH ─────────────────────────────────────────

export function shouldPhoenixSave(relics: DungeonRelic[], phoenixUsed: boolean): boolean {
  return hasRelic(relics, 'relic_phoenix_feather') && !phoenixUsed;
}

// ─── PASSIVE MODIFIERS ─────────────────────────────────────

export function getPassiveModifiers(relics: DungeonRelic[]): {
  extraMaxEnergy: number;
  extraMaxHealth: number;
  lastWordsBonusDamage: number;
  immolateDamageMultiplier: number;
  cloakPhaseAttackBonus: number;
  epicLegendaryCostReduction: number;
  shopDiscount: number;
  mechStartBuff: { attack: number; health: number };
  seeDrawPileTop: boolean;
  cursedGoldDamage: number;
} {
  let extraMaxEnergy = 0;
  let extraMaxHealth = 0;
  let lastWordsBonusDamage = 0;
  let immolateDamageMultiplier = 1.0;
  let cloakPhaseAttackBonus = 0;
  let epicLegendaryCostReduction = 0;
  let shopDiscount = 0;
  const mechStartBuff = { attack: 0, health: 0 };
  let seeDrawPileTop = false;
  let cursedGoldDamage = 0;

  // Starforged Crystal — +1 max energy
  if (hasRelic(relics, 'relic_starforged_crystal')) {
    extraMaxEnergy += 1;
  }

  // Sentinel's Crown (boss) — +2 max energy
  if (hasRelic(relics, 'relic_sentinels_crown')) {
    extraMaxEnergy += 2;
  }

  // Corsair's Dice — +15 max health
  if (hasRelic(relics, 'relic_corsairs_dice')) {
    extraMaxHealth += 15;
  }

  // Void Shard — LAST_WORDS effects deal +3 damage
  if (hasRelic(relics, 'relic_void_shard')) {
    lastWordsBonusDamage += 3;
  }

  // Pyroclast Brand — IMMOLATE effects deal double damage
  if (hasRelic(relics, 'relic_pyroclast_brand')) {
    immolateDamageMultiplier = 2.0;
  }

  // Phantom Ink — CLOAK and PHASE minions have +2 Attack
  if (hasRelic(relics, 'relic_phantom_ink')) {
    cloakPhaseAttackBonus += 2;
  }

  // Starforge Shard — Epic and Legendary cards cost 1 less
  if (hasRelic(relics, 'relic_starforge_shard')) {
    epicLegendaryCostReduction += 1;
  }

  // Smuggler's Map — Shop prices reduced by 25%
  if (hasRelic(relics, 'relic_smugglers_map')) {
    shopDiscount = 0.25;
  }

  // Cogsmith Signet — Mechs start each combat with +2/+2
  if (hasRelic(relics, 'relic_cogsmith_signet')) {
    mechStartBuff.attack += 2;
    mechStartBuff.health += 2;
  }

  // Astral Lens — See the top card of your draw pile at all times
  if (hasRelic(relics, 'relic_astral_lens')) {
    seeDrawPileTop = true;
  }

  // Cursed Gold — Take 3 damage at the start of each combat
  if (hasRelic(relics, 'relic_cursed_gold')) {
    cursedGoldDamage = 3;
  }

  return {
    extraMaxEnergy,
    extraMaxHealth,
    lastWordsBonusDamage,
    immolateDamageMultiplier,
    cloakPhaseAttackBonus,
    epicLegendaryCostReduction,
    shopDiscount,
    mechStartBuff,
    seeDrawPileTop,
    cursedGoldDamage,
  };
}

// ─── Card Cost Calculation ─────────────────────────────────

export function getCardCostWithRelics(
  card: RunCard,
  relics: DungeonRelic[],
  hasHealedThisTurn: boolean,
): number {
  let cost = card.upgraded && card.upgradedCost !== undefined ? card.upgradedCost : card.cost;

  // Starforge Shard — Epic and Legendary cards cost 1 less
  if (
    hasRelic(relics, 'relic_starforge_shard') &&
    (card.rarity === 'Epic' || card.rarity === 'Legendary')
  ) {
    cost -= 1;
  }

  // Beacon Fragment — Spells cost 1 less on turns you've healed
  if (hasRelic(relics, 'relic_beacon_fragment') && card.type === 'Spell' && hasHealedThisTurn) {
    cost -= 1;
  }

  // Crystal Resonator is handled by the combat engine via cardsPlayedThisTurn counter
  // (every 4th card costs 0 — needs external state)

  return Math.max(0, cost);
}
