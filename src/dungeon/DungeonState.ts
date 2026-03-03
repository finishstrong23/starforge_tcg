/**
 * STARFORGE TCG - Dungeon Run State & Persistence
 *
 * Manages roguelike dungeon run progress with localStorage persistence.
 * Tracks: current run, boss progress, deck, relics, run history.
 */

import { Race } from '../types/Race';
import type { DungeonBoss, DungeonRelic, CardBundle } from './DungeonData';
import {
  generateBossRoster,
  getCardBundleChoices,
  getRelicChoices,
  getDungeonStarterDeck,
} from './DungeonData';

const STORAGE_KEY = 'starforge_dungeon';
const HISTORY_KEY = 'starforge_dungeon_history';

/**
 * Phase of the dungeon run between fights
 */
export type DungeonPhase =
  | 'choosing_faction'
  | 'pre_boss'
  | 'fighting'
  | 'choose_cards'
  | 'choose_relic'
  | 'remove_cards'
  | 'run_over'
  | 'run_victory';

/**
 * The full dungeon run save state
 */
export interface DungeonRunSave {
  /** Chosen faction for this run */
  race: Race;
  /** Current deck (card IDs) */
  deck: string[];
  /** Boss roster for this run (8 bosses) */
  bossRoster: DungeonBoss[];
  /** Current boss index (0-7) */
  currentBossIndex: number;
  /** Bosses defeated */
  bossesDefeated: number;
  /** Relics collected */
  relics: DungeonRelic[];
  /** Card bundles already chosen (to avoid repeats) */
  chosenBundleIds: string[];
  /** Current run phase */
  phase: DungeonPhase;
  /** Current HP (persists between fights) */
  currentHP: number;
  /** Max HP */
  maxHP: number;
  /** Run seed for deterministic randomness */
  seed: number;
  /** Timestamp of run start */
  startedAt: number;
  /** Whether the run is still active */
  isActive: boolean;
  /** Cards offered for removal (after boss 4) */
  removalOffered: boolean;
}

/**
 * A completed run record for the leaderboard
 */
export interface DungeonRunRecord {
  race: Race;
  bossesDefeated: number;
  won: boolean;
  relics: string[];
  finalDeckSize: number;
  duration: number;
  timestamp: number;
}

// ─── RUN CREATION ───────────────────────────────────────────────────────────

/**
 * Start a new dungeon run with a chosen faction
 */
export function createDungeonRun(race: Race): DungeonRunSave {
  const seed = Date.now();
  return {
    race,
    deck: getDungeonStarterDeck(race),
    bossRoster: generateBossRoster(seed),
    currentBossIndex: 0,
    bossesDefeated: 0,
    relics: [],
    chosenBundleIds: [],
    phase: 'pre_boss',
    currentHP: 30,
    maxHP: 30,
    seed,
    startedAt: seed,
    isActive: true,
    removalOffered: false,
  };
}

// ─── BOSS PROGRESSION ───────────────────────────────────────────────────────

/**
 * Get the current boss to fight
 */
export function getCurrentBoss(save: DungeonRunSave): DungeonBoss | null {
  if (save.currentBossIndex >= save.bossRoster.length) return null;
  return save.bossRoster[save.currentBossIndex];
}

/**
 * Record a boss fight result. Returns the next phase.
 */
export function recordBossFight(
  save: DungeonRunSave,
  won: boolean,
  playerHPRemaining: number,
): DungeonRunSave {
  const updated = { ...save };

  if (!won) {
    updated.phase = 'run_over';
    updated.isActive = false;
    updated.currentHP = 0;
    return updated;
  }

  updated.bossesDefeated++;
  updated.currentHP = playerHPRemaining;
  updated.currentBossIndex++;

  // Check if run is complete (all 8 bosses beaten)
  if (updated.currentBossIndex >= updated.bossRoster.length) {
    updated.phase = 'run_victory';
    updated.isActive = false;
    return updated;
  }

  // Determine next phase based on boss defeated
  const bossNum = updated.bossesDefeated;

  // After bosses 2, 5, 7 → choose a relic
  if (bossNum === 2 || bossNum === 5 || bossNum === 7) {
    updated.phase = 'choose_relic';
  }
  // After boss 4 → remove cards
  else if (bossNum === 4 && !updated.removalOffered) {
    updated.phase = 'remove_cards';
    updated.removalOffered = true;
  }
  // Otherwise → choose card bundle
  else {
    updated.phase = 'choose_cards';
  }

  return updated;
}

/**
 * Choose a card bundle to add to deck
 */
export function chooseCardBundle(save: DungeonRunSave, bundle: CardBundle): DungeonRunSave {
  const updated = { ...save };
  updated.deck = [...updated.deck, ...bundle.cardIds];
  updated.chosenBundleIds = [...updated.chosenBundleIds, bundle.id];
  updated.phase = 'pre_boss';
  return updated;
}

/**
 * Choose a relic
 */
export function chooseRelic(save: DungeonRunSave, relic: DungeonRelic): DungeonRunSave {
  const updated = { ...save };
  updated.relics = [...updated.relics, relic];

  // After relic, also offer cards (except if it's the last relic choice before boss 8)
  if (updated.currentBossIndex < updated.bossRoster.length) {
    updated.phase = 'choose_cards';
  } else {
    updated.phase = 'pre_boss';
  }
  return updated;
}

/**
 * Remove cards from deck (after boss 4)
 */
export function removeCards(save: DungeonRunSave, cardIdsToRemove: string[]): DungeonRunSave {
  const updated = { ...save };
  const remaining = [...updated.deck];

  for (const id of cardIdsToRemove) {
    const idx = remaining.indexOf(id);
    if (idx >= 0) remaining.splice(idx, 1);
  }

  updated.deck = remaining;
  updated.phase = 'choose_cards';
  return updated;
}

/**
 * Skip card removal
 */
export function skipRemoval(save: DungeonRunSave): DungeonRunSave {
  return { ...save, phase: 'choose_cards' };
}

/**
 * Get card bundle choices for the current state
 */
export function getBundleChoices(save: DungeonRunSave): CardBundle[] {
  return getCardBundleChoices(save.chosenBundleIds, save.seed + save.bossesDefeated * 1000);
}

/**
 * Get relic choices for the current state
 */
export function getRelicOptions(save: DungeonRunSave): DungeonRelic[] {
  const excludeIds = save.relics.map(r => r.id);
  return getRelicChoices(excludeIds, save.seed + save.bossesDefeated * 2000);
}

// ─── PERSISTENCE ────────────────────────────────────────────────────────────

/**
 * Save dungeon run to localStorage
 */
export function saveDungeonRun(save: DungeonRunSave): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    console.warn('Failed to save dungeon run');
  }
}

/**
 * Load dungeon run from localStorage
 */
export function loadDungeonRun(): DungeonRunSave | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DungeonRunSave;
    if (!parsed.race || !parsed.bossRoster) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Delete dungeon run save
 */
export function deleteDungeonRun(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// ─── RUN HISTORY ────────────────────────────────────────────────────────────

/**
 * Save a completed run to history
 */
export function saveRunToHistory(save: DungeonRunSave): void {
  const record: DungeonRunRecord = {
    race: save.race,
    bossesDefeated: save.bossesDefeated,
    won: save.phase === 'run_victory',
    relics: save.relics.map(r => r.name),
    finalDeckSize: save.deck.length,
    duration: Date.now() - save.startedAt,
    timestamp: Date.now(),
  };

  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const history: DungeonRunRecord[] = raw ? JSON.parse(raw) : [];
    history.unshift(record);
    // Keep last 50 records
    if (history.length > 50) history.length = 50;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    console.warn('Failed to save dungeon run history');
  }
}

/**
 * Load run history
 */
export function loadRunHistory(): DungeonRunRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Get best run for a specific race
 */
export function getBestRun(race: Race): DungeonRunRecord | null {
  const history = loadRunHistory();
  const raceRuns = history.filter(r => r.race === race);
  if (raceRuns.length === 0) return null;
  return raceRuns.reduce((best, run) =>
    run.bossesDefeated > best.bossesDefeated ? run : best
  );
}

/**
 * Check if any run has completed all 8 bosses with this race
 */
export function hasCompletedWithRace(race: Race): boolean {
  return loadRunHistory().some(r => r.race === race && r.won);
}
