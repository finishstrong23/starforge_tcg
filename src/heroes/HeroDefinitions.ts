/**
 * STARFORGE TCG - Hero Definitions
 *
 * All 10 heroes with their unique hero powers.
 */

import type { HeroDefinition, HeroPower } from '../types/Player';
import { Race } from '../types/Race';
import { EffectType, EffectTrigger, TargetType } from '../types/Effects';
import type { Effect } from '../types/Effects';
import { CombatKeyword } from '../types/Keywords';

/**
 * Create a hero power helper
 */
function createHeroPower(
  id: string,
  name: string,
  description: string,
  effects: Effect[],
  requiresTarget: boolean = false,
  validTargets?: TargetType
): HeroPower {
  return {
    id,
    name,
    cost: 2, // All hero powers cost 2
    description,
    effects,
    requiresTarget,
    validTargets,
    canUseOnPlayTurn: true,
  };
}

/**
 * COGSMITHS - Constructor Prime Gearsmith
 * Hero Power: "Retrofit" - Give a friendly Mech +1/+1. If it's a Mech, draw a card.
 */
export const HERO_COGSMITHS: HeroDefinition = {
  id: 'hero_cogsmiths_gearsmith',
  name: 'Constructor Prime Gearsmith',
  race: Race.COGSMITHS,
  maxHealth: 30,
  heroPower: createHeroPower(
    'hp_retrofit',
    'Retrofit',
    'Give a friendly Mech +1/+1. If it\'s a Mech, draw a card.',
    [
      {
        id: 'retrofit_buff',
        type: EffectType.BUFF,
        trigger: EffectTrigger.ACTIVATED,
        targetType: TargetType.CHOSEN,
        targetFilter: { tribe: 'MECH' as any },
        data: { attack: 1, health: 1 },
        isMandatory: true,
      },
      {
        id: 'retrofit_draw',
        type: EffectType.DRAW,
        trigger: EffectTrigger.ACTIVATED,
        targetType: TargetType.NONE,
        data: { count: 1 },
        isMandatory: true,
      },
    ],
    true,
    TargetType.FRIENDLY_MINION
  ),
  flavorText: 'Every cog has its place. Every machine has its purpose.',
};

/**
 * LUMINAR - Archon Solarius
 * Hero Power: "Radiance" - Restore 3 Health to your Hero or a minion.
 */
export const HERO_LUMINAR: HeroDefinition = {
  id: 'hero_luminar_solarius',
  name: 'Archon Solarius',
  race: Race.LUMINAR,
  maxHealth: 30,
  heroPower: createHeroPower(
    'hp_radiance',
    'Radiance',
    'Restore 3 Health to your Hero or a minion.',
    [
      {
        id: 'radiance_heal',
        type: EffectType.HEAL,
        trigger: EffectTrigger.ACTIVATED,
        targetType: TargetType.CHOSEN,
        data: { amount: 3 },
        isMandatory: true,
      },
    ],
    true,
    TargetType.ALL_CHARACTERS
  ),
  flavorText: 'The light of Solhaven burns eternal, a beacon against the void.',
};

/**
 * PYROCLAST - Flamecaller Ashyr
 * Hero Power: "Fireblast" - Deal 2 damage to a minion or enemy Hero.
 */
export const HERO_PYROCLAST: HeroDefinition = {
  id: 'hero_pyroclast_ashyr',
  name: 'Flamecaller Ashyr',
  race: Race.PYROCLAST,
  maxHealth: 30,
  heroPower: createHeroPower(
    'hp_fireblast',
    'Fireblast',
    'Deal 2 damage to a minion or enemy Hero.',
    [
      {
        id: 'fireblast_damage',
        type: EffectType.DAMAGE,
        trigger: EffectTrigger.ACTIVATED,
        targetType: TargetType.CHOSEN,
        data: { amount: 2 },
        isMandatory: true,
      },
    ],
    true,
    TargetType.ENEMY_HERO // Also allows enemy minions
  ),
  flavorText: 'Fire consumes all. Fire purifies all. Fire is all.',
};

/**
 * VOIDBORN - Prophet of the Abyss
 * Hero Power: "Void Touch" - Deal 2 damage to a random enemy minion. If none, deal 1 to the enemy hero.
 */
export const HERO_VOIDBORN: HeroDefinition = {
  id: 'hero_voidborn_prophet',
  name: 'Prophet of the Abyss',
  race: Race.VOIDBORN,
  maxHealth: 30,
  heroPower: createHeroPower(
    'hp_void_touch',
    'Void Touch',
    'Deal 2 damage to a random enemy.',
    [
      {
        id: 'void_touch_damage',
        type: EffectType.DAMAGE,
        trigger: EffectTrigger.ACTIVATED,
        targetType: TargetType.RANDOM_ENEMY,
        data: { amount: 2 },
        isMandatory: true,
      },
    ],
    false
  ),
  flavorText: 'The void whispers secrets that shatter minds and unmake worlds.',
};

/**
 * BIOTITANS - Worldshaper Thorna
 * Hero Power: "Cultivate" - Give a friendly minion +1/+1 and Guardian.
 */
export const HERO_BIOTITANS: HeroDefinition = {
  id: 'hero_biotitans_thorna',
  name: 'Worldshaper Thorna',
  race: Race.BIOTITANS,
  maxHealth: 30,
  heroPower: createHeroPower(
    'hp_cultivate',
    'Cultivate',
    'Give a friendly minion +1/+1 and Guardian.',
    [
      {
        id: 'cultivate_buff',
        type: EffectType.BUFF,
        trigger: EffectTrigger.ACTIVATED,
        targetType: TargetType.CHOSEN,
        data: { attack: 1, health: 1 },
        isMandatory: true,
      },
      {
        id: 'cultivate_guardian',
        type: EffectType.GRANT_KEYWORD,
        trigger: EffectTrigger.ACTIVATED,
        targetType: TargetType.CHOSEN,
        data: { keywords: [{ keyword: CombatKeyword.GUARDIAN }] },
        isMandatory: true,
      },
    ],
    true,
    TargetType.FRIENDLY_MINION
  ),
  flavorText: 'Nature bends to her will, and worlds bloom in her wake.',
};

/**
 * CRYSTALLINE - Geode Sage Lumis
 * Hero Power: "Refract" - Gain 1 Crystal this turn. Draw a card.
 */
export const HERO_CRYSTALLINE: HeroDefinition = {
  id: 'hero_crystalline_lumis',
  name: 'Geode Sage Lumis',
  race: Race.CRYSTALLINE,
  maxHealth: 30,
  heroPower: createHeroPower(
    'hp_refract',
    'Refract',
    'Gain 1 Crystal this turn. Draw a card.',
    [
      {
        id: 'refract_crystal',
        type: EffectType.GAIN_CRYSTALS,
        trigger: EffectTrigger.ACTIVATED,
        targetType: TargetType.NONE,
        data: { amount: 1, isTemporary: true },
        isMandatory: true,
      },
      {
        id: 'refract_draw',
        type: EffectType.DRAW,
        trigger: EffectTrigger.ACTIVATED,
        targetType: TargetType.NONE,
        data: { count: 1 },
        isMandatory: true,
      },
    ],
    false
  ),
  flavorText: 'Crystal channels power. Prismora channels infinity.',
};

/**
 * PHANTOM CORSAIRS - Captain Shadowvane
 * Hero Power: "Ghost Shot" - Deal 2 damage. Draw a card.
 */
export const HERO_PHANTOM_CORSAIRS: HeroDefinition = {
  id: 'hero_corsairs_shadowvane',
  name: 'Captain Shadowvane',
  race: Race.PHANTOM_CORSAIRS,
  maxHealth: 30,
  heroPower: createHeroPower(
    'hp_ghost_shot',
    'Ghost Shot',
    'Deal 2 damage. Draw a card.',
    [
      {
        id: 'ghost_shot_damage',
        type: EffectType.DAMAGE,
        trigger: EffectTrigger.ACTIVATED,
        targetType: TargetType.CHOSEN,
        data: { amount: 2 },
        isMandatory: true,
      },
      {
        id: 'ghost_shot_draw',
        type: EffectType.DRAW,
        trigger: EffectTrigger.ACTIVATED,
        targetType: TargetType.NONE,
        data: { count: 1 },
        isMandatory: true,
      },
      // Conditional draw handled in effect resolution
    ],
    true,
    TargetType.ALL_CHARACTERS
  ),
  flavorText: 'A captain of shadows sails between stars, taking what the void provides.',
};

/**
 * HIVEMIND - Overmind Skryx
 * Hero Power: "Spawn" - Summon a 1/1 Drone.
 */
export const HERO_HIVEMIND: HeroDefinition = {
  id: 'hero_hivemind_skryx',
  name: 'Overmind Skryx',
  race: Race.HIVEMIND,
  maxHealth: 30,
  heroPower: createHeroPower(
    'hp_spawn',
    'Spawn',
    'Summon a 1/1 Drone.',
    [
      {
        id: 'spawn_summon',
        type: EffectType.SUMMON,
        trigger: EffectTrigger.ACTIVATED,
        targetType: TargetType.NONE,
        data: { cardId: 'token_drone', count: 1 },
        isMandatory: true,
      },
    ],
    false
  ),
  flavorText: 'The swarm is one. The one is swarm. Resistance feeds the collective.',
};

/**
 * ASTROMANCERS - Oracle Stellara
 * Hero Power: "Foresight" - Draw a card.
 */
export const HERO_ASTROMANCERS: HeroDefinition = {
  id: 'hero_astromancers_stellara',
  name: 'Oracle Stellara',
  race: Race.ASTROMANCERS,
  maxHealth: 30,
  heroPower: createHeroPower(
    'hp_foresight',
    'Foresight',
    'Draw a card.',
    [
      {
        id: 'foresight_draw',
        type: EffectType.DRAW,
        trigger: EffectTrigger.ACTIVATED,
        targetType: TargetType.NONE,
        data: { count: 1 },
        isMandatory: true,
      },
    ],
    false
  ),
  flavorText: 'The stars reveal all paths. She walks the one that leads to victory.',
};

/**
 * CHRONOBOUND - Timeshaper Chronus
 * Hero Power: "Rewind" - Deal 1 damage to all enemy minions.
 */
export const HERO_CHRONOBOUND: HeroDefinition = {
  id: 'hero_chronobound_chronus',
  name: 'Timeshaper Chronus',
  race: Race.CHRONOBOUND,
  maxHealth: 30,
  heroPower: createHeroPower(
    'hp_rewind',
    'Rewind',
    'Deal 1 damage to all enemy minions.',
    [
      {
        id: 'rewind_aoe',
        type: EffectType.DAMAGE,
        trigger: EffectTrigger.ACTIVATED,
        targetType: TargetType.ALL_ENEMY_MINIONS,
        data: { amount: 1 },
        isMandatory: true,
      },
    ],
    false
  ),
  flavorText: 'Time is not a river but an ocean. He swims where others drown.',
};

/**
 * All hero definitions
 */
export const ALL_HEROES: HeroDefinition[] = [
  HERO_COGSMITHS,
  HERO_LUMINAR,
  HERO_PYROCLAST,
  HERO_VOIDBORN,
  HERO_BIOTITANS,
  HERO_CRYSTALLINE,
  HERO_PHANTOM_CORSAIRS,
  HERO_HIVEMIND,
  HERO_ASTROMANCERS,
  HERO_CHRONOBOUND,
];

/**
 * Get hero by race
 */
export function getHeroByRace(race: Race): HeroDefinition | undefined {
  return ALL_HEROES.find((h) => h.race === race);
}

/**
 * Get hero by ID
 */
export function getHeroById(id: string): HeroDefinition | undefined {
  return ALL_HEROES.find((h) => h.id === id);
}

/**
 * Hero registry for quick lookup
 */
export const HeroRegistry: Map<string, HeroDefinition> = new Map(
  ALL_HEROES.map((h) => [h.id, h])
);
