import type { Faction, RunState } from '../types';
import { DUNGEON_BUILD_CHANNEL, DUNGEON_BUILD_NAME, DUNGEON_BUILD_VERSION } from './buildInfo';
import { loadDungeonMeta } from './metaProgression';
import { getEvents, type TelemetryEvent } from './telemetry';

export const DUNGEON_FEEDBACK_SCHEMA_VERSION = 1;

export const DUNGEON_FEEDBACK_INCLUDED_FIELDS = [
  'build version',
  'seed',
  'faction',
  'ascension',
  'act and phase',
  'HP and gold',
  'deck, relic, potion, and modifier ids',
  'meta stats',
  'recent telemetry events',
] as const;

export const DUNGEON_FEEDBACK_EXCLUDED_FIELDS = [
  'name',
  'email',
  'account id',
  'payment data',
  'full localStorage dump',
] as const;

export interface DungeonFeedbackRunSummary {
  seed?: string;
  faction: Faction | 'Unknown';
  phase: RunState['phase'];
  ascensionLevel: number;
  currentAct: 1 | 2 | 3;
  health: { current: number; max: number };
  gold: number;
  deck: Array<{ id: string; name: string; upgraded: boolean }>;
  relics: Array<{ id: string; name: string }>;
  potions: string[];
  runModifiers: string[];
  stats: RunState['runStats'];
}

export interface DungeonFeedbackBundle {
  schemaVersion: typeof DUNGEON_FEEDBACK_SCHEMA_VERSION;
  createdAt: number;
  build: {
    name: string;
    version: string;
    channel: string;
  };
  client: {
    userAgent?: string;
    path?: string;
  };
  run: DungeonFeedbackRunSummary | null;
  meta: {
    totalRuns: number;
    victories: number;
    bestActReached: 1 | 2 | 3;
    unlockedBadges: string[];
  };
  telemetry: {
    totalEvents: number;
    recentEvents: TelemetryEvent[];
  };
}

function getClientInfo(): DungeonFeedbackBundle['client'] {
  if (typeof window === 'undefined') return {};
  return {
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    path: `${window.location.origin}${window.location.pathname}`,
  };
}

export function summarizeRunForFeedback(
  run: RunState,
  faction: Faction | null,
): DungeonFeedbackRunSummary {
  return {
    seed: run.seed,
    faction: faction ?? 'Unknown',
    phase: run.phase,
    ascensionLevel: run.ascensionLevel,
    currentAct: run.currentAct,
    health: { current: run.currentHealth, max: run.maxHealth },
    gold: run.gold,
    deck: run.deck.map((card) => ({
      id: card.id,
      name: card.name,
      upgraded: Boolean(card.upgraded),
    })),
    relics: run.relics.map((relic) => ({ id: relic.id, name: relic.name })),
    potions: run.potions.flatMap((potion) => potion?.definitionId ?? []),
    runModifiers: (run.runModifiers ?? []).map((modifier) => modifier.id),
    stats: { ...run.runStats },
  };
}

export function createDungeonFeedbackBundle(
  run: RunState | null,
  faction: Faction | null,
  now = Date.now(),
): DungeonFeedbackBundle {
  const meta = loadDungeonMeta();
  const events = getEvents();

  return {
    schemaVersion: DUNGEON_FEEDBACK_SCHEMA_VERSION,
    createdAt: now,
    build: {
      name: DUNGEON_BUILD_NAME,
      version: DUNGEON_BUILD_VERSION,
      channel: DUNGEON_BUILD_CHANNEL,
    },
    client: getClientInfo(),
    run: run ? summarizeRunForFeedback(run, faction) : null,
    meta: {
      totalRuns: meta.stats.totalRuns,
      victories: meta.stats.victories,
      bestActReached: meta.stats.bestActReached,
      unlockedBadges: meta.unlockedBadges,
    },
    telemetry: {
      totalEvents: events.length,
      recentEvents: events.slice(-100),
    },
  };
}

export function exportDungeonFeedbackJSON(
  run: RunState | null,
  faction: Faction | null,
  now = Date.now(),
): string {
  return JSON.stringify(createDungeonFeedbackBundle(run, faction, now), null, 2);
}
