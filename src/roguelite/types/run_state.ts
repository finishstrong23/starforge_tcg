import type { FactionId } from './card';
import type { CardInstance } from './card_instance';
import type { CombatState } from './combat_state';
import type { ActMap } from './map_state';

// Run-scoped overall phase. Combat is entered via `combat` / `elite_combat`
// / `boss_combat`; those all produce a CombatState on RunState and keep
// the RunPhase reflecting the room type for UI routing.
export type RunPhase =
  | 'character_select'
  | 'run_start'         // first-room entry animation (optional)
  | 'map'
  | 'combat'
  | 'elite_combat'
  | 'boss_combat'
  | 'rest'
  | 'shop'
  | 'anomaly'           // event / choice room
  | 'reward'            // post-combat reward screen
  | 'run_end_win'
  | 'run_end_loss';

export interface RunStats {
  totalCombats: number;
  elitesDefeated: number;
  bossesDefeated: number;
  cardsPlayed: number;
  cardsEvolved: number;
  totalDamageDealt: number;
  totalDamageTaken: number;
  goldEarned: number;
  relicsCollected: number;
  roomsEntered: number;
}

export const EMPTY_RUN_STATS: RunStats = {
  totalCombats: 0,
  elitesDefeated: 0,
  bossesDefeated: 0,
  cardsPlayed: 0,
  cardsEvolved: 0,
  totalDamageDealt: 0,
  totalDamageTaken: 0,
  goldEarned: 0,
  relicsCollected: 0,
  roomsEntered: 0,
};

// Complete run state. Everything needed to resume a run from scratch
// fits in this object — the only thing not serialized here is the
// MetaProgression (which lives in its own store, per constraint #4).
export interface RunState {
  // ─── identity & seed ────────────────────────────────────────────
  runId: string;               // uuid, primary key in IndexedDB
  seed: string;                // deterministic source for all RNG
  schemaVersion: number;       // bump on breaking shape changes
  createdAt: number;           // epoch ms
  lastSavedAt: number;         // epoch ms; updated on every checkpoint

  // ─── character ──────────────────────────────────────────────────
  factionId: FactionId;
  characterName: string;
  ascensionTier: number;       // 0..20

  // ─── progress ───────────────────────────────────────────────────
  phase: RunPhase;
  currentAct: 1 | 2 | 3;
  currentStep: number;         // 0..11 within act
  currentNodeId: string | null;

  // ─── player vitals (run-scoped) ─────────────────────────────────
  currentHealth: number;
  maxHealth: number;
  gold: number;
  maxEnergy: number;           // default 3 per STS-lineage

  // ─── collections ────────────────────────────────────────────────
  // Entire deck is per-instance. Cards mutate (evolve, gain augments,
  // get removed) but keep their instanceId throughout the run.
  deck: CardInstance[];
  relics: string[];            // relic ids
  potionSlots: Array<string | null>;   // 3 slots, id or null
  potionSlotCount: number;     // default 3

  // ─── map ────────────────────────────────────────────────────────
  actMaps: ActMap[];           // 3 entries: acts 1, 2, 3

  // ─── combat snapshot ────────────────────────────────────────────
  // Non-null iff phase is a combat phase. Cleared on combat_end.
  combatState: CombatState | null;

  // ─── stats ──────────────────────────────────────────────────────
  runStats: RunStats;
}

export const RUN_STATE_SCHEMA_VERSION = 1;
