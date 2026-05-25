// ─── CARD TYPES ────────────────────────────────────────────────────────────
export type Faction = 'Cogsmiths' | 'Pyroclast' | 'Luminar' | 'WarpRiders';
export type CardType = 'Minion' | 'Spell' | 'Structure' | 'Attack' | 'Skill' | 'Power' | 'Augment' | 'Curse';
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
  /** Complexity tier for reward weighting (see ComplexityTier). */
  complexityTier: ComplexityTier;
  /** Active text after upgrade. The engine is regex-driven on card text, so
   *  upgradeText IS the primary effect-override mechanism — most effect
   *  changes (new status riders, new clauses, removed exhaust) are expressed
   *  here, not via a structured effect object. */
  upgradeText?: string;
  /** Optional numeric overrides for upgrades that change stats outside
   *  the natural-language card text (cost reductions, minion stat bumps).
   *  When omitted, the upgraded card uses the same stat as the base card. */
  upgradedCost?: number;
  upgradedAttack?: number;
  upgradedHealth?: number;
  upgraded?: boolean;
  /** Structured executable effects. Phase 1 migration path: if present,
   *  combat resolution uses these instead of parsing cardText. */
  effects?: EffectDefinition[];
  /** Structured executable effects after upgrade. Falls back to effects. */
  upgradeEffects?: EffectDefinition[];
}

export interface CardInstance extends CardDefinition {
  instanceId: string;             // unique per copy in deck
  upgraded: boolean;
  currentHealth?: number;         // for minions in play
  hasAttacked?: boolean;
  statusEffects: StatusEffect[];
  fluxState?: 'A' | 'B' | 'C';    // WarpRiders Flux cards: which mode is active
  /** Cogsmiths summons: auto-attack damage at end of player turn. */
  summonAutoDamage?: number;
  /** Cogsmiths summons: how many actions per turn (e.g. Titan = 2). */
  summonActionsPerTurn?: number;
  /** Cogsmiths summons: how many turns the summon persists. -1 = permanent. */
  summonTurnsLeft?: number;
  /** Cogsmiths augment buffs attached to this card (display + bonus tags). */
  augments?: string[];
  /** Luminar Channel cards: number of Lumens accumulated on this card. */
  lumens?: number;
}

// ─── STRUCTURED EFFECTS ──────────────────────────────────────────────────────

export type EffectTarget = 'enemy' | 'player';

export type EffectTrigger =
  | 'play'
  | 'combat_start'
  | 'turn_start'
  | 'turn_end'
  | 'combat_end'
  | 'on_card_play'
  | 'on_damage_taken'
  | 'on_heal'
  | 'on_kill'
  | 'on_death'
  | 'on_rest'
  | 'on_shop';

export type LumenGrantMode = 'each' | 'first' | 'distributed';

export type ConditionDefinition =
  | { type: 'heat_at_least'; amount: number }
  | { type: 'has_status'; target: EffectTarget; status: StatusEffectType; stacksAtLeast?: number }
  | { type: 'card_is_upgraded' };

export interface DamageEffect {
  type: 'damage';
  amount: number;
  target?: Extract<EffectTarget, 'enemy'>;
}

export interface BlockEffect {
  type: 'block';
  amount: number;
}

export interface DrawEffect {
  type: 'draw';
  amount: number;
}

export interface EnergyEffect {
  type: 'energy';
  amount: number;
}

export interface StatusEffectDefinition {
  type: 'status';
  target: EffectTarget;
  status: StatusEffectType;
  stacks: number;
  duration?: number;
}

export interface ExhaustEffect {
  type: 'exhaust';
}

export interface HeatEffect {
  type: 'heat';
  amount: number;
}

export interface HealEffect {
  type: 'heal';
  amount: number;
}

export interface SelfDamageEffect {
  type: 'self_damage';
  amount: number;
}

export interface LumenEffect {
  type: 'lumen';
  amount: number;
  mode: LumenGrantMode;
}

export interface AugmentEffect {
  type: 'augment';
  damageBonus?: number;
  blockBonus?: number;
  costReduction?: number;
  status?: StatusEffectDefinition;
}

export interface SummonEffect {
  type: 'summon';
  name: string;
  health: number;
  damage: number;
  actionsPerTurn?: number;
  turns?: number;
}

export interface RiftEffect {
  type: 'rift';
  rift: Rift['type'];
  turns: number;
}

export interface ChoiceEffect {
  type: 'choice';
  options: Array<{
    id: string;
    label: string;
    effects: EffectDefinition[];
  }>;
}

export interface ConditionalEffect {
  type: 'conditional';
  condition: ConditionDefinition;
  effects: EffectDefinition[];
}

export interface TriggeredEffect {
  type: 'trigger';
  trigger: EffectTrigger;
  effects: EffectDefinition[];
}

export type EffectDefinition =
  | DamageEffect
  | BlockEffect
  | DrawEffect
  | EnergyEffect
  | StatusEffectDefinition
  | ExhaustEffect
  | HeatEffect
  | HealEffect
  | SelfDamageEffect
  | LumenEffect
  | AugmentEffect
  | SummonEffect
  | RiftEffect
  | ChoiceEffect
  | ConditionalEffect
  | TriggeredEffect;

// ─── STATUS EFFECTS ─────────────────────────────────────────────────────────
export type StatusEffectType =
  | 'poison'
  | 'burn'
  | 'shield'
  | 'strength'
  | 'dexterity'
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
export type NodeType = 'combat' | 'elite' | 'boss' | 'rest' | 'shop' | 'treasure' | 'event';

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

/**
 * Warp Riders Rift — a persistent buff that ticks each player turn.
 * - cost: 1 random card in hand costs 0 next turn
 * - genesis: all cards cost -1 this turn (1-turn burst)
 * - energy: gain +1 energy at turn start
 * - chaos: deal small damage to a random enemy at turn start
 */
export interface Rift {
  type: 'cost' | 'genesis' | 'energy' | 'chaos';
  turnsRemaining: number;
}

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
  /** Active Warp Riders rifts (ticks down each player turn end). */
  playerRifts: Rift[];
  /** Persistent Power cards in effect for the rest of combat. */
  playerPowers: CardInstance[];
  /** Cards permanently removed for the rest of combat (Phoenix Vial, Exhaust keyword). */
  exhaustPile: CardInstance[];
  /** Set by Chronoshift Philter — short-circuits the next enemy turn entirely. */
  skipNextEnemyTurn?: boolean;
  /** Block grants queued for the start of the next player turn (Aegis Mixture). */
  pendingTurnStartBlock?: number;
  /** Cards drawn at the start of every player turn. Default 5, lowered to 4 by Ascension A9. */
  drawPerTurn?: number;
  /** Forgemaster's Sigil: next card played this combat gets +2 damage/block. */
  forgemasterSigilPending?: boolean;
}

// ─── POTIONS ─────────────────────────────────────────────────────────────────

export type PotionRarity = 'common' | 'uncommon' | 'rare';
export type PotionId = string;

/**
 * How a potion needs to be resolved by the UI before its onUse can run.
 *   - 'self'             → drink resolves immediately
 *   - 'enemy'            → player must click an enemy first
 *   - 'lumen-allocation' → if Channel cards are in hand, prompt distribution; otherwise self
 */
export type PotionTargeting = 'self' | 'enemy' | 'lumen-allocation';

export type PotionCategory =
  | 'Defense'
  | 'Tempo'
  | 'Damage'
  | 'Buff'
  | 'Debuff'
  | 'Utility'
  | 'Recovery'
  | 'Extreme';

export interface PotionContext {
  /** For target-required potions (Forgefire Flask). 'enemy' = main enemy, otherwise an enemy minion instanceId. */
  targetId?: string;
  /** For Lumen Infusion: { cardInstanceId → lumens to add } (must sum to 3). */
  lumenAllocation?: Record<string, number>;
}

export interface PotionDefinition {
  id: PotionId;
  name: string;
  rarity: PotionRarity;
  category: PotionCategory;
  /** One-sentence tooltip description. */
  effect: string;
  flavorText: string;
  targeting: PotionTargeting;
  /** Pure functional effect: returns the new combat state. */
  onUse: (state: CombatState, ctx?: PotionContext) => CombatState;
}

export interface PotionInstance {
  definitionId: PotionId;
}

export type RunModifierDuration = 'next_combat' | 'act';

export type RunModifierEffect =
  | { type: 'player_status'; status: StatusEffectType; stacks: number; duration?: number }
  | { type: 'enemy_status'; status: StatusEffectType; stacks: number; duration?: number }
  | { type: 'heat'; amount: number }
  | { type: 'block'; amount: number }
  | { type: 'energy'; amount: number }
  | { type: 'rift'; rift: Rift['type']; turns: number };

export interface RunModifierDefinition {
  id: string;
  name: string;
  description: string;
  duration: RunModifierDuration;
  effects: RunModifierEffect[];
}

export type DungeonEventEffect =
  | { type: 'gold'; amount: number }
  | { type: 'heal'; amount: number }
  | { type: 'damage'; amount: number }
  | { type: 'max_hp'; amount: number; heal?: boolean }
  | { type: 'add_card'; cardId: string }
  | { type: 'upgrade_card'; mode: 'first_unupgraded' }
  | { type: 'remove_card'; mode: 'first_starter' | 'first_card' }
  | { type: 'add_relic'; relicId: string }
  | { type: 'add_potion'; potionId: string }
  | { type: 'add_curse'; curseId: string }
  | { type: 'map_modifier'; modifierId: string }
  | { type: 'class_resource'; modifierId: string };

export interface DungeonEventChoiceDefinition {
  id: string;
  label: string;
  effectText: string;
  effects: DungeonEventEffect[];
  requiresFaction?: Faction;
}

export interface DungeonEventDefinition {
  id: string;
  name: string;
  act: 1 | 2 | 3;
  body: string;
  tone: 'mystery' | 'forge' | 'light' | 'hazard' | 'trade';
  choices: DungeonEventChoiceDefinition[];
}

// ─── RUN STATE ───────────────────────────────────────────────────────────────
export type RunPhase =
  | 'draft'
  | 'blessing'      // Act-start blessing screen (after draft for Act 1, after each boss for Acts 2 & 3)
  | 'map'
  | 'combat'
  | 'elite_combat'
  | 'boss_combat'
  | 'event'
  | 'rest'
  | 'shop'
  | 'reward'
  | 'run_end_win'
  | 'run_end_loss';

/**
 * Ascension level — STS-style difficulty escalation. Each level adds a
 * specific modifier on top of the previous ones; the 10 mods are defined
 * inside getAscensionMods (engine/ascension.ts).
 */
export type AscensionLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface RunState {
  phase: RunPhase;
  /** Original run seed. Used for deterministic content selection. */
  seed?: string;
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
  /** Difficulty tier for this run (0 = no modifiers, 10 = stacked modifiers). */
  ascensionLevel: AscensionLevel;
  combatState: CombatState | null;
  /** 3-slot potion inventory. Nulls are empty slots. Persists across combats. */
  potions: (PotionInstance | null)[];
  /** Event/blessing consequences waiting to affect future combat or the current act. */
  runModifiers?: RunModifierDefinition[];
  runStats: {
    totalCombats: number;
    elitesDefeated: number;
    bossesDefeated: number;
    cardsPlayed: number;
    totalDamageDealt: number;
  };
}
