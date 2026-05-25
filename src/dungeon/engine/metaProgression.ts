import type { Faction, RunState } from '../types';

export const DUNGEON_META_STORAGE_KEY = 'sf:dungeon:meta:v1';
export const DUNGEON_META_SCHEMA_VERSION = 1;
export const MAX_RECENT_DUNGEON_RUNS = 50;

export type DungeonBadgeId =
  | 'first_run'
  | 'first_victory'
  | 'act_one_clear'
  | 'act_two_clear'
  | 'elite_hunter'
  | 'boss_breaker'
  | 'big_deck'
  | 'relic_hoard'
  | 'close_call'
  | 'perfect_finish';

export interface DungeonBadgeDefinition {
  id: DungeonBadgeId;
  name: string;
  description: string;
}

export interface DungeonRunHistoryEntry {
  runId: string;
  seed?: string;
  faction: Faction | 'Unknown';
  ascensionLevel: number;
  completedAt: number;
  victory: boolean;
  actsReached: 1 | 2 | 3;
  finalHealth: number;
  maxHealth: number;
  gold: number;
  deckSize: number;
  relicCount: number;
  potionCount: number;
  totalCombats: number;
  elitesDefeated: number;
  bossesDefeated: number;
  cardsPlayed: number;
  totalDamageDealt: number;
  badges: DungeonBadgeId[];
}

export interface DungeonMetaStats {
  totalRuns: number;
  victories: number;
  bestActReached: 1 | 2 | 3;
  highestAscensionByFaction: Partial<Record<Faction, number>>;
  totalCombats: number;
  totalElitesDefeated: number;
  totalBossesDefeated: number;
  totalCardsPlayed: number;
}

export interface DungeonMetaProgression {
  schemaVersion: number;
  createdAt: number;
  lastUpdatedAt: number;
  stats: DungeonMetaStats;
  unlockedBadges: DungeonBadgeId[];
  recentRuns: DungeonRunHistoryEntry[];
}

export const DUNGEON_BADGES: DungeonBadgeDefinition[] = [
  { id: 'first_run', name: 'First Descent', description: 'Finish any dungeon run.' },
  { id: 'first_victory', name: 'Crown Claimed', description: 'Win a dungeon run.' },
  { id: 'act_one_clear', name: 'Gatebreaker', description: 'Reach Act 2 or deeper.' },
  { id: 'act_two_clear', name: 'Deep Delver', description: 'Reach Act 3.' },
  { id: 'elite_hunter', name: 'Elite Hunter', description: 'Defeat at least 3 elites in a run.' },
  { id: 'boss_breaker', name: 'Boss Breaker', description: 'Defeat at least 2 bosses in a run.' },
  { id: 'big_deck', name: 'Library Run', description: 'Finish with 24 or more cards.' },
  { id: 'relic_hoard', name: 'Relic Hoard', description: 'Finish with 8 or more relics.' },
  { id: 'close_call', name: 'Close Call', description: 'Win with 5 or less HP.' },
  { id: 'perfect_finish', name: 'Untouched Crown', description: 'Win at full HP.' },
];

export function getBadgeDefinition(id: DungeonBadgeId): DungeonBadgeDefinition {
  return DUNGEON_BADGES.find((badge) => badge.id === id) ?? {
    id,
    name: id,
    description: 'Unknown badge.',
  };
}

export function emptyDungeonMeta(now = Date.now()): DungeonMetaProgression {
  return {
    schemaVersion: DUNGEON_META_SCHEMA_VERSION,
    createdAt: now,
    lastUpdatedAt: now,
    stats: {
      totalRuns: 0,
      victories: 0,
      bestActReached: 1,
      highestAscensionByFaction: {},
      totalCombats: 0,
      totalElitesDefeated: 0,
      totalBossesDefeated: 0,
      totalCardsPlayed: 0,
    },
    unlockedBadges: [],
    recentRuns: [],
  };
}

export function deriveDungeonBadges(run: RunState, won: boolean): DungeonBadgeId[] {
  const badges: DungeonBadgeId[] = ['first_run'];

  if (won) badges.push('first_victory');
  if (run.currentAct >= 2 || run.runStats.bossesDefeated >= 1) badges.push('act_one_clear');
  if (run.currentAct >= 3 || run.runStats.bossesDefeated >= 2) badges.push('act_two_clear');
  if (run.runStats.elitesDefeated >= 3) badges.push('elite_hunter');
  if (run.runStats.bossesDefeated >= 2) badges.push('boss_breaker');
  if (run.deck.length >= 24) badges.push('big_deck');
  if (run.relics.length >= 8) badges.push('relic_hoard');
  if (won && run.currentHealth <= 5) badges.push('close_call');
  if (won && run.currentHealth >= run.maxHealth) badges.push('perfect_finish');

  return [...new Set(badges)];
}

export function summarizeDungeonRun(
  run: RunState,
  faction: Faction | null,
  won: boolean,
  now = Date.now(),
): DungeonRunHistoryEntry {
  const runFaction = faction ?? 'Unknown';

  return {
    runId: [
      run.seed ?? 'legacy',
      runFaction,
      `A${run.ascensionLevel}`,
      won ? 'W' : 'L',
      run.currentAct,
      run.runStats.totalCombats,
      run.runStats.bossesDefeated,
      run.runStats.elitesDefeated,
    ].join(':'),
    seed: run.seed,
    faction: runFaction,
    ascensionLevel: run.ascensionLevel,
    completedAt: now,
    victory: won,
    actsReached: run.currentAct,
    finalHealth: run.currentHealth,
    maxHealth: run.maxHealth,
    gold: run.gold,
    deckSize: run.deck.length,
    relicCount: run.relics.length,
    potionCount: run.potions.filter(Boolean).length,
    totalCombats: run.runStats.totalCombats,
    elitesDefeated: run.runStats.elitesDefeated,
    bossesDefeated: run.runStats.bossesDefeated,
    cardsPlayed: run.runStats.cardsPlayed,
    totalDamageDealt: run.runStats.totalDamageDealt,
    badges: deriveDungeonBadges(run, won),
  };
}

export function applyRunToDungeonMeta(
  meta: DungeonMetaProgression,
  entry: DungeonRunHistoryEntry,
): DungeonMetaProgression {
  const duplicateIndex = meta.recentRuns.findIndex((run) => run.runId === entry.runId);
  if (duplicateIndex !== -1) {
    return {
      ...meta,
      lastUpdatedAt: Math.max(meta.lastUpdatedAt, entry.completedAt),
      unlockedBadges: [...new Set([...meta.unlockedBadges, ...entry.badges])],
      recentRuns: [
        entry,
        ...meta.recentRuns.filter((run) => run.runId !== entry.runId),
      ].slice(0, MAX_RECENT_DUNGEON_RUNS),
    };
  }

  const highestAscensionByFaction = { ...meta.stats.highestAscensionByFaction };
  if (entry.faction !== 'Unknown') {
    highestAscensionByFaction[entry.faction] = Math.max(
      highestAscensionByFaction[entry.faction] ?? 0,
      entry.ascensionLevel,
    );
  }

  return {
    ...meta,
    lastUpdatedAt: entry.completedAt,
    stats: {
      totalRuns: meta.stats.totalRuns + 1,
      victories: meta.stats.victories + (entry.victory ? 1 : 0),
      bestActReached: Math.max(meta.stats.bestActReached, entry.actsReached) as 1 | 2 | 3,
      highestAscensionByFaction,
      totalCombats: meta.stats.totalCombats + entry.totalCombats,
      totalElitesDefeated: meta.stats.totalElitesDefeated + entry.elitesDefeated,
      totalBossesDefeated: meta.stats.totalBossesDefeated + entry.bossesDefeated,
      totalCardsPlayed: meta.stats.totalCardsPlayed + entry.cardsPlayed,
    },
    unlockedBadges: [...new Set([...meta.unlockedBadges, ...entry.badges])],
    recentRuns: [entry, ...meta.recentRuns].slice(0, MAX_RECENT_DUNGEON_RUNS),
  };
}

export function loadDungeonMeta(): DungeonMetaProgression {
  if (typeof localStorage === 'undefined') return emptyDungeonMeta();
  try {
    const raw = localStorage.getItem(DUNGEON_META_STORAGE_KEY);
    if (!raw) return emptyDungeonMeta();
    const parsed = JSON.parse(raw) as DungeonMetaProgression;
    if (parsed?.schemaVersion !== DUNGEON_META_SCHEMA_VERSION) return emptyDungeonMeta();
    return parsed;
  } catch {
    return emptyDungeonMeta();
  }
}

export function saveDungeonMeta(meta: DungeonMetaProgression): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(DUNGEON_META_STORAGE_KEY, JSON.stringify(meta));
  } catch {
    // Meta persistence is best-effort; a failed write should not break run end.
  }
}

export function recordDungeonRunEnd(
  run: RunState,
  faction: Faction | null,
  won: boolean,
  now = Date.now(),
): DungeonMetaProgression {
  const entry = summarizeDungeonRun(run, faction, won, now);
  const next = applyRunToDungeonMeta(loadDungeonMeta(), entry);
  saveDungeonMeta(next);
  return next;
}
