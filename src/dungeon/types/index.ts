// ─── CARD TYPES ────────────────────────────────────────────────────────────
export type Faction = 'Cogsmiths' | 'Pyroclast' | 'Luminar' | 'WarpRiders';
export type CardType = 'Minion' | 'Spell' | 'Structure' | 'Attack' | 'Skill' | 'Power' | 'Augment';
export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
/**
 * Complexity tier — orthogonal to rarity. Drives reward roller weighting so
 * brand-new players see foundational cards first and the faction mechanic
 * is introduced gradually.
 *   1 = Foundational     (no mechanic engagement)
 *   2 = Mechanic-introducing (generates Heat / Channel / augments / Flux)
 *   3 = Mechanic-payoff    (consumes or scales on mechanic state)
 */
export type ComplexityTier = 1 | 2 | 3;
export type Keyword =
  | 'LAST_WORDS'
  | 'IMMOLATE'
  | 'ILLUMINATE'
  | 'DRAIN'
  | 'GUARDIAN'
  | 'BARRIER'
  | 'CLOAK'
  | 'PHASE'
  | 'SWIFT'
  | 'BLITZ'
  | 'DEPLOY'
  | 'UPGRADE';

export interface CardDefinition {
  id: string;
  name: string;
  faction: Faction;
  type: CardType;
  cost: number;
  attack?: number;
  health?: number;
  keywords: Keyword[];
  cardText: string;
  rarity: Rarity;
  /**
   * Complexity tier for reward weighting (see ComplexityTier).
   * NOTE: optional during the Phase 1.5 per-faction rollout. Cards without
   * this field are treated as Tier 1 by the reward roller. Will be tightened
   * to required once all four factions are tagged.
   */
  complexityTier?: ComplexityTier;
  upgradeText?: string;           // What changes on upgrade
  upgraded?: boolean;
}

export interface CardInstance extends CardDefinition {
  instanceId: string;             // unique per copy in deck
  upgraded: boolean;
  currentHealth?: number;         // for minions in play
  hasAttacked?: boolean;
  statusEffects: StatusEffect[];
  fluxState?: 'A' | 'B' | 'C';    // WarpRiders Flux cards: which mode is active
}

// ─── STATUS EFFECTS ─────────────────────────────────────────────────────────
export type StatusEffectType =
  | 'poison'
  | 'burn'
  | 'shield'
  | 'strength'
  | 'weak'
  | 'vulnerable'
  | 'barrier'
  | 'stealth'
  | 'phase';

export interface StatusEffect {
  type: StatusEffectType;
  stacks: number;
  duration?: number;              // turns remaining, undefined = permanent
}

// ─── ENEMY TYPES ────────────────────────────────────────────────────────────
export type IntentType = 'attack' | 'defend' | 'buff' | 'debuff' | 'summon' | 'special';

export interface EnemyIntent {
  type: IntentType;
  value?: number;                 // damage or shield amount
  description: string;
}

export interface EnemyDefinition {
  id: string;
  name: string;
  lore: string;                   // one-line flavor text
  maxHealth: number;
  attack: number;
  art: string;                    // emoji or color code for placeholder art
  acts: (1 | 2 | 3)[];            // which acts this enemy appears in
  isElite: boolean;
  isBoss: boolean;
  intents: EnemyIntent[];         // rotation of intents
  onDeath?: string;               // special effect description
}

export interface EnemyInstance extends EnemyDefinition {
  currentHealth: number;
  currentShield: number;
  statusEffects: StatusEffect[];
  intentIndex: number;            // current position in intent rotation
  minionsInPlay: CardInstance[];
}

// ─── RELIC TYPES ────────────────────────────────────────────────────────────
export type RelicTrigger =
  | 'run_start'
  | 'combat_start'
  | 'combat_end'
  | 'on_kill'
  | 'on_card_play'
  | 'on_heal'
  | 'on_damage_taken'
  | 'on_rest'
  | 'on_shop'
  | 'turn_start'
  | 'turn_end'
  | 'on_death'
  | 'passive';

export interface RelicDefinition {
  id: string;
  name: string;
  description: string;
  flavor: string;                 // lore text
  trigger: RelicTrigger;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Boss';
  art: string;                    // emoji placeholder
}

// ─── MAP TYPES ───────────────────────────────────────────────────────────────
export type NodeType = 'combat' | 'elite' | 'boss' | 'rest' | 'shop' | 'treasure';

export interface MapNode {
  id: string;
  row: number;
  col: number;
  type: NodeType;
  visited: boolean;
  connections: string[];          // ids of next-row nodes this connects to
}

export interface ActMap {
  actNumber: 1 | 2 | 3;
  nodes: MapNode[];
  currentNodeId: string | null;
  completed: boolean;
}

// ─── COMBAT STATE ────────────────────────────────────────────────────────────
export type CombatPhase =
  | 'draw'
  | 'player_turn'
  | 'enemy_turn'
  | 'combat_end_win'
  | 'combat_end_loss';

export interface CombatState {
  phase: CombatPhase;
  turn: number;
  playerHealth: number;
  playerMaxHealth: number;
  playerEnergy: number;
  playerMaxEnergy: number;
  playerShield: number;
  playerHeat: number;             // Pyroclast faction resource
  playerFaction: string;          // e.g. 'Pyroclast' | 'Cogsmiths' etc.
  playerStatusEffects: StatusEffect[];
  playerBoard: CardInstance[];    // minions in play
  hand: CardInstance[];
  drawPile: CardInstance[];
  discardPile: CardInstance[];
  enemy: EnemyInstance;
  enemyBoard: CardInstance[];     // enemy minions in play
  lastAction: string;             // description of last thing that happened
  combatLog: string[];
}

// ─── RUN STATE ───────────────────────────────────────────────────────────────
export type RunPhase =
  | 'draft'
  | 'map'
  | 'combat'
  | 'elite_combat'
  | 'boss_combat'
  | 'rest'
  | 'shop'
  | 'reward'
  | 'run_end_win'
  | 'run_end_loss';

export interface RunState {
  phase: RunPhase;
  currentAct: 1 | 2 | 3;
  actMaps: ActMap[];
  deck: CardInstance[];
  hand: CardInstance[];
  relics: RelicDefinition[];
  gold: number;
  maxHealth: number;
  currentHealth: number;
  energy: number;
  maxEnergy: number;
  combatState: CombatState | null;
  runStats: {
    totalCombats: number;
    elitesDefeated: number;
    bossesDefeated: number;
    cardsPlayed: number;
    totalDamageDealt: number;
  };
}
