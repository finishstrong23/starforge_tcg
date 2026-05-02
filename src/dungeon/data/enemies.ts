/**
 * STARFORGE TCG — Dungeon Run Enemy Definitions
 * All enemy templates for the roguelite dungeon mode.
 */

import type { DungeonEnemy, EnemyIntent, AIPattern } from '../types';

// ─── Enemy Template Type ───────────────────────────────────
export interface EnemyTemplate {
  name: string;
  maxHealth: number;
  actTier: 1 | 2 | 3;
  isElite: boolean;
  isBoss: boolean;
  aiPattern: AIPattern;
}

// ─── Helper: cycle turn for repeating patterns ─────────────
function cycle(turn: number, length: number): number {
  return ((turn - 1) % length);
}

// ─── Intent Builders ───────────────────────────────────────
function attack(value: number, description?: string): EnemyIntent {
  return { type: 'ATTACK', damage: value, value, description: description ?? `Attack for ${value}` };
}

function multiAttack(perHit: number, hits: number, description?: string): EnemyIntent {
  return {
    type: 'MULTI_ATTACK',
    damage: perHit,
    hits,
    value: perHit,
    description: description ?? `Attack for ${perHit} x${hits} (${perHit * hits} total)`,
  };
}

function aoeAttack(value: number, description?: string): EnemyIntent {
  return { type: 'AOE_ATTACK', damage: value, value, description: description ?? `Attack ALL for ${value}` };
}

function defend(value: number, description?: string): EnemyIntent {
  return { type: 'DEFEND', block: value, value, description: description ?? `Block for ${value}` };
}

function buff(description: string, value?: number): EnemyIntent {
  return { type: 'BUFF', value, buffName: description, description };
}

function debuff(description: string, value?: number): EnemyIntent {
  return { type: 'DEBUFF', value, debuffName: description, description };
}

function attackBuff(damage: number, buffDesc: string, buffValue?: number): EnemyIntent {
  return {
    type: 'ATTACK_BUFF',
    damage,
    value: damage,
    buffName: buffDesc,
    description: `Attack for ${damage} and ${buffDesc}`,
  };
}

function attackDebuff(damage: number, debuffDesc: string, debuffValue?: number): EnemyIntent {
  return {
    type: 'ATTACK_DEBUFF',
    damage,
    value: damage,
    debuffName: debuffDesc,
    description: `Attack for ${damage} and ${debuffDesc}`,
  };
}

function special(description: string, value?: number): EnemyIntent {
  return { type: 'SPECIAL', value, description };
}

// ═══════════════════════════════════════════════════════════
// ACT 1 — Regular Enemies
// ═══════════════════════════════════════════════════════════

const voidDrone: EnemyTemplate = {
  name: 'Void Drone',
  maxHealth: 28,
  actTier: 1,
  isElite: false,
  isBoss: false,
  aiPattern: {
    name: 'alternating_attack_buff',
    getIntent: (turn: number) => {
      const phase = cycle(turn, 3);
      if (phase < 2) return attack(6);
      return buff('Gains +2 Strength', 2);
    },
  },
};

const crystalHatchling: EnemyTemplate = {
  name: 'Crystal Hatchling',
  maxHealth: 22,
  actTier: 1,
  isElite: false,
  isBoss: false,
  aiPattern: {
    name: 'attack_with_low_hp_block',
    getIntent: (_turn: number, enemy: DungeonEnemy) => {
      if (enemy.currentHealth < enemy.maxHealth / 2) {
        return attackBuff(4, 'gain 4 Block');
      }
      return attack(4);
    },
  },
};

const scrapGolem: EnemyTemplate = {
  name: 'Scrap Golem',
  maxHealth: 36,
  actTier: 1,
  isElite: false,
  isBoss: false,
  aiPattern: {
    name: 'attack_defend_cycle',
    getIntent: (turn: number) => {
      const phase = cycle(turn, 3);
      if (phase === 0) return attack(8);
      if (phase === 1) return defend(10);
      return attack(8);
    },
  },
};

const emberWisp: EnemyTemplate = {
  name: 'Ember Wisp',
  maxHealth: 20,
  actTier: 1,
  isElite: false,
  isBoss: false,
  aiPattern: {
    name: 'aoe_and_heal',
    getIntent: (turn: number) => {
      const phase = cycle(turn, 3);
      if (phase < 2) return aoeAttack(3);
      return special('Heal for 6', 6);
    },
  },
};

const phantomScout: EnemyTemplate = {
  name: 'Phantom Scout',
  maxHealth: 24,
  actTier: 1,
  isElite: false,
  isBoss: false,
  aiPattern: {
    name: 'phase_attack_debuff',
    getIntent: (turn: number) => {
      const phase = cycle(turn, 2);
      if (phase === 0) return attackDebuff(5, 'apply Weak 1');
      return debuff('Apply WEAK', 1);
    },
  },
};

const cogworkSentry: EnemyTemplate = {
  name: 'Cogwork Sentry',
  maxHealth: 34,
  actTier: 1,
  isElite: false,
  isBoss: false,
  aiPattern: {
    name: 'defend_then_attack',
    getIntent: (turn: number) => {
      const phase = cycle(turn, 3);
      if (phase === 0) return defend(12);
      return attack(10);
    },
  },
};

const lavaHatchling: EnemyTemplate = {
  name: 'Lava Hatchling',
  maxHealth: 18,
  actTier: 1,
  isElite: false,
  isBoss: false,
  aiPattern: {
    name: 'constant_attack_immolate',
    getIntent: () => {
      return attack(5, 'Attack for 5. On death: IMMOLATE — deal 6 to hero');
    },
  },
};

// ═══════════════════════════════════════════════════════════
// ACT 1 — Elite Enemies
// ═══════════════════════════════════════════════════════════

const forgeGuardian: EnemyTemplate = {
  name: 'Forge Guardian',
  maxHealth: 60,
  actTier: 1,
  isElite: true,
  isBoss: false,
  aiPattern: {
    name: 'enrage_cycle',
    getIntent: (turn: number) => {
      const phase = cycle(turn, 4);
      if (phase === 0) return attack(12);
      if (phase === 1) return defend(15);
      if (phase === 2) return buff('Enrage: +3 Strength', 3);
      return attack(18);
    },
  },
};

const crystalColossus: EnemyTemplate = {
  name: 'Crystal Colossus',
  maxHealth: 70,
  actTier: 1,
  isElite: true,
  isBoss: false,
  aiPattern: {
    name: 'shatter_cycle',
    getIntent: (turn: number, enemy: DungeonEnemy) => {
      const phase = cycle(turn, 3);
      if (phase === 0) return attack(10);
      if (phase === 1) return defend(20);
      return special(`Shatter: deal ${enemy.block} damage (equal to Block)`, enemy.block);
    },
  },
};

const shadowAmbusher: EnemyTemplate = {
  name: 'Shadow Ambusher',
  maxHealth: 52,
  actTier: 1,
  isElite: true,
  isBoss: false,
  aiPattern: {
    name: 'cloak_ambush',
    getIntent: (turn: number) => {
      const phase = cycle(turn, 3);
      if (phase === 0) return attack(8, 'Attack for 8 (CLOAK)');
      if (phase === 1) return debuff('Apply VULNERABLE', 1);
      return attack(14);
    },
  },
};

// ═══════════════════════════════════════════════════════════
// ACT 2 — Regular Enemies
// ═══════════════════════════════════════════════════════════

const spectralCorsair: EnemyTemplate = {
  name: 'Spectral Corsair',
  maxHealth: 44,
  actTier: 2,
  isElite: false,
  isBoss: false,
  aiPattern: {
    name: 'attack_steal_cycle',
    getIntent: (turn: number) => {
      const phase = cycle(turn, 3);
      if (phase === 0) return attack(8);
      if (phase === 1) return special('Steal a card from your hand');
      return attack(12);
    },
  },
};

const pyroclastCultist: EnemyTemplate = {
  name: 'Pyroclast Cultist',
  maxHealth: 38,
  actTier: 2,
  isElite: false,
  isBoss: false,
  aiPattern: {
    name: 'buff_attack_immolate',
    getIntent: (turn: number) => {
      const phase = cycle(turn, 3);
      if (phase === 0) return buff('Buff all enemies: +3 Strength', 3);
      if (phase === 1) return attack(10);
      return aoeAttack(8, 'IMMOLATE burst: Attack ALL for 8');
    },
  },
};

const luminarZealot: EnemyTemplate = {
  name: 'Luminar Zealot',
  maxHealth: 48,
  actTier: 2,
  isElite: false,
  isBoss: false,
  aiPattern: {
    name: 'heal_attack_shield',
    getIntent: (turn: number) => {
      const phase = cycle(turn, 4);
      if (phase === 0) return special('Heal for 10', 10);
      if (phase === 1) return attack(8);
      if (phase === 2) return special('Heal for 10', 10);
      return defend(15, 'Shield for 15');
    },
  },
};

const voidStalker: EnemyTemplate = {
  name: 'Void Stalker',
  maxHealth: 42,
  actTier: 2,
  isElite: false,
  isBoss: false,
  aiPattern: {
    name: 'phase_stalker',
    getIntent: (turn: number) => {
      const phase = cycle(turn, 3);
      if (phase === 0) return attack(9, 'Attack for 9 (PHASE)');
      if (phase === 1) return debuff('Apply VULNERABLE', 1);
      return attack(14);
    },
  },
};

const mechSwarm: EnemyTemplate = {
  name: 'Mech Swarm',
  maxHealth: 34,
  actTier: 2,
  isElite: false,
  isBoss: false,
  aiPattern: {
    name: 'summon_and_attack',
    getIntent: (turn: number) => {
      const phase = cycle(turn, 3);
      if (phase === 0) return special('Summon 2 small Mech adds (2/2)');
      return attack(6);
    },
  },
};

const crystalGuardian: EnemyTemplate = {
  name: 'Crystal Guardian',
  maxHealth: 50,
  actTier: 2,
  isElite: false,
  isBoss: false,
  aiPattern: {
    name: 'guardian_cycle',
    getIntent: (turn: number) => {
      const phase = cycle(turn, 3);
      if (phase === 0) return attack(6, 'Attack for 6 (GUARDIAN)');
      if (phase === 1) return defend(16);
      return attack(6, 'Attack for 6 (GUARDIAN)');
    },
  },
};

// ═══════════════════════════════════════════════════════════
// ACT 2 — Elite Enemies
// ═══════════════════════════════════════════════════════════

const pyroclastWarlord: EnemyTemplate = {
  name: 'Pyroclast Warlord',
  maxHealth: 90,
  actTier: 2,
  isElite: true,
  isBoss: false,
  aiPattern: {
    name: 'burn_enrage',
    getIntent: (turn: number) => {
      const phase = cycle(turn, 4);
      if (phase === 0) return attack(15);
      if (phase === 1) return debuff('Apply BURN 3', 3);
      if (phase === 2) return attack(20);
      return buff('Enrage: +4 Strength', 4);
    },
  },
};

const voidReaver: EnemyTemplate = {
  name: 'Void Reaver',
  maxHealth: 85,
  actTier: 2,
  isElite: true,
  isBoss: false,
  aiPattern: {
    name: 'phase_debuff_assault',
    getIntent: (turn: number) => {
      const phase = cycle(turn, 3);
      if (phase === 0) return attack(12, 'Attack for 12 (PHASE)');
      if (phase === 1) return debuff('Apply WEAK + VULNERABLE');
      return attack(18);
    },
  },
};

const mechOverlord: EnemyTemplate = {
  name: 'Mech Overlord',
  maxHealth: 95,
  actTier: 2,
  isElite: true,
  isBoss: false,
  aiPattern: {
    name: 'overlord_cycle',
    getIntent: (turn: number) => {
      const phase = cycle(turn, 4);
      if (phase === 0) return defend(20);
      if (phase === 1) return special('Summon a 2/2 Mech');
      if (phase === 2) return attack(16);
      return buff('Buff all allies: +2 Attack', 2);
    },
  },
};

// ═══════════════════════════════════════════════════════════
// ACT 3 — Regular Enemies
// ═══════════════════════════════════════════════════════════

const theOverwarden: EnemyTemplate = {
  name: 'The Overwarden',
  maxHealth: 70,
  actTier: 3,
  isElite: false,
  isBoss: false,
  aiPattern: {
    name: 'overwarden_cycle',
    getIntent: (turn: number) => {
      const phase = cycle(turn, 4);
      if (phase === 0) return attack(12);
      if (phase === 1) return debuff('Apply BURN 3', 3);
      if (phase === 2) return attack(18);
      return buff('Enrage: +5 Strength', 5);
    },
  },
};

const phantomDreadlord: EnemyTemplate = {
  name: 'Phantom Dreadlord',
  maxHealth: 65,
  actTier: 3,
  isElite: false,
  isBoss: false,
  aiPattern: {
    name: 'phase_dread',
    getIntent: (turn: number) => {
      const phase = cycle(turn, 3);
      if (phase === 0) return attack(15, 'Attack for 15 (PHASE)');
      if (phase === 1) return debuff('Apply VULNERABLE + WEAK');
      return attack(20);
    },
  },
};

const astralJuggernaut: EnemyTemplate = {
  name: 'Astral Juggernaut',
  maxHealth: 80,
  actTier: 3,
  isElite: false,
  isBoss: false,
  aiPattern: {
    name: 'juggernaut_cycle',
    getIntent: (turn: number) => {
      const phase = cycle(turn, 3);
      if (phase === 0) return aoeAttack(10);
      if (phase === 1) return defend(20);
      return attack(20);
    },
  },
};

// ═══════════════════════════════════════════════════════════
// ACT 3 — Elite Enemies
// ═══════════════════════════════════════════════════════════

const starWyrm: EnemyTemplate = {
  name: 'Star Wyrm',
  maxHealth: 120,
  actTier: 3,
  isElite: true,
  isBoss: false,
  aiPattern: {
    name: 'devour_cycle',
    getIntent: (turn: number) => {
      const phase = cycle(turn, 4);
      if (phase === 0) return attack(20);
      if (phase === 1) return defend(25);
      if (phase === 2) return special('Devour: destroy a player minion');
      return attack(25);
    },
  },
};

const temporalHorror: EnemyTemplate = {
  name: 'Temporal Horror',
  maxHealth: 110,
  actTier: 3,
  isElite: true,
  isBoss: false,
  aiPattern: {
    name: 'temporal_cycle',
    getIntent: (turn: number) => {
      const phase = cycle(turn, 4);
      if (phase === 0) return attack(14);
      if (phase === 1) return debuff('Exhaust a random card from your hand');
      if (phase === 2) return attack(18);
      return special('Heal for 15', 15);
    },
  },
};

// ═══════════════════════════════════════════════════════════
// ACT BOSSES
// ═══════════════════════════════════════════════════════════

const forgebornSentinel: EnemyTemplate = {
  name: 'The Forgeborn Sentinel',
  maxHealth: 150,
  actTier: 1,
  isElite: false,
  isBoss: true,
  aiPattern: {
    name: 'forgeborn_boss',
    getIntent: (turn: number, enemy: DungeonEnemy) => {
      const cycleIndex = cycle(turn, 4);
      const cycleNumber = Math.floor((turn - 1) / 4);
      const escalation = cycleNumber * 2;
      const enraged = enemy.currentHealth <= enemy.maxHealth * 0.5;
      const bonus = enraged ? 4 : 0;

      if (cycleIndex === 0) return defend(15 + escalation, `Block for ${15 + escalation}`);
      if (cycleIndex === 1) return attack(14 + escalation + bonus);
      if (cycleIndex === 2) return aoeAttack(6 + escalation + bonus, `Overload: Attack ALL for ${6 + escalation + bonus}`);
      return attack(18 + escalation + bonus);
    },
  },
};

const voidAdmiralKess: EnemyTemplate = {
  name: 'Void Admiral Kess',
  maxHealth: 220,
  actTier: 2,
  isElite: false,
  isBoss: true,
  aiPattern: {
    name: 'kess_boss',
    getIntent: (turn: number) => {
      const phase = cycle(turn, 4);
      if (phase === 0) return special('Steal top card from your draw pile');
      if (phase === 1) return attack(16, 'Attack for 16 (PHASE)');
      if (phase === 2) return special('Summon 3/3 Phantom adds');
      return special('Grand Heist: steal best relic for 2 turns');
    },
  },
};

const starDevourer: EnemyTemplate = {
  name: 'The Star Devourer',
  maxHealth: 300,
  actTier: 3,
  isElite: false,
  isBoss: true,
  aiPattern: {
    name: 'star_devourer_boss',
    getIntent: (turn: number) => {
      // Turn 1 is always Consume
      if (turn === 1) return special('Consume: destroy one player minion');

      // After turn 1, cycle through 4-turn pattern (attack / aoe / warning / supernova)
      // with escalation per cycle
      const adjustedTurn = turn - 2; // 0-indexed from turn 2
      const cycleNumber = Math.floor(adjustedTurn / 4);
      const escalation = cycleNumber * 3;
      const phase = adjustedTurn % 4;

      if (phase === 0) return attack(20 + escalation);
      if (phase === 1) return aoeAttack(12 + escalation);
      if (phase === 2) return special('SUPERNOVA WARNING — brace yourself!');
      return special(`SUPERNOVA: deal ${30 + escalation} to hero!`, 30 + escalation);
    },
  },
};

// ═══════════════════════════════════════════════════════════
// TEMPLATE REGISTRY
// ═══════════════════════════════════════════════════════════

export const ENEMY_TEMPLATES: Record<string, EnemyTemplate> = {
  // Act 1 Regular
  void_drone: voidDrone,
  crystal_hatchling: crystalHatchling,
  scrap_golem: scrapGolem,
  ember_wisp: emberWisp,
  phantom_scout: phantomScout,
  cogwork_sentry: cogworkSentry,
  lava_hatchling: lavaHatchling,
  // Act 1 Elite
  forge_guardian: forgeGuardian,
  crystal_colossus: crystalColossus,
  shadow_ambusher: shadowAmbusher,
  // Act 2 Regular
  spectral_corsair: spectralCorsair,
  pyroclast_cultist: pyroclastCultist,
  luminar_zealot: luminarZealot,
  void_stalker: voidStalker,
  mech_swarm: mechSwarm,
  crystal_guardian: crystalGuardian,
  // Act 2 Elite
  pyroclast_warlord: pyroclastWarlord,
  void_reaver: voidReaver,
  mech_overlord: mechOverlord,
  // Act 3 Regular
  the_overwarden: theOverwarden,
  phantom_dreadlord: phantomDreadlord,
  astral_juggernaut: astralJuggernaut,
  // Act 3 Elite
  star_wyrm: starWyrm,
  temporal_horror: temporalHorror,
  // Bosses
  forgeborn_sentinel: forgebornSentinel,
  void_admiral_kess: voidAdmiralKess,
  star_devourer: starDevourer,
};

// ═══════════════════════════════════════════════════════════
// ACT LOOKUPS
// ═══════════════════════════════════════════════════════════

const ACT_ENEMIES: Record<1 | 2 | 3, string[]> = {
  1: [
    'void_drone',
    'crystal_hatchling',
    'scrap_golem',
    'ember_wisp',
    'phantom_scout',
    'cogwork_sentry',
    'lava_hatchling',
  ],
  2: [
    'spectral_corsair',
    'pyroclast_cultist',
    'luminar_zealot',
    'void_stalker',
    'mech_swarm',
    'crystal_guardian',
  ],
  3: [
    'the_overwarden',
    'phantom_dreadlord',
    'astral_juggernaut',
  ],
};

const ACT_ELITES: Record<1 | 2 | 3, string[]> = {
  1: ['forge_guardian', 'crystal_colossus', 'shadow_ambusher'],
  2: ['pyroclast_warlord', 'void_reaver', 'mech_overlord'],
  3: ['star_wyrm', 'temporal_horror'],
};

const ACT_BOSSES: Record<1 | 2 | 3, string> = {
  1: 'forgeborn_sentinel',
  2: 'void_admiral_kess',
  3: 'star_devourer',
};

// ═══════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════

let enemyCounter = 0;

/**
 * Create a fresh DungeonEnemy instance from a template ID.
 * Each call produces a unique instance with full health and no status effects.
 */
export function createEnemy(templateId: string): DungeonEnemy {
  const template = ENEMY_TEMPLATES[templateId];
  if (!template) {
    throw new Error(`Unknown enemy template: "${templateId}"`);
  }

  enemyCounter++;
  const enemy: DungeonEnemy = {
    id: `enemy_${templateId}_${enemyCounter}`,
    name: template.name,
    maxHealth: template.maxHealth,
    currentHealth: template.maxHealth,
    block: 0,
    intent: { type: 'ATTACK', value: 0, description: 'Preparing...' },
    upcomingIntents: [],
    statusEffects: [],
    actTier: template.actTier,
    isElite: template.isElite,
    isBoss: template.isBoss,
    aiPattern: template.aiPattern,
  };

  // Resolve the first turn's intent; elites/bosses get multi-turn preview
  enemy.intent = template.aiPattern.getIntent(1, enemy);
  enemy.upcomingIntents = (template.isElite || template.isBoss)
    ? [template.aiPattern.getIntent(2, enemy), template.aiPattern.getIntent(3, enemy)]
    : [];

  return enemy;
}

/** Returns template IDs for regular enemies in the given act. */
export function getActEnemies(act: 1 | 2 | 3): string[] {
  return [...ACT_ENEMIES[act]];
}

/** Returns template IDs for elite enemies in the given act. */
export function getActElites(act: 1 | 2 | 3): string[] {
  return [...ACT_ELITES[act]];
}

/** Returns the template ID for the boss of the given act. */
export function getActBoss(act: 1 | 2 | 3): string {
  return ACT_BOSSES[act];
}
