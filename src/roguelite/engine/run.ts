import type {
  CardInstance,
  FactionId,
  RunState,
  StarterDeck,
} from '../types';
import { EMPTY_RUN_STATS, RUN_STATE_SCHEMA_VERSION } from '../types';
import { CARD_BY_ID, STARTER_DECKS } from '../cards';
import type { MetaStore, RunStore } from '../persistence';

// Minimum viable character baseline used by createNewRun. Design-doc
// spec (`meta-progression-design.md`) will refine per-faction HP pools
// and ascension modifiers; these are placeholder defaults that Phase 6
// (faction mechanics) will re-home.
const DEFAULT_STARTING_HP = 80;
const DEFAULT_MAX_ENERGY = 3;
const DEFAULT_POTION_SLOTS = 3;
const DEFAULT_STARTING_GOLD = 0;

export interface CreateRunOptions {
  factionId: FactionId;
  /** Optional override for the run seed (defaults to randomUUID). */
  seed?: string;
  /** Ascension tier 0..20 (default 0). */
  ascensionTier?: number;
}

/** Build a fresh RunState. Does not persist — the caller is responsible
 *  for passing the result to RunStore.save(). */
export function createNewRun(opts: CreateRunOptions): RunState {
  const starterDeck = STARTER_DECKS[opts.factionId];
  if (!starterDeck) {
    throw new Error(`createNewRun: no starter deck for factionId '${opts.factionId}'`);
  }

  const runId = newUUID();
  const seed = opts.seed ?? newUUID();
  const now = Date.now();

  return {
    runId,
    seed,
    schemaVersion: RUN_STATE_SCHEMA_VERSION,
    createdAt: now,
    lastSavedAt: now,

    factionId: opts.factionId,
    characterName: starterDeck.characterName,
    ascensionTier: opts.ascensionTier ?? 0,

    phase: 'character_select',
    currentAct: 1,
    currentStep: 0,
    currentNodeId: null,

    currentHealth: DEFAULT_STARTING_HP,
    maxHealth: DEFAULT_STARTING_HP,
    gold: DEFAULT_STARTING_GOLD,
    maxEnergy: DEFAULT_MAX_ENERGY,

    deck: materializeStarterDeck(starterDeck),
    relics: [],
    potionSlots: Array(DEFAULT_POTION_SLOTS).fill(null),
    potionSlotCount: DEFAULT_POTION_SLOTS,

    actMaps: [],                  // Phase 3 (map generator) fills this
    combatState: null,

    runStats: { ...EMPTY_RUN_STATS },
  };
}

/** Expand a StarterDeck (cardId + count) into a flat CardInstance[] with
 *  a unique instanceId per copy. */
export function materializeStarterDeck(deck: StarterDeck): CardInstance[] {
  const result: CardInstance[] = [];
  for (const entry of deck.cards) {
    const def = CARD_BY_ID.get(entry.cardId);
    if (!def) {
      throw new Error(
        `materializeStarterDeck: unknown cardId '${entry.cardId}' in starter deck for ${deck.factionId}`,
      );
    }
    for (let i = 0; i < entry.count; i++) {
      result.push({
        instanceId: newUUID(),
        cardId: def.id,
        evolutionProgress: { count: 0, evolved: false },
        statusEffects: [],
      });
    }
  }
  return result;
}

/** Save the run via the supplied RunStore. Thin wrapper kept here so
 *  callers in other subsystems don't have to import the persistence
 *  layer directly. */
export function saveCheckpoint(runs: RunStore, state: RunState): Promise<RunState> {
  return runs.save(state);
}

/** Resume the most-recent in-progress run, or return undefined if
 *  there isn't one. Honors constraint #3 — a mid-combat save can be
 *  resumed because RunState.combatState is fully serialized. */
export async function resumeLatestRun(runs: RunStore): Promise<RunState | undefined> {
  return runs.getActive();
}

/** Close out a run (abandoned or completed). Deletes the RunState from
 *  the runs DB and, if a MetaStore is provided, appends a summary entry
 *  to MetaProgression.recentRuns (trimmed to the most recent 50).
 *  Separate DB per constraint #4 — a runs-DB write failure cannot
 *  corrupt meta. */
export async function endRun(
  runs: RunStore,
  state: RunState,
  victory: boolean,
  meta?: MetaStore,
): Promise<void> {
  if (meta) {
    const m = await meta.load();
    m.recentRuns = [
      {
        runId: state.runId,
        factionId: state.factionId,
        ascensionTier: state.ascensionTier,
        completedAt: Date.now(),
        victory,
        actsCleared: computeActsCleared(state, victory),
        finalHealth: state.currentHealth,
        totalDamageDealt: state.runStats.totalDamageDealt,
        totalCombats: state.runStats.totalCombats,
      },
      ...m.recentRuns,
    ].slice(0, 50);
    await meta.save(m);
  }
  await runs.delete(state.runId);
}

function computeActsCleared(state: RunState, victory: boolean): 0 | 1 | 2 | 3 {
  if (victory) return 3;
  // Partial progress: count maps marked completed.
  const done = state.actMaps.filter((m) => m.completed).length;
  if (done >= 3) return 3;
  if (done === 2) return 2;
  if (done === 1) return 1;
  return 0;
}

// ─── uuid helper ───────────────────────────────────────────────────────────

function newUUID(): string {
  // Prefer the platform's crypto.randomUUID (browser + Node ≥14.17 + 19).
  const g: { crypto?: { randomUUID?: () => string } } = globalThis as never;
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  // Fallback — xorshift-y hex. Not cryptographically strong, but
  // this code path only runs on environments missing crypto.randomUUID
  // which in practice is Node < 14.17.
  const rand = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  return `${rand()}-${rand().slice(0, 4)}-${rand().slice(0, 4)}-${rand().slice(0, 4)}-${rand()}${rand().slice(0, 4)}`;
}
