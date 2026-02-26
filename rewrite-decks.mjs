#!/usr/bin/env node
/**
 * rewrite-decks.mjs — Full rework of all 10 starter decks
 * 
 * Goals:
 * - Flavorful, thematic card names and text per race
 * - Balanced keyword distribution matching race identities
 * - AI-parseable cardText (exact patterns the AI scores)
 * - Stats follow cost*2+1 guideline
 * - Preserve existing STARFORGE cards exactly
 */

import { readFileSync, writeFileSync } from 'fs';

const FILE = 'src/data/SampleCards.ts';

// ============================================================================
// CARD GENERATION HELPERS
// ============================================================================

function minion(id, name, cost, race, rarity, atk, hp, tribe, keywords, effects, flavorText, cardText, starforge) {
  let kws = keywords.map(k => {
    if (k.startsWith('T:')) return `{ keyword: TriggerKeyword.${k.slice(2)} }`;
    return `{ keyword: CombatKeyword.${k} }`;
  }).join(', ');
  
  let effs = effects.map((e, i) => {
    if (typeof e === 'string') return e; // raw effect string
    // Structured effect
    const { type, trigger, target, data } = e;
    return `{ id: 'e${i}', type: EffectType.${type}, trigger: EffectTrigger.${trigger}, targetType: TargetType.${target}, data: ${data}, isMandatory: true }`;
  }).join(', ');

  let tribeStr = tribe ? `\n    tribe: MinionTribe.${tribe},` : '';
  let sfStr = starforge ? `\n    ${starforge},` : '';
  
  return `  {
    id: '${id}',
    name: '${name.replace(/'/g, "\\'")}',
    cost: ${cost},
    type: CardType.MINION,
    race: Race.${race},
    rarity: CardRarity.${rarity},
    attack: ${atk},
    health: ${hp},${tribeStr}
    keywords: [${kws}],
    effects: [${effs}],${sfStr}
    flavorText: '${flavorText.replace(/'/g, "\\'")}',
    cardText: '${cardText.replace(/'/g, "\\'")}',
    collectible: true,
    set: 'CORE',
  }`;
}

function spell(id, name, cost, race, rarity, keywords, effects, flavorText, cardText) {
  let kws = keywords.map(k => {
    if (k.startsWith('T:')) return `{ keyword: TriggerKeyword.${k.slice(2)} }`;
    return `{ keyword: CombatKeyword.${k} }`;
  }).join(', ');
  
  let effs = effects.map((e, i) => {
    if (typeof e === 'string') return e;
    const { type, trigger, target, data } = e;
    return `{ id: 'e${i}', type: EffectType.${type}, trigger: EffectTrigger.${trigger}, targetType: TargetType.${target}, data: ${data}, isMandatory: true }`;
  }).join(', ');

  return `  {
    id: '${id}',
    name: '${name.replace(/'/g, "\\'")}',
    cost: ${cost},
    type: CardType.SPELL,
    race: Race.${race},
    rarity: CardRarity.${rarity},
    keywords: [${kws}],
    effects: [${effs}],
    flavorText: '${flavorText.replace(/'/g, "\\'")}',
    cardText: '${cardText.replace(/'/g, "\\'")}',
    collectible: true,
    set: 'CORE',
  }`;
}

function structure(id, name, cost, race, rarity, keywords, effects, flavorText, cardText) {
  let kws = keywords.map(k => {
    if (k.startsWith('T:')) return `{ keyword: TriggerKeyword.${k.slice(2)} }`;
    return `{ keyword: CombatKeyword.${k} }`;
  }).join(', ');
  
  let effs = effects.map((e, i) => {
    if (typeof e === 'string') return e;
    const { type, trigger, target, data } = e;
    return `{ id: 'e${i}', type: EffectType.${type}, trigger: EffectTrigger.${trigger}, targetType: TargetType.${target}, data: ${data}, isMandatory: true }`;
  }).join(', ');

  return `  {
    id: '${id}',
    name: '${name.replace(/'/g, "\\'")}',
    cost: ${cost},
    type: CardType.STRUCTURE,
    race: Race.${race},
    rarity: CardRarity.${rarity},
    keywords: [${kws}],
    effects: [${effs}],
    flavorText: '${flavorText.replace(/'/g, "\\'")}',
    cardText: '${cardText.replace(/'/g, "\\'")}',
    collectible: true,
    set: 'CORE',
  }`;
}

// Effect data helpers
const dmg = (amt) => `{ amount: ${amt} } as DamageEffectData`;
const heal = (amt) => `{ amount: ${amt} } as HealEffectData`;
const buff = (a, h) => `{ attack: ${a}, health: ${h} } as BuffEffectData`;
const draw = (n) => `{ count: ${n} } as DrawEffectData`;
const summon = (n) => `{ cardId: 'token_generated', count: ${n} } as SummonEffectData`;
const grantKw = (kw) => `{ keywords: [{ keyword: CombatKeyword.${kw} }] } as GrantKeywordData`;
const crystals = (n) => `{ amount: ${n} } as GainCrystalsData`;

// Effect shorthand
const E = (type, trigger, target, data) => ({ type, trigger, target, data });
const PLAY = 'ON_PLAY';
const DEATH = 'ON_DEATH';
const RAND_E = 'RANDOM_ENEMY';
const ALL_EM = 'ALL_ENEMY_MINIONS';
const ALL_E = 'ALL_ENEMIES';
const ALL_FM = 'ALL_FRIENDLY_MINIONS';
const CHOSEN = 'CHOSEN';
const NONE = 'NONE';
const RAND_FM = 'RANDOM_FRIENDLY_MINION';
const F_HERO = 'FRIENDLY_HERO';

console.log('Generating 300 starter deck cards...\n');

// ============================================================================
// COGSMITHS — Industrial Mech Fortress (BARRIER/SWIFT/GUARDIAN/DRAIN)
// Theme: Build walls, protect with barriers, steady mechanical advance
// ============================================================================
const COGSMITHS = [
  // --- SPELLS (5) ---
  spell('cog_s1', 'Emergency Repairs', 1, 'COGSMITHS', 'COMMON', [],
    [E('HEAL', PLAY, F_HERO, heal(4))],
    'Duct tape? In SPACE?', 'Restore 4 health to your hero'),
  spell('cog_s2', 'Assembly Line', 2, 'COGSMITHS', 'COMMON', [],
    [E('SUMMON', PLAY, NONE, summon(2))],
    'Two for the price of two. What a deal!', 'Summon two 1/1 Cog-Bots'),
  spell('cog_s3', 'Magnetize', 3, 'COGSMITHS', 'COMMON', [],
    [E('BUFF', PLAY, CHOSEN, buff(2, 2)), E('GRANT_KEYWORD', PLAY, CHOSEN, grantKw('BARRIER'))],
    'Positive vibes only. Also positive charges.', 'Give a minion +2/+2 and BARRIER'),
  spell('cog_s4', 'Iron Curtain', 5, 'COGSMITHS', 'RARE', [],
    [E('BUFF', PLAY, ALL_FM, buff(0, 3))],
    'Privacy policy: nobody gets through.', 'Give all friendly minions +0/+3'),
  spell('cog_s5', 'Overclock Protocol', 4, 'COGSMITHS', 'COMMON', [],
    [E('DRAW', PLAY, NONE, draw(2))],
    'WARNING: May void warranty.', 'Draw 2 cards'),
  // --- STRUCTURES (3) ---
  structure('cog_st1', 'Repair Bay', 3, 'COGSMITHS', 'COMMON', ['T:DEPLOY'],
    [E('HEAL', PLAY, F_HERO, heal(3))],
    'Free oil changes on Tuesdays.', 'Start of turn: Restore 3 health to your hero'),
  structure('cog_st2', 'Turret Platform', 4, 'COGSMITHS', 'RARE', ['T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(2))],
    'Point. Shoot. Repeat.', 'Start of turn: Deal 2 damage to a random enemy'),
  structure('cog_st3', 'Forge Works', 5, 'COGSMITHS', 'COMMON', ['T:DEPLOY'],
    [E('BUFF', PLAY, ALL_FM, buff(1, 1))],
    'Making things bigger since forever.', 'Start of turn: Give all friendly minions +1/+1'),
  // --- MINIONS (22) ---
  // 1-cost (4)
  minion('cog_m1', 'Spark Plug', 1, 'COGSMITHS', 'COMMON', 1, 2, 'MECH',
    ['BARRIER'],
    [], 'WARNING: Do not lick.', 'BARRIER'),
  minion('cog_m2', 'Cog Worker', 1, 'COGSMITHS', 'COMMON', 2, 1, 'MECH',
    ['SWIFT', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(1))],
    'It ain\'t much, but it\'s honest work.', 'Deal 1 damage to a random enemy'),
  minion('cog_m3', 'Rivet Gunner', 1, 'COGSMITHS', 'COMMON', 1, 3, 'MECH',
    ['GUARDIAN'],
    [], 'Nails everything. Including your opponents.', 'GUARDIAN'),
  minion('cog_m4', 'Wire Runner', 1, 'COGSMITHS', 'COMMON', 2, 2, 'MECH',
    ['SWIFT'],
    [], 'Zips through cables faster than electricity.', 'SWIFT'),
  // 2-cost (4)
  minion('cog_m5', 'Bolt Tightener', 2, 'COGSMITHS', 'COMMON', 1, 4, 'MECH',
    ['BARRIER', 'GUARDIAN'],
    [], 'Loose bolts? Not on my watch.', 'BARRIER. GUARDIAN'),
  minion('cog_m6', 'Scrap Collector', 2, 'COGSMITHS', 'COMMON', 2, 3, 'MECH',
    ['SWIFT', 'T:DEPLOY'],
    [E('DRAW', PLAY, NONE, draw(1))],
    'One bot\'s trash is another bot\'s treasure.', 'Draw a card'),
  minion('cog_m7', 'Recycler Bot', 2, 'COGSMITHS', 'COMMON', 3, 2, 'MECH',
    ['DRAIN'],
    [], 'Reduce, reuse, reboot.', 'DRAIN'),
  minion('cog_m8', 'Welding Drone', 2, 'COGSMITHS', 'COMMON', 2, 3, 'MECH',
    ['BARRIER', 'T:DEPLOY'],
    [E('HEAL', PLAY, F_HERO, heal(2))],
    'Patches you up. Whether you want it or not.', 'Restore 2 health to your hero'),
  // 3-cost (4)
  minion('cog_m9', 'Copper Sentinel', 3, 'COGSMITHS', 'COMMON', 2, 5, 'MECH',
    ['GUARDIAN', 'DRAIN'],
    [], 'Shiny and chrome, as intended.', 'GUARDIAN. DRAIN'),
  minion('cog_m10', 'Junkyard Hound', 3, 'COGSMITHS', 'COMMON', 3, 4, 'MECH',
    ['SWIFT', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(1))],
    'Good boy! Who\'s a good corrosion-resistant boy?', 'Deal 1 damage to a random enemy'),
  minion('cog_m11', 'Shield Generator', 3, 'COGSMITHS', 'RARE', 2, 5, 'MECH',
    ['BARRIER', 'T:DEPLOY'],
    [E('GRANT_KEYWORD', PLAY, RAND_FM, grantKw('BARRIER'))],
    'Generating shields since 3025.', 'Give a random friendly minion BARRIER'),
  minion('cog_m12', 'Chrome Medic', 3, 'COGSMITHS', 'COMMON', 3, 4, 'MECH',
    ['DRAIN', 'T:DEPLOY'],
    [E('HEAL', PLAY, F_HERO, heal(3))],
    'The bedside manner needs work. The healing doesn\'t.', 'Restore 3 health to your hero'),
  // 4-cost (3)
  minion('cog_m13', 'Steel Rampart', 4, 'COGSMITHS', 'COMMON', 2, 7, 'MECH',
    ['GUARDIAN', 'BARRIER', 'T:DEPLOY'],
    [E('BUFF', PLAY, CHOSEN, buff(0, 2))],
    'They shall not pass. Mostly because it\'s blocking the door.', 'GUARDIAN. BARRIER. Give a minion +0/+2'),
  minion('cog_m14', 'Turret Deployer', 4, 'COGSMITHS', 'COMMON', 3, 5, 'MECH',
    ['SWIFT', 'T:DEPLOY'],
    [E('SUMMON', PLAY, NONE, summon(1))],
    'Some assembly required. Batteries not included.', 'Summon a 2/2 Mech Turret'),
  minion('cog_m15', 'Circuit Breaker', 4, 'COGSMITHS', 'RARE', 4, 5, 'MECH',
    ['BARRIER', 'DRAIN'],
    [], 'Breaks circuits. And faces.', 'BARRIER. DRAIN'),
  // 5-cost (3)
  minion('cog_m16', 'Overclocked Engine', 5, 'COGSMITHS', 'RARE', 5, 6, 'MECH',
    ['SWIFT', 'BARRIER', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(2))],
    'The warranty is void. So, so void.', 'Deal 2 damage to a random enemy. BARRIER'),
  minion('cog_m17', 'Ironclad Behemoth', 5, 'COGSMITHS', 'COMMON', 4, 7, 'MECH',
    ['GUARDIAN', 'DRAIN', 'T:DEPLOY'],
    [E('BUFF', PLAY, ALL_FM, buff(0, 2))],
    'The immovable object AND the unstoppable force.', 'GUARDIAN. Give all friendly minions +0/+2'),
  minion('cog_m18', 'Arc Welder', 5, 'COGSMITHS', 'COMMON', 5, 6, 'MECH',
    ['SWIFT', 'DRAIN'],
    [], 'Welds. Heals. Welds AND heals.', 'SWIFT. DRAIN'),
  // 6-cost (2)
  minion('cog_m19', 'Bronze Colossus', 6, 'COGSMITHS', 'COMMON', 5, 8, 'MECH',
    ['GUARDIAN', 'BARRIER', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(3))],
    'Big. Bronze. Beautiful.', 'GUARDIAN. BARRIER. Deal 3 damage to a random enemy'),
  minion('cog_m20', 'Siege Automaton', 6, 'COGSMITHS', 'RARE', 6, 7, 'MECH',
    ['SWIFT', 'DRAIN', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, ALL_EM, dmg(2))],
    'For when diplomacy fails. Which is always.', 'Deal 2 damage to all enemy minions'),
  // 7-cost (1)
  minion('cog_m21', 'Titanium Fortress', 7, 'COGSMITHS', 'EPIC', 4, 12, 'MECH',
    ['GUARDIAN', 'BARRIER', 'DRAIN', 'T:DEPLOY'],
    [E('BUFF', PLAY, ALL_FM, buff(1, 2))],
    'Not going anywhere. Ever.', 'GUARDIAN. BARRIER. DRAIN. Give all friendly minions +1/+2'),
  // 8-cost (1) — No starforge for COGSMITHS, make a big epic
  minion('cog_m22', 'Omega Warframe', 8, 'COGSMITHS', 'EPIC', 7, 9, 'MECH',
    ['GUARDIAN', 'BARRIER', 'SWIFT', 'DRAIN', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(4))],
    'The final word in mechanical warfare.', 'GUARDIAN. BARRIER. DRAIN. Deal 4 damage to a random enemy'),
];

// ============================================================================
// LUMINAR — Holy Light Paladins (GUARDIAN/DRAIN/BARRIER/SWIFT)
// Theme: Heal, protect, sustain — divine fortitude
// Starforge: ARCHON'S CHOSEN (line 13198)
// ============================================================================
const LUMINAR_STARFORGE = `  {
    id: 'lum_archons_chosen',
    name: 'ARCHON\\'S CHOSEN',
    cost: 8,
    type: CardType.MINION,
    race: Race.LUMINAR,
    rarity: CardRarity.EPIC,
    attack: 6,
    health: 9,
    keywords: [{ keyword: CombatKeyword.SWIFT }, { keyword: CombatKeyword.DRAIN }, { keyword: CombatKeyword.BLITZ }, { keyword: TriggerKeyword.DEPLOY }],
    effects: [{ id: 'e0', type: EffectType.BUFF, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.CHOSEN, data: { attack: 3, health: 3 } as BuffEffectData, isMandatory: true }],
    starforge: {
    type: StarforgeType.PROGRESSIVE,
    conditions: [{
      type: StarforgeConditionType.SPELLS_CAST,
      targetValue: 10,
      persistsAcrossZones: true,
      persistsIfSilenced: true,
    }],
    forgedForm: {
      name: 'ARCHON ASCENDANT',
      cost: 8,
      attack: 12,
      health: 12,
      keywords: [{ keyword: CombatKeyword.BLITZ }, { keyword: CombatKeyword.DRAIN }, { keyword: CombatKeyword.SWIFT }],
      effects: [],
      cardText: 'BARRIER, GUARDIAN, DRAIN. ILLUMINATE: Fully heal your Hero.',
    },
    isReversible: false,
    transformationText: 'STARFORGE — After healing 30 Health: Transform into ARCHON ASCENDANT — 12/12, BARRIER, GUARDIAN, DRAIN. ILLUMINATE: Fully heal your Hero.',
  },
    flavorText: 'Chosen by the Archon. Feared by everything else.',
    cardText: 'BARRIER. GUARDIAN. Gain +3/+3 and DRAIN',
    collectible: true,
    set: 'CORE',
  }`;

const LUMINAR = [
  // --- SPELLS (5) ---
  spell('lum_s1', 'Divine Light', 1, 'LUMINAR', 'COMMON', [],
    [E('HEAL', PLAY, F_HERO, heal(5))],
    'The light provides. The light HEALS.', 'Restore 5 health to your hero'),
  spell('lum_s2', 'Blessed Radiance', 2, 'LUMINAR', 'COMMON', [],
    [E('BUFF', PLAY, CHOSEN, buff(1, 3)), E('GRANT_KEYWORD', PLAY, CHOSEN, grantKw('GUARDIAN'))],
    'The light makes you sturdier. And shinier.', 'Give a minion +1/+3 and GUARDIAN'),
  spell('lum_s3', 'Consecration', 3, 'LUMINAR', 'RARE', [],
    [E('DAMAGE', PLAY, ALL_EM, dmg(2))],
    'Holy fire. Burns the unholy. And the carpet.', 'Deal 2 damage to all enemy minions'),
  spell('lum_s4', 'Restoration Wave', 4, 'LUMINAR', 'COMMON', [],
    [E('HEAL', PLAY, F_HERO, heal(8)), E('DRAW', PLAY, NONE, draw(1))],
    'Healing body and mind. Not necessarily in that order.', 'Restore 8 health to your hero. Draw a card'),
  spell('lum_s5', 'Aegis of Light', 6, 'LUMINAR', 'RARE', [],
    [E('BUFF', PLAY, ALL_FM, buff(2, 2))],
    'Everyone gets a shield! You get a shield! YOU get a shield!', 'Give all friendly minions +2/+2'),
  // --- STRUCTURES (3) ---
  structure('lum_st1', 'Sunwell Shrine', 2, 'LUMINAR', 'COMMON', ['T:DEPLOY'],
    [E('HEAL', PLAY, F_HERO, heal(2))],
    'Drink of the light. Taste like lemonade.', 'Start of turn: Restore 2 health to your hero'),
  structure('lum_st2', 'Cathedral of Dawn', 4, 'LUMINAR', 'RARE', ['T:DEPLOY'],
    [E('HEAL', PLAY, F_HERO, heal(4))],
    'Services every Sunday. Healing every day.', 'Start of turn: Restore 4 health to your hero'),
  structure('lum_st3', 'Beacon of Hope', 3, 'LUMINAR', 'COMMON', ['T:DEPLOY'],
    [E('BUFF', PLAY, ALL_FM, buff(0, 1))],
    'Hope springs eternal. So does the health buff.', 'Start of turn: Give all friendly minions +0/+1'),
  // --- MINIONS (21 + 1 starforge = 22) ---
  // 1-cost (4)
  minion('lum_m1', 'Acolyte of Light', 1, 'LUMINAR', 'COMMON', 1, 3, null,
    ['GUARDIAN'],
    [], 'Stands in the light. Stands IN THE WAY.', 'GUARDIAN'),
  minion('lum_m2', 'Temple Initiate', 1, 'LUMINAR', 'COMMON', 1, 2, null,
    ['DRAIN', 'T:DEPLOY'],
    [E('HEAL', PLAY, F_HERO, heal(2))],
    'Heals first. Asks questions later.', 'DRAIN. Restore 2 health to your hero'),
  minion('lum_m3', 'Sunbeam Sprite', 1, 'LUMINAR', 'COMMON', 2, 2, null,
    ['SWIFT'],
    [], 'Fast as light. Literally.', 'SWIFT'),
  minion('lum_m4', 'Prayer Candle', 1, 'LUMINAR', 'COMMON', 1, 3, null,
    ['DRAIN'],
    [], 'Burns for your sins. Heals for your wounds.', 'DRAIN'),
  // 2-cost (4)
  minion('lum_m5', 'Lightsworn Guardian', 2, 'LUMINAR', 'COMMON', 2, 3, null,
    ['GUARDIAN', 'DRAIN'],
    [], 'Heals make him stronger. Hugs also work.', 'GUARDIAN. DRAIN'),
  minion('lum_m6', 'Sunward Cleric', 2, 'LUMINAR', 'COMMON', 1, 4, null,
    ['GUARDIAN', 'T:DEPLOY'],
    [E('HEAL', PLAY, F_HERO, heal(3))],
    'The sermon is short. The healing is not.', 'GUARDIAN. Restore 3 health to your hero'),
  minion('lum_m7', 'Dawn Paladin', 2, 'LUMINAR', 'COMMON', 2, 4, null,
    ['DRAIN'],
    [], 'His faith is his armor. His mace is also his armor.', 'DRAIN'),
  minion('lum_m8', 'Shield Bearer', 2, 'LUMINAR', 'COMMON', 1, 5, null,
    ['GUARDIAN', 'BARRIER'],
    [], 'Two layers of protection. Minimum.', 'GUARDIAN. BARRIER'),
  // 3-cost (4)
  minion('lum_m9', 'Radiant Aegis', 3, 'LUMINAR', 'RARE', 2, 5, null,
    ['GUARDIAN', 'BARRIER', 'T:DEPLOY'],
    [E('HEAL', PLAY, F_HERO, heal(3))],
    'Heals make it shinier. And harder to kill.', 'GUARDIAN. BARRIER. Restore 3 health to your hero'),
  minion('lum_m10', 'Solhaven Knight', 3, 'LUMINAR', 'COMMON', 3, 4, null,
    ['DRAIN', 'SWIFT'],
    [], 'For honor! And also hit points!', 'DRAIN. SWIFT'),
  minion('lum_m11', 'Blessed Protector', 3, 'LUMINAR', 'COMMON', 2, 6, null,
    ['GUARDIAN', 'DRAIN'],
    [], 'Blessed by three saints. Tough as all three combined.', 'GUARDIAN. DRAIN'),
  minion('lum_m12', 'Dawnbreaker', 3, 'LUMINAR', 'COMMON', 3, 5, null,
    ['SWIFT', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(1))],
    'Breaks the dawn. And your face.', 'Deal 1 damage to a random enemy'),
  // 4-cost (3)
  minion('lum_m13', 'Crusading Templar', 4, 'LUMINAR', 'COMMON', 3, 6, null,
    ['GUARDIAN', 'DRAIN', 'T:DEPLOY'],
    [E('HEAL', PLAY, F_HERO, heal(4))],
    'Crusades for justice. Also for health potions.', 'GUARDIAN. DRAIN. Restore 4 health to your hero'),
  minion('lum_m14', 'Lightforged Avenger', 4, 'LUMINAR', 'RARE', 4, 5, null,
    ['BARRIER', 'DRAIN', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(2))],
    'Forged in light. Deals in darkness.', 'BARRIER. DRAIN. Deal 2 damage to a random enemy'),
  minion('lum_m15', 'Holy Warden', 4, 'LUMINAR', 'COMMON', 3, 7, null,
    ['GUARDIAN', 'BARRIER'],
    [], 'Nobody enters. Nobody leaves. Nobody complains.', 'GUARDIAN. BARRIER'),
  // 5-cost (2)
  minion('lum_m16', 'Archon Sentinel', 5, 'LUMINAR', 'RARE', 4, 7, null,
    ['GUARDIAN', 'DRAIN', 'BARRIER', 'T:DEPLOY'],
    [E('HEAL', PLAY, F_HERO, heal(5))],
    'Sentinel of the Archon. Guardian of the faithful.', 'GUARDIAN. DRAIN. BARRIER. Restore 5 health to your hero'),
  minion('lum_m17', 'Sunlit Protector', 5, 'LUMINAR', 'COMMON', 5, 6, null,
    ['GUARDIAN', 'SWIFT', 'T:DEPLOY'],
    [E('BUFF', PLAY, ALL_FM, buff(0, 2))],
    'Stands in the light. IS the light.', 'GUARDIAN. Give all friendly minions +0/+2'),
  // 6-cost (2)
  minion('lum_m18', 'Solhaven Crusader', 6, 'LUMINAR', 'COMMON', 5, 8, null,
    ['GUARDIAN', 'DRAIN', 'SWIFT', 'T:DEPLOY'],
    [E('HEAL', PLAY, F_HERO, heal(6))],
    'FOR THE LIGHT! (And also cardio.)', 'GUARDIAN. DRAIN. Restore 6 health to your hero'),
  minion('lum_m19', 'Seraphim Vanguard', 6, 'LUMINAR', 'RARE', 6, 7, null,
    ['BARRIER', 'DRAIN', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, ALL_EM, dmg(2))],
    'Wings of light. Fists of justice.', 'BARRIER. DRAIN. Deal 2 damage to all enemy minions'),
  // 7-cost (1)
  minion('lum_m20', 'High Archon', 7, 'LUMINAR', 'EPIC', 6, 9, null,
    ['GUARDIAN', 'BARRIER', 'DRAIN', 'T:DEPLOY'],
    [E('HEAL', PLAY, F_HERO, heal(8)), E('BUFF', PLAY, ALL_FM, buff(1, 1))],
    'The highest of archons. The healingest of healers.', 'GUARDIAN. BARRIER. DRAIN. Restore 8 health. Give all friendly minions +1/+1'),
  // 8-cost = STARFORGE card (inserted separately)
  // 9-cost (1)
  minion('lum_m21', 'Avatar of Solhaven', 9, 'LUMINAR', 'EPIC', 8, 10, null,
    ['GUARDIAN', 'BARRIER', 'DRAIN', 'SWIFT', 'T:DEPLOY'],
    [E('HEAL', PLAY, F_HERO, heal(10))],
    'The sun made flesh. The light made fist.', 'GUARDIAN. BARRIER. DRAIN. Restore 10 health to your hero'),
];

// ============================================================================
// PYROCLAST — Volcanic Aggro (BLITZ/DOUBLE_STRIKE/SWIFT/DRAIN/LETHAL)
// Theme: Fast, explosive, burn everything
// No starforge in starter deck
// ============================================================================
const PYROCLAST = [
  // --- SPELLS (5) ---
  spell('pyro_s1', 'Firebolt', 1, 'PYROCLAST', 'COMMON', [],
    [E('DAMAGE', PLAY, CHOSEN, dmg(3))],
    'Point. Shoot. Burn.', 'Deal 3 damage'),
  spell('pyro_s2', 'Volcanic Eruption', 3, 'PYROCLAST', 'RARE', [],
    [E('DAMAGE', PLAY, ALL_EM, dmg(2))],
    'The floor is literally lava.', 'Deal 2 damage to all enemy minions'),
  spell('pyro_s3', 'Infernal Strike', 2, 'PYROCLAST', 'COMMON', [],
    [E('DAMAGE', PLAY, CHOSEN, dmg(4))],
    'Strike first. Strike hard. Strike with fire.', 'Deal 4 damage'),
  spell('pyro_s4', 'Pyroblast', 5, 'PYROCLAST', 'RARE', [],
    [E('DAMAGE', PLAY, CHOSEN, dmg(8))],
    'Subtlety was never an option.', 'Deal 8 damage'),
  spell('pyro_s5', 'Flame Surge', 4, 'PYROCLAST', 'COMMON', [],
    [E('DAMAGE', PLAY, ALL_E, dmg(3))],
    'Surge pricing applies to everything.', 'Deal 3 damage to all enemies'),
  // --- STRUCTURES (3) ---
  structure('pyro_st1', 'Magma Vent', 2, 'PYROCLAST', 'COMMON', ['T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(2))],
    'Nature\'s space heater.', 'Start of turn: Deal 2 damage to a random enemy'),
  structure('pyro_st2', 'Inferno Altar', 3, 'PYROCLAST', 'COMMON', ['T:DEPLOY'],
    [E('BUFF', PLAY, ALL_FM, buff(1, 0))],
    'Worship the flame. Gain the flame.', 'Start of turn: Give all friendly minions +1/+0'),
  structure('pyro_st3', 'Lava Forge', 4, 'PYROCLAST', 'RARE', ['T:DEPLOY'],
    [E('DAMAGE', PLAY, ALL_EM, dmg(1))],
    'Hot enough for ya? No? How about now?', 'Start of turn: Deal 1 damage to all enemy minions'),
  // --- MINIONS (22) ---
  // 1-cost (4)
  minion('pyro_m1', 'Cinderspark', 1, 'PYROCLAST', 'COMMON', 2, 1, 'ELEMENTAL',
    ['BLITZ'],
    [], 'Small but ANGRY.', 'BLITZ'),
  minion('pyro_m2', 'Flame Imp', 1, 'PYROCLAST', 'COMMON', 2, 2, 'ELEMENTAL',
    ['SWIFT'],
    [], 'Burns calories. And enemies.', 'SWIFT'),
  minion('pyro_m3', 'Ember Wisp', 1, 'PYROCLAST', 'COMMON', 1, 2, 'ELEMENTAL',
    ['DOUBLE_STRIKE'],
    [], 'Twice the fire. Half the size.', 'DOUBLE STRIKE'),
  minion('pyro_m4', 'Sparkling Igniter', 1, 'PYROCLAST', 'COMMON', 2, 2, 'ELEMENTAL',
    ['SWIFT', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(1))],
    'Ignites on contact. Contact is inevitable.', 'Deal 1 damage to a random enemy'),
  // 2-cost (4)
  minion('pyro_m5', 'Magma Hound', 2, 'PYROCLAST', 'COMMON', 3, 2, 'ELEMENTAL',
    ['BLITZ', 'SWIFT'],
    [], 'Fetches fireballs. Good boy.', 'BLITZ. SWIFT'),
  minion('pyro_m6', 'Ash Berserker', 2, 'PYROCLAST', 'COMMON', 3, 3, 'ELEMENTAL',
    ['DOUBLE_STRIKE'],
    [], 'Hits twice. Apologizes never.', 'DOUBLE STRIKE'),
  minion('pyro_m7', 'Lava Stalker', 2, 'PYROCLAST', 'COMMON', 2, 3, 'ELEMENTAL',
    ['BLITZ', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(1))],
    'Walks on lava. Runs on rage.', 'BLITZ. Deal 1 damage to a random enemy'),
  minion('pyro_m8', 'Scorch Dancer', 2, 'PYROCLAST', 'COMMON', 3, 2, 'ELEMENTAL',
    ['SWIFT', 'DRAIN'],
    [], 'Dances through the flames. Heals in the heat.', 'SWIFT. DRAIN'),
  // 3-cost (4)
  minion('pyro_m9', 'Volcanic Ravager', 3, 'PYROCLAST', 'COMMON', 4, 3, 'ELEMENTAL',
    ['BLITZ', 'DOUBLE_STRIKE'],
    [], 'Ravages. Doubly.', 'BLITZ. DOUBLE STRIKE'),
  minion('pyro_m10', 'Flame Dancer', 3, 'PYROCLAST', 'RARE', 3, 4, 'ELEMENTAL',
    ['SWIFT', 'DRAIN', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(2))],
    'Pirouettes of pain.', 'SWIFT. DRAIN. Deal 2 damage to a random enemy'),
  minion('pyro_m11', 'Eruptomancer', 3, 'PYROCLAST', 'COMMON', 3, 4, 'ELEMENTAL',
    ['LETHAL', 'SWIFT'],
    [], 'One touch and it\'s over.', 'LETHAL. SWIFT'),
  minion('pyro_m12', 'Obsidian Cleaver', 3, 'PYROCLAST', 'COMMON', 4, 4, 'ELEMENTAL',
    ['BLITZ'],
    [], 'Sharp. Hot. Coming for you.', 'BLITZ'),
  // 4-cost (3)
  minion('pyro_m13', 'Infernal Berserker', 4, 'PYROCLAST', 'COMMON', 5, 4, 'ELEMENTAL',
    ['BLITZ', 'SWIFT', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(2))],
    'Berserk is the only gear.', 'BLITZ. Deal 2 damage to a random enemy'),
  minion('pyro_m14', 'Caldera Giant', 4, 'PYROCLAST', 'RARE', 4, 5, 'ELEMENTAL',
    ['DOUBLE_STRIKE', 'DRAIN'],
    [], 'Big enough to swim in lava. Mean enough to throw it.', 'DOUBLE STRIKE. DRAIN'),
  minion('pyro_m15', 'Magma Wyrm', 4, 'PYROCLAST', 'COMMON', 5, 5, 'ELEMENTAL',
    ['BLITZ', 'LETHAL'],
    [], 'A wyrm made of magma. Your argument is invalid.', 'BLITZ. LETHAL'),
  // 5-cost (3)
  minion('pyro_m16', 'Cinder Lord', 5, 'PYROCLAST', 'RARE', 6, 5, 'ELEMENTAL',
    ['BLITZ', 'DOUBLE_STRIKE', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(3))],
    'Lord of the cinders. King of the burn.', 'BLITZ. DOUBLE STRIKE. Deal 3 damage to a random enemy'),
  minion('pyro_m17', 'Volcanic Juggernaut', 5, 'PYROCLAST', 'COMMON', 5, 6, 'ELEMENTAL',
    ['BLITZ', 'DRAIN', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, ALL_EM, dmg(1))],
    'Unstoppable. Unquenchable. Uninsurable.', 'BLITZ. DRAIN. Deal 1 damage to all enemy minions'),
  minion('pyro_m18', 'Firestorm Phoenix', 5, 'PYROCLAST', 'COMMON', 5, 6, 'ELEMENTAL',
    ['SWIFT', 'DOUBLE_STRIKE'],
    [], 'Born in fire. Lives in fire. IS fire.', 'SWIFT. DOUBLE STRIKE'),
  // 6-cost (2)
  minion('pyro_m19', 'Molten Colossus', 6, 'PYROCLAST', 'COMMON', 7, 6, 'ELEMENTAL',
    ['BLITZ', 'DOUBLE_STRIKE', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, ALL_EM, dmg(2))],
    'Steps on things. Things melt.', 'BLITZ. DOUBLE STRIKE. Deal 2 damage to all enemy minions'),
  minion('pyro_m20', 'Ashbringer Titan', 6, 'PYROCLAST', 'RARE', 6, 7, 'ELEMENTAL',
    ['BLITZ', 'DRAIN', 'SWIFT'],
    [], 'Brings ash. Brings pain. Takes health.', 'BLITZ. DRAIN. SWIFT'),
  // 7-cost (1)
  minion('pyro_m21', 'Inferno Drake', 7, 'PYROCLAST', 'EPIC', 8, 7, 'DRAGON',
    ['BLITZ', 'DOUBLE_STRIKE', 'DRAIN', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, ALL_EM, dmg(3))],
    'Breathes fire. Eats fire. IS FIRE ITSELF.', 'BLITZ. DOUBLE STRIKE. DRAIN. Deal 3 damage to all enemy minions'),
  // 8-cost (1)
  minion('pyro_m22', 'Primordial Inferno', 8, 'PYROCLAST', 'EPIC', 9, 8, 'ELEMENTAL',
    ['BLITZ', 'DOUBLE_STRIKE', 'SWIFT', 'DRAIN', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, ALL_E, dmg(4))],
    'The first fire. The last fire. THE ONLY FIRE.', 'BLITZ. DOUBLE STRIKE. DRAIN. Deal 4 damage to all enemies'),
];

console.log('  COGSMITHS: 30 cards defined');
console.log('  LUMINAR: 30 cards defined');
console.log('  PYROCLAST: 30 cards defined');

// ============================================================================
// VOIDBORN — Eldritch Control (CLOAK/DRAIN/LETHAL/BARRIER/SWIFT)
// Theme: Stealth, assassination, life drain
// Starforge: PROPHET OF THE ENDLESS VOID (line 14222)
// ============================================================================
const VOIDBORN_STARFORGE = `  {
    id: 'void_prophet_of_the_endless_void',
    name: 'PROPHET OF THE ENDLESS VOID',
    cost: 9,
    type: CardType.MINION,
    race: Race.VOIDBORN,
    rarity: CardRarity.LEGENDARY,
    attack: 8,
    health: 9,
    keywords: [{ keyword: CombatKeyword.LETHAL }, { keyword: CombatKeyword.DRAIN }, { keyword: TriggerKeyword.DEPLOY }],
    effects: [{ id: 'e0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.RANDOM_ENEMY, data: { amount: 9 } as DamageEffectData, isMandatory: true }],
    starforge: {
    type: StarforgeType.PROGRESSIVE,
    conditions: [{
      type: StarforgeConditionType.BANISH_COUNT,
      targetValue: 20,
      persistsAcrossZones: true,
      persistsIfSilenced: true,
    }],
    forgedForm: {
      name: 'GOD OF THE VOID',
      cost: 9,
      attack: 12,
      health: 12,
      keywords: [],
      effects: [],
      cardText: 'PHASE. DEPLOY: BANISH your opponent\\'s hand AND deck. They draw 1 card per turn from a "Void Remnant" pool (random 1-cost minions).',
    },
    isReversible: false,
    transformationText: 'STARFORGE — After BANISHing 20 cards total: Transform into GOD OF THE VOID — 12/12, PHASE. DEPLOY: BANISH your opponent\\'s hand AND deck. They draw 1 card per turn from a "Void Remnant" pool (random 1-cost minions).',
  },
    flavorText: 'He preaches one gospel: nothingness. His congregation? Everyone. Eventually.',
    cardText: 'Deal 9 damage to a random enemy. LETHAL. DRAIN',
    collectible: true,
    set: 'CORE',
  }`;

const VOIDBORN = [
  // --- SPELLS (5) ---
  spell('void_s1', 'Shadow Bolt', 1, 'VOIDBORN', 'COMMON', [],
    [E('DAMAGE', PLAY, CHOSEN, dmg(3))],
    'From the void with love.', 'Deal 3 damage'),
  spell('void_s2', 'Void Drain', 2, 'VOIDBORN', 'COMMON', [],
    [E('DAMAGE', PLAY, CHOSEN, dmg(3)), E('HEAL', PLAY, F_HERO, heal(3))],
    'What\'s yours is mine. Especially your life force.', 'Deal 3 damage. Restore 3 health to your hero'),
  spell('void_s3', 'Tendrils of Darkness', 3, 'VOIDBORN', 'RARE', [],
    [E('DAMAGE', PLAY, ALL_EM, dmg(2))],
    'Reaching. Grasping. Destroying.', 'Deal 2 damage to all enemy minions'),
  spell('void_s4', 'Devour Essence', 4, 'VOIDBORN', 'COMMON', [],
    [E('DAMAGE', PLAY, CHOSEN, dmg(5)), E('DRAW', PLAY, NONE, draw(1))],
    'Eat the light. Digest the hope.', 'Deal 5 damage. Draw a card'),
  spell('void_s5', 'Oblivion', 6, 'VOIDBORN', 'RARE', [],
    [E('DAMAGE', PLAY, ALL_EM, dmg(4))],
    'Everything ends. Especially your minions.', 'Deal 4 damage to all enemy minions'),
  // --- STRUCTURES (2) ---
  structure('void_st1', 'Void Altar', 3, 'VOIDBORN', 'COMMON', ['T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(2))],
    'The altar demands sacrifice. Preferably yours.', 'Start of turn: Deal 2 damage to a random enemy'),
  structure('void_st2', 'Shadow Nexus', 4, 'VOIDBORN', 'RARE', ['T:DEPLOY'],
    [E('DRAW', PLAY, NONE, draw(1))],
    'Knowledge from the darkness. At a price.', 'Start of turn: Draw a card'),
  // --- MINIONS (22 + 1 starforge = 23, so 22 here) ---
  // 1-cost (4)
  minion('void_m1', 'Void Initiate', 1, 'VOIDBORN', 'COMMON', 1, 2, 'VOID',
    ['CLOAK'],
    [], 'Stares into the abyss. The abyss blinks first.', 'CLOAK'),
  minion('void_m2', 'Shadow Creeper', 1, 'VOIDBORN', 'COMMON', 2, 1, 'VOID',
    ['LETHAL'],
    [], 'Creeps in shadows. Kills in silence.', 'LETHAL'),
  minion('void_m3', 'Nether Wisp', 1, 'VOIDBORN', 'COMMON', 1, 3, 'VOID',
    ['DRAIN'],
    [], 'Wisps of nothing that steal everything.', 'DRAIN'),
  minion('void_m4', 'Dark Acolyte', 1, 'VOIDBORN', 'COMMON', 2, 2, 'VOID',
    ['SWIFT'],
    [], 'Darkness moves fast when motivated.', 'SWIFT'),
  // 2-cost (4)
  minion('void_m5', 'Shade Assassin', 2, 'VOIDBORN', 'COMMON', 3, 2, 'VOID',
    ['CLOAK', 'LETHAL'],
    [], 'You never see it coming. That\'s the point.', 'CLOAK. LETHAL'),
  minion('void_m6', 'Entropy Agent', 2, 'VOIDBORN', 'COMMON', 2, 3, 'VOID',
    ['DRAIN', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(1))],
    'Agent of chaos. Employee of the month.', 'DRAIN. Deal 1 damage to a random enemy'),
  minion('void_m7', 'Void Walker', 2, 'VOIDBORN', 'COMMON', 2, 4, 'VOID',
    ['CLOAK'],
    [], 'Walks between worlds. Trips on nothing.', 'CLOAK'),
  minion('void_m8', 'Umbral Leech', 2, 'VOIDBORN', 'COMMON', 3, 3, 'VOID',
    ['DRAIN'],
    [], 'Feeds on light. Poops darkness.', 'DRAIN'),
  // 3-cost (4)
  minion('void_m9', 'Nightmare Stalker', 3, 'VOIDBORN', 'RARE', 3, 3, 'VOID',
    ['CLOAK', 'LETHAL', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(1))],
    'Your nightmares have nightmares about this.', 'CLOAK. LETHAL. Deal 1 damage to a random enemy'),
  minion('void_m10', 'Thought Shredder', 3, 'VOIDBORN', 'COMMON', 3, 4, 'VOID',
    ['LETHAL', 'T:DEPLOY'],
    [E('DRAW', PLAY, NONE, draw(1))],
    'Your thoughts. My cards. Fair trade.', 'LETHAL. Draw a card'),
  minion('void_m11', 'Void Mirror', 3, 'VOIDBORN', 'COMMON', 2, 5, 'VOID',
    ['BARRIER', 'DRAIN'],
    [], 'Reflects nothing. Absorbs everything.', 'BARRIER. DRAIN'),
  minion('void_m12', 'Shadow Weaver', 3, 'VOIDBORN', 'COMMON', 3, 5, 'VOID',
    ['CLOAK', 'DRAIN'],
    [], 'Weaves shadows into shields. And swords.', 'CLOAK. DRAIN'),
  // 4-cost (3)
  minion('void_m13', 'Abyssal Horror', 4, 'VOIDBORN', 'COMMON', 4, 5, 'VOID',
    ['CLOAK', 'DRAIN', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(2))],
    'Horror is its middle name. Abyssal is its first.', 'CLOAK. DRAIN. Deal 2 damage to a random enemy'),
  minion('void_m14', 'Void Reaper', 4, 'VOIDBORN', 'RARE', 5, 4, 'VOID',
    ['LETHAL', 'DRAIN'],
    [], 'Reaps what you sow. And what you didn\'t sow.', 'LETHAL. DRAIN'),
  minion('void_m15', 'Phantom Devourer', 4, 'VOIDBORN', 'COMMON', 3, 6, 'VOID',
    ['BARRIER', 'CLOAK'],
    [], 'Devours phantoms. And everything else.', 'BARRIER. CLOAK'),
  // 5-cost (3)
  minion('void_m16', 'Eclipse Wraith', 5, 'VOIDBORN', 'COMMON', 5, 6, 'VOID',
    ['CLOAK', 'DRAIN', 'SWIFT'],
    [], 'Eclipses the sun. Steals the warmth.', 'CLOAK. DRAIN. SWIFT'),
  minion('void_m17', 'Nether Goliath', 5, 'VOIDBORN', 'RARE', 4, 7, 'VOID',
    ['BARRIER', 'DRAIN', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(3))],
    'From the deepest nether. With the deepest hatred.', 'BARRIER. DRAIN. Deal 3 damage to a random enemy'),
  minion('void_m18', 'Soul Harvester', 5, 'VOIDBORN', 'COMMON', 5, 6, 'VOID',
    ['LETHAL', 'DRAIN', 'T:DEPLOY'],
    [E('DRAW', PLAY, NONE, draw(1))],
    'Harvests souls. Pays in cards.', 'LETHAL. DRAIN. Draw a card'),
  // 6-cost (2)
  minion('void_m19', 'Oblivion Herald', 6, 'VOIDBORN', 'COMMON', 6, 7, 'VOID',
    ['CLOAK', 'DRAIN', 'LETHAL', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, ALL_EM, dmg(2))],
    'Heralds the end. Gets paid per apocalypse.', 'CLOAK. DRAIN. LETHAL. Deal 2 damage to all enemy minions'),
  minion('void_m20', 'Void Tyrant', 6, 'VOIDBORN', 'RARE', 5, 8, 'VOID',
    ['BARRIER', 'DRAIN', 'CLOAK'],
    [], 'Rules the void. The void approves.', 'BARRIER. DRAIN. CLOAK'),
  // 7-cost (1)
  minion('void_m21', 'Eldritch Colossus', 7, 'VOIDBORN', 'EPIC', 7, 8, 'VOID',
    ['CLOAK', 'DRAIN', 'BARRIER', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, ALL_EM, dmg(3))],
    'Colossus of the dark. Champion of nothing.', 'CLOAK. DRAIN. BARRIER. Deal 3 damage to all enemy minions'),
  // 9-cost = STARFORGE (inserted separately)
  // 8-cost (1)
  minion('void_m22', 'Void Leviathan', 8, 'VOIDBORN', 'EPIC', 8, 8, 'VOID',
    ['CLOAK', 'DRAIN', 'LETHAL', 'SWIFT', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(5))],
    'Swims in the void between stars. Eats stars for breakfast.', 'CLOAK. DRAIN. LETHAL. Deal 5 damage to a random enemy'),
];

// ============================================================================
// BIOTITANS — Adaptive Beasts (DRAIN/GUARDIAN/DOUBLE_STRIKE/BARRIER/SWIFT)
// Theme: Evolution, adaptation, massive beasts
// Starforge: WORLDEATER HYDRA (line 14584)
// ============================================================================
const BIOTITANS_STARFORGE = `  {
    id: 'bio_worldeater_hydra',
    name: 'WORLDEATER HYDRA',
    cost: 8,
    type: CardType.MINION,
    race: Race.BIOTITANS,
    rarity: CardRarity.EPIC,
    attack: 8,
    health: 8,
    tribe: MinionTribe.BEAST,
    keywords: [{ keyword: CombatKeyword.GUARDIAN }, { keyword: CombatKeyword.SWIFT }, { keyword: CombatKeyword.DRAIN }, { keyword: TriggerKeyword.DEPLOY }],
    effects: [{ id: 'e0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.RANDOM_ENEMY, data: { amount: 4 } as DamageEffectData, isMandatory: true }],
    starforge: {
    type: StarforgeType.PROGRESSIVE,
    conditions: [{
      type: StarforgeConditionType.ADAPT_COUNT,
      targetValue: 10,
      persistsAcrossZones: true,
      persistsIfSilenced: true,
    }],
    forgedForm: {
      name: 'HYDRA APEX',
      cost: 8,
      attack: 15,
      health: 15,
      keywords: [],
      effects: [],
      cardText: 'Has ALL ADAPT bonuses permanently. Whenever this attacks, ADAPT twice. Can\\'t be targeted by spells.',
    },
    isReversible: false,
    transformationText: 'STARFORGE — After ADAPTing 10 times: Transform into HYDRA APEX — 15/15. Has ALL ADAPT bonuses permanently. Whenever this attacks, ADAPT twice. Can\\'t be targeted by spells.',
  },
    flavorText: 'Three heads. Each one evolves independently. Each one hates you independently.',
    cardText: 'GUARDIAN. DRAIN. Deal 4 damage to a random enemy',
    collectible: true,
    set: 'CORE',
  }`;

const BIOTITANS = [
  // --- SPELLS (5) ---
  spell('bio_s1', 'Primal Roar', 1, 'BIOTITANS', 'COMMON', [],
    [E('BUFF', PLAY, CHOSEN, buff(2, 1))],
    'ROAR! (Translation: I\'m going to eat you.)', 'Give a minion +2/+1'),
  spell('bio_s2', 'Evolutionary Leap', 2, 'BIOTITANS', 'COMMON', [],
    [E('BUFF', PLAY, CHOSEN, buff(2, 2))],
    'Darwin would be proud. And terrified.', 'Give a minion +2/+2'),
  spell('bio_s3', 'Regrowth', 3, 'BIOTITANS', 'COMMON', [],
    [E('HEAL', PLAY, F_HERO, heal(8))],
    'Cut off a limb. Grow back two.', 'Restore 8 health to your hero'),
  spell('bio_s4', 'Stampede', 4, 'BIOTITANS', 'RARE', [],
    [E('DAMAGE', PLAY, ALL_EM, dmg(2)), E('BUFF', PLAY, ALL_FM, buff(1, 0))],
    'Everything charges at once. EVERYTHING.', 'Deal 2 damage to all enemy minions. Give all friendly minions +1/+0'),
  spell('bio_s5', 'Apex Evolution', 5, 'BIOTITANS', 'RARE', [],
    [E('BUFF', PLAY, ALL_FM, buff(2, 2))],
    'Peak evolution. Everyone evolves. NOW.', 'Give all friendly minions +2/+2'),
  // --- STRUCTURES (3) ---
  structure('bio_st1', 'Spawning Pool', 2, 'BIOTITANS', 'COMMON', ['T:DEPLOY'],
    [E('SUMMON', PLAY, NONE, summon(1))],
    'Things crawl out of this. Horrible things.', 'Start of turn: Summon a 1/1 Beast'),
  structure('bio_st2', 'Evolution Chamber', 3, 'BIOTITANS', 'RARE', ['T:DEPLOY'],
    [E('BUFF', PLAY, ALL_FM, buff(1, 0))],
    'Step in weak. Step out strong. Side effects vary.', 'Start of turn: Give all friendly minions +1/+0'),
  structure('bio_st3', 'Primordial Nest', 4, 'BIOTITANS', 'COMMON', ['T:DEPLOY'],
    [E('HEAL', PLAY, F_HERO, heal(3))],
    'Home sweet home. If home had fangs.', 'Start of turn: Restore 3 health to your hero'),
  // --- MINIONS (21 + 1 starforge = 22) ---
  // 1-cost (4)
  minion('bio_m1', 'Feral Whelp', 1, 'BIOTITANS', 'COMMON', 2, 1, 'BEAST',
    ['SWIFT'],
    [], 'Small. Fast. Bitey.', 'SWIFT'),
  minion('bio_m2', 'Spore Pod', 1, 'BIOTITANS', 'COMMON', 1, 3, 'BEAST',
    ['GUARDIAN'],
    [], 'Pops when touched. Don\'t touch it.', 'GUARDIAN'),
  minion('bio_m3', 'Creeping Vine', 1, 'BIOTITANS', 'COMMON', 1, 2, 'BEAST',
    ['DRAIN', 'T:DEPLOY'],
    [E('HEAL', PLAY, F_HERO, heal(2))],
    'Creeps. Heals. Creeps while healing.', 'DRAIN. Restore 2 health to your hero'),
  minion('bio_m4', 'Razortooth Pup', 1, 'BIOTITANS', 'COMMON', 2, 2, 'BEAST',
    ['DOUBLE_STRIKE'],
    [], 'Puppy teeth. Twice the bite.', 'DOUBLE STRIKE'),
  // 2-cost (4)
  minion('bio_m5', 'Thornback Raptor', 2, 'BIOTITANS', 'COMMON', 3, 2, 'BEAST',
    ['SWIFT', 'DRAIN'],
    [], 'Fast. Prickly. Hungry.', 'SWIFT. DRAIN'),
  minion('bio_m6', 'Shell Guardian', 2, 'BIOTITANS', 'COMMON', 1, 5, 'BEAST',
    ['GUARDIAN', 'DRAIN'],
    [], 'Its shell is tougher than your armor.', 'GUARDIAN. DRAIN'),
  minion('bio_m7', 'Fang Striker', 2, 'BIOTITANS', 'COMMON', 3, 3, 'BEAST',
    ['DOUBLE_STRIKE'],
    [], 'Two fangs. Two strikes. Zero mercy.', 'DOUBLE STRIKE'),
  minion('bio_m8', 'Marsh Leech', 2, 'BIOTITANS', 'COMMON', 2, 4, 'BEAST',
    ['DRAIN', 'T:DEPLOY'],
    [E('HEAL', PLAY, F_HERO, heal(2))],
    'Attaches. Drains. Won\'t let go.', 'DRAIN. Restore 2 health to your hero'),
  // 3-cost (4)
  minion('bio_m9', 'Alpha Predator', 3, 'BIOTITANS', 'RARE', 4, 3, 'BEAST',
    ['DOUBLE_STRIKE', 'DRAIN'],
    [], 'Top of the food chain. Top of the kill count.', 'DOUBLE STRIKE. DRAIN'),
  minion('bio_m10', 'Iron Tortoise', 3, 'BIOTITANS', 'COMMON', 2, 6, 'BEAST',
    ['GUARDIAN', 'BARRIER'],
    [], 'Slow and steady wins the not-dying contest.', 'GUARDIAN. BARRIER'),
  minion('bio_m11', 'Venomfang Lurker', 3, 'BIOTITANS', 'COMMON', 3, 4, 'BEAST',
    ['DRAIN', 'SWIFT', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(1))],
    'Lurks. Bites. You feel worse.', 'DRAIN. Deal 1 damage to a random enemy'),
  minion('bio_m12', 'Primal Charger', 3, 'BIOTITANS', 'COMMON', 4, 4, 'BEAST',
    ['SWIFT', 'DRAIN'],
    [], 'Charges primal-ly. Is that a word? It is now.', 'SWIFT. DRAIN'),
  // 4-cost (3)
  minion('bio_m13', 'Stampede Rhino', 4, 'BIOTITANS', 'COMMON', 4, 5, 'BEAST',
    ['GUARDIAN', 'DRAIN', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(2))],
    'INCOMING! No, seriously, MOVE.', 'GUARDIAN. DRAIN. Deal 2 damage to a random enemy'),
  minion('bio_m14', 'Twin-Claw Hunter', 4, 'BIOTITANS', 'RARE', 4, 5, 'BEAST',
    ['DOUBLE_STRIKE', 'DRAIN'],
    [], 'Two claws. Four strikes. Infinite regret for the enemy.', 'DOUBLE STRIKE. DRAIN'),
  minion('bio_m15', 'Evolving Brute', 4, 'BIOTITANS', 'COMMON', 3, 7, 'BEAST',
    ['GUARDIAN', 'BARRIER', 'T:DEPLOY'],
    [E('BUFF', PLAY, CHOSEN, buff(1, 1))],
    'Gets bigger. Gets meaner. Gets scarier.', 'GUARDIAN. BARRIER. Give a minion +1/+1'),
  // 5-cost (2)
  minion('bio_m16', 'Apex Stalker', 5, 'BIOTITANS', 'RARE', 5, 6, 'BEAST',
    ['DOUBLE_STRIKE', 'DRAIN', 'SWIFT'],
    [], 'Stalks. Strikes. Strikes AGAIN.', 'DOUBLE STRIKE. DRAIN. SWIFT'),
  minion('bio_m17', 'Behemoth Guardian', 5, 'BIOTITANS', 'COMMON', 4, 8, 'BEAST',
    ['GUARDIAN', 'DRAIN', 'BARRIER'],
    [], 'Guards the herd. IS the herd.', 'GUARDIAN. DRAIN. BARRIER'),
  // 6-cost (2)
  minion('bio_m18', 'Primeval Titan', 6, 'BIOTITANS', 'COMMON', 6, 7, 'BEAST',
    ['GUARDIAN', 'DOUBLE_STRIKE', 'DRAIN', 'T:DEPLOY'],
    [E('BUFF', PLAY, ALL_FM, buff(1, 1))],
    'Seven million years of evolution in one card.', 'GUARDIAN. DOUBLE STRIKE. DRAIN. Give all friendly minions +1/+1'),
  minion('bio_m19', 'Rampaging Colossus', 6, 'BIOTITANS', 'RARE', 7, 6, 'BEAST',
    ['DOUBLE_STRIKE', 'DRAIN', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(3))],
    'Rampage is its only setting.', 'DOUBLE STRIKE. DRAIN. Deal 3 damage to a random enemy'),
  // 7-cost (1)
  minion('bio_m20', 'Progenitor Rex', 7, 'BIOTITANS', 'EPIC', 7, 8, 'BEAST',
    ['GUARDIAN', 'DOUBLE_STRIKE', 'DRAIN', 'BARRIER', 'T:DEPLOY'],
    [E('BUFF', PLAY, ALL_FM, buff(1, 1))],
    'The first. The biggest. The hungriest.', 'GUARDIAN. DOUBLE STRIKE. DRAIN. BARRIER. Give all friendly minions +1/+1'),
  // 8-cost = STARFORGE (inserted separately)
  // 9-cost (1)
  minion('bio_m21', 'World Serpent', 9, 'BIOTITANS', 'EPIC', 9, 10, 'BEAST',
    ['GUARDIAN', 'DRAIN', 'DOUBLE_STRIKE', 'SWIFT', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, ALL_EM, dmg(3))],
    'Wraps around the world. Squeezes.', 'GUARDIAN. DRAIN. DOUBLE STRIKE. Deal 3 damage to all enemy minions'),
];

console.log('  VOIDBORN: 30 cards defined');
console.log('  BIOTITANS: 30 cards defined');

// ============================================================================
// CRYSTALLINE — Crystal Fortress (BARRIER/GUARDIAN/DRAIN/DOUBLE_STRIKE/SWIFT)
// Theme: Unbreakable defense, crystal constructs, magical resonance
// Starforge: GEODE SAGE LUMIS (line 15389)
// ============================================================================
const CRYSTALLINE_STARFORGE = `  {
    id: 'crys_geode_sage_lumis',
    name: 'GEODE SAGE LUMIS',
    cost: 9,
    type: CardType.MINION,
    race: Race.CRYSTALLINE,
    rarity: CardRarity.LEGENDARY,
    attack: 7,
    health: 10,
    keywords: [{ keyword: CombatKeyword.DRAIN }, { keyword: TriggerKeyword.DEPLOY }],
    effects: [{ id: 'e0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.RANDOM_ENEMY, data: { amount: 9 } as DamageEffectData, isMandatory: true }],
    starforge: {
    type: StarforgeType.PROGRESSIVE,
    conditions: [{
      type: StarforgeConditionType.SPELLS_CAST,
      targetValue: 25,
      persistsAcrossZones: true,
      persistsIfSilenced: true,
    }],
    forgedForm: {
      name: 'LUMIS, ARCANE AVATAR',
      cost: 9,
      attack: 10,
      health: 12,
      keywords: [],
      effects: [],
      cardText: 'ALL spells you cast are cast twice. Your spells cost (3) less. RESONATE effects trigger three times.',
    },
    isReversible: false,
    transformationText: 'STARFORGE — After casting 25 spells: Transform into LUMIS, ARCANE AVATAR — 10/12. ALL spells you cast are cast twice. Your spells cost (3) less. RESONATE effects trigger three times.',
  },
    flavorText: 'He didn\\'t master Prismora\\'s crystals. He IS Prismora\\'s crystals.',
    cardText: 'DRAIN. Deal 9 damage to a random enemy',
    collectible: true,
    set: 'CORE',
  }`;

const CRYSTALLINE = [
  // --- SPELLS (5) ---
  spell('crys_s1', 'Crystal Shard', 1, 'CRYSTALLINE', 'COMMON', [],
    [E('DAMAGE', PLAY, CHOSEN, dmg(2)), E('DRAW', PLAY, NONE, draw(1))],
    'Sharp, shiny, and surprisingly aerodynamic.', 'Deal 2 damage. Draw a card'),
  spell('crys_s2', 'Prismatic Shield', 2, 'CRYSTALLINE', 'COMMON', [],
    [E('BUFF', PLAY, CHOSEN, buff(0, 4)), E('GRANT_KEYWORD', PLAY, CHOSEN, grantKw('BARRIER'))],
    'Seven colors of not-dying.', 'Give a minion +0/+4 and BARRIER'),
  spell('crys_s3', 'Refraction Blast', 3, 'CRYSTALLINE', 'RARE', [],
    [E('DAMAGE', PLAY, ALL_EM, dmg(2))],
    'One beam in. A thousand beams out.', 'Deal 2 damage to all enemy minions'),
  spell('crys_s4', 'Diamond Plating', 4, 'CRYSTALLINE', 'COMMON', [],
    [E('BUFF', PLAY, ALL_FM, buff(0, 3))],
    'Harder than diamond. Because it IS diamond.', 'Give all friendly minions +0/+3'),
  spell('crys_s5', 'Resonance Cascade', 5, 'CRYSTALLINE', 'RARE', [],
    [E('DAMAGE', PLAY, ALL_EM, dmg(3)), E('BUFF', PLAY, ALL_FM, buff(1, 1))],
    'The crystals sing. Everything else screams.', 'Deal 3 damage to all enemy minions. Give all friendly minions +1/+1'),
  // --- STRUCTURES (3) ---
  structure('crys_st1', 'Crystal Pylon', 2, 'CRYSTALLINE', 'COMMON', ['T:DEPLOY'],
    [E('BUFF', PLAY, ALL_FM, buff(0, 1))],
    'Hums with power. Don\'t touch.', 'Start of turn: Give all friendly minions +0/+1'),
  structure('crys_st2', 'Gemstone Vault', 3, 'CRYSTALLINE', 'COMMON', ['T:DEPLOY'],
    [E('DRAW', PLAY, NONE, draw(1))],
    'Shiny AND useful.', 'Start of turn: Draw a card'),
  structure('crys_st3', 'Resonance Core', 4, 'CRYSTALLINE', 'RARE', ['T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(2))],
    'Vibrates at the frequency of pain.', 'Start of turn: Deal 2 damage to a random enemy'),
  // --- MINIONS (21 + 1 starforge = 22) ---
  // 1-cost (3)
  minion('crys_m1', 'Quartz Sentry', 1, 'CRYSTALLINE', 'COMMON', 1, 3, 'ELEMENTAL',
    ['GUARDIAN'],
    [], 'Clear as crystal. Hard as rock.', 'GUARDIAN'),
  minion('crys_m2', 'Gem Sprite', 1, 'CRYSTALLINE', 'COMMON', 1, 2, 'ELEMENTAL',
    ['BARRIER'],
    [], 'Tiny but tough. And sparkly.', 'BARRIER'),
  minion('crys_m3', 'Crystal Moth', 1, 'CRYSTALLINE', 'COMMON', 2, 2, 'ELEMENTAL',
    ['SWIFT'],
    [], 'Attracted to all light sources. Including spells.', 'SWIFT'),
  // 2-cost (4)
  minion('crys_m4', 'Obsidian Defender', 2, 'CRYSTALLINE', 'COMMON', 1, 5, 'ELEMENTAL',
    ['GUARDIAN', 'BARRIER'],
    [], 'Dark crystal. Bright defense.', 'GUARDIAN. BARRIER'),
  minion('crys_m5', 'Topaz Striker', 2, 'CRYSTALLINE', 'COMMON', 3, 2, 'ELEMENTAL',
    ['DOUBLE_STRIKE'],
    [], 'Strikes with both facets.', 'DOUBLE STRIKE'),
  minion('crys_m6', 'Sapphire Healer', 2, 'CRYSTALLINE', 'COMMON', 2, 3, 'ELEMENTAL',
    ['DRAIN', 'T:DEPLOY'],
    [E('HEAL', PLAY, F_HERO, heal(2))],
    'Blue crystal, blue healing vibes.', 'DRAIN. Restore 2 health to your hero'),
  minion('crys_m7', 'Amethyst Scout', 2, 'CRYSTALLINE', 'COMMON', 2, 4, 'ELEMENTAL',
    ['SWIFT', 'DRAIN'],
    [], 'Scouts ahead. Heals behind.', 'SWIFT. DRAIN'),
  // 3-cost (4)
  minion('crys_m8', 'Ruby Golem', 3, 'CRYSTALLINE', 'COMMON', 3, 4, 'CONSTRUCT',
    ['GUARDIAN', 'DRAIN'],
    [], 'Red means stop. Permanently.', 'GUARDIAN. DRAIN'),
  minion('crys_m9', 'Diamond Guardian', 3, 'CRYSTALLINE', 'RARE', 2, 6, 'ELEMENTAL',
    ['GUARDIAN', 'BARRIER', 'T:DEPLOY'],
    [E('BUFF', PLAY, CHOSEN, buff(0, 2))],
    'The hardest guardian. In every sense.', 'GUARDIAN. BARRIER. Give a minion +0/+2'),
  minion('crys_m10', 'Prism Knight', 3, 'CRYSTALLINE', 'COMMON', 3, 5, 'ELEMENTAL',
    ['BARRIER', 'DRAIN'],
    [], 'Refracts damage. Absorbs life.', 'BARRIER. DRAIN'),
  minion('crys_m11', 'Emerald Dancer', 3, 'CRYSTALLINE', 'COMMON', 4, 3, 'ELEMENTAL',
    ['DOUBLE_STRIKE', 'SWIFT'],
    [], 'Dances twice. Cuts twice.', 'DOUBLE STRIKE. SWIFT'),
  // 4-cost (3)
  minion('crys_m12', 'Geode Sentinel', 4, 'CRYSTALLINE', 'COMMON', 3, 7, 'ELEMENTAL',
    ['GUARDIAN', 'BARRIER', 'DRAIN'],
    [], 'Rough on the outside. Sparkling on the inside.', 'GUARDIAN. BARRIER. DRAIN'),
  minion('crys_m13', 'Opal Ravager', 4, 'CRYSTALLINE', 'RARE', 5, 4, 'ELEMENTAL',
    ['DOUBLE_STRIKE', 'DRAIN', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(2))],
    'Opalescent AND violent.', 'DOUBLE STRIKE. DRAIN. Deal 2 damage to a random enemy'),
  minion('crys_m14', 'Crystal Warden', 4, 'CRYSTALLINE', 'COMMON', 3, 6, 'ELEMENTAL',
    ['GUARDIAN', 'BARRIER', 'T:DEPLOY'],
    [E('BUFF', PLAY, ALL_FM, buff(0, 1))],
    'Wardens never sleep. Crystal never breaks.', 'GUARDIAN. BARRIER. Give all friendly minions +0/+1'),
  // 5-cost (3)
  minion('crys_m15', 'Resonance Drake', 5, 'CRYSTALLINE', 'RARE', 5, 6, 'DRAGON',
    ['BARRIER', 'DOUBLE_STRIKE', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(2))],
    'Crystal wings. Crystal teeth. Crystal clear intentions.', 'BARRIER. DOUBLE STRIKE. Deal 2 damage to a random enemy'),
  minion('crys_m16', 'Monolith Protector', 5, 'CRYSTALLINE', 'COMMON', 3, 9, 'ELEMENTAL',
    ['GUARDIAN', 'BARRIER', 'DRAIN'],
    [], 'A monument to stubbornness.', 'GUARDIAN. BARRIER. DRAIN'),
  minion('crys_m17', 'Jade Templar', 5, 'CRYSTALLINE', 'COMMON', 5, 6, 'ELEMENTAL',
    ['GUARDIAN', 'DRAIN', 'T:DEPLOY'],
    [E('HEAL', PLAY, F_HERO, heal(4))],
    'Green with envy? No. Green with POWER.', 'GUARDIAN. DRAIN. Restore 4 health to your hero'),
  // 6-cost (2)
  minion('crys_m18', 'Crystal Colossus', 6, 'CRYSTALLINE', 'COMMON', 5, 8, 'ELEMENTAL',
    ['GUARDIAN', 'BARRIER', 'DRAIN', 'T:DEPLOY'],
    [E('BUFF', PLAY, ALL_FM, buff(0, 2))],
    'Towering. Shimmering. Unbreakable.', 'GUARDIAN. BARRIER. DRAIN. Give all friendly minions +0/+2'),
  minion('crys_m19', 'Prismora Archon', 6, 'CRYSTALLINE', 'RARE', 6, 7, 'ELEMENTAL',
    ['BARRIER', 'DOUBLE_STRIKE', 'DRAIN'],
    [], 'Rules the crystal realm. With a crystal fist.', 'BARRIER. DOUBLE STRIKE. DRAIN'),
  // 7-cost (1)
  minion('crys_m20', 'Diamond Titan', 7, 'CRYSTALLINE', 'EPIC', 6, 10, 'ELEMENTAL',
    ['GUARDIAN', 'BARRIER', 'DRAIN', 'DOUBLE_STRIKE', 'T:DEPLOY'],
    [E('BUFF', PLAY, ALL_FM, buff(1, 2))],
    'Hardest. Titan. Ever.', 'GUARDIAN. BARRIER. DRAIN. DOUBLE STRIKE. Give all friendly minions +1/+2'),
  // 9-cost = STARFORGE (inserted separately)
  // 8-cost (1)
  minion('crys_m21', 'Living Geode', 8, 'CRYSTALLINE', 'EPIC', 7, 10, 'ELEMENTAL',
    ['GUARDIAN', 'BARRIER', 'DRAIN', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, ALL_EM, dmg(3))],
    'Not a rock. A LIVING rock. With FEELINGS. And violence.', 'GUARDIAN. BARRIER. DRAIN. Deal 3 damage to all enemy minions'),
];

console.log('  CRYSTALLINE: 30 cards defined');

// ============================================================================
// PHANTOM_CORSAIRS — Ghost Pirates (SWIFT/CLOAK/BLITZ/DRAIN/LETHAL)
// Theme: Speed, stealth, hit-and-run piracy
// Starforge: PHANTOM ADMIRAL (line 15617)
// ============================================================================
const PC_STARFORGE = `  {
    id: 'pc_phantom_admiral',
    name: 'PHANTOM ADMIRAL',
    cost: 7,
    type: CardType.MINION,
    race: Race.PHANTOM_CORSAIRS,
    rarity: CardRarity.EPIC,
    attack: 6,
    health: 8,
    tribe: MinionTribe.PIRATE,
    keywords: [{ keyword: CombatKeyword.LETHAL }, { keyword: CombatKeyword.SWIFT }, { keyword: TriggerKeyword.DEPLOY }],
    effects: [{ id: 'e0', type: EffectType.SUMMON, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.NONE, data: { cardId: 'token_generated', count: 1 } as SummonEffectData, isMandatory: true }],
    starforge: {
    type: StarforgeType.PROGRESSIVE,
    conditions: [{
      type: StarforgeConditionType.CARDS_STOLEN,
      targetValue: 10,
      persistsAcrossZones: true,
      persistsIfSilenced: true,
    }],
    forgedForm: {
      name: 'ADMIRAL OF THE DAMNED',
      cost: 7,
      attack: 10,
      health: 10,
      keywords: [],
      effects: [],
      cardText: 'PHASE. ALL Pirates have PHASE. Whenever you play a card, steal a random card from your opponent\\'s hand. Stolen cards cost (0).',
    },
    isReversible: false,
    transformationText: 'STARFORGE — After playing 10 stolen cards: Transform into ADMIRAL OF THE DAMNED — 10/10, PHASE. ALL Pirates have PHASE. Whenever you play a card, steal a random card from your opponent\\'s hand. Stolen cards cost (0).',
  },
    flavorText: 'The Admiral doesn\\'t command a fleet. The Admiral commands a GHOST fleet.',
    cardText: 'LETHAL. SWIFT. Summon a 3/3 Phantom Pirate',
    collectible: true,
    set: 'CORE',
  }`;

const PHANTOM_CORSAIRS = [
  // --- SPELLS (5) ---
  spell('pc_s1', 'Cutlass Strike', 1, 'PHANTOM_CORSAIRS', 'COMMON', [],
    [E('DAMAGE', PLAY, CHOSEN, dmg(3))],
    'Quick. Clean. Deadly.', 'Deal 3 damage'),
  spell('pc_s2', 'Plunder', 2, 'PHANTOM_CORSAIRS', 'COMMON', [],
    [E('DRAW', PLAY, NONE, draw(2))],
    'Take everything. Leave nothing.', 'Draw 2 cards'),
  spell('pc_s3', 'Ghostly Broadside', 3, 'PHANTOM_CORSAIRS', 'RARE', [],
    [E('DAMAGE', PLAY, ALL_EM, dmg(2))],
    'You can\'t dodge ghost cannonballs.', 'Deal 2 damage to all enemy minions'),
  spell('pc_s4', 'Boarding Action', 4, 'PHANTOM_CORSAIRS', 'COMMON', [],
    [E('DAMAGE', PLAY, CHOSEN, dmg(4)), E('SUMMON', PLAY, NONE, summon(1))],
    'BOARD THEM! BOARD EVERYTHING!', 'Deal 4 damage. Summon a 2/2 Phantom Pirate'),
  spell('pc_s5', 'Cannon Barrage', 5, 'PHANTOM_CORSAIRS', 'RARE', [],
    [E('DAMAGE', PLAY, ALL_E, dmg(3))],
    'FIRE! FIRE EVERYTHING!', 'Deal 3 damage to all enemies'),
  // --- STRUCTURES (3) ---
  structure('pc_st1', 'Smuggler\'s Cache', 2, 'PHANTOM_CORSAIRS', 'COMMON', ['T:DEPLOY'],
    [E('DRAW', PLAY, NONE, draw(1))],
    'Hidden. Valuable. Probably stolen.', 'Start of turn: Draw a card'),
  structure('pc_st2', 'Ghost Cannon', 3, 'PHANTOM_CORSAIRS', 'COMMON', ['T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(2))],
    'Fires ghost bullets. Still hurts.', 'Start of turn: Deal 2 damage to a random enemy'),
  structure('pc_st3', 'Pirate Hideout', 4, 'PHANTOM_CORSAIRS', 'RARE', ['T:DEPLOY'],
    [E('SUMMON', PLAY, NONE, summon(1))],
    'Arr! Everyone needs a base of operations.', 'Start of turn: Summon a 1/1 Phantom Pirate'),
  // --- MINIONS (21 + 1 starforge = 22) ---
  // 1-cost (4)
  minion('pc_m1', 'Deckhand Shade', 1, 'PHANTOM_CORSAIRS', 'COMMON', 2, 1, 'PIRATE',
    ['CLOAK'],
    [], 'Invisible deckhand. Still does chores.', 'CLOAK'),
  minion('pc_m2', 'Cutthroat Imp', 1, 'PHANTOM_CORSAIRS', 'COMMON', 1, 2, 'PIRATE',
    ['SWIFT', 'LETHAL'],
    [], 'Small knife. Big ambition.', 'SWIFT. LETHAL'),
  minion('pc_m3', 'Ghost Parrot', 1, 'PHANTOM_CORSAIRS', 'COMMON', 2, 2, 'PIRATE',
    ['SWIFT'],
    [], 'Polly wants a SOUL.', 'SWIFT'),
  minion('pc_m4', 'Smuggler Scout', 1, 'PHANTOM_CORSAIRS', 'COMMON', 1, 3, 'PIRATE',
    ['CLOAK', 'T:DEPLOY'],
    [E('DRAW', PLAY, NONE, draw(1))],
    'Sees everything. Tells nobody.', 'CLOAK. Draw a card'),
  // 2-cost (4)
  minion('pc_m5', 'Phantom Cutlass', 2, 'PHANTOM_CORSAIRS', 'COMMON', 3, 2, 'PIRATE',
    ['SWIFT', 'BLITZ'],
    [], 'A sword that swings itself. Terrifying.', 'SWIFT. BLITZ'),
  minion('pc_m6', 'Spectral Swashbuckler', 2, 'PHANTOM_CORSAIRS', 'COMMON', 2, 3, 'PIRATE',
    ['CLOAK', 'DRAIN'],
    [], 'Buckles swashes. Swashes buckles. Both ghostily.', 'CLOAK. DRAIN'),
  minion('pc_m7', 'Corsair Raider', 2, 'PHANTOM_CORSAIRS', 'COMMON', 3, 3, 'PIRATE',
    ['SWIFT'],
    [], 'Raids. Pillages. Takes breaks for grog.', 'SWIFT'),
  minion('pc_m8', 'Ghostly Rigger', 2, 'PHANTOM_CORSAIRS', 'COMMON', 2, 4, 'PIRATE',
    ['DRAIN', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(1))],
    'Rigs the ship. Rigs the fight.', 'DRAIN. Deal 1 damage to a random enemy'),
  // 3-cost (4)
  minion('pc_m9', 'Phantom Dagger', 3, 'PHANTOM_CORSAIRS', 'RARE', 3, 3, 'PIRATE',
    ['CLOAK', 'LETHAL', 'SWIFT'],
    [], 'Three keywords of pure pirate perfection.', 'CLOAK. LETHAL. SWIFT'),
  minion('pc_m10', 'Spectral Gunner', 3, 'PHANTOM_CORSAIRS', 'COMMON', 3, 4, 'PIRATE',
    ['SWIFT', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(2))],
    'Shoots first. Doesn\'t ask questions. Is a ghost.', 'SWIFT. Deal 2 damage to a random enemy'),
  minion('pc_m11', 'Ghost Navigator', 3, 'PHANTOM_CORSAIRS', 'COMMON', 2, 5, 'PIRATE',
    ['CLOAK', 'DRAIN'],
    [], 'Navigates the void. Drains the living.', 'CLOAK. DRAIN'),
  minion('pc_m12', 'Corsair Duelist', 3, 'PHANTOM_CORSAIRS', 'COMMON', 4, 3, 'PIRATE',
    ['BLITZ', 'DRAIN'],
    [], 'Challenges you. Beats you. Heals from it.', 'BLITZ. DRAIN'),
  // 4-cost (3)
  minion('pc_m13', 'Phantom Boarder', 4, 'PHANTOM_CORSAIRS', 'COMMON', 4, 5, 'PIRATE',
    ['SWIFT', 'CLOAK', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(2))],
    'Boards your ship. Boards your SOUL.', 'SWIFT. CLOAK. Deal 2 damage to a random enemy'),
  minion('pc_m14', 'Spectral Cannoneer', 4, 'PHANTOM_CORSAIRS', 'RARE', 5, 4, 'PIRATE',
    ['BLITZ', 'DRAIN', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(2))],
    'Ghost cannons. Real damage.', 'BLITZ. DRAIN. Deal 2 damage to a random enemy'),
  minion('pc_m15', 'Ghost Captain', 4, 'PHANTOM_CORSAIRS', 'COMMON', 4, 5, 'PIRATE',
    ['SWIFT', 'DRAIN', 'LETHAL'],
    [], 'Captains the ghost ship. And your nightmares.', 'SWIFT. DRAIN. LETHAL'),
  // 5-cost (2)
  minion('pc_m16', 'Phantom Duelist', 5, 'PHANTOM_CORSAIRS', 'COMMON', 5, 6, 'PIRATE',
    ['SWIFT', 'CLOAK', 'DRAIN'],
    [], 'Fights you. You can\'t fight back. Space pirate honor.', 'SWIFT. CLOAK. DRAIN'),
  minion('pc_m17', 'Dread Pirate', 5, 'PHANTOM_CORSAIRS', 'RARE', 6, 5, 'PIRATE',
    ['BLITZ', 'DRAIN', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(3))],
    'The name strikes fear. The sword strikes harder.', 'BLITZ. DRAIN. Deal 3 damage to a random enemy'),
  // 6-cost (2)
  minion('pc_m18', 'Ghost Galleon', 6, 'PHANTOM_CORSAIRS', 'COMMON', 6, 7, 'PIRATE',
    ['SWIFT', 'CLOAK', 'DRAIN', 'T:DEPLOY'],
    [E('SUMMON', PLAY, NONE, summon(2))],
    'A ship that sails itself. Through WALLS.', 'SWIFT. CLOAK. DRAIN. Summon two 1/1 Phantom Pirates'),
  minion('pc_m19', 'Corsair Flagship', 6, 'PHANTOM_CORSAIRS', 'RARE', 5, 8, 'PIRATE',
    ['SWIFT', 'DRAIN', 'BLITZ', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, ALL_EM, dmg(2))],
    'The pride of the ghost fleet.', 'SWIFT. DRAIN. BLITZ. Deal 2 damage to all enemy minions'),
  // 7-cost = STARFORGE (inserted separately)
  // 8-cost (1)
  minion('pc_m20', 'Kraken of the Damned', 8, 'PHANTOM_CORSAIRS', 'EPIC', 8, 8, 'PIRATE',
    ['SWIFT', 'CLOAK', 'DRAIN', 'LETHAL', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, ALL_EM, dmg(3))],
    'Release the kraken. The GHOST kraken.', 'SWIFT. CLOAK. DRAIN. LETHAL. Deal 3 damage to all enemy minions'),
  // 9-cost (1)
  minion('pc_m21', 'Dreadnought Specter', 9, 'PHANTOM_CORSAIRS', 'EPIC', 8, 10, 'PIRATE',
    ['SWIFT', 'DRAIN', 'BLITZ', 'CLOAK', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(5))],
    'The final ship. The last voyage. YOUR last voyage.', 'SWIFT. DRAIN. BLITZ. CLOAK. Deal 5 damage to a random enemy'),
];

console.log('  PHANTOM_CORSAIRS: 30 cards defined');

// ============================================================================
// HIVEMIND — Swarm & Last Words Bombs (LETHAL/DRAIN/SWIFT/BARRIER/BLITZ/DS + LAST_WORDS)
// Theme: Insects, swarm tokens, death triggers
// Starforge: OVERMIND SKRYX + THE BROOD MOTHER (lines 16150, 16240)
// ============================================================================
const HIVEMIND_STARFORGE_1 = `  {
    id: 'hive_overmind_skryx',
    name: 'OVERMIND SKRYX',
    cost: 9,
    type: CardType.MINION,
    race: Race.HIVEMIND,
    rarity: CardRarity.LEGENDARY,
    attack: 6,
    health: 12,
    tribe: MinionTribe.INSECT,
    keywords: [{ keyword: CombatKeyword.DRAIN }, { keyword: CombatKeyword.DOUBLE_STRIKE }, { keyword: TriggerKeyword.DEPLOY }],
    effects: [{ id: 'e0', type: EffectType.BUFF, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_FRIENDLY_MINIONS, data: { attack: 1, health: 1 } as BuffEffectData, isMandatory: true }, { id: 'e1', type: EffectType.GRANT_KEYWORD, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.CHOSEN, data: { keywords: [{ keyword: CombatKeyword.SWIFT }] } as GrantKeywordData, isMandatory: true }],
    starforge: {
    type: StarforgeType.PROGRESSIVE,
    conditions: [{
      type: StarforgeConditionType.SUMMON_COUNT,
      targetValue: 50,
      persistsAcrossZones: true,
      persistsIfSilenced: true,
    }],
    forgedForm: {
      name: 'SKRYX, THE INFINITE SWARM',
      cost: 9,
      attack: 8,
      health: 20,
      keywords: [{ keyword: CombatKeyword.BLITZ }, { keyword: CombatKeyword.LETHAL }],
      effects: [],
      cardText: 'SWARM. Drones have SWARM, SWIFT, and LETHAL. Start of Turn: Fill your board with 1/1 Drones. Whenever a Drone attacks, summon another Drone.',
    },
    isReversible: false,
    transformationText: 'STARFORGE — After summoning 50 Drones: Transform into SKRYX, THE INFINITE SWARM — 8/20. Drones have SWARM, SWIFT, and LETHAL. Start of Turn: Fill your board with 1/1 Drones.',
  },
    flavorText: 'One mind controls them all. One mind says: MORE.',
    cardText: 'DRAIN. DOUBLE STRIKE. Give all friendly minions +1/+1',
    collectible: true,
    set: 'CORE',
  }`;

const HIVEMIND_STARFORGE_2 = `  {
    id: 'hive_the_brood_mother',
    name: 'THE BROOD MOTHER',
    cost: 8,
    type: CardType.MINION,
    race: Race.HIVEMIND,
    rarity: CardRarity.EPIC,
    attack: 7,
    health: 10,
    tribe: MinionTribe.INSECT,
    keywords: [{ keyword: CombatKeyword.DOUBLE_STRIKE }, { keyword: CombatKeyword.LETHAL }, { keyword: TriggerKeyword.DEPLOY }, { keyword: TriggerKeyword.LAST_WORDS }],
    effects: [{ id: 'e0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.RANDOM_ENEMY, data: { amount: 4 } as DamageEffectData, isMandatory: true }, { id: 'lw0', type: EffectType.SUMMON, trigger: EffectTrigger.ON_DEATH, targetType: TargetType.NONE, data: { cardId: 'token_generated', count: 3 } as SummonEffectData, isMandatory: true }],
    starforge: {
    type: StarforgeType.PROGRESSIVE,
    conditions: [{
      type: StarforgeConditionType.SUMMON_COUNT,
      targetValue: 30,
      persistsAcrossZones: true,
      persistsIfSilenced: true,
    }],
    forgedForm: {
      name: 'THE HIVE EMPRESS',
      cost: 8,
      attack: 10,
      health: 15,
      keywords: [],
      effects: [],
      cardText: 'SWARM. DEPLOY: Fill your board with 4/4 Elite Drones with SWARM. ALL SWARM bonuses are tripled. Start of Turn: Summon Drones until your board is full.',
    },
    isReversible: false,
    transformationText: 'STARFORGE — After summoning 30 Drones: Transform into THE HIVE EMPRESS — 10/15. DEPLOY: Fill your board with 4/4 Elite Drones.',
  },
    flavorText: 'She doesn\\'t breed drones. She breeds ARMIES.',
    cardText: 'DOUBLE STRIKE. LETHAL. Deal 4 damage to a random enemy. LAST WORDS: Summon three 1/1 Drones',
    collectible: true,
    set: 'CORE',
  }`;

const HIVEMIND = [
  // --- SPELLS (5) ---
  spell('hive_s1', 'Spawning Pit', 1, 'HIVEMIND', 'COMMON', [],
    [E('SUMMON', PLAY, NONE, summon(2))],
    'Two bugs for one crystal. Bargain!', 'Summon two 1/1 Drones'),
  spell('hive_s2', 'Infest', 2, 'HIVEMIND', 'COMMON', [],
    [E('SUMMON', PLAY, NONE, summon(3))],
    'Three bugs. Three problems. Your opponent\'s problems.', 'Summon three 1/1 Drones'),
  spell('hive_s3', 'Plague Swarm', 3, 'HIVEMIND', 'RARE', [],
    [E('DAMAGE', PLAY, ALL_EM, dmg(2))],
    'Bugs everywhere. EVERYWHERE.', 'Deal 2 damage to all enemy minions'),
  spell('hive_s4', 'Brood Burst', 4, 'HIVEMIND', 'COMMON', [],
    [E('SUMMON', PLAY, NONE, summon(4))],
    'POP! Four more drones.', 'Summon four 1/1 Drones'),
  spell('hive_s5', 'Swarm Tide', 5, 'HIVEMIND', 'RARE', [],
    [E('DAMAGE', PLAY, ALL_EM, dmg(2)), E('SUMMON', PLAY, NONE, summon(3))],
    'The tide comes in. The tide IS bugs.', 'Deal 2 damage to all enemy minions. Summon three 1/1 Drones'),
  // --- STRUCTURES (3) ---
  structure('hive_st1', 'Hive Nexus', 3, 'HIVEMIND', 'COMMON', ['T:DEPLOY'],
    [E('BUFF', PLAY, ALL_FM, buff(1, 0))],
    'The nexus hums. The swarm grows stronger.', 'Start of turn: Give all friendly minions +1/+0'),
  structure('hive_st2', 'Brood Pit', 4, 'HIVEMIND', 'RARE', ['T:DEPLOY'],
    [E('SUMMON', PLAY, NONE, summon(2))],
    'Things crawl out. Terrible things.', 'Start of turn: Summon two 1/1 Drones'),
  structure('hive_st3', 'Spawning Chamber', 5, 'HIVEMIND', 'COMMON', ['T:DEPLOY'],
    [E('SUMMON', PLAY, NONE, summon(1)), E('BUFF', PLAY, ALL_FM, buff(0, 1))],
    'The chamber pulses. Life emerges.', 'Start of turn: Summon a 1/1 Drone. Give all friendly minions +0/+1'),
  // --- MINIONS (20 + 2 starforge = 22) ---
  // 1-cost (4)
  minion('hive_m1', 'Egg Sac', 1, 'HIVEMIND', 'COMMON', 0, 4, 'INSECT',
    ['GUARDIAN', 'T:LAST_WORDS'],
    [E('SUMMON', DEATH, NONE, summon(2))],
    'Don\'t step on it. Trust me.', 'GUARDIAN. LAST WORDS: Summon two 1/1 Drones'),
  minion('hive_m2', 'Worker Drone', 1, 'HIVEMIND', 'COMMON', 2, 2, 'INSECT',
    ['LETHAL'],
    [], 'Works. Stings. Repeats.', 'LETHAL'),
  minion('hive_m3', 'Skittering Scout', 1, 'HIVEMIND', 'COMMON', 1, 3, 'INSECT',
    ['SWIFT', 'T:DEPLOY'],
    [E('DRAW', PLAY, NONE, draw(1))],
    'Skitters ahead. Reports back. With cards.', 'SWIFT. Draw a card'),
  minion('hive_m4', 'Hatchling Swarm', 1, 'HIVEMIND', 'COMMON', 2, 2, 'INSECT',
    ['BLITZ', 'T:DEPLOY'],
    [E('SUMMON', PLAY, NONE, summon(1))],
    'Just hatched. Already angry.', 'BLITZ. Summon a 1/1 Drone'),
  // 2-cost (4)
  minion('hive_m5', 'Swarm Striker', 2, 'HIVEMIND', 'COMMON', 3, 3, 'INSECT',
    ['SWIFT', 'DRAIN', 'T:LAST_WORDS'],
    [E('DAMAGE', DEATH, RAND_E, dmg(1))],
    'Strikes fast. Heals faster. Explodes last.', 'SWIFT. DRAIN. LAST WORDS: Deal 1 damage to a random enemy'),
  minion('hive_m6', 'Brood Tender', 2, 'HIVEMIND', 'COMMON', 2, 4, 'INSECT',
    ['LETHAL', 'T:DEPLOY'],
    [E('SUMMON', PLAY, NONE, summon(1))],
    'Tends the brood. Tends your doom.', 'LETHAL. Summon a 1/1 Drone'),
  minion('hive_m7', 'Acid Spitter', 2, 'HIVEMIND', 'COMMON', 3, 3, 'INSECT',
    ['DOUBLE_STRIKE', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(1))],
    'Spits acid. Twice if you\'re unlucky.', 'DOUBLE STRIKE. Deal 1 damage to a random enemy'),
  minion('hive_m8', 'Venomsting', 2, 'HIVEMIND', 'COMMON', 2, 3, 'INSECT',
    ['LETHAL', 'T:LAST_WORDS'],
    [E('DAMAGE', DEATH, ALL_EM, dmg(1))],
    'Sting and die. Leave acid behind.', 'LETHAL. LAST WORDS: Deal 1 damage to all enemy minions'),
  // 3-cost (3)
  minion('hive_m9', 'Tunnel Burrower', 3, 'HIVEMIND', 'COMMON', 3, 5, 'INSECT',
    ['DRAIN', 'T:LAST_WORDS'],
    [E('SUMMON', DEATH, NONE, summon(1))],
    'Burrows in. Doesn\'t burrow out. Leaves friends.', 'DRAIN. LAST WORDS: Summon a 1/1 Drone'),
  minion('hive_m10', 'Hive Warrior', 3, 'HIVEMIND', 'COMMON', 4, 4, 'INSECT',
    ['BLITZ', 'DOUBLE_STRIKE', 'T:LAST_WORDS'],
    [E('BUFF', DEATH, RAND_FM, buff(1, 1))],
    'Dies fighting. Empowers the swarm.', 'BLITZ. DOUBLE STRIKE. LAST WORDS: Give a random friendly minion +1/+1'),
  minion('hive_m11', 'Parasite Injector', 3, 'HIVEMIND', 'RARE', 3, 4, 'INSECT',
    ['LETHAL', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(2))],
    'Injects parasites. For free!', 'LETHAL. Deal 2 damage to a random enemy'),
  // 4-cost (3)
  minion('hive_m12', 'Chitin Charger', 4, 'HIVEMIND', 'COMMON', 5, 5, 'INSECT',
    ['BLITZ', 'DRAIN', 'T:LAST_WORDS'],
    [E('DAMAGE', DEATH, RAND_E, dmg(2))],
    'Charges in. Explodes out.', 'BLITZ. DRAIN. LAST WORDS: Deal 2 damage to a random enemy'),
  minion('hive_m13', 'Swarm Matriarch', 4, 'HIVEMIND', 'RARE', 4, 6, 'INSECT',
    ['DRAIN', 'T:DEPLOY'],
    [E('SUMMON', PLAY, NONE, summon(2))],
    'Mother of many. Enemy of all.', 'DRAIN. Summon two 1/1 Drones'),
  minion('hive_m14', 'Hiveguard', 4, 'HIVEMIND', 'COMMON', 3, 7, 'INSECT',
    ['GUARDIAN', 'DRAIN'],
    [], 'Guards the hive. Guards your face.', 'GUARDIAN. DRAIN'),
  // 5-cost (2)
  minion('hive_m15', 'Queen\'s Champion', 5, 'HIVEMIND', 'COMMON', 5, 6, 'INSECT',
    ['DRAIN', 'LETHAL', 'T:DEPLOY'],
    [E('SUMMON', PLAY, NONE, summon(2))],
    'Champions don\'t ask. Champions STING.', 'DRAIN. LETHAL. Summon two 1/1 Drones'),
  minion('hive_m16', 'Brood Carrier', 5, 'HIVEMIND', 'COMMON', 5, 7, 'INSECT',
    ['LETHAL', 'BARRIER', 'T:DEPLOY'],
    [E('SUMMON', PLAY, NONE, summon(3))],
    'Carries the brood. Drops the brood. On you.', 'LETHAL. BARRIER. Summon three 1/1 Drones'),
  // 6-cost (2)
  minion('hive_m17', 'Titan Beetle', 6, 'HIVEMIND', 'COMMON', 7, 7, 'INSECT',
    ['SWIFT', 'BLITZ', 'T:DEPLOY', 'T:LAST_WORDS'],
    [E('SUMMON', PLAY, NONE, summon(2)), E('DAMAGE', DEATH, RAND_E, dmg(3))],
    'Massive. Explosive. Unhappy.', 'SWIFT. BLITZ. Summon two 1/1 Drones. LAST WORDS: Deal 3 damage to a random enemy'),
  minion('hive_m18', 'Plague Bearer', 6, 'HIVEMIND', 'RARE', 5, 8, 'INSECT',
    ['DRAIN', 'LETHAL', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, ALL_EM, dmg(2))],
    'Bears plague. Shares plague. Generous with plague.', 'DRAIN. LETHAL. Deal 2 damage to all enemy minions'),
  // 7-cost (1)
  minion('hive_m19', 'Hive Colossus', 7, 'HIVEMIND', 'EPIC', 6, 9, 'INSECT',
    ['DRAIN', 'LETHAL', 'DOUBLE_STRIKE', 'T:DEPLOY'],
    [E('SUMMON', PLAY, NONE, summon(3)), E('BUFF', PLAY, ALL_FM, buff(1, 0))],
    'Colossal bug. Colossal problems.', 'DRAIN. LETHAL. DOUBLE STRIKE. Summon three 1/1 Drones. Give all friendly minions +1/+0'),
  // 8-cost + 9-cost = STARFORGE (inserted separately)
  minion('hive_m20', 'Swarm Coordinator', 4, 'HIVEMIND', 'COMMON', 4, 6, 'INSECT',
    ['SWIFT', 'T:DEPLOY'],
    [E('BUFF', PLAY, ALL_FM, buff(1, 0))],
    'Coordinates the swarm. In perfect unison.', 'SWIFT. Give all friendly minions +1/+0'),
];

console.log('  HIVEMIND: 30 cards defined');

// ============================================================================
// ASTROMANCERS — Celestial Double Strike (DOUBLE_STRIKE/BARRIER/DRAIN/BLITZ/SWIFT)
// Theme: Star magic, celestial power, striking twice
// Starforge: CELESTIAL ORACLE (line 16622)
// ============================================================================
const ASTRO_STARFORGE = `  {
    id: 'astro_celestial_oracle',
    name: 'CELESTIAL ORACLE',
    cost: 8,
    type: CardType.MINION,
    race: Race.ASTROMANCERS,
    rarity: CardRarity.EPIC,
    attack: 7,
    health: 11,
    keywords: [{ keyword: CombatKeyword.DRAIN }, { keyword: CombatKeyword.BLITZ }, { keyword: TriggerKeyword.DEPLOY }],
    effects: [{ id: 'e0', type: EffectType.DRAW, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.NONE, data: { count: 1 } as DrawEffectData, isMandatory: true }],
    starforge: {
    type: StarforgeType.PROGRESSIVE,
    conditions: [{
      type: StarforgeConditionType.CARDS_DRAWN,
      targetValue: 30,
      persistsAcrossZones: true,
      persistsIfSilenced: true,
    }],
    forgedForm: {
      name: 'ORACLE SUPREME',
      cost: 8,
      attack: 10,
      health: 12,
      keywords: [],
      effects: [],
      cardText: 'Whenever you draw a card, play the top card of your deck for free regardless of cost. SCRY (3) at start of each turn.',
    },
    isReversible: false,
    transformationText: 'STARFORGE — After drawing 30 cards: Transform into ORACLE SUPREME — 10/12. Whenever you draw a card, play the top card of your deck for free.',
  },
    flavorText: 'Sees everything. Plays everything. Pays for NOTHING.',
    cardText: 'DRAIN. BLITZ. Draw a card',
    collectible: true,
    set: 'CORE',
  }`;

const ASTROMANCERS = [
  // --- SPELLS (5) ---
  spell('astro_s1', 'Starfall', 1, 'ASTROMANCERS', 'COMMON', [],
    [E('DAMAGE', PLAY, CHOSEN, dmg(3))],
    'A star falls. On your face.', 'Deal 3 damage'),
  spell('astro_s2', 'Cosmic Insight', 2, 'ASTROMANCERS', 'COMMON', [],
    [E('DRAW', PLAY, NONE, draw(2))],
    'The cosmos reveals its secrets. You draw cards.', 'Draw 2 cards'),
  spell('astro_s3', 'Nebula Blast', 3, 'ASTROMANCERS', 'RARE', [],
    [E('DAMAGE', PLAY, ALL_EM, dmg(2))],
    'A nebula in miniature. Still explosive.', 'Deal 2 damage to all enemy minions'),
  spell('astro_s4', 'Celestial Blessing', 4, 'ASTROMANCERS', 'COMMON', [],
    [E('BUFF', PLAY, ALL_FM, buff(2, 1))],
    'The stars bless you. With POWER.', 'Give all friendly minions +2/+1'),
  spell('astro_s5', 'Supernova', 6, 'ASTROMANCERS', 'RARE', [],
    [E('DAMAGE', PLAY, ALL_E, dmg(4))],
    'Stars die. Everything near them dies too.', 'Deal 4 damage to all enemies'),
  // --- STRUCTURES (2) ---
  structure('astro_st1', 'Star Observatory', 3, 'ASTROMANCERS', 'COMMON', ['T:DEPLOY'],
    [E('DRAW', PLAY, NONE, draw(1))],
    'Observes stars. Also observes enemy weaknesses.', 'Start of turn: Draw a card'),
  structure('astro_st2', 'Astral Beacon', 4, 'ASTROMANCERS', 'RARE', ['T:DEPLOY'],
    [E('BUFF', PLAY, ALL_FM, buff(1, 0))],
    'Beams celestial power to all allies.', 'Start of turn: Give all friendly minions +1/+0'),
  // --- MINIONS (22 + 1 starforge = 23, so 22 here) ---
  // 1-cost (4)
  minion('astro_m1', 'Star Pupil', 1, 'ASTROMANCERS', 'COMMON', 1, 2, null,
    ['DOUBLE_STRIKE'],
    [], 'Studies the stars. Hits you twice.', 'DOUBLE STRIKE'),
  minion('astro_m2', 'Cosmic Sprite', 1, 'ASTROMANCERS', 'COMMON', 2, 2, null,
    ['SWIFT'],
    [], 'Fast as a shooting star.', 'SWIFT'),
  minion('astro_m3', 'Moon Shard', 1, 'ASTROMANCERS', 'COMMON', 1, 3, null,
    ['BARRIER'],
    [], 'A piece of the moon. Still tough.', 'BARRIER'),
  minion('astro_m4', 'Astral Wisp', 1, 'ASTROMANCERS', 'COMMON', 2, 1, null,
    ['BLITZ', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(1))],
    'Tiny but celestially violent.', 'BLITZ. Deal 1 damage to a random enemy'),
  // 2-cost (4)
  minion('astro_m5', 'Stargazer', 2, 'ASTROMANCERS', 'COMMON', 2, 3, null,
    ['DOUBLE_STRIKE', 'T:DEPLOY'],
    [E('DRAW', PLAY, NONE, draw(1))],
    'Gazes at stars. Draws inspiration. And cards.', 'DOUBLE STRIKE. Draw a card'),
  minion('astro_m6', 'Nebula Walker', 2, 'ASTROMANCERS', 'COMMON', 3, 2, null,
    ['BARRIER', 'BLITZ'],
    [], 'Walks through nebulae. Punches through defenses.', 'BARRIER. BLITZ'),
  minion('astro_m7', 'Comet Rider', 2, 'ASTROMANCERS', 'COMMON', 3, 3, null,
    ['SWIFT'],
    [], 'Rides comets. Crashes into enemies.', 'SWIFT'),
  minion('astro_m8', 'Celestial Acolyte', 2, 'ASTROMANCERS', 'COMMON', 2, 4, null,
    ['DRAIN', 'T:DEPLOY'],
    [E('HEAL', PLAY, F_HERO, heal(2))],
    'Studies celestial healing. Practices on you.', 'DRAIN. Restore 2 health to your hero'),
  // 3-cost (4)
  minion('astro_m9', 'Constellation Knight', 3, 'ASTROMANCERS', 'RARE', 3, 4, null,
    ['DOUBLE_STRIKE', 'DRAIN'],
    [], 'Each star in the constellation is a sword.', 'DOUBLE STRIKE. DRAIN'),
  minion('astro_m10', 'Solar Flare Mage', 3, 'ASTROMANCERS', 'COMMON', 3, 4, null,
    ['BLITZ', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(2))],
    'Flares are just angry sunshine.', 'BLITZ. Deal 2 damage to a random enemy'),
  minion('astro_m11', 'Meteor Sentinel', 3, 'ASTROMANCERS', 'COMMON', 2, 6, null,
    ['BARRIER', 'GUARDIAN'],
    [], 'Made of meteor. Guards like one too.', 'BARRIER. GUARDIAN'),
  minion('astro_m12', 'Twilight Striker', 3, 'ASTROMANCERS', 'COMMON', 4, 3, null,
    ['DOUBLE_STRIKE', 'SWIFT'],
    [], 'Strikes at twilight. Strikes TWICE at twilight.', 'DOUBLE STRIKE. SWIFT'),
  // 4-cost (3)
  minion('astro_m13', 'Pulsar Champion', 4, 'ASTROMANCERS', 'COMMON', 4, 5, null,
    ['DOUBLE_STRIKE', 'DRAIN', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(1))],
    'Pulses with cosmic energy. And violence.', 'DOUBLE STRIKE. DRAIN. Deal 1 damage to a random enemy'),
  minion('astro_m14', 'Void Dancer', 4, 'ASTROMANCERS', 'RARE', 5, 4, null,
    ['BLITZ', 'DOUBLE_STRIKE'],
    [], 'Dances between stars. Cuts between heartbeats.', 'BLITZ. DOUBLE STRIKE'),
  minion('astro_m15', 'Astral Guardian', 4, 'ASTROMANCERS', 'COMMON', 3, 7, null,
    ['BARRIER', 'DRAIN'],
    [], 'Guards the astral plane. And your health total.', 'BARRIER. DRAIN'),
  // 5-cost (3)
  minion('astro_m16', 'Celestial Blade', 5, 'ASTROMANCERS', 'COMMON', 5, 6, null,
    ['DOUBLE_STRIKE', 'DRAIN', 'SWIFT'],
    [], 'A blade forged from starlight. Cuts twice.', 'DOUBLE STRIKE. DRAIN. SWIFT'),
  minion('astro_m17', 'Starshaper', 5, 'ASTROMANCERS', 'RARE', 5, 6, null,
    ['DOUBLE_STRIKE', 'BARRIER', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(3))],
    'Shapes stars into weapons. And shields.', 'DOUBLE STRIKE. BARRIER. Deal 3 damage to a random enemy'),
  minion('astro_m18', 'Quasar Knight', 5, 'ASTROMANCERS', 'COMMON', 5, 7, null,
    ['BLITZ', 'DRAIN', 'T:DEPLOY'],
    [E('DRAW', PLAY, NONE, draw(1))],
    'As bright as a quasar. As deadly too.', 'BLITZ. DRAIN. Draw a card'),
  // 6-cost (2)
  minion('astro_m19', 'Galaxy Warden', 6, 'ASTROMANCERS', 'COMMON', 6, 7, null,
    ['DOUBLE_STRIKE', 'BARRIER', 'DRAIN', 'T:DEPLOY'],
    [E('BUFF', PLAY, ALL_FM, buff(1, 1))],
    'Wardens guard galaxies. This one guards YOUR galaxy.', 'DOUBLE STRIKE. BARRIER. DRAIN. Give all friendly minions +1/+1'),
  minion('astro_m20', 'Nova Titan', 6, 'ASTROMANCERS', 'RARE', 7, 6, null,
    ['DOUBLE_STRIKE', 'BLITZ', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, ALL_EM, dmg(2))],
    'A titan born from a nova. Everything burns.', 'DOUBLE STRIKE. BLITZ. Deal 2 damage to all enemy minions'),
  // 7-cost (1)
  minion('astro_m21', 'Cosmic Arbiter', 7, 'ASTROMANCERS', 'EPIC', 7, 8, null,
    ['DOUBLE_STRIKE', 'BARRIER', 'DRAIN', 'BLITZ', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(4))],
    'Arbitrates with stars. The verdict is always: MORE DAMAGE.', 'DOUBLE STRIKE. BARRIER. DRAIN. BLITZ. Deal 4 damage to a random enemy'),
  // 8-cost = STARFORGE (inserted separately)
  // 9-cost (1)
  minion('astro_m22', 'Constellation Emperor', 9, 'ASTROMANCERS', 'EPIC', 9, 10, null,
    ['DOUBLE_STRIKE', 'DRAIN', 'BARRIER', 'SWIFT', 'T:DEPLOY'],
    [E('BUFF', PLAY, ALL_FM, buff(2, 2))],
    'Rules the constellations. ALL of them.', 'DOUBLE STRIKE. DRAIN. BARRIER. Give all friendly minions +2/+2'),
];

console.log('  ASTROMANCERS: 30 cards defined');

// ============================================================================
// CHRONOBOUND — Temporal Assassins (LETHAL/DOUBLE_STRIKE/DRAIN/BLITZ/BARRIER/SWIFT)
// Theme: Time manipulation, echoes, paradoxes
// Starforge: TIMESHAPER'S MASTERPIECE + TIMESHAPER CHRONUS
// ============================================================================
const CHRONO_STARFORGE_1 = `  {
    id: 'chrono_timeshaper_masterpiece',
    name: 'TIMESHAPER\\'S MASTERPIECE',
    cost: 8,
    type: CardType.MINION,
    race: Race.CHRONOBOUND,
    rarity: CardRarity.EPIC,
    attack: 8,
    health: 10,
    keywords: [{ keyword: CombatKeyword.BARRIER }, { keyword: CombatKeyword.BLITZ }, { keyword: TriggerKeyword.DEPLOY }],
    effects: [{ id: 'e0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.RANDOM_ENEMY, data: { amount: 8 } as DamageEffectData, isMandatory: true }],
    starforge: {
    type: StarforgeType.PROGRESSIVE,
    conditions: [{
      type: StarforgeConditionType.ECHO_CARDS_PLAYED,
      targetValue: 20,
      persistsAcrossZones: true,
      persistsIfSilenced: true,
    }],
    forgedForm: {
      name: 'THE PARADOX INCARNATE',
      cost: 8,
      attack: 12,
      health: 12,
      keywords: [],
      effects: [],
      cardText: 'ECHO. DEPLOY: ALL cards you play for the rest of the game have ECHO and cost (1) less. ECHO cards gain +2/+2 on replay.',
    },
    isReversible: false,
    transformationText: 'STARFORGE — After playing 20 ECHO cards: Transform into THE PARADOX INCARNATE — 12/12. ALL cards have ECHO and cost (1) less.',
  },
    flavorText: 'Every card. Echoes. EVERY. CARD.',
    cardText: 'BARRIER. BLITZ. Deal 8 damage to a random enemy',
    collectible: true,
    set: 'CORE',
  }`;

const CHRONO_STARFORGE_2 = `  {
    id: 'chrono_timeshaper_chronus',
    name: 'TIMESHAPER CHRONUS',
    cost: 9,
    type: CardType.MINION,
    race: Race.CHRONOBOUND,
    rarity: CardRarity.LEGENDARY,
    attack: 7,
    health: 11,
    keywords: [{ keyword: CombatKeyword.LETHAL }, { keyword: TriggerKeyword.DEPLOY }],
    effects: [{ id: 'e0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.RANDOM_ENEMY, data: { amount: 9 } as DamageEffectData, isMandatory: true }],
    starforge: {
    type: StarforgeType.PROGRESSIVE,
    conditions: [{
      type: StarforgeConditionType.ECHO_CARDS_PLAYED,
      targetValue: 30,
      persistsAcrossZones: true,
      persistsIfSilenced: true,
    }],
    forgedForm: {
      name: 'CHRONUS, LORD OF TIME',
      cost: 9,
      attack: 10,
      health: 10,
      keywords: [],
      effects: [],
      cardText: 'ALL cards have ECHO and cost (2) less. ECHO replays cost (0). At start of turn, gain 2 extra Crystals. Take an extra turn every 3rd turn.',
    },
    isReversible: false,
    transformationText: 'STARFORGE — After playing 30 ECHO cards: Transform into CHRONUS, LORD OF TIME — 10/10. ALL cards have ECHO and cost (2) less.',
  },
    flavorText: 'He doesn\\'t bend time. He BROKE time. And he\\'s NOT sorry.',
    cardText: 'LETHAL. Deal 9 damage to a random enemy',
    collectible: true,
    set: 'CORE',
  }`;

const CHRONOBOUND = [
  // --- SPELLS (5) ---
  spell('chrono_s1', 'Time Bolt', 1, 'CHRONOBOUND', 'COMMON', [],
    [E('DAMAGE', PLAY, CHOSEN, dmg(3))],
    'Yesterday\'s bolt. Today\'s damage.', 'Deal 3 damage'),
  spell('chrono_s2', 'Temporal Shift', 2, 'CHRONOBOUND', 'COMMON', [],
    [E('DRAW', PLAY, NONE, draw(2))],
    'Shift through time. Find what you need.', 'Draw 2 cards'),
  spell('chrono_s3', 'Chrono Blast', 3, 'CHRONOBOUND', 'RARE', [],
    [E('DAMAGE', PLAY, ALL_EM, dmg(2))],
    'A blast from the past. And the future. And now.', 'Deal 2 damage to all enemy minions'),
  spell('chrono_s4', 'Paradox Strike', 4, 'CHRONOBOUND', 'COMMON', [],
    [E('DAMAGE', PLAY, CHOSEN, dmg(5)), E('DRAW', PLAY, NONE, draw(1))],
    'Hits you before you know it happened.', 'Deal 5 damage. Draw a card'),
  spell('chrono_s5', 'Epoch Collapse', 6, 'CHRONOBOUND', 'RARE', [],
    [E('DAMAGE', PLAY, ALL_E, dmg(4))],
    'All of time. Collapsed. On your head.', 'Deal 4 damage to all enemies'),
  // --- STRUCTURES (3) ---
  structure('chrono_st1', 'Time Rift', 2, 'CHRONOBOUND', 'COMMON', ['T:DEPLOY'],
    [E('DRAW', PLAY, NONE, draw(1))],
    'A tear in time. Cards fall through.', 'Start of turn: Draw a card'),
  structure('chrono_st2', 'Temporal Forge', 3, 'CHRONOBOUND', 'COMMON', ['T:DEPLOY'],
    [E('BUFF', PLAY, ALL_FM, buff(1, 0))],
    'Forges weapons from stolen moments.', 'Start of turn: Give all friendly minions +1/+0'),
  structure('chrono_st3', 'Paradox Engine', 4, 'CHRONOBOUND', 'RARE', ['T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(2))],
    'Creates paradoxes. Resolves them violently.', 'Start of turn: Deal 2 damage to a random enemy'),
  // --- MINIONS (20 + 2 starforge = 22) ---
  // 1-cost (4)
  minion('chrono_m1', 'Temporal Wisp', 1, 'CHRONOBOUND', 'COMMON', 2, 2, null,
    ['DOUBLE_STRIKE'],
    [], 'Hits you now. And a second ago.', 'DOUBLE STRIKE'),
  minion('chrono_m2', 'Chrono Scout', 1, 'CHRONOBOUND', 'COMMON', 1, 2, null,
    ['LETHAL', 'T:DEPLOY'],
    [E('DRAW', PLAY, NONE, draw(1))],
    'Scouts through time. Brings intel.', 'LETHAL. Draw a card'),
  minion('chrono_m3', 'Phase Shifter', 1, 'CHRONOBOUND', 'COMMON', 2, 1, null,
    ['BLITZ'],
    [], 'Shifts into existence. Already swinging.', 'BLITZ'),
  minion('chrono_m4', 'Echo Fragment', 1, 'CHRONOBOUND', 'COMMON', 1, 3, null,
    ['BARRIER'],
    [], 'A fragment of a future echo.', 'BARRIER'),
  // 2-cost (4)
  minion('chrono_m5', 'Paradox Agent', 2, 'CHRONOBOUND', 'COMMON', 3, 2, null,
    ['LETHAL', 'DOUBLE_STRIKE'],
    [], 'Exists in two timelines. Kills in both.', 'LETHAL. DOUBLE STRIKE'),
  minion('chrono_m6', 'Time Stalker', 2, 'CHRONOBOUND', 'COMMON', 2, 3, null,
    ['DRAIN', 'BLITZ'],
    [], 'Stalks through time. Drains through space.', 'DRAIN. BLITZ'),
  minion('chrono_m7', 'Clockwork Assassin', 2, 'CHRONOBOUND', 'COMMON', 3, 3, null,
    ['LETHAL'],
    [], 'Ticks. Tocks. Kills.', 'LETHAL'),
  minion('chrono_m8', 'Flux Walker', 2, 'CHRONOBOUND', 'COMMON', 2, 4, null,
    ['DRAIN', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(1))],
    'Walks through flux. Hits through time.', 'DRAIN. Deal 1 damage to a random enemy'),
  // 3-cost (3)
  minion('chrono_m9', 'Epoch Blade', 3, 'CHRONOBOUND', 'RARE', 3, 4, null,
    ['DOUBLE_STRIKE', 'DRAIN'],
    [], 'Forged across epochs. Sharp across all of them.', 'DOUBLE STRIKE. DRAIN'),
  minion('chrono_m10', 'Temporal Knight', 3, 'CHRONOBOUND', 'COMMON', 3, 5, null,
    ['BLITZ', 'DRAIN'],
    [], 'Knighted by time itself. Fights for all timelines.', 'BLITZ. DRAIN'),
  minion('chrono_m11', 'Moment Stealer', 3, 'CHRONOBOUND', 'COMMON', 4, 3, null,
    ['LETHAL', 'SWIFT', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(1))],
    'Steals your moments. And your health.', 'LETHAL. SWIFT. Deal 1 damage to a random enemy'),
  // 4-cost (3)
  minion('chrono_m12', 'Chrono Ravager', 4, 'CHRONOBOUND', 'COMMON', 5, 4, null,
    ['DOUBLE_STRIKE', 'BLITZ'],
    [], 'Ravages timelines. Ravages faces.', 'DOUBLE STRIKE. BLITZ'),
  minion('chrono_m13', 'Time Lord', 4, 'CHRONOBOUND', 'RARE', 4, 5, null,
    ['LETHAL', 'DRAIN', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(2))],
    'Lord of time. Master of your demise.', 'LETHAL. DRAIN. Deal 2 damage to a random enemy'),
  minion('chrono_m14', 'Paradox Sentinel', 4, 'CHRONOBOUND', 'COMMON', 3, 7, null,
    ['BARRIER', 'DRAIN'],
    [], 'Guards the paradox. Is a paradox.', 'BARRIER. DRAIN'),
  // 5-cost (2)
  minion('chrono_m15', 'Temporal Titan', 5, 'CHRONOBOUND', 'COMMON', 5, 6, null,
    ['DOUBLE_STRIKE', 'DRAIN', 'BLITZ'],
    [], 'A titan across all timelines.', 'DOUBLE STRIKE. DRAIN. BLITZ'),
  minion('chrono_m16', 'Epoch Warden', 5, 'CHRONOBOUND', 'RARE', 4, 8, null,
    ['BARRIER', 'DRAIN', 'LETHAL', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(2))],
    'Wardens guard epochs. This one guards them LETHALLY.', 'BARRIER. DRAIN. LETHAL. Deal 2 damage to a random enemy'),
  // 6-cost (2)
  minion('chrono_m17', 'Infinity Blade', 6, 'CHRONOBOUND', 'COMMON', 6, 7, null,
    ['DOUBLE_STRIKE', 'DRAIN', 'BLITZ', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, RAND_E, dmg(3))],
    'A blade that cuts infinitely. Through everything.', 'DOUBLE STRIKE. DRAIN. BLITZ. Deal 3 damage to a random enemy'),
  minion('chrono_m18', 'Chrono Colossus', 6, 'CHRONOBOUND', 'RARE', 5, 9, null,
    ['LETHAL', 'BARRIER', 'DRAIN', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, ALL_EM, dmg(2))],
    'Colossal in every timeline.', 'LETHAL. BARRIER. DRAIN. Deal 2 damage to all enemy minions'),
  // 7-cost (1)
  minion('chrono_m19', 'Temporal Arbiter', 7, 'CHRONOBOUND', 'EPIC', 7, 8, null,
    ['DOUBLE_STRIKE', 'LETHAL', 'DRAIN', 'BLITZ', 'T:DEPLOY'],
    [E('DAMAGE', PLAY, ALL_EM, dmg(3))],
    'Arbitrates across all of time. The verdict: destruction.', 'DOUBLE STRIKE. LETHAL. DRAIN. BLITZ. Deal 3 damage to all enemy minions'),
  // 8-cost + 9-cost = STARFORGE (inserted separately)
  minion('chrono_m20', 'Time Phantom', 3, 'CHRONOBOUND', 'COMMON', 3, 4, null,
    ['LETHAL', 'DRAIN', 'T:DEPLOY'],
    [E('DRAW', PLAY, NONE, draw(1))],
    'A phantom from another timeline. Here to haunt.', 'LETHAL. DRAIN. Draw a card'),
];

console.log('  CHRONOBOUND: 30 cards defined');

// ============================================================================
// GENERATION — Build the replacement starter deck sections
// ============================================================================

function buildDeck(name, cards, starforgeCards) {
  const allCards = [];
  for (const c of cards) allCards.push(c);
  for (const sf of starforgeCards) allCards.push(sf);
  
  const header = `export const STARTER_DECK_${name}: CardDefinition[] = [\n`;
  const body = allCards.join(',\n');
  const footer = `\n];`;
  
  return header + body + footer;
}

const decks = {
  COGSMITHS: buildDeck('COGSMITHS', COGSMITHS, []),
  LUMINAR: buildDeck('LUMINAR', LUMINAR, [LUMINAR_STARFORGE]),
  PYROCLAST: buildDeck('PYROCLAST', PYROCLAST, []),
  VOIDBORN: buildDeck('VOIDBORN', VOIDBORN, [VOIDBORN_STARFORGE]),
  BIOTITANS: buildDeck('BIOTITANS', BIOTITANS, [BIOTITANS_STARFORGE]),
  CRYSTALLINE: buildDeck('CRYSTALLINE', CRYSTALLINE, [CRYSTALLINE_STARFORGE]),
  PHANTOM_CORSAIRS: buildDeck('PHANTOM_CORSAIRS', PHANTOM_CORSAIRS, [PC_STARFORGE]),
  HIVEMIND: buildDeck('HIVEMIND', HIVEMIND, [HIVEMIND_STARFORGE_1, HIVEMIND_STARFORGE_2]),
  ASTROMANCERS: buildDeck('ASTROMANCERS', ASTROMANCERS, [ASTRO_STARFORGE]),
  CHRONOBOUND: buildDeck('CHRONOBOUND', CHRONOBOUND, [CHRONO_STARFORGE_1, CHRONO_STARFORGE_2]),
};

// Count cards per deck
for (const [name, content] of Object.entries(decks)) {
  const count = (content.match(/id: '/g) || []).length;
  console.log(`  ${name}: ${count} cards in output`);
}

// ============================================================================
// REPLACE STARTER DECK SECTIONS IN SampleCards.ts
// ============================================================================
let src = readFileSync(FILE, 'utf8');

const deckOrder = [
  'COGSMITHS', 'LUMINAR', 'PYROCLAST', 'VOIDBORN', 'BIOTITANS',
  'CRYSTALLINE', 'PHANTOM_CORSAIRS', 'HIVEMIND', 'ASTROMANCERS', 'CHRONOBOUND'
];

for (let i = 0; i < deckOrder.length; i++) {
  const name = deckOrder[i];
  const startMarker = `export const STARTER_DECK_${name}: CardDefinition[] = [`;
  const startIdx = src.indexOf(startMarker);
  
  if (startIdx === -1) {
    console.error(`ERROR: Could not find ${startMarker}`);
    process.exit(1);
  }
  
  // Find the end of this deck array — look for the next STARTER_DECK or getStarterDeck
  let endMarker;
  if (i < deckOrder.length - 1) {
    endMarker = `export const STARTER_DECK_${deckOrder[i + 1]}`;
  } else {
    endMarker = 'export function getStarterDeck';
  }
  
  const endIdx = src.indexOf(endMarker, startIdx);
  if (endIdx === -1) {
    console.error(`ERROR: Could not find end marker ${endMarker}`);
    process.exit(1);
  }
  
  // Replace everything from startIdx to endIdx (exclusive)
  const before = src.substring(0, startIdx);
  const after = src.substring(endIdx);
  src = before + decks[name] + '\n\n' + after;
  
  console.log(`  Replaced STARTER_DECK_${name}`);
}

writeFileSync(FILE, src);
console.log('\nDone! All 10 starter decks replaced.');
console.log('Run: npx esbuild run-balance-test.ts --bundle --platform=node --outfile=_test.cjs && node _test.cjs');
