/**
 * STARFORGE TCG - Expansion Cards
 *
 * Additional cards for post-story deckbuilding. Each faction gets 10 extra
 * cards (5 Rare, 3 Epic, 2 Legendary) that add strategic depth and powerful
 * synergies beyond the starter deck. Plus 15 neutral expansion cards.
 *
 * These cards are unlocked when a player defeats that faction's planet
 * in the campaign, expanding their deckbuilding pool.
 */

import { CardType, CardRarity, MinionTribe } from '../types/Card';
import type { CardDefinition } from '../types/Card';
import { Race } from '../types/Race';
import { CombatKeyword, TriggerKeyword } from '../types/Keywords';
import { EffectType, EffectTrigger, TargetType } from '../types/Effects';
import type {
  DamageEffectData,
  HealEffectData,
  BuffEffectData,
  DrawEffectData,
  SummonEffectData,
  GenericEffectData,
  GainCrystalsData,
} from '../types/Effects';
import { StarforgeType, StarforgeConditionType } from '../types/Starforge';

// ============================================================================
// COGSMITHS EXPANSION (10 cards)
// ============================================================================
export const COGSMITHS_EXPANSION: CardDefinition[] = [
  { id: 'cog_ex1', name: 'Scrapyard Salvager', cost: 2, type: CardType.MINION, race: Race.COGSMITHS, rarity: CardRarity.RARE, attack: 2, health: 2, tribe: MinionTribe.MECH, keywords: [{ keyword: TriggerKeyword.LAST_WORDS }], effects: [{ id: 'e0', type: EffectType.DRAW, trigger: EffectTrigger.ON_DEATH, targetType: TargetType.NONE, data: { count: 1 } as DrawEffectData, isMandatory: true }], flavorText: 'One mech\'s junk...', cardText: 'LAST WORDS: Draw a card', collectible: true, set: 'EXPANSION' },
  { id: 'cog_ex2', name: 'Overclock Engineer', cost: 3, type: CardType.MINION, race: Race.COGSMITHS, rarity: CardRarity.RARE, attack: 3, health: 3, tribe: MinionTribe.MECH, keywords: [{ keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.BUFF, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.CHOSEN, data: { attack: 2, health: 0 } as BuffEffectData, isMandatory: true }], flavorText: 'Push it to the limit!', cardText: 'DEPLOY: Give a friendly Mech +2/+0', collectible: true, set: 'EXPANSION' },
  { id: 'cog_ex3', name: 'Emergency Protocol', cost: 3, type: CardType.SPELL, race: Race.COGSMITHS, rarity: CardRarity.RARE, keywords: [], effects: [{ id: 'e0', type: EffectType.BUFF, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_FRIENDLY_MINIONS, data: { attack: 0, health: 3 } as BuffEffectData, isMandatory: true }], flavorText: 'Shields up!', cardText: 'Give all friendly minions +0/+3', collectible: true, set: 'EXPANSION' },
  { id: 'cog_ex4', name: 'Arc Welder', cost: 4, type: CardType.MINION, race: Race.COGSMITHS, rarity: CardRarity.RARE, attack: 4, health: 3, tribe: MinionTribe.MECH, keywords: [{ keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.CHOSEN, data: { amount: 3 } as DamageEffectData, isMandatory: true }], flavorText: 'Precision welding... or cutting.', cardText: 'DEPLOY: Deal 3 damage', collectible: true, set: 'EXPANSION' },
  { id: 'cog_ex5', name: 'Mech Assembly Line', cost: 4, type: CardType.SPELL, race: Race.COGSMITHS, rarity: CardRarity.RARE, keywords: [], effects: [{ id: 'e0', type: EffectType.SUMMON, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.NONE, data: { cardId: 'token_mech', count: 3 } as SummonEffectData, isMandatory: true }], flavorText: 'Mass production.', cardText: 'Summon three 2/2 Mechs', collectible: true, set: 'EXPANSION' },
  { id: 'cog_ex6', name: 'Titan Forgemaster', cost: 6, type: CardType.MINION, race: Race.COGSMITHS, rarity: CardRarity.EPIC, attack: 5, health: 7, tribe: MinionTribe.MECH, keywords: [{ keyword: CombatKeyword.GUARDIAN }, { keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.BUFF, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_FRIENDLY_MINIONS, data: { attack: 1, health: 1 } as BuffEffectData, isMandatory: true }], flavorText: 'Forges titans from scrap.', cardText: 'GUARDIAN. DEPLOY: Give all friendly minions +1/+1', collectible: true, set: 'EXPANSION' },
  { id: 'cog_ex7', name: 'Magnetic Pulse Cannon', cost: 5, type: CardType.SPELL, race: Race.COGSMITHS, rarity: CardRarity.EPIC, keywords: [], effects: [{ id: 'e0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_ENEMY_MINIONS, data: { amount: 3 } as DamageEffectData, isMandatory: true }], flavorText: 'Electromagnetic devastation.', cardText: 'Deal 3 damage to all enemy minions', collectible: true, set: 'EXPANSION' },
  { id: 'cog_ex8', name: 'Prototype Colossus', cost: 7, type: CardType.MINION, race: Race.COGSMITHS, rarity: CardRarity.EPIC, attack: 7, health: 7, tribe: MinionTribe.MECH, keywords: [{ keyword: CombatKeyword.GUARDIAN }, { keyword: CombatKeyword.BARRIER }], effects: [], flavorText: 'The ultimate prototype.', cardText: 'GUARDIAN. BARRIER', collectible: true, set: 'EXPANSION' },
  { id: 'cog_ex9', name: 'Mechronis Prime', cost: 8, type: CardType.MINION, race: Race.COGSMITHS, rarity: CardRarity.LEGENDARY, attack: 6, health: 8, tribe: MinionTribe.MECH, keywords: [{ keyword: CombatKeyword.GUARDIAN }, { keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.SUMMON, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.NONE, data: { cardId: 'token_mech', count: 3 } as SummonEffectData, isMandatory: true }], flavorText: 'The heart of Mechronis awakens.', cardText: 'GUARDIAN. DEPLOY: Summon three 2/2 Mechs with SWIFT', collectible: true, set: 'EXPANSION',
    starforge: {
      type: StarforgeType.PROGRESSIVE,
      conditions: [{ type: StarforgeConditionType.SUMMON_COUNT, targetValue: 8, persistsAcrossZones: true, persistsIfSilenced: true }],
      forgedForm: { name: 'MECHRONIS ASCENDED', cost: 8, attack: 12, health: 16, keywords: [{ keyword: CombatKeyword.GUARDIAN }, { keyword: CombatKeyword.BARRIER }, { keyword: CombatKeyword.DOUBLE_STRIKE }], effects: [], cardText: 'GUARDIAN. BARRIER. DOUBLE STRIKE. Your Mechs have +3/+3 and SWIFT.' },
      isReversible: false,
      transformationText: 'STARFORGE — After summoning 8 minions: Transform into MECHRONIS ASCENDED — 12/16 with GUARDIAN, BARRIER, DOUBLE STRIKE.',
    },
  },
  { id: 'cog_ex10', name: 'The Omega Engine', cost: 10, type: CardType.MINION, race: Race.COGSMITHS, rarity: CardRarity.LEGENDARY, attack: 8, health: 10, tribe: MinionTribe.MECH, keywords: [{ keyword: CombatKeyword.BARRIER }, { keyword: CombatKeyword.GUARDIAN }, { keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.BUFF, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_FRIENDLY_MINIONS, data: { attack: 3, health: 3 } as BuffEffectData, isMandatory: true }], flavorText: 'The final creation.', cardText: 'BARRIER. GUARDIAN. DEPLOY: Give all friendly minions +3/+3', collectible: true, set: 'EXPANSION',
    starforge: {
      type: StarforgeType.PROGRESSIVE,
      conditions: [{ type: StarforgeConditionType.SPELLS_CAST, targetValue: 6, persistsAcrossZones: true, persistsIfSilenced: true }],
      forgedForm: { name: 'THE SINGULARITY ENGINE', cost: 10, attack: 16, health: 20, keywords: [{ keyword: CombatKeyword.BARRIER }, { keyword: CombatKeyword.GUARDIAN }, { keyword: CombatKeyword.DOUBLE_STRIKE }], effects: [], cardText: 'BARRIER. GUARDIAN. DOUBLE STRIKE. Start of Turn: Give all friendly minions +3/+3 and BARRIER.' },
      isReversible: false,
      transformationText: 'STARFORGE — After casting 6 spells: Transform into THE SINGULARITY ENGINE — 16/20. Your army becomes unstoppable.',
    },
  },
];

// ============================================================================
// LUMINAR EXPANSION (10 cards)
// ============================================================================
export const LUMINAR_EXPANSION: CardDefinition[] = [
  { id: 'lum_ex1', name: 'Dawn Acolyte', cost: 2, type: CardType.MINION, race: Race.LUMINAR, rarity: CardRarity.RARE, attack: 2, health: 3, keywords: [{ keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.HEAL, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.FRIENDLY_HERO, data: { amount: 4 } as HealEffectData, isMandatory: true }], flavorText: 'Dawn brings hope.', cardText: 'DEPLOY: Restore 4 Health to your Hero', collectible: true, set: 'EXPANSION' },
  { id: 'lum_ex2', name: 'Holy Smite', cost: 2, type: CardType.SPELL, race: Race.LUMINAR, rarity: CardRarity.RARE, keywords: [], effects: [{ id: 'e0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.CHOSEN, data: { amount: 4 } as DamageEffectData, isMandatory: true }], flavorText: 'Divine punishment.', cardText: 'Deal 4 damage', collectible: true, set: 'EXPANSION' },
  { id: 'lum_ex3', name: 'Consecrated Shield', cost: 3, type: CardType.SPELL, race: Race.LUMINAR, rarity: CardRarity.RARE, keywords: [], effects: [{ id: 'e0', type: EffectType.BUFF, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_FRIENDLY_MINIONS, data: { attack: 0, health: 3 } as BuffEffectData, isMandatory: true }], flavorText: 'Protected by the light.', cardText: 'Give all friendly minions +0/+3', collectible: true, set: 'EXPANSION' },
  { id: 'lum_ex4', name: 'Radiant Templar', cost: 4, type: CardType.MINION, race: Race.LUMINAR, rarity: CardRarity.RARE, attack: 3, health: 5, keywords: [{ keyword: CombatKeyword.GUARDIAN }, { keyword: CombatKeyword.DRAIN }], effects: [], flavorText: 'Heals as it fights.', cardText: 'GUARDIAN. DRAIN', collectible: true, set: 'EXPANSION' },
  { id: 'lum_ex5', name: 'Blessing of Solhaven', cost: 4, type: CardType.SPELL, race: Race.LUMINAR, rarity: CardRarity.RARE, keywords: [], effects: [{ id: 'e0', type: EffectType.HEAL, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_FRIENDLIES, data: { amount: 4 } as HealEffectData, isMandatory: true }], flavorText: 'The sun blesses all.', cardText: 'Restore 4 Health to all friendly characters', collectible: true, set: 'EXPANSION' },
  { id: 'lum_ex6', name: 'Sunfire Avenger', cost: 5, type: CardType.MINION, race: Race.LUMINAR, rarity: CardRarity.EPIC, attack: 5, health: 5, keywords: [{ keyword: CombatKeyword.BARRIER }, { keyword: CombatKeyword.SWIFT }], effects: [], flavorText: 'Avenges with sunfire.', cardText: 'BARRIER. SWIFT', collectible: true, set: 'EXPANSION' },
  { id: 'lum_ex7', name: 'Divine Judgment', cost: 6, type: CardType.SPELL, race: Race.LUMINAR, rarity: CardRarity.EPIC, keywords: [], effects: [{ id: 'e0', type: EffectType.DESTROY, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_ENEMY_MINIONS, data: { value: 1 } as GenericEffectData, isMandatory: true }], flavorText: 'All are judged.', cardText: 'Destroy all enemy minions with 3 or less Attack', collectible: true, set: 'EXPANSION' },
  { id: 'lum_ex8', name: 'Archangel of Light', cost: 7, type: CardType.MINION, race: Race.LUMINAR, rarity: CardRarity.EPIC, attack: 5, health: 8, keywords: [{ keyword: CombatKeyword.GUARDIAN }, { keyword: CombatKeyword.BARRIER }, { keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.HEAL, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.FRIENDLY_HERO, data: { amount: 8 } as HealEffectData, isMandatory: true }], flavorText: 'An angel descends.', cardText: 'GUARDIAN. BARRIER. DEPLOY: Restore 8 Health to your Hero', collectible: true, set: 'EXPANSION' },
  { id: 'lum_ex9', name: 'High Priestess Aurelia', cost: 8, type: CardType.MINION, race: Race.LUMINAR, rarity: CardRarity.LEGENDARY, attack: 5, health: 9, keywords: [{ keyword: CombatKeyword.GUARDIAN }, { keyword: CombatKeyword.DRAIN }], effects: [{ id: 'e0', type: EffectType.HEAL, trigger: EffectTrigger.ON_TURN_END, targetType: TargetType.ALL_FRIENDLIES, data: { amount: 3 } as HealEffectData, isMandatory: true }], flavorText: 'High Priestess of Solhaven.', cardText: 'GUARDIAN. DRAIN. End of Turn: Restore 3 Health to all friendly characters', collectible: true, set: 'EXPANSION',
    starforge: {
      type: StarforgeType.PROGRESSIVE,
      conditions: [{ type: StarforgeConditionType.HEALING_DONE, targetValue: 20, persistsAcrossZones: true, persistsIfSilenced: true }],
      forgedForm: { name: 'AURELIA, SAINT OF LIGHT', cost: 8, attack: 10, health: 18, keywords: [{ keyword: CombatKeyword.GUARDIAN }, { keyword: CombatKeyword.DRAIN }, { keyword: CombatKeyword.BARRIER }], effects: [], cardText: 'GUARDIAN. DRAIN. BARRIER. End of Turn: Fully heal all friendly minions.' },
      isReversible: false,
      transformationText: 'STARFORGE — After healing 20 total Health: Transform into AURELIA, SAINT OF LIGHT — 10/18. Your army can never fall.',
    },
  },
  { id: 'lum_ex10', name: 'Solhaven, The Radiant', cost: 10, type: CardType.MINION, race: Race.LUMINAR, rarity: CardRarity.LEGENDARY, attack: 7, health: 12, keywords: [{ keyword: CombatKeyword.GUARDIAN }, { keyword: CombatKeyword.BARRIER }, { keyword: CombatKeyword.DRAIN }], effects: [], flavorText: 'The living sun.', cardText: 'GUARDIAN. BARRIER. DRAIN', collectible: true, set: 'EXPANSION',
    starforge: {
      type: StarforgeType.PROGRESSIVE,
      conditions: [{ type: StarforgeConditionType.HEALING_DONE, targetValue: 30, persistsAcrossZones: true, persistsIfSilenced: true }],
      forgedForm: { name: 'SOLHAVEN ETERNAL', cost: 10, attack: 14, health: 24, keywords: [{ keyword: CombatKeyword.GUARDIAN }, { keyword: CombatKeyword.BARRIER }, { keyword: CombatKeyword.DRAIN }, { keyword: CombatKeyword.DOUBLE_STRIKE }], effects: [], cardText: 'GUARDIAN. BARRIER. DRAIN. DOUBLE STRIKE. Immune to damage on your turn.' },
      isReversible: false,
      transformationText: 'STARFORGE — After healing 30 total Health: Transform into SOLHAVEN ETERNAL — 14/24. The undying sun.',
    },
  },
];

// ============================================================================
// PYROCLAST EXPANSION (10 cards)
// ============================================================================
export const PYROCLAST_EXPANSION: CardDefinition[] = [
  { id: 'pyro_ex1', name: 'Flame Imp', cost: 1, type: CardType.MINION, race: Race.PYROCLAST, rarity: CardRarity.RARE, attack: 3, health: 2, keywords: [{ keyword: CombatKeyword.SWIFT }], effects: [{ id: 'e0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.FRIENDLY_HERO, data: { amount: 2 } as DamageEffectData, isMandatory: true }], flavorText: 'Power has a price.', cardText: 'SWIFT. DEPLOY: Deal 2 damage to YOUR Hero', collectible: true, set: 'EXPANSION' },
  { id: 'pyro_ex2', name: 'Molten Barrage', cost: 2, type: CardType.SPELL, race: Race.PYROCLAST, rarity: CardRarity.RARE, keywords: [], effects: [{ id: 'e0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.RANDOM_ENEMY, data: { amount: 2 } as DamageEffectData, isMandatory: true }], flavorText: 'Lava rains down.', cardText: 'Deal 2 damage to a random enemy. Repeat twice', collectible: true, set: 'EXPANSION' },
  { id: 'pyro_ex3', name: 'Pyromaniac', cost: 3, type: CardType.MINION, race: Race.PYROCLAST, rarity: CardRarity.RARE, attack: 4, health: 2, keywords: [{ keyword: CombatKeyword.BLITZ }, { keyword: CombatKeyword.SWIFT }], effects: [], flavorText: 'Burn it all!', cardText: 'BLITZ. SWIFT', collectible: true, set: 'EXPANSION' },
  { id: 'pyro_ex4', name: 'Searing Chains', cost: 3, type: CardType.SPELL, race: Race.PYROCLAST, rarity: CardRarity.RARE, keywords: [], effects: [{ id: 'e0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_ENEMY_MINIONS, data: { amount: 2 } as DamageEffectData, isMandatory: true }], flavorText: 'Chains of flame.', cardText: 'Deal 2 damage to all enemy minions', collectible: true, set: 'EXPANSION' },
  { id: 'pyro_ex5', name: 'Lava Golem', cost: 5, type: CardType.MINION, race: Race.PYROCLAST, rarity: CardRarity.RARE, attack: 6, health: 5, keywords: [{ keyword: CombatKeyword.BLITZ }], effects: [], flavorText: 'Pure magma given form.', cardText: 'BLITZ', collectible: true, set: 'EXPANSION' },
  { id: 'pyro_ex6', name: 'Magma Elemental Lord', cost: 6, type: CardType.MINION, race: Race.PYROCLAST, rarity: CardRarity.EPIC, attack: 6, health: 5, keywords: [{ keyword: CombatKeyword.SWIFT }, { keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.RANDOM_ENEMY, data: { amount: 4 } as DamageEffectData, isMandatory: true }], flavorText: 'Fire incarnate.', cardText: 'SWIFT. DEPLOY: Deal 4 damage to a random enemy', collectible: true, set: 'EXPANSION' },
  { id: 'pyro_ex7', name: 'Inferno Wave', cost: 6, type: CardType.SPELL, race: Race.PYROCLAST, rarity: CardRarity.EPIC, keywords: [], effects: [{ id: 'e0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_ENEMIES, data: { amount: 4 } as DamageEffectData, isMandatory: true }], flavorText: 'Everything burns.', cardText: 'Deal 4 damage to all enemies', collectible: true, set: 'EXPANSION' },
  { id: 'pyro_ex8', name: 'Volcanic Titan', cost: 7, type: CardType.MINION, race: Race.PYROCLAST, rarity: CardRarity.EPIC, attack: 7, health: 6, keywords: [{ keyword: CombatKeyword.SWIFT }, { keyword: CombatKeyword.BLITZ }], effects: [], flavorText: 'Erupts with fury.', cardText: 'SWIFT. BLITZ', collectible: true, set: 'EXPANSION' },
  { id: 'pyro_ex9', name: 'Ignaros the Burning', cost: 9, type: CardType.MINION, race: Race.PYROCLAST, rarity: CardRarity.LEGENDARY, attack: 8, health: 7, keywords: [{ keyword: CombatKeyword.SWIFT }, { keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_ENEMIES, data: { amount: 4 } as DamageEffectData, isMandatory: true }], flavorText: 'The living volcano.', cardText: 'SWIFT. DEPLOY: Deal 4 damage to all enemies', collectible: true, set: 'EXPANSION',
    starforge: {
      type: StarforgeType.PROGRESSIVE,
      conditions: [{ type: StarforgeConditionType.DAMAGE_DONE, targetValue: 25, persistsAcrossZones: true, persistsIfSilenced: true }],
      forgedForm: { name: 'IGNAROS, WORLD BURNER', cost: 9, attack: 16, health: 14, keywords: [{ keyword: CombatKeyword.SWIFT }, { keyword: CombatKeyword.BLITZ }, { keyword: CombatKeyword.DOUBLE_STRIKE }], effects: [], cardText: 'SWIFT. BLITZ. DOUBLE STRIKE. End of Turn: Deal 4 damage to all enemies.' },
      isReversible: false,
      transformationText: 'STARFORGE — After dealing 25 total damage: Transform into IGNAROS, WORLD BURNER — 16/14. Nothing survives the inferno.',
    },
  },
  { id: 'pyro_ex10', name: 'Supernova', cost: 10, type: CardType.SPELL, race: Race.PYROCLAST, rarity: CardRarity.LEGENDARY, keywords: [], effects: [{ id: 'e0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_CHARACTERS, data: { amount: 8 } as DamageEffectData, isMandatory: true }], flavorText: 'Total annihilation.', cardText: 'Deal 8 damage to ALL characters', collectible: true, set: 'EXPANSION' },
];

// ============================================================================
// VOIDBORN EXPANSION (10 cards)
// ============================================================================
export const VOIDBORN_EXPANSION: CardDefinition[] = [
  { id: 'void_ex1', name: 'Void Leech', cost: 2, type: CardType.MINION, race: Race.VOIDBORN, rarity: CardRarity.RARE, attack: 2, health: 3, keywords: [{ keyword: CombatKeyword.DRAIN }], effects: [], flavorText: 'Drains life force.', cardText: 'DRAIN', collectible: true, set: 'EXPANSION' },
  { id: 'void_ex2', name: 'Null Field', cost: 2, type: CardType.SPELL, race: Race.VOIDBORN, rarity: CardRarity.RARE, keywords: [], effects: [{ id: 'e0', type: EffectType.SILENCE, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.CHOSEN, data: { value: 1 } as GenericEffectData, isMandatory: true }], flavorText: 'Silence everything.', cardText: 'Silence a minion', collectible: true, set: 'EXPANSION' },
  { id: 'void_ex3', name: 'Shadow Assassin', cost: 3, type: CardType.MINION, race: Race.VOIDBORN, rarity: CardRarity.RARE, attack: 3, health: 2, keywords: [{ keyword: CombatKeyword.CLOAK }, { keyword: CombatKeyword.LETHAL }], effects: [], flavorText: 'Death from the void.', cardText: 'CLOAK. LETHAL', collectible: true, set: 'EXPANSION' },
  { id: 'void_ex4', name: 'Void Blast', cost: 3, type: CardType.SPELL, race: Race.VOIDBORN, rarity: CardRarity.RARE, keywords: [], effects: [{ id: 'e0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.CHOSEN, data: { amount: 5 } as DamageEffectData, isMandatory: true }], flavorText: 'A blast of nothingness.', cardText: 'Deal 5 damage', collectible: true, set: 'EXPANSION' },
  { id: 'void_ex5', name: 'Entropy Weaver', cost: 4, type: CardType.MINION, race: Race.VOIDBORN, rarity: CardRarity.RARE, attack: 4, health: 4, keywords: [{ keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.DEBUFF, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_ENEMY_MINIONS, data: { attack: -1, health: 0 } as BuffEffectData, isMandatory: true }], flavorText: 'Weaves entropy.', cardText: 'DEPLOY: Give all enemy minions -1/-0', collectible: true, set: 'EXPANSION' },
  { id: 'void_ex6', name: 'Void Colossus', cost: 6, type: CardType.MINION, race: Race.VOIDBORN, rarity: CardRarity.EPIC, attack: 6, health: 6, keywords: [{ keyword: CombatKeyword.DRAIN }, { keyword: CombatKeyword.GUARDIAN }], effects: [], flavorText: 'The void made flesh.', cardText: 'DRAIN. GUARDIAN', collectible: true, set: 'EXPANSION' },
  { id: 'void_ex7', name: 'Void Rift', cost: 5, type: CardType.SPELL, race: Race.VOIDBORN, rarity: CardRarity.EPIC, keywords: [], effects: [{ id: 'e0', type: EffectType.DESTROY, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.CHOSEN, data: { value: 1 } as GenericEffectData, isMandatory: true }], flavorText: 'A rift to nowhere.', cardText: 'Destroy a minion. Draw a card', collectible: true, set: 'EXPANSION' },
  { id: 'void_ex8', name: 'Annihilator', cost: 7, type: CardType.MINION, race: Race.VOIDBORN, rarity: CardRarity.EPIC, attack: 6, health: 8, keywords: [{ keyword: CombatKeyword.DRAIN }, { keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_ENEMY_MINIONS, data: { amount: 2 } as DamageEffectData, isMandatory: true }], flavorText: 'Annihilates existence.', cardText: 'DRAIN. DEPLOY: Deal 2 damage to all enemy minions', collectible: true, set: 'EXPANSION' },
  { id: 'void_ex9', name: 'Nullheim Sovereign', cost: 8, type: CardType.MINION, race: Race.VOIDBORN, rarity: CardRarity.LEGENDARY, attack: 7, health: 8, keywords: [{ keyword: CombatKeyword.DRAIN }, { keyword: CombatKeyword.BARRIER }], effects: [{ id: 'e0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_TURN_END, targetType: TargetType.ALL_ENEMY_MINIONS, data: { amount: 2 } as DamageEffectData, isMandatory: true }], flavorText: 'Sovereign of the Void.', cardText: 'DRAIN. BARRIER. End of Turn: Deal 2 damage to all enemy minions', collectible: true, set: 'EXPANSION',
    starforge: {
      type: StarforgeType.PROGRESSIVE,
      conditions: [{ type: StarforgeConditionType.MINIONS_DIED, targetValue: 8, persistsAcrossZones: true, persistsIfSilenced: true }],
      forgedForm: { name: 'NULLHEIM, DEVOURER OF WORLDS', cost: 8, attack: 14, health: 16, keywords: [{ keyword: CombatKeyword.DRAIN }, { keyword: CombatKeyword.BARRIER }, { keyword: CombatKeyword.CLOAK }], effects: [], cardText: 'DRAIN. BARRIER. CLOAK. End of Turn: Deal 4 damage to all enemies and heal your Hero for the damage dealt.' },
      isReversible: false,
      transformationText: 'STARFORGE — After 8 minions die: Transform into NULLHEIM, DEVOURER OF WORLDS — 14/16. The void feeds on death.',
    },
  },
  { id: 'void_ex10', name: 'The Void Incarnate', cost: 10, type: CardType.MINION, race: Race.VOIDBORN, rarity: CardRarity.LEGENDARY, attack: 8, health: 10, keywords: [{ keyword: CombatKeyword.DRAIN }, { keyword: CombatKeyword.GUARDIAN }, { keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.DESTROY, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_ENEMY_MINIONS, data: { value: 1 } as GenericEffectData, isMandatory: true }], flavorText: 'The void itself.', cardText: 'DRAIN. GUARDIAN. DEPLOY: Destroy all enemy minions', collectible: true, set: 'EXPANSION',
    starforge: {
      type: StarforgeType.PROGRESSIVE,
      conditions: [{ type: StarforgeConditionType.BANISH_COUNT, targetValue: 5, persistsAcrossZones: true, persistsIfSilenced: true }],
      forgedForm: { name: 'OBLIVION INCARNATE', cost: 10, attack: 16, health: 20, keywords: [{ keyword: CombatKeyword.DRAIN }, { keyword: CombatKeyword.GUARDIAN }, { keyword: CombatKeyword.BARRIER }, { keyword: CombatKeyword.LETHAL }], effects: [], cardText: 'DRAIN. GUARDIAN. BARRIER. LETHAL. Whenever an enemy minion is played, destroy it.' },
      isReversible: false,
      transformationText: 'STARFORGE — After banishing 5 cards: Transform into OBLIVION INCARNATE — 16/20. Nothing can exist near the void.',
    },
  },
];

// ============================================================================
// BIOTITANS EXPANSION (10 cards)
// ============================================================================
export const BIOTITANS_EXPANSION: CardDefinition[] = [
  { id: 'bio_ex1', name: 'Seedling Sprout', cost: 1, type: CardType.MINION, race: Race.BIOTITANS, rarity: CardRarity.RARE, attack: 1, health: 1, tribe: MinionTribe.BEAST, keywords: [{ keyword: TriggerKeyword.LAST_WORDS }], effects: [{ id: 'e0', type: EffectType.SUMMON, trigger: EffectTrigger.ON_DEATH, targetType: TargetType.NONE, data: { cardId: 'token_beast', count: 2 } as SummonEffectData, isMandatory: true }], flavorText: 'Death feeds growth.', cardText: 'LAST WORDS: Summon two 1/1 Beasts', collectible: true, set: 'EXPANSION' },
  { id: 'bio_ex2', name: 'Predator\'s Instinct', cost: 2, type: CardType.SPELL, race: Race.BIOTITANS, rarity: CardRarity.RARE, keywords: [], effects: [{ id: 'e0', type: EffectType.BUFF, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.CHOSEN, data: { attack: 3, health: 1 } as BuffEffectData, isMandatory: true }], flavorText: 'The hunt begins.', cardText: 'Give a minion +3/+1', collectible: true, set: 'EXPANSION' },
  { id: 'bio_ex3', name: 'Primal Guardian', cost: 4, type: CardType.MINION, race: Race.BIOTITANS, rarity: CardRarity.RARE, attack: 3, health: 6, tribe: MinionTribe.BEAST, keywords: [{ keyword: CombatKeyword.GUARDIAN }, { keyword: CombatKeyword.DRAIN }], effects: [], flavorText: 'Protects and sustains.', cardText: 'GUARDIAN. DRAIN', collectible: true, set: 'EXPANSION' },
  { id: 'bio_ex4', name: 'Overgrowth', cost: 3, type: CardType.SPELL, race: Race.BIOTITANS, rarity: CardRarity.RARE, keywords: [], effects: [{ id: 'e0', type: EffectType.GAIN_CRYSTALS, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.NONE, data: { amount: 2, isEmpty: true } as GainCrystalsData, isMandatory: true }], flavorText: 'Nature accelerates.', cardText: 'Gain 2 empty Mana Crystals', collectible: true, set: 'EXPANSION' },
  { id: 'bio_ex5', name: 'Alpha Rex', cost: 5, type: CardType.MINION, race: Race.BIOTITANS, rarity: CardRarity.RARE, attack: 5, health: 6, tribe: MinionTribe.BEAST, keywords: [{ keyword: CombatKeyword.SWIFT }], effects: [], flavorText: 'Apex predator.', cardText: 'SWIFT', collectible: true, set: 'EXPANSION' },
  { id: 'bio_ex6', name: 'Primeval Matriarch', cost: 6, type: CardType.MINION, race: Race.BIOTITANS, rarity: CardRarity.EPIC, attack: 5, health: 7, tribe: MinionTribe.BEAST, keywords: [{ keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.BUFF, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_FRIENDLY_MINIONS, data: { attack: 2, health: 1 } as BuffEffectData, isMandatory: true }], flavorText: 'Mother of all.', cardText: 'DEPLOY: Give all friendly minions +2/+1', collectible: true, set: 'EXPANSION' },
  { id: 'bio_ex7', name: 'Extinction Event', cost: 6, type: CardType.SPELL, race: Race.BIOTITANS, rarity: CardRarity.EPIC, keywords: [], effects: [{ id: 'e0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_MINIONS, data: { amount: 4 } as DamageEffectData, isMandatory: true }], flavorText: 'Only the strongest survive.', cardText: 'Deal 4 damage to ALL minions', collectible: true, set: 'EXPANSION' },
  { id: 'bio_ex8', name: 'Titan Broodmother', cost: 7, type: CardType.MINION, race: Race.BIOTITANS, rarity: CardRarity.EPIC, attack: 6, health: 8, tribe: MinionTribe.BEAST, keywords: [{ keyword: CombatKeyword.GUARDIAN }, { keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.SUMMON, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.NONE, data: { cardId: 'token_beast', count: 2 } as SummonEffectData, isMandatory: true }], flavorText: 'Breeds giants.', cardText: 'GUARDIAN. DEPLOY: Summon two 3/3 Beasts', collectible: true, set: 'EXPANSION' },
  { id: 'bio_ex9', name: 'Primeva World Tree', cost: 9, type: CardType.MINION, race: Race.BIOTITANS, rarity: CardRarity.LEGENDARY, attack: 5, health: 12, tribe: MinionTribe.BEAST, keywords: [{ keyword: CombatKeyword.GUARDIAN }], effects: [{ id: 'e0', type: EffectType.HEAL, trigger: EffectTrigger.ON_TURN_START, targetType: TargetType.ALL_FRIENDLIES, data: { amount: 3 } as HealEffectData, isMandatory: true }], flavorText: 'The tree of all life.', cardText: 'GUARDIAN. Start of Turn: Restore 3 Health to all friendly characters', collectible: true, set: 'EXPANSION',
    starforge: {
      type: StarforgeType.PROGRESSIVE,
      conditions: [{ type: StarforgeConditionType.HEALING_DONE, targetValue: 25, persistsAcrossZones: true, persistsIfSilenced: true }],
      forgedForm: { name: 'YGGDRASIL, TREE OF ETERNITY', cost: 9, attack: 10, health: 24, keywords: [{ keyword: CombatKeyword.GUARDIAN }, { keyword: CombatKeyword.BARRIER }], effects: [], cardText: 'GUARDIAN. BARRIER. Start of Turn: Fully heal all friendly characters. Summon a 3/3 Treant.' },
      isReversible: false,
      transformationText: 'STARFORGE — After healing 25 total Health: Transform into YGGDRASIL, TREE OF ETERNITY — 10/24. Life eternal.',
    },
  },
  { id: 'bio_ex10', name: 'Gaia, Titan Supreme', cost: 10, type: CardType.MINION, race: Race.BIOTITANS, rarity: CardRarity.LEGENDARY, attack: 10, health: 10, tribe: MinionTribe.BEAST, keywords: [{ keyword: CombatKeyword.GUARDIAN }, { keyword: CombatKeyword.SWIFT }, { keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.BUFF, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_FRIENDLY_MINIONS, data: { attack: 2, health: 2 } as BuffEffectData, isMandatory: true }], flavorText: 'Mother Earth incarnate.', cardText: 'GUARDIAN. SWIFT. DEPLOY: Give all friendly minions +2/+2', collectible: true, set: 'EXPANSION',
    starforge: {
      type: StarforgeType.PROGRESSIVE,
      conditions: [{ type: StarforgeConditionType.SUMMON_COUNT, targetValue: 10, persistsAcrossZones: true, persistsIfSilenced: true }],
      forgedForm: { name: 'GAIA, THE LIVING WORLD', cost: 10, attack: 20, health: 20, keywords: [{ keyword: CombatKeyword.GUARDIAN }, { keyword: CombatKeyword.SWIFT }, { keyword: CombatKeyword.DOUBLE_STRIKE }, { keyword: CombatKeyword.BARRIER }], effects: [], cardText: 'GUARDIAN. SWIFT. DOUBLE STRIKE. BARRIER. Start of Turn: Give all friendly minions +3/+3.' },
      isReversible: false,
      transformationText: 'STARFORGE — After summoning 10 minions: Transform into GAIA, THE LIVING WORLD — 20/20. The planet fights back.',
    },
  },
];

// ============================================================================
// CRYSTALLINE EXPANSION (10 cards)
// ============================================================================
export const CRYSTALLINE_EXPANSION: CardDefinition[] = [
  { id: 'crys_ex1', name: 'Mana Battery', cost: 1, type: CardType.MINION, race: Race.CRYSTALLINE, rarity: CardRarity.RARE, attack: 1, health: 2, keywords: [{ keyword: TriggerKeyword.LAST_WORDS }], effects: [{ id: 'e0', type: EffectType.DRAW, trigger: EffectTrigger.ON_DEATH, targetType: TargetType.NONE, data: { count: 1 } as DrawEffectData, isMandatory: true }], flavorText: 'Stores and releases.', cardText: 'LAST WORDS: Draw a card', collectible: true, set: 'EXPANSION' },
  { id: 'crys_ex2', name: 'Arcane Missiles', cost: 2, type: CardType.SPELL, race: Race.CRYSTALLINE, rarity: CardRarity.RARE, keywords: [], effects: [{ id: 'e0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.RANDOM_ENEMY, data: { amount: 1 } as DamageEffectData, isMandatory: true }], flavorText: 'Three bolts of energy.', cardText: 'Deal 1 damage to a random enemy three times', collectible: true, set: 'EXPANSION' },
  { id: 'crys_ex3', name: 'Mana Infusion', cost: 3, type: CardType.SPELL, race: Race.CRYSTALLINE, rarity: CardRarity.RARE, keywords: [], effects: [{ id: 'e0', type: EffectType.GAIN_CRYSTALS, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.NONE, data: { amount: 2, isEmpty: false } as GainCrystalsData, isMandatory: true }], flavorText: 'Pure mana energy.', cardText: 'Gain 2 Mana Crystals this turn only', collectible: true, set: 'EXPANSION' },
  { id: 'crys_ex4', name: 'Crystal Golem', cost: 4, type: CardType.MINION, race: Race.CRYSTALLINE, rarity: CardRarity.RARE, attack: 4, health: 5, keywords: [{ keyword: CombatKeyword.BARRIER }], effects: [], flavorText: 'Crystallized and tough.', cardText: 'BARRIER', collectible: true, set: 'EXPANSION' },
  { id: 'crys_ex5', name: 'Spell Surge', cost: 5, type: CardType.SPELL, race: Race.CRYSTALLINE, rarity: CardRarity.RARE, keywords: [], effects: [{ id: 'e0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_ENEMY_MINIONS, data: { amount: 3 } as DamageEffectData, isMandatory: true }], flavorText: 'A surge of arcane power.', cardText: 'Deal 3 damage to all enemy minions', collectible: true, set: 'EXPANSION' },
  { id: 'crys_ex6', name: 'Archmage of Prismora', cost: 6, type: CardType.MINION, race: Race.CRYSTALLINE, rarity: CardRarity.EPIC, attack: 5, health: 6, keywords: [{ keyword: CombatKeyword.BARRIER }, { keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.CHOSEN, data: { amount: 5 } as DamageEffectData, isMandatory: true }], flavorText: 'Master of crystal magic.', cardText: 'BARRIER. DEPLOY: Deal 5 damage', collectible: true, set: 'EXPANSION' },
  { id: 'crys_ex7', name: 'Mana Storm', cost: 7, type: CardType.SPELL, race: Race.CRYSTALLINE, rarity: CardRarity.EPIC, keywords: [], effects: [{ id: 'e0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_ENEMIES, data: { amount: 5 } as DamageEffectData, isMandatory: true }], flavorText: 'A storm of pure mana.', cardText: 'Deal 5 damage to all enemies', collectible: true, set: 'EXPANSION' },
  { id: 'crys_ex8', name: 'Crystal Titan', cost: 8, type: CardType.MINION, race: Race.CRYSTALLINE, rarity: CardRarity.EPIC, attack: 7, health: 8, keywords: [{ keyword: CombatKeyword.BARRIER }, { keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.DRAW, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.NONE, data: { count: 2 } as DrawEffectData, isMandatory: true }], flavorText: 'A titan of crystal.', cardText: 'BARRIER. DEPLOY: Draw 2 cards', collectible: true, set: 'EXPANSION' },
  { id: 'crys_ex9', name: 'Prismora, The Infinite', cost: 9, type: CardType.MINION, race: Race.CRYSTALLINE, rarity: CardRarity.LEGENDARY, attack: 7, health: 9, keywords: [{ keyword: CombatKeyword.BARRIER }], effects: [{ id: 'e0', type: EffectType.DRAW, trigger: EffectTrigger.ON_TURN_END, targetType: TargetType.NONE, data: { count: 2 } as DrawEffectData, isMandatory: true }], flavorText: 'Infinite crystal wisdom.', cardText: 'BARRIER. End of Turn: Draw 2 cards', collectible: true, set: 'EXPANSION',
    starforge: {
      type: StarforgeType.PROGRESSIVE,
      conditions: [{ type: StarforgeConditionType.CARDS_DRAWN, targetValue: 15, persistsAcrossZones: true, persistsIfSilenced: true }],
      forgedForm: { name: 'PRISMORA, ARCANE INFINITY', cost: 9, attack: 14, health: 18, keywords: [{ keyword: CombatKeyword.BARRIER }, { keyword: CombatKeyword.DOUBLE_STRIKE }], effects: [], cardText: 'BARRIER. DOUBLE STRIKE. End of Turn: Draw 3 cards. Your spells cost (2) less.' },
      isReversible: false,
      transformationText: 'STARFORGE — After drawing 15 cards: Transform into PRISMORA, ARCANE INFINITY — 14/18. Infinite knowledge, infinite power.',
    },
  },
  { id: 'crys_ex10', name: 'The Nexus Core', cost: 10, type: CardType.MINION, race: Race.CRYSTALLINE, rarity: CardRarity.LEGENDARY, attack: 8, health: 10, keywords: [{ keyword: CombatKeyword.BARRIER }, { keyword: CombatKeyword.GUARDIAN }, { keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_ENEMY_MINIONS, data: { amount: 5 } as DamageEffectData, isMandatory: true }], flavorText: 'The heart of all magic.', cardText: 'BARRIER. GUARDIAN. DEPLOY: Deal 5 damage to all enemy minions', collectible: true, set: 'EXPANSION',
    starforge: {
      type: StarforgeType.PROGRESSIVE,
      conditions: [{ type: StarforgeConditionType.SPELLS_CAST, targetValue: 8, persistsAcrossZones: true, persistsIfSilenced: true }],
      forgedForm: { name: 'THE NEXUS SINGULARITY', cost: 10, attack: 16, health: 20, keywords: [{ keyword: CombatKeyword.BARRIER }, { keyword: CombatKeyword.GUARDIAN }, { keyword: CombatKeyword.DOUBLE_STRIKE }], effects: [], cardText: 'BARRIER. GUARDIAN. DOUBLE STRIKE. Whenever you cast a spell, deal its cost as damage to all enemies.' },
      isReversible: false,
      transformationText: 'STARFORGE — After casting 8 spells: Transform into THE NEXUS SINGULARITY — 16/20. Magic given ultimate form.',
    },
  },
];

// ============================================================================
// PHANTOM CORSAIRS EXPANSION (10 cards)
// ============================================================================
export const PHANTOM_CORSAIRS_EXPANSION: CardDefinition[] = [
  { id: 'pc_ex1', name: 'Stowaway', cost: 1, type: CardType.MINION, race: Race.PHANTOM_CORSAIRS, rarity: CardRarity.RARE, attack: 2, health: 1, tribe: MinionTribe.PIRATE, keywords: [{ keyword: CombatKeyword.CLOAK }], effects: [{ id: 'e0', type: EffectType.DRAW, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.NONE, data: { count: 1 } as DrawEffectData, isMandatory: true }], flavorText: 'Snuck aboard.', cardText: 'CLOAK. DEPLOY: Draw a card', collectible: true, set: 'EXPANSION' },
  { id: 'pc_ex2', name: 'Walk the Plank', cost: 3, type: CardType.SPELL, race: Race.PHANTOM_CORSAIRS, rarity: CardRarity.RARE, keywords: [], effects: [{ id: 'e0', type: EffectType.DESTROY, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.CHOSEN, data: { value: 1 } as GenericEffectData, isMandatory: true }], flavorText: 'Off you go!', cardText: 'Destroy an enemy minion with 3 or less Attack', collectible: true, set: 'EXPANSION' },
  { id: 'pc_ex3', name: 'Ghost Ship Raider', cost: 3, type: CardType.MINION, race: Race.PHANTOM_CORSAIRS, rarity: CardRarity.RARE, attack: 3, health: 3, tribe: MinionTribe.PIRATE, keywords: [{ keyword: CombatKeyword.CLOAK }, { keyword: CombatKeyword.SWIFT }], effects: [], flavorText: 'Phases through defenses.', cardText: 'CLOAK. SWIFT', collectible: true, set: 'EXPANSION' },
  { id: 'pc_ex4', name: 'Plunderer\'s Map', cost: 2, type: CardType.SPELL, race: Race.PHANTOM_CORSAIRS, rarity: CardRarity.RARE, keywords: [], effects: [{ id: 'e0', type: EffectType.DRAW, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.NONE, data: { count: 2 } as DrawEffectData, isMandatory: true }], flavorText: 'X marks the spot.', cardText: 'Draw 2 cards', collectible: true, set: 'EXPANSION' },
  { id: 'pc_ex5', name: 'Blade Dancer', cost: 4, type: CardType.MINION, race: Race.PHANTOM_CORSAIRS, rarity: CardRarity.RARE, attack: 4, health: 3, tribe: MinionTribe.PIRATE, keywords: [{ keyword: CombatKeyword.DOUBLE_STRIKE }], effects: [], flavorText: 'Two strikes, one dance.', cardText: 'DOUBLE STRIKE', collectible: true, set: 'EXPANSION' },
  { id: 'pc_ex6', name: 'Phantom Admiral', cost: 5, type: CardType.MINION, race: Race.PHANTOM_CORSAIRS, rarity: CardRarity.EPIC, attack: 4, health: 5, tribe: MinionTribe.PIRATE, keywords: [{ keyword: CombatKeyword.CLOAK }, { keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.BUFF, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_FRIENDLY_MINIONS, data: { attack: 1, health: 1 } as BuffEffectData, isMandatory: true }], flavorText: 'Commands from the shadows.', cardText: 'CLOAK. DEPLOY: Give all friendly minions +1/+1', collectible: true, set: 'EXPANSION' },
  { id: 'pc_ex7', name: 'Dimensional Anchor', cost: 5, type: CardType.SPELL, race: Race.PHANTOM_CORSAIRS, rarity: CardRarity.EPIC, keywords: [], effects: [{ id: 'e0', type: EffectType.RETURN_TO_HAND, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_ENEMY_MINIONS, data: { value: 1 } as GenericEffectData, isMandatory: true }], flavorText: 'Anchor them elsewhere.', cardText: 'Return all enemy minions to their hand', collectible: true, set: 'EXPANSION' },
  { id: 'pc_ex8', name: 'Corsair Flagship', cost: 7, type: CardType.MINION, race: Race.PHANTOM_CORSAIRS, rarity: CardRarity.EPIC, attack: 6, health: 7, tribe: MinionTribe.PIRATE, keywords: [{ keyword: CombatKeyword.CLOAK }, { keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.SUMMON, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.NONE, data: { cardId: 'token_pirate', count: 3 } as SummonEffectData, isMandatory: true }], flavorText: 'The flagship arrives.', cardText: 'CLOAK. DEPLOY: Summon three 2/1 Ghost Pirates', collectible: true, set: 'EXPANSION' },
  { id: 'pc_ex9', name: 'Netherstorm Pirate King', cost: 8, type: CardType.MINION, race: Race.PHANTOM_CORSAIRS, rarity: CardRarity.LEGENDARY, attack: 7, health: 7, tribe: MinionTribe.PIRATE, keywords: [{ keyword: CombatKeyword.CLOAK }, { keyword: CombatKeyword.DOUBLE_STRIKE }], effects: [], flavorText: 'King of the void pirates.', cardText: 'CLOAK. DOUBLE STRIKE', collectible: true, set: 'EXPANSION',
    starforge: {
      type: StarforgeType.PROGRESSIVE,
      conditions: [{ type: StarforgeConditionType.ATTACK_COUNT, targetValue: 6, persistsAcrossZones: true, persistsIfSilenced: true }],
      forgedForm: { name: 'THE NETHERSTORM EMPEROR', cost: 8, attack: 14, health: 14, keywords: [{ keyword: CombatKeyword.CLOAK }, { keyword: CombatKeyword.DOUBLE_STRIKE }, { keyword: CombatKeyword.SWIFT }, { keyword: CombatKeyword.LETHAL }], effects: [], cardText: 'CLOAK. DOUBLE STRIKE. SWIFT. LETHAL. After attacking, return to CLOAK.' },
      isReversible: false,
      transformationText: 'STARFORGE — After attacking 6 times: Transform into THE NETHERSTORM EMPEROR — 14/14. The unseen blade strikes twice.',
    },
  },
  { id: 'pc_ex10', name: 'The Phantom Fleet', cost: 10, type: CardType.SPELL, race: Race.PHANTOM_CORSAIRS, rarity: CardRarity.LEGENDARY, keywords: [], effects: [{ id: 'e0', type: EffectType.SUMMON, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.NONE, data: { cardId: 'token_pirate_elite', count: 5 } as SummonEffectData, isMandatory: true }], flavorText: 'The entire fleet materializes.', cardText: 'Summon five 3/3 Ghost Pirates with SWIFT', collectible: true, set: 'EXPANSION' },
];

// ============================================================================
// HIVEMIND EXPANSION (10 cards)
// ============================================================================
export const HIVEMIND_EXPANSION: CardDefinition[] = [
  { id: 'hive_ex1', name: 'Egg Clutch', cost: 1, type: CardType.SPELL, race: Race.HIVEMIND, rarity: CardRarity.RARE, keywords: [], effects: [{ id: 'e0', type: EffectType.SUMMON, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.NONE, data: { cardId: 'token_drone', count: 3 } as SummonEffectData, isMandatory: true }], flavorText: 'New drones emerge.', cardText: 'Summon three 1/1 Drones', collectible: true, set: 'EXPANSION' },
  { id: 'hive_ex2', name: 'Parasitic Link', cost: 2, type: CardType.SPELL, race: Race.HIVEMIND, rarity: CardRarity.RARE, keywords: [], effects: [{ id: 'e0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.CHOSEN, data: { amount: 3 } as DamageEffectData, isMandatory: true }], flavorText: 'Feed on the enemy.', cardText: 'Deal 3 damage. Draw a card', collectible: true, set: 'EXPANSION' },
  { id: 'hive_ex3', name: 'Swarm Queen\'s Guard', cost: 3, type: CardType.MINION, race: Race.HIVEMIND, rarity: CardRarity.RARE, attack: 2, health: 4, tribe: MinionTribe.INSECT, keywords: [{ keyword: CombatKeyword.GUARDIAN }, { keyword: TriggerKeyword.LAST_WORDS }], effects: [{ id: 'e0', type: EffectType.SUMMON, trigger: EffectTrigger.ON_DEATH, targetType: TargetType.NONE, data: { cardId: 'token_drone', count: 2 } as SummonEffectData, isMandatory: true }], flavorText: 'Even in death, serves the queen.', cardText: 'GUARDIAN. LAST WORDS: Summon two 1/1 Drones', collectible: true, set: 'EXPANSION' },
  { id: 'hive_ex4', name: 'Hive Mutation', cost: 3, type: CardType.SPELL, race: Race.HIVEMIND, rarity: CardRarity.RARE, keywords: [], effects: [{ id: 'e0', type: EffectType.BUFF, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_FRIENDLY_MINIONS, data: { attack: 2, health: 0 } as BuffEffectData, isMandatory: true }], flavorText: 'The swarm mutates.', cardText: 'Give all friendly minions +2/+0', collectible: true, set: 'EXPANSION' },
  { id: 'hive_ex5', name: 'Swarm Ravager', cost: 5, type: CardType.MINION, race: Race.HIVEMIND, rarity: CardRarity.RARE, attack: 5, health: 4, tribe: MinionTribe.INSECT, keywords: [{ keyword: CombatKeyword.SWIFT }, { keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.SUMMON, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.NONE, data: { cardId: 'token_drone', count: 2 } as SummonEffectData, isMandatory: true }], flavorText: 'Ravages and spawns.', cardText: 'SWIFT. DEPLOY: Summon two 1/1 Drones', collectible: true, set: 'EXPANSION' },
  { id: 'hive_ex6', name: 'Hive Tyrant', cost: 6, type: CardType.MINION, race: Race.HIVEMIND, rarity: CardRarity.EPIC, attack: 5, health: 6, tribe: MinionTribe.INSECT, keywords: [{ keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.BUFF, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_FRIENDLY_MINIONS, data: { attack: 2, health: 1 } as BuffEffectData, isMandatory: true }], flavorText: 'Commands through pheromones.', cardText: 'DEPLOY: Give all friendly minions +2/+1', collectible: true, set: 'EXPANSION' },
  { id: 'hive_ex7', name: 'Acid Storm', cost: 5, type: CardType.SPELL, race: Race.HIVEMIND, rarity: CardRarity.EPIC, keywords: [], effects: [{ id: 'e0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_ENEMY_MINIONS, data: { amount: 3 } as DamageEffectData, isMandatory: true }], flavorText: 'Acid rain melts all.', cardText: 'Deal 3 damage to all enemy minions', collectible: true, set: 'EXPANSION' },
  { id: 'hive_ex8', name: 'Mega Beetle', cost: 7, type: CardType.MINION, race: Race.HIVEMIND, rarity: CardRarity.EPIC, attack: 7, health: 7, tribe: MinionTribe.INSECT, keywords: [{ keyword: CombatKeyword.GUARDIAN }, { keyword: CombatKeyword.SWIFT }], effects: [], flavorText: 'Unstoppable carapace.', cardText: 'GUARDIAN. SWIFT', collectible: true, set: 'EXPANSION' },
  { id: 'hive_ex9', name: 'Xenoptera Prime', cost: 9, type: CardType.MINION, race: Race.HIVEMIND, rarity: CardRarity.LEGENDARY, attack: 6, health: 9, tribe: MinionTribe.INSECT, keywords: [{ keyword: CombatKeyword.GUARDIAN }, { keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.SUMMON, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.NONE, data: { cardId: 'token_drone', count: 5 } as SummonEffectData, isMandatory: true }], flavorText: 'Heart of the hive.', cardText: 'GUARDIAN. DEPLOY: Summon five 1/1 Drones', collectible: true, set: 'EXPANSION',
    starforge: {
      type: StarforgeType.PROGRESSIVE,
      conditions: [{ type: StarforgeConditionType.SUMMON_COUNT, targetValue: 12, persistsAcrossZones: true, persistsIfSilenced: true }],
      forgedForm: { name: 'XENOPTERA, HIVE EMPEROR', cost: 9, attack: 12, health: 18, keywords: [{ keyword: CombatKeyword.GUARDIAN }, { keyword: CombatKeyword.BARRIER }], effects: [], cardText: 'GUARDIAN. BARRIER. Start of Turn: Fill your board with 3/3 Evolved Drones. All friendly minions have +2/+2.' },
      isReversible: false,
      transformationText: 'STARFORGE — After summoning 12 minions: Transform into XENOPTERA, HIVE EMPEROR — 12/18. The swarm evolves beyond control.',
    },
  },
  { id: 'hive_ex10', name: 'The Swarm Eternal', cost: 10, type: CardType.MINION, race: Race.HIVEMIND, rarity: CardRarity.LEGENDARY, attack: 7, health: 10, tribe: MinionTribe.INSECT, keywords: [{ keyword: CombatKeyword.GUARDIAN }, { keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.BUFF, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_FRIENDLY_MINIONS, data: { attack: 3, health: 3 } as BuffEffectData, isMandatory: true }], flavorText: 'The swarm is infinite.', cardText: 'GUARDIAN. DEPLOY: Give all friendly minions +3/+3', collectible: true, set: 'EXPANSION',
    starforge: {
      type: StarforgeType.PROGRESSIVE,
      conditions: [{ type: StarforgeConditionType.MINIONS_DIED, targetValue: 10, persistsAcrossZones: true, persistsIfSilenced: true }],
      forgedForm: { name: 'THE INFINITE SWARM', cost: 10, attack: 14, health: 20, keywords: [{ keyword: CombatKeyword.GUARDIAN }, { keyword: CombatKeyword.BARRIER }, { keyword: CombatKeyword.SWIFT }], effects: [], cardText: 'GUARDIAN. BARRIER. SWIFT. Whenever a friendly minion dies, summon two 3/3 Evolved Drones. All friendly minions have +3/+3.' },
      isReversible: false,
      transformationText: 'STARFORGE — After 10 minions die: Transform into THE INFINITE SWARM — 14/20. Death feeds the swarm eternally.',
    },
  },
];

// ============================================================================
// ASTROMANCERS EXPANSION (10 cards)
// ============================================================================
export const ASTROMANCERS_EXPANSION: CardDefinition[] = [
  { id: 'astro_ex1', name: 'Stargazer', cost: 1, type: CardType.MINION, race: Race.ASTROMANCERS, rarity: CardRarity.RARE, attack: 1, health: 2, keywords: [{ keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.DRAW, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.NONE, data: { count: 1 } as DrawEffectData, isMandatory: true }], flavorText: 'Reads the stars.', cardText: 'DEPLOY: Draw a card', collectible: true, set: 'EXPANSION' },
  { id: 'astro_ex2', name: 'Meteor Shower', cost: 3, type: CardType.SPELL, race: Race.ASTROMANCERS, rarity: CardRarity.RARE, keywords: [], effects: [{ id: 'e0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_ENEMY_MINIONS, data: { amount: 2 } as DamageEffectData, isMandatory: true }], flavorText: 'Stars fall from the sky.', cardText: 'Deal 2 damage to all enemy minions', collectible: true, set: 'EXPANSION' },
  { id: 'astro_ex3', name: 'Cosmic Insight', cost: 2, type: CardType.SPELL, race: Race.ASTROMANCERS, rarity: CardRarity.RARE, keywords: [], effects: [{ id: 'e0', type: EffectType.DRAW, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.NONE, data: { count: 2 } as DrawEffectData, isMandatory: true }], flavorText: 'The cosmos reveals all.', cardText: 'Draw 2 cards', collectible: true, set: 'EXPANSION' },
  { id: 'astro_ex4', name: 'Star Shaper', cost: 4, type: CardType.MINION, race: Race.ASTROMANCERS, rarity: CardRarity.RARE, attack: 3, health: 5, keywords: [{ keyword: CombatKeyword.BARRIER }, { keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.DRAW, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.NONE, data: { count: 1 } as DrawEffectData, isMandatory: true }], flavorText: 'Shapes starlight.', cardText: 'BARRIER. DEPLOY: Draw a card', collectible: true, set: 'EXPANSION' },
  { id: 'astro_ex5', name: 'Constellation Guardian', cost: 5, type: CardType.MINION, race: Race.ASTROMANCERS, rarity: CardRarity.RARE, attack: 4, health: 6, keywords: [{ keyword: CombatKeyword.GUARDIAN }, { keyword: CombatKeyword.BARRIER }], effects: [], flavorText: 'Guarded by the stars.', cardText: 'GUARDIAN. BARRIER', collectible: true, set: 'EXPANSION' },
  { id: 'astro_ex6', name: 'Celestial Prophet', cost: 6, type: CardType.MINION, race: Race.ASTROMANCERS, rarity: CardRarity.EPIC, attack: 5, health: 6, keywords: [{ keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.DRAW, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.NONE, data: { count: 3 } as DrawEffectData, isMandatory: true }], flavorText: 'Sees the future.', cardText: 'DEPLOY: Draw 3 cards', collectible: true, set: 'EXPANSION' },
  { id: 'astro_ex7', name: 'Black Hole', cost: 6, type: CardType.SPELL, race: Race.ASTROMANCERS, rarity: CardRarity.EPIC, keywords: [], effects: [{ id: 'e0', type: EffectType.DESTROY, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_MINIONS, data: { value: 1 } as GenericEffectData, isMandatory: true }], flavorText: 'Nothing escapes.', cardText: 'Destroy ALL minions', collectible: true, set: 'EXPANSION' },
  { id: 'astro_ex8', name: 'Cosmic Dragon', cost: 8, type: CardType.MINION, race: Race.ASTROMANCERS, rarity: CardRarity.EPIC, attack: 7, health: 8, keywords: [{ keyword: CombatKeyword.BARRIER }, { keyword: CombatKeyword.SWIFT }], effects: [], flavorText: 'A dragon of pure starlight.', cardText: 'BARRIER. SWIFT', collectible: true, set: 'EXPANSION' },
  { id: 'astro_ex9', name: 'Celestara, Star Mother', cost: 9, type: CardType.MINION, race: Race.ASTROMANCERS, rarity: CardRarity.LEGENDARY, attack: 6, health: 10, keywords: [{ keyword: CombatKeyword.BARRIER }], effects: [{ id: 'e0', type: EffectType.DRAW, trigger: EffectTrigger.ON_TURN_START, targetType: TargetType.NONE, data: { count: 2 } as DrawEffectData, isMandatory: true }], flavorText: 'Mother of all stars.', cardText: 'BARRIER. Start of Turn: Draw 2 cards', collectible: true, set: 'EXPANSION',
    starforge: {
      type: StarforgeType.PROGRESSIVE,
      conditions: [{ type: StarforgeConditionType.CARDS_DRAWN, targetValue: 20, persistsAcrossZones: true, persistsIfSilenced: true }],
      forgedForm: { name: 'CELESTARA, MOTHER OF GALAXIES', cost: 9, attack: 12, health: 20, keywords: [{ keyword: CombatKeyword.BARRIER }, { keyword: CombatKeyword.GUARDIAN }], effects: [], cardText: 'BARRIER. GUARDIAN. Start of Turn: Draw 3 cards. Cards you draw cost (1) less.' },
      isReversible: false,
      transformationText: 'STARFORGE — After drawing 20 cards: Transform into CELESTARA, MOTHER OF GALAXIES — 12/20. The stars align for you.',
    },
  },
  { id: 'astro_ex10', name: 'The Cosmic Singularity', cost: 10, type: CardType.MINION, race: Race.ASTROMANCERS, rarity: CardRarity.LEGENDARY, attack: 8, health: 10, keywords: [{ keyword: CombatKeyword.BARRIER }, { keyword: CombatKeyword.GUARDIAN }, { keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.DRAW, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.NONE, data: { count: 4 } as DrawEffectData, isMandatory: true }], flavorText: 'All knowledge converges.', cardText: 'BARRIER. GUARDIAN. DEPLOY: Draw 4 cards', collectible: true, set: 'EXPANSION',
    starforge: {
      type: StarforgeType.PROGRESSIVE,
      conditions: [{ type: StarforgeConditionType.SPELLS_CAST, targetValue: 10, persistsAcrossZones: true, persistsIfSilenced: true }],
      forgedForm: { name: 'THE OMNISCIENT SINGULARITY', cost: 10, attack: 16, health: 20, keywords: [{ keyword: CombatKeyword.BARRIER }, { keyword: CombatKeyword.GUARDIAN }, { keyword: CombatKeyword.DOUBLE_STRIKE }], effects: [], cardText: 'BARRIER. GUARDIAN. DOUBLE STRIKE. Whenever you draw a card, deal 2 damage to a random enemy.' },
      isReversible: false,
      transformationText: 'STARFORGE — After casting 10 spells: Transform into THE OMNISCIENT SINGULARITY — 16/20. All knowledge becomes power.',
    },
  },
];

// ============================================================================
// CHRONOBOUND EXPANSION (10 cards)
// ============================================================================
export const CHRONOBOUND_EXPANSION: CardDefinition[] = [
  { id: 'chrono_ex1', name: 'Time Skip', cost: 1, type: CardType.SPELL, race: Race.CHRONOBOUND, rarity: CardRarity.RARE, keywords: [], effects: [{ id: 'e0', type: EffectType.RETURN_TO_HAND, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.FRIENDLY_MINION, data: { value: 1 } as GenericEffectData, isMandatory: true }], flavorText: 'Skip through time.', cardText: 'Return a friendly minion to your hand', collectible: true, set: 'EXPANSION' },
  { id: 'chrono_ex2', name: 'Temporal Echo', cost: 2, type: CardType.SPELL, race: Race.CHRONOBOUND, rarity: CardRarity.RARE, keywords: [], effects: [{ id: 'e0', type: EffectType.COPY, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.CHOSEN, data: { value: 1 } as GenericEffectData, isMandatory: true }], flavorText: 'An echo from another time.', cardText: 'Add a copy of a friendly minion to your hand', collectible: true, set: 'EXPANSION' },
  { id: 'chrono_ex3', name: 'Paradox Knight', cost: 3, type: CardType.MINION, race: Race.CHRONOBOUND, rarity: CardRarity.RARE, attack: 3, health: 3, keywords: [{ keyword: CombatKeyword.BARRIER }, { keyword: CombatKeyword.SWIFT }], effects: [], flavorText: 'Exists outside time.', cardText: 'BARRIER. SWIFT', collectible: true, set: 'EXPANSION' },
  { id: 'chrono_ex4', name: 'Time Warp', cost: 4, type: CardType.SPELL, race: Race.CHRONOBOUND, rarity: CardRarity.RARE, keywords: [], effects: [{ id: 'e0', type: EffectType.RETURN_TO_HAND, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_ENEMY_MINIONS, data: { value: 1 } as GenericEffectData, isMandatory: true }], flavorText: 'Time warps around you.', cardText: 'Return all enemy minions to their hand', collectible: true, set: 'EXPANSION' },
  { id: 'chrono_ex5', name: 'Rift Guardian', cost: 5, type: CardType.MINION, race: Race.CHRONOBOUND, rarity: CardRarity.RARE, attack: 4, health: 7, keywords: [{ keyword: CombatKeyword.GUARDIAN }, { keyword: CombatKeyword.BARRIER }], effects: [], flavorText: 'Guards temporal rifts.', cardText: 'GUARDIAN. BARRIER', collectible: true, set: 'EXPANSION' },
  { id: 'chrono_ex6', name: 'Temporal Overlord', cost: 6, type: CardType.MINION, race: Race.CHRONOBOUND, rarity: CardRarity.EPIC, attack: 5, health: 7, keywords: [{ keyword: CombatKeyword.BARRIER }, { keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.RETURN_TO_HAND, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ENEMY_MINION, data: { value: 1 } as GenericEffectData, isMandatory: true }], flavorText: 'Commands time itself.', cardText: 'BARRIER. DEPLOY: Return an enemy minion to their hand', collectible: true, set: 'EXPANSION' },
  { id: 'chrono_ex7', name: 'Temporal Erasure', cost: 5, type: CardType.SPELL, race: Race.CHRONOBOUND, rarity: CardRarity.EPIC, keywords: [], effects: [{ id: 'e0', type: EffectType.DESTROY, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.CHOSEN, data: { value: 1 } as GenericEffectData, isMandatory: true }], flavorText: 'Erased from the timeline.', cardText: 'Destroy a minion. It cannot trigger LAST WORDS', collectible: true, set: 'EXPANSION' },
  { id: 'chrono_ex8', name: 'Infinity Knight', cost: 7, type: CardType.MINION, race: Race.CHRONOBOUND, rarity: CardRarity.EPIC, attack: 6, health: 8, keywords: [{ keyword: CombatKeyword.BARRIER }, { keyword: CombatKeyword.GUARDIAN }, { keyword: CombatKeyword.SWIFT }], effects: [], flavorText: 'A knight from infinity.', cardText: 'BARRIER. GUARDIAN. SWIFT', collectible: true, set: 'EXPANSION' },
  { id: 'chrono_ex9', name: 'Temporia, The Eternal', cost: 9, type: CardType.MINION, race: Race.CHRONOBOUND, rarity: CardRarity.LEGENDARY, attack: 7, health: 9, keywords: [{ keyword: CombatKeyword.BARRIER }, { keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.RETURN_TO_HAND, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_ENEMY_MINIONS, data: { value: 1 } as GenericEffectData, isMandatory: true }], flavorText: 'The eternal time lord.', cardText: 'BARRIER. DEPLOY: Return all enemy minions to their hand', collectible: true, set: 'EXPANSION',
    starforge: {
      type: StarforgeType.PROGRESSIVE,
      conditions: [{ type: StarforgeConditionType.TURNS_IN_PLAY, targetValue: 3, persistsAcrossZones: false, persistsIfSilenced: true }],
      forgedForm: { name: 'TEMPORIA, LORD OF ALL TIME', cost: 9, attack: 14, health: 18, keywords: [{ keyword: CombatKeyword.BARRIER }, { keyword: CombatKeyword.SWIFT }, { keyword: CombatKeyword.DOUBLE_STRIKE }], effects: [], cardText: 'BARRIER. SWIFT. DOUBLE STRIKE. Start of Turn: Return all enemy minions to their hand. Your minions cost (2) less.' },
      isReversible: false,
      transformationText: 'STARFORGE — After surviving 3 turns: Transform into TEMPORIA, LORD OF ALL TIME — 14/18. Time itself bows.',
    },
  },
  { id: 'chrono_ex10', name: 'The End of Time', cost: 10, type: CardType.SPELL, race: Race.CHRONOBOUND, rarity: CardRarity.LEGENDARY, keywords: [], effects: [{ id: 'e0', type: EffectType.DESTROY, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_MINIONS, data: { value: 1 } as GenericEffectData, isMandatory: true }], flavorText: 'Time ends. Everything ends.', cardText: 'Destroy ALL minions. Draw 3 cards', collectible: true, set: 'EXPANSION' },
];

// ============================================================================
// NEUTRAL EXPANSION (15 cards)
// ============================================================================
export const NEUTRAL_EXPANSION: CardDefinition[] = [
  { id: 'neut_ex1', name: 'Wandering Merchant', cost: 2, type: CardType.MINION, race: Race.NEUTRAL, rarity: CardRarity.RARE, attack: 2, health: 3, keywords: [{ keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.DRAW, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.NONE, data: { count: 1 } as DrawEffectData, isMandatory: true }], flavorText: 'Always has something.', cardText: 'DEPLOY: Draw a card', collectible: true, set: 'EXPANSION' },
  { id: 'neut_ex2', name: 'Mercenary Captain', cost: 3, type: CardType.MINION, race: Race.NEUTRAL, rarity: CardRarity.RARE, attack: 3, health: 4, keywords: [{ keyword: CombatKeyword.SWIFT }], effects: [], flavorText: 'Fights for coin.', cardText: 'SWIFT', collectible: true, set: 'EXPANSION' },
  { id: 'neut_ex3', name: 'Void Shield Generator', cost: 3, type: CardType.STRUCTURE, race: Race.NEUTRAL, rarity: CardRarity.RARE, keywords: [], effects: [{ id: 'e0', type: EffectType.HEAL, trigger: EffectTrigger.ON_TURN_START, targetType: TargetType.FRIENDLY_HERO, data: { amount: 2 } as HealEffectData, isMandatory: true }], flavorText: 'Shields against the void.', cardText: 'Start of Turn: Restore 2 Health to your Hero', collectible: true, set: 'EXPANSION' },
  { id: 'neut_ex4', name: 'Bounty Hunter', cost: 4, type: CardType.MINION, race: Race.NEUTRAL, rarity: CardRarity.RARE, attack: 4, health: 3, keywords: [{ keyword: CombatKeyword.LETHAL }, { keyword: CombatKeyword.SWIFT }], effects: [], flavorText: 'Dead or alive.', cardText: 'LETHAL. SWIFT', collectible: true, set: 'EXPANSION' },
  { id: 'neut_ex5', name: 'Galactic Peacekeeper', cost: 4, type: CardType.MINION, race: Race.NEUTRAL, rarity: CardRarity.RARE, attack: 3, health: 6, keywords: [{ keyword: CombatKeyword.GUARDIAN }, { keyword: CombatKeyword.BARRIER }], effects: [], flavorText: 'Peace through strength.', cardText: 'GUARDIAN. BARRIER', collectible: true, set: 'EXPANSION' },
  { id: 'neut_ex6', name: 'Supply Crate', cost: 2, type: CardType.SPELL, race: Race.NEUTRAL, rarity: CardRarity.RARE, keywords: [], effects: [{ id: 'e0', type: EffectType.DRAW, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.NONE, data: { count: 2 } as DrawEffectData, isMandatory: true }], flavorText: 'Supplies from afar.', cardText: 'Draw 2 cards', collectible: true, set: 'EXPANSION' },
  { id: 'neut_ex7', name: 'EMP Blast', cost: 4, type: CardType.SPELL, race: Race.NEUTRAL, rarity: CardRarity.EPIC, keywords: [], effects: [{ id: 'e0', type: EffectType.SILENCE, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_MINIONS, data: { value: 1 } as GenericEffectData, isMandatory: true }], flavorText: 'Systems offline.', cardText: 'Silence all minions', collectible: true, set: 'EXPANSION' },
  { id: 'neut_ex8', name: 'Interstellar Behemoth', cost: 6, type: CardType.MINION, race: Race.NEUTRAL, rarity: CardRarity.EPIC, attack: 6, health: 7, keywords: [{ keyword: CombatKeyword.GUARDIAN }], effects: [], flavorText: 'Massive beyond measure.', cardText: 'GUARDIAN', collectible: true, set: 'EXPANSION' },
  { id: 'neut_ex9', name: 'Ancient Titan', cost: 7, type: CardType.MINION, race: Race.NEUTRAL, rarity: CardRarity.EPIC, attack: 7, health: 7, keywords: [{ keyword: CombatKeyword.BARRIER }, { keyword: CombatKeyword.GUARDIAN }], effects: [], flavorText: 'From the dawn of time.', cardText: 'BARRIER. GUARDIAN', collectible: true, set: 'EXPANSION' },
  { id: 'neut_ex10', name: 'Orbital Strike', cost: 5, type: CardType.SPELL, race: Race.NEUTRAL, rarity: CardRarity.EPIC, keywords: [], effects: [{ id: 'e0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_ENEMY_MINIONS, data: { amount: 3 } as DamageEffectData, isMandatory: true }], flavorText: 'From orbit.', cardText: 'Deal 3 damage to all enemy minions', collectible: true, set: 'EXPANSION' },
  { id: 'neut_ex11', name: 'Star Drifter', cost: 5, type: CardType.MINION, race: Race.NEUTRAL, rarity: CardRarity.RARE, attack: 5, health: 5, keywords: [{ keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.DRAW, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.NONE, data: { count: 1 } as DrawEffectData, isMandatory: true }], flavorText: 'Drifts between stars.', cardText: 'DEPLOY: Draw a card', collectible: true, set: 'EXPANSION' },
  { id: 'neut_ex12', name: 'Cosmic Horror', cost: 8, type: CardType.MINION, race: Race.NEUTRAL, rarity: CardRarity.LEGENDARY, attack: 8, health: 8, keywords: [{ keyword: CombatKeyword.GUARDIAN }, { keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_ENEMY_MINIONS, data: { amount: 3 } as DamageEffectData, isMandatory: true }], flavorText: 'Terror from beyond.', cardText: 'GUARDIAN. DEPLOY: Deal 3 damage to all enemy minions', collectible: true, set: 'EXPANSION',
    starforge: {
      type: StarforgeType.PROGRESSIVE,
      conditions: [{ type: StarforgeConditionType.MINIONS_DIED, targetValue: 8, persistsAcrossZones: true, persistsIfSilenced: true }],
      forgedForm: { name: 'THE ELDRITCH ABOMINATION', cost: 8, attack: 16, health: 16, keywords: [{ keyword: CombatKeyword.GUARDIAN }, { keyword: CombatKeyword.BARRIER }, { keyword: CombatKeyword.DRAIN }], effects: [], cardText: 'GUARDIAN. BARRIER. DRAIN. End of Turn: Deal 3 damage to all enemies.' },
      isReversible: false,
      transformationText: 'STARFORGE — After 8 minions die: Transform into THE ELDRITCH ABOMINATION — 16/16. Sanity crumbles before it.',
    },
  },
  { id: 'neut_ex13', name: 'Dimensional Rift', cost: 6, type: CardType.SPELL, race: Race.NEUTRAL, rarity: CardRarity.LEGENDARY, keywords: [], effects: [{ id: 'e0', type: EffectType.DESTROY, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_MINIONS, data: { value: 1 } as GenericEffectData, isMandatory: true }], flavorText: 'A rift between dimensions.', cardText: 'Destroy ALL minions', collectible: true, set: 'EXPANSION' },
  { id: 'neut_ex14', name: 'Galactic Warlord', cost: 9, type: CardType.MINION, race: Race.NEUTRAL, rarity: CardRarity.LEGENDARY, attack: 8, health: 9, keywords: [{ keyword: CombatKeyword.BARRIER }, { keyword: CombatKeyword.SWIFT }, { keyword: TriggerKeyword.DEPLOY }], effects: [{ id: 'e0', type: EffectType.BUFF, trigger: EffectTrigger.ON_PLAY, targetType: TargetType.ALL_FRIENDLY_MINIONS, data: { attack: 2, health: 2 } as BuffEffectData, isMandatory: true }], flavorText: 'Commands the galaxy.', cardText: 'BARRIER. SWIFT. DEPLOY: Give all friendly minions +2/+2', collectible: true, set: 'EXPANSION',
    starforge: {
      type: StarforgeType.PROGRESSIVE,
      conditions: [{ type: StarforgeConditionType.ATTACK_COUNT, targetValue: 8, persistsAcrossZones: true, persistsIfSilenced: true }],
      forgedForm: { name: 'GALACTIC EMPEROR', cost: 9, attack: 16, health: 18, keywords: [{ keyword: CombatKeyword.BARRIER }, { keyword: CombatKeyword.SWIFT }, { keyword: CombatKeyword.DOUBLE_STRIKE }], effects: [], cardText: 'BARRIER. SWIFT. DOUBLE STRIKE. All friendly minions have +3/+3 and SWIFT.' },
      isReversible: false,
      transformationText: 'STARFORGE — After attacking 8 times: Transform into GALACTIC EMPEROR — 16/18. The galaxy kneels.',
    },
  },
  { id: 'neut_ex15', name: 'The Starforge', cost: 10, type: CardType.MINION, race: Race.NEUTRAL, rarity: CardRarity.LEGENDARY, attack: 10, health: 10, keywords: [{ keyword: CombatKeyword.BARRIER }, { keyword: CombatKeyword.GUARDIAN }], effects: [{ id: 'e0', type: EffectType.BUFF, trigger: EffectTrigger.ON_TURN_START, targetType: TargetType.ALL_FRIENDLY_MINIONS, data: { attack: 1, health: 1 } as BuffEffectData, isMandatory: true }], flavorText: 'Where stars are born.', cardText: 'BARRIER. GUARDIAN. Start of Turn: Give all friendly minions +1/+1', collectible: true, set: 'EXPANSION',
    starforge: {
      type: StarforgeType.PROGRESSIVE,
      conditions: [{ type: StarforgeConditionType.TURNS_IN_PLAY, targetValue: 3, persistsAcrossZones: false, persistsIfSilenced: true }],
      forgedForm: { name: 'THE STARFORGE AWAKENED', cost: 10, attack: 20, health: 20, keywords: [{ keyword: CombatKeyword.BARRIER }, { keyword: CombatKeyword.GUARDIAN }, { keyword: CombatKeyword.DOUBLE_STRIKE }], effects: [], cardText: 'BARRIER. GUARDIAN. DOUBLE STRIKE. Start of Turn: Give all friendly minions +3/+3 and BARRIER. Summon a 5/5 Star Titan.' },
      isReversible: false,
      transformationText: 'STARFORGE — After surviving 3 turns: Transform into THE STARFORGE AWAKENED — 20/20. Stars are born in its light.',
    },
  },
];

// ============================================================================
// Combined expansion exports
// ============================================================================
export const ALL_EXPANSION_CARDS: CardDefinition[] = [
  ...COGSMITHS_EXPANSION,
  ...LUMINAR_EXPANSION,
  ...PYROCLAST_EXPANSION,
  ...VOIDBORN_EXPANSION,
  ...BIOTITANS_EXPANSION,
  ...CRYSTALLINE_EXPANSION,
  ...PHANTOM_CORSAIRS_EXPANSION,
  ...HIVEMIND_EXPANSION,
  ...ASTROMANCERS_EXPANSION,
  ...CHRONOBOUND_EXPANSION,
  ...NEUTRAL_EXPANSION,
];

/** Get expansion cards for a specific race */
export function getExpansionCardsByRace(race: Race): CardDefinition[] {
  switch (race) {
    case Race.COGSMITHS: return COGSMITHS_EXPANSION;
    case Race.LUMINAR: return LUMINAR_EXPANSION;
    case Race.PYROCLAST: return PYROCLAST_EXPANSION;
    case Race.VOIDBORN: return VOIDBORN_EXPANSION;
    case Race.BIOTITANS: return BIOTITANS_EXPANSION;
    case Race.CRYSTALLINE: return CRYSTALLINE_EXPANSION;
    case Race.PHANTOM_CORSAIRS: return PHANTOM_CORSAIRS_EXPANSION;
    case Race.HIVEMIND: return HIVEMIND_EXPANSION;
    case Race.ASTROMANCERS: return ASTROMANCERS_EXPANSION;
    case Race.CHRONOBOUND: return CHRONOBOUND_EXPANSION;
    case Race.NEUTRAL: return NEUTRAL_EXPANSION;
    default: return [];
  }
}
