/**
 * STARFORGE TCG — Roguelite Dungeon Run Types
 *
 * Core type definitions for the Slay-the-Spire-style roguelite mode.
 * Uses real STARFORGE TCG combat (minion-board via GameEngine),
 * not the dormant StS-style energy/block system.
 */

import { Race } from '../../types/Race';
import type { CardInstance } from '../../types/Card';
import type { KeywordInstance } from '../../types/Keywords';
import type { MapNode as BaseMapNode } from '../types';

// ─── Map ────────────────────────────────────────────────────

/** Re-export the base MapNode with our FORGE extension */
export type MapNodeType = 'COMBAT' | 'ELITE' | 'BOSS' | 'REST' | 'SHOP' | 'TREASURE' | 'FORGE';

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
  | 'HERO_SELECT'
  | 'MAP'
  | 'BATTLE'
  | 'REWARD'
  | 'SHOP'
  | 'REST'
  | 'FORGE'
  | 'TREASURE'
  | 'ACT_TRANSITION'
  | 'VICTORY'
  | 'DEATH';

export interface DungeonRunSave {
  /** Schema version for migration */
  version: 1;
  /** Seed for deterministic map generation and RNG */
  seed: string;
  /** Player's chosen race */
  race: Race;
  /** Player's chosen hero ID (from HeroDefinitions) */
  heroId: string;
  /** Serialized run deck — rehydrated to CardInstance[] at battle time */
  deck: SerializedRunCard[];
  /** Collected relic IDs */
  relics: string[];
  /** Current gold */
  gold: number;
  /** Current hero HP (persists across battles) */
  hp: number;
  /** Maximum hero HP */
  maxHp: number;
  /** Procedural map for current act */
  map: MapNode[][];
  /** Current node position (null = haven't entered map yet) */
  currentNodeId: string | null;
  /** Current act (1-3) */
  act: 1 | 2 | 3;
  /** Current run phase */
  phase: RunPhase;
  /** Pending reward choices after a battle */
  pendingRewards?: RewardOffer;
  /** Record of all battles fought this run */
  battleLog: BattleRecord[];
  /** Timestamp when run started */
  startedAt: number;
}

// ─── Card Serialization ────────────────────────────────────

export interface SerializedRunCard {
  /** Stable ID for this card within the run (persists across battles) */
  runCardId: string;
  /** Card definition ID in the CardDatabase */
  definitionId: string;
  /** Ordered list of upgrades applied to this card */
  upgrades: AppliedUpgrade[];
  /** Custom display name (from Starforge Stamp upgrade) */
  customName?: string;
}

export interface AppliedUpgrade {
  /** References an UpgradeTemplate.id from the upgrade catalog */
  templateId: string;
  /** Which map node this upgrade was applied at */
  appliedAtNode: string;
}

// ─── Battle Records ────────────────────────────────────────

export interface BattleRecord {
  nodeId: string;
  enemyRace: Race;
  won: boolean;
  turns: number;
  hpBefore: number;
  hpAfter: number;
}

// ─── Rewards ───────────────────────────────────────────────

export interface RewardOffer {
  /** Card definition IDs that can be added to deck */
  cardOffers: string[];
  /** Upgrade templates available to apply */
  upgradeOffers: string[];
  /** Relic IDs available to pick */
  relicOffers: string[];
  /** Gold earned from this node */
  goldReward: number;
  /** Whether card removal is offered */
  canRemoveCard: boolean;
  /** Node type that generated this reward (for UI theming) */
  sourceNodeType: MapNodeType;
}

// ─── Upgrades ──────────────────────────────────────────────

export type UpgradeTier = 'COMMON' | 'RARE' | 'LEGENDARY';

export type UpgradeAppliesTo = 'MINION' | 'SPELL' | 'ANY';

export interface UpgradeTemplate {
  id: string;
  name: string;
  description: string;
  tier: UpgradeTier;
  icon: string;
  appliesTo: UpgradeAppliesTo;
  /** Mutates a CardInstance in-place to apply the upgrade */
  apply: (instance: CardInstance) => void;
}

// ─── Relics ────────────────────────────────────────────────

export type RelicTier = 'COMMON' | 'RARE' | 'LEGENDARY';

export interface RelicDefinition {
  id: string;
  name: string;
  description: string;
  flavorText: string;
  tier: RelicTier;
  icon: string;
}

// ─── Enemy Encounters ──────────────────────────────────────

export interface EncounterConfig {
  /** Enemy race for deck selection */
  race: Race;
  /** Enemy hero ID */
  heroId: string;
  /** Enemy hero starting HP */
  heroHp: number;
  /** AI difficulty level */
  difficulty: 'easy' | 'medium' | 'hard';
  /** Custom deck card IDs (if different from starter) */
  deckCardIds?: string[];
  /** Display name for this encounter */
  name: string;
  /** Flavor intro text */
  introText?: string;
}

// ─── Node Distribution Config ──────────────────────────────

export interface ActConfig {
  act: 1 | 2 | 3;
  /** Weights for node types in rows 1-8 (row 0 = entry, row 9 = boss) */
  nodeWeights: Record<Exclude<MapNodeType, 'BOSS'>, number>;
  /** Boss encounter for this act */
  bossEncounterId: string;
}

// ─── Persistence ───────────────────────────────────────────

export interface RogueliteSaveData {
  /** Active run (null if no run in progress) */
  active: DungeonRunSave | null;
  /** Completed run history (capped at 50) */
  history: CompletedRun[];
}

export interface CompletedRun {
  seed: string;
  race: Race;
  heroId: string;
  result: 'VICTORY' | 'DEATH';
  act: 1 | 2 | 3;
  /** Total battles fought */
  battlesWon: number;
  /** Total relics collected */
  relicsCollected: number;
  /** Total upgrades applied */
  upgradesApplied: number;
  /** Duration in milliseconds */
  duration: number;
  /** Timestamp */
  completedAt: number;
}

// ─── Shop ──────────────────────────────────────────────────

export type ShopItemType = 'card' | 'upgrade' | 'relic' | 'removeCard';

export interface ShopItem {
  type: ShopItemType;
  /** Card definition ID (for 'card' type) */
  cardId?: string;
  /** Upgrade template ID (for 'upgrade' type) */
  upgradeId?: string;
  /** Relic definition ID (for 'relic' type) */
  relicId?: string;
  /** Gold cost */
  cost: number;
  /** Whether this item has been purchased */
  sold: boolean;
}
