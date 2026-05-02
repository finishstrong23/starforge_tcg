/**
 * STARFORGE TCG — Dungeon Run Mode Types
 * Slay the Spire-style roguelite type definitions
 */

// ─── Factions ───────────────────────────────────────────────
export type DungeonFaction = 'Cogsmiths' | 'Pyroclast' | 'Luminar' | 'PhantomCorsairs';

export const ALL_FACTIONS: DungeonFaction[] = ['Cogsmiths', 'Pyroclast', 'Luminar', 'PhantomCorsairs'];

export const FACTION_COLORS: Record<DungeonFaction, { primary: string; secondary: string; bg: string }> = {
  Cogsmiths: { primary: '#d4760a', secondary: '#8b5e34', bg: '#2a1f14' },
  Pyroclast: { primary: '#e63946', secondary: '#ff6b35', bg: '#2a1414' },
  Luminar: { primary: '#ffd700', secondary: '#fffacd', bg: '#2a2714' },
  PhantomCorsairs: { primary: '#7b2d8e', secondary: '#00cec9', bg: '#1a142a' },
};

// ─── Cards ──────────────────────────────────────────────────
export interface DungeonCardDefinition {
  id: string;
  name: string;
  faction: DungeonFaction;
  type: 'Minion' | 'Spell' | 'Structure';
  cost: number;
  attack?: number;
  health?: number;
  keywords: string[];
  cardText: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  tribe?: string;
}

export interface RunCard extends DungeonCardDefinition {
  instanceId: string;
  upgraded: boolean;
  upgradedCost?: number;
  upgradedText?: string;
  upgradedKeywords?: string[];
}

// ─── Enemies ────────────────────────────────────────────────
export type IntentType =
  | 'ATTACK'
  | 'MULTI_ATTACK'
  | 'AOE_ATTACK'
  | 'DEFEND'
  | 'BUFF'
  | 'DEBUFF'
  | 'ATTACK_BUFF'
  | 'ATTACK_DEBUFF'
  | 'SPECIAL'
  | 'UNKNOWN';

export interface EnemyIntent {
  type: IntentType;
  damage?: number;
  hits?: number;
  block?: number;
  buffName?: string;
  debuffName?: string;
  description: string;
}

export interface AIPattern {
  name: string;
  getIntent: (turn: number, enemy: DungeonEnemy) => EnemyIntent;
}

export interface DungeonEnemy {
  id: string;
  name: string;
  maxHealth: number;
  currentHealth: number;
  block: number;
  intent: EnemyIntent;
  statusEffects: StatusEffect[];
  actTier: 1 | 2 | 3;
  isElite: boolean;
  isBoss: boolean;
  aiPattern: AIPattern;
}

// ─── Status Effects ─────────────────────────────────────────
export type StatusType =
  | 'STRENGTH'
  | 'DEXTERITY'
  | 'VULNERABLE'
  | 'WEAK'
  | 'BURN'
  | 'ILLUMINATE_STACKS'
  | 'IMMOLATE_STACKS'
  | 'BARRIER'
  | 'DRAIN'
  | 'PHASE'
  | 'GUARDIAN'
  | 'CLOAK'
  | 'SWIFT'
  | 'BLITZ'
  | 'DOUBLE_STRIKE'
  | 'ENRAGE'
  | 'REGEN';

export interface StatusEffect {
  type: StatusType;
  stacks: number;
  duration?: number;
}

// ─── Board Minions ──────────────────────────────────────────
export interface BoardMinion {
  instanceId: string;
  card: RunCard;
  currentAttack: number;
  currentHealth: number;
  maxHealth: number;
  hasAttacked: boolean;
  statusEffects: StatusEffect[];
  summonedThisTurn: boolean;
}

// ─── Relics ─────────────────────────────────────────────────
export type RelicTrigger =
  | 'ON_COMBAT_START'
  | 'ON_CARD_PLAYED'
  | 'ON_KILL'
  | 'ON_HERO_HEAL'
  | 'ON_TURN_START'
  | 'ON_MINION_DEATH'
  | 'ON_HERO_DEATH'
  | 'PASSIVE';

export interface RelicEffect {
  type: string;
  value: number;
  condition?: string;
}

export interface DungeonRelic {
  id: string;
  name: string;
  description: string;
  flavorText: string;
  trigger: RelicTrigger;
  effect: RelicEffect;
  isBossRelic?: boolean;
}

// ─── Map ────────────────────────────────────────────────────
export type MapNodeType = 'COMBAT' | 'ELITE' | 'BOSS' | 'REST' | 'SHOP' | 'TREASURE';

export interface MapNode {
  id: string;
  type: MapNodeType;
  act: number;
  row: number;
  col: number;
  connections: string[];
  completed: boolean;
  accessible: boolean;
}

// ─── Run State ──────────────────────────────────────────────
export type RunPhase =
  | 'DRAFT'
  | 'MAP'
  | 'COMBAT'
  | 'SHOP'
  | 'REST'
  | 'REWARD'
  | 'VICTORY'
  | 'DEATH'
  | 'ACT_TRANSITION';

export type CombatPhase =
  | 'COMBAT_START'
  | 'PLAYER_TURN_START'
  | 'PLAYER_ACTING'
  | 'PLAYER_TURN_END'
  | 'ENEMY_TURN_START'
  | 'ENEMY_TURN_END'
  | 'COMBAT_VICTORY'
  | 'RUN_DEATH';

export interface RewardState {
  cardOptions: DungeonCardDefinition[];
  relicOptions: DungeonRelic[];
  gold: number;
  picked: boolean;
}

export interface RunStats {
  turnsPlayed: number;
  damageDealt: number;
  damageTaken: number;
  cardsCollected: number;
  relicsCollected: number;
  enemiesKilled: number;
  floorReached: number;
}

export interface RunState {
  phase: RunPhase;
  act: 1 | 2 | 3;
  deck: RunCard[];
  hand: RunCard[];
  drawPile: RunCard[];
  discardPile: RunCard[];
  exhaustPile: RunCard[];
  energy: number;
  maxEnergy: number;
  heroHealth: number;
  maxHeroHealth: number;
  heroBlock: number;
  heroStatusEffects: StatusEffect[];
  board: BoardMinion[];
  currentEnemy: DungeonEnemy | null;
  currentEnemyGroup: DungeonEnemy[];
  map: MapNode[][];
  currentNodeId: string;
  relics: DungeonRelic[];
  gold: number;
  turn: number;
  combatPhase: CombatPhase;
  runSeed: string;
  combatLog: string[];
  stats: RunStats;
  reward: RewardState | null;

  // Draft state
  draftRound: number;
  draftFaction: DungeonFaction | null;
  draftOptions: DungeonCardDefinition[];
  draftRelicOptions: DungeonRelic[];

  // Relic tracking
  cardsPlayedThisTurn: number;
  hasHealedThisTurn: boolean;
  hasHealedThisCombat: boolean;
  phoenixFeatherUsed: boolean;

  // Combat selection
  selectedMinionId: string | null;
  selectedCardId: string | null;

  // Floating combat text
  floatingTexts: FloatingText[];
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  createdAt: number;
}

// ─── Shop ───────────────────────────────────────────────────
export interface ShopItem {
  type: 'card' | 'relic' | 'removeCard' | 'upgradeCard';
  card?: DungeonCardDefinition;
  relic?: DungeonRelic;
  cost: number;
  sold: boolean;
}
