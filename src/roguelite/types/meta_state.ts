import type { FactionId } from './card';

// Meta progression — persists across runs, lives in a separate
// IndexedDB database from RunState per constraint #4: "A corrupt run
// must never corrupt a player's mastery level or unlocks."

export interface FactionMastery {
  factionId: FactionId;
  xp: number;
  level: number;              // 0..N (design doc defines cap)
  runsAttempted: number;
  runsCompleted: number;      // full Act-3 boss kills
  highestAscension: number;   // 0..20
}

export interface AscensionProgress {
  // Per-faction ascension unlocks. Defeating Ascension N unlocks
  // Ascension N+1 for that faction.
  byFaction: Partial<Record<FactionId, number>>;
}

export interface CollectionUnlocks {
  // Card ids the player has unlocked (starter cards are unlocked by
  // default; non-starter cards unlock via mastery level-ups).
  unlockedCardIds: string[];
  // Relic ids unlocked and browseable in the Relic Vault.
  unlockedRelicIds: string[];
  // Starter-deck variants unlocked per faction (Phase 11).
  unlockedStarterVariants: Partial<Record<FactionId, string[]>>;
}

export interface RelicTokens {
  // Currency earned from runs; spent at character select to influence
  // the first shop roll. Design spec: `meta-progression-design.md`.
  count: number;
}

export interface MetaProgression {
  schemaVersion: number;
  createdAt: number;
  lastUpdatedAt: number;

  masteries: FactionMastery[];
  ascension: AscensionProgress;
  collection: CollectionUnlocks;
  relicTokens: RelicTokens;

  // Raw run history — last 50 runs for stats display. Trimmed on write.
  recentRuns: RunHistoryEntry[];
}

export interface RunHistoryEntry {
  runId: string;
  factionId: FactionId;
  ascensionTier: number;
  completedAt: number;
  victory: boolean;
  actsCleared: 0 | 1 | 2 | 3;
  finalHealth: number;
  totalDamageDealt: number;
  totalCombats: number;
}

export const META_SCHEMA_VERSION = 1;

export function emptyMeta(): MetaProgression {
  const now = Date.now();
  return {
    schemaVersion: META_SCHEMA_VERSION,
    createdAt: now,
    lastUpdatedAt: now,
    masteries: [],
    ascension: { byFaction: {} },
    collection: {
      unlockedCardIds: [],
      unlockedRelicIds: [],
      unlockedStarterVariants: {},
    },
    relicTokens: { count: 0 },
    recentRuns: [],
  };
}
