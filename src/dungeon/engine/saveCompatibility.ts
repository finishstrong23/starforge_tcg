import type {
  AscensionLevel,
  CardDefinition,
  CardInstance,
  Faction,
  RunPhase,
  RunState,
} from '../types';
import { DUNGEON_BUILD_VERSION } from './buildInfo';

export const DUNGEON_SAVE_STORAGE_KEY = 'sf:dungeon:save:v1';
export const DUNGEON_SAVE_SCHEMA_VERSION = 2;

export interface DungeonSaveContextState {
  run: RunState | null;
  draftFaction: Faction | null;
  draftRound: number;
  draftOptions: CardDefinition[];
  draftPicks: CardInstance[];
  seed: string;
}

export interface DungeonSaveSnapshot extends DungeonSaveContextState {
  schemaVersion: typeof DUNGEON_SAVE_SCHEMA_VERSION;
  buildVersion: string;
  lastSavedAt: number;
}

const ENDED_PHASES: RunPhase[] = ['run_end_win', 'run_end_loss'];
const FACTIONS: Faction[] = ['Cogsmiths', 'Pyroclast', 'Luminar', 'WarpRiders'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFaction(value: unknown): value is Faction {
  return typeof value === 'string' && FACTIONS.includes(value as Faction);
}

function asAscensionLevel(value: unknown): AscensionLevel {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 10
    ? value as AscensionLevel
    : 0;
}

function asAct(value: unknown): 1 | 2 | 3 {
  return value === 1 || value === 2 || value === 3 ? value : 1;
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? value as T[] : [];
}

function normalizeRun(rawRun: unknown, now: number): RunState | null {
  if (!isRecord(rawRun)) return null;
  const phase = typeof rawRun.phase === 'string' ? rawRun.phase as RunPhase : null;
  if (!phase || ENDED_PHASES.includes(phase)) return null;

  const rawStats = isRecord(rawRun.runStats) ? rawRun.runStats : {};
  const rawPotions = asArray(rawRun.potions);
  const potions = [rawPotions[0] ?? null, rawPotions[1] ?? null, rawPotions[2] ?? null] as RunState['potions'];

  return {
    ...rawRun,
    phase,
    seed: typeof rawRun.seed === 'string' && rawRun.seed.length > 0 ? rawRun.seed : `legacy-${now}`,
    currentAct: asAct(rawRun.currentAct),
    actMaps: asArray(rawRun.actMaps),
    deck: asArray(rawRun.deck),
    hand: asArray(rawRun.hand),
    relics: asArray(rawRun.relics),
    gold: typeof rawRun.gold === 'number' ? rawRun.gold : 0,
    maxHealth: typeof rawRun.maxHealth === 'number' ? rawRun.maxHealth : 72,
    currentHealth: typeof rawRun.currentHealth === 'number' ? rawRun.currentHealth : 72,
    energy: typeof rawRun.energy === 'number' ? rawRun.energy : 3,
    maxEnergy: typeof rawRun.maxEnergy === 'number' ? rawRun.maxEnergy : 3,
    ascensionLevel: asAscensionLevel(rawRun.ascensionLevel),
    combatState: isRecord(rawRun.combatState)
      ? rawRun.combatState as unknown as RunState['combatState']
      : null,
    potions,
    runModifiers: asArray(rawRun.runModifiers),
    runStats: {
      totalCombats: typeof rawStats.totalCombats === 'number' ? rawStats.totalCombats : 0,
      elitesDefeated: typeof rawStats.elitesDefeated === 'number' ? rawStats.elitesDefeated : 0,
      bossesDefeated: typeof rawStats.bossesDefeated === 'number' ? rawStats.bossesDefeated : 0,
      cardsPlayed: typeof rawStats.cardsPlayed === 'number' ? rawStats.cardsPlayed : 0,
      totalDamageDealt: typeof rawStats.totalDamageDealt === 'number' ? rawStats.totalDamageDealt : 0,
    },
  } as RunState;
}

export function createDungeonSaveSnapshot(
  state: DungeonSaveContextState,
  now = Date.now(),
): DungeonSaveSnapshot | null {
  if (!state.run) return null;
  return {
    schemaVersion: DUNGEON_SAVE_SCHEMA_VERSION,
    buildVersion: DUNGEON_BUILD_VERSION,
    lastSavedAt: now,
    run: state.run,
    draftFaction: state.draftFaction,
    draftRound: state.draftRound,
    draftOptions: state.draftOptions,
    draftPicks: state.draftPicks,
    seed: state.seed,
  };
}

export function normalizeDungeonSaveSnapshot(
  value: unknown,
  now = Date.now(),
): DungeonSaveSnapshot | null {
  if (!isRecord(value)) return null;

  const run = normalizeRun(value.run, now);
  if (!run) return null;

  return {
    schemaVersion: DUNGEON_SAVE_SCHEMA_VERSION,
    buildVersion: typeof value.buildVersion === 'string' ? value.buildVersion : 'legacy',
    lastSavedAt: typeof value.lastSavedAt === 'number' ? value.lastSavedAt : now,
    run,
    draftFaction: isFaction(value.draftFaction) ? value.draftFaction : null,
    draftRound: typeof value.draftRound === 'number' ? value.draftRound : 1,
    draftOptions: asArray<CardDefinition>(value.draftOptions),
    draftPicks: asArray<CardInstance>(value.draftPicks),
    seed: typeof value.seed === 'string' ? value.seed : run.seed ?? '',
  };
}

export function getContextStateFromSave(snapshot: DungeonSaveSnapshot): DungeonSaveContextState {
  return {
    run: snapshot.run,
    draftFaction: snapshot.draftFaction,
    draftRound: snapshot.draftRound,
    draftOptions: snapshot.draftOptions,
    draftPicks: snapshot.draftPicks,
    seed: snapshot.seed,
  };
}

export function loadDungeonSaveSnapshot(now = Date.now()): DungeonSaveSnapshot | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DUNGEON_SAVE_STORAGE_KEY);
    if (!raw) return null;
    return normalizeDungeonSaveSnapshot(JSON.parse(raw), now);
  } catch {
    return null;
  }
}

export function saveDungeonSaveSnapshot(snapshot: DungeonSaveSnapshot | null): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (snapshot) {
      localStorage.setItem(DUNGEON_SAVE_STORAGE_KEY, JSON.stringify(snapshot));
    } else {
      localStorage.removeItem(DUNGEON_SAVE_STORAGE_KEY);
    }
  } catch {
    // Save persistence is best-effort; storage failure must not break gameplay.
  }
}

export function clearDungeonSaveSnapshot(): void {
  saveDungeonSaveSnapshot(null);
}
