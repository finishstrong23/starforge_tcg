import type { CardInstance } from './card_instance';
import type { HeatState, RiftInstance } from './faction_mechanics';
import type { StatusEffect } from './status_effect';

// Combat-scoped enemy state. Phase 4 (combat engine) fills in intent
// resolution; Phase 2 only needs the shape to be serializable.
export interface EnemyCombatState {
  enemyInstanceId: string;      // unique per enemy in this combat
  enemyDefinitionId: string;    // reference to the pool definition
  currentHealth: number;
  maxHealth: number;
  currentBlock: number;
  statusEffects: StatusEffect[];
  // Current intent telegraph. Phase 2 stores it raw; Phase 4 defines
  // the proper intent resolver. `null` means "intent not yet rolled."
  currentIntent: null | {
    type: string;               // 'attack' | 'defend' | 'buff' | 'debuff' | 'summon' | 'special'
    value?: number;
    description: string;
  };
  // Rolling intent index so predictable rotations stay stable across
  // save/load. Seeded rolls advance this on resume.
  intentIndex: number;
  // Reactive-Ecology trait refs (Phase 5 populates). Phase 2 stores
  // the id list; effects are applied by the trait handler registry.
  traitIds: string[];
}

export type CombatPhase =
  | 'initializing'
  | 'player_turn'
  | 'enemy_turn'
  | 'ended_win'
  | 'ended_loss';

// Full mid-combat snapshot. Persisted after every discrete action so a
// mid-combat browser close can resume seamlessly (non-negotiable
// constraint #3 from the master build prompt).
export interface CombatState {
  combatId: string;             // uuid for this combat instance
  phase: CombatPhase;
  turnNumber: number;           // 1-based

  // Player energy for the current turn
  energy: number;
  maxEnergyThisTurn: number;    // may diverge from RunState.maxEnergy (buffs)

  // Zones — every entry is a per-instance CardInstance snapshot
  hand: CardInstance[];
  drawPile: CardInstance[];
  discardPile: CardInstance[];
  exhaustPile: CardInstance[];

  // Player-side statuses (Block, Vulnerable, Weak, Strength, Dexterity,
  // Retain markers, etc.). Resolution logic is Phase 4; Phase 2 just
  // needs them serializable.
  playerStatuses: StatusEffect[];

  // Faction-specific combat-scoped state
  heatState?: HeatState;        // Pyroclast only
  rifts: RiftInstance[];        // Warp Riders only; empty array otherwise

  // Enemies in this combat (1-4 typically)
  enemies: EnemyCombatState[];

  // Seeded RNG state captured at the moment of save. Resuming the
  // combat advances from exactly this state — deterministic replay.
  rngState: string;             // SplitMix64 state serialized as hex

  // Turn action log — keeps the last N actions for Chrono Break
  // (Warp Riders) and for UI combat log. Phase 4 prunes old turns.
  actionLog: CombatActionLogEntry[];
}

export interface CombatActionLogEntry {
  turn: number;
  sequence: number;             // order within turn
  action: 'play_card' | 'attack' | 'potion' | 'end_turn' | 'enemy_action' | 'triggered';
  cardInstanceId?: string;
  targetId?: string;
  summary: string;              // human-readable for log UI
}
