import { getBossByAct, getEnemiesByAct, getElitesByAct } from '../data/enemies';
import {
  applyAugment,
  endPlayerTurn,
  executeEnemyTurn,
  getCardChoice,
  initCombat,
  playCard,
} from './combat';
import { createCardInstance, generateRewardOptions, getStarterCards } from './draft';
import { getCardStats } from './cardStats';
import { SplitMix64 } from '../../roguelite/engine/rng';
import type { CardDefinition, CardInstance, CombatState, EnemyDefinition, Faction } from '../types';

export type BotProfileId = 'random' | 'aggressive' | 'defensive' | 'value' | 'archetype';

export interface BalanceLabConfig {
  seed: string;
  runsPerProfile: number;
  maxTurnsPerCombat: number;
  combatsPerAct: number;
  includeElites: boolean;
  includeBosses: boolean;
  factions: Faction[];
  profiles: BotProfileId[];
}

export interface BalanceRunResult {
  seed: string;
  faction: Faction;
  profile: BotProfileId;
  won: boolean;
  deathAct: 1 | 2 | 3 | null;
  deathFloor: number | null;
  combatsWon: number;
  combatsLost: number;
  totalTurns: number;
  deckSize: number;
  cardsPicked: number;
  cardsSkipped: number;
  cardPicks: Record<string, number>;
}

export interface BalanceBucketSummary {
  faction: Faction;
  profile: BotProfileId;
  runs: number;
  winRate: number;
  averageDeathFloor: number | null;
  averageTurns: number;
  averageDeckSize: number;
  cardPicks: Record<string, number>;
}

export interface BalanceReport {
  seed: string;
  config: BalanceLabConfig;
  runs: BalanceRunResult[];
  summaries: BalanceBucketSummary[];
  topCardPicks: Array<{ cardId: string; picks: number }>;
}

const DEFAULT_FACTIONS: Faction[] = ['Cogsmiths', 'Pyroclast', 'Luminar', 'WarpRiders'];
const DEFAULT_PROFILES: BotProfileId[] = ['random', 'aggressive', 'defensive', 'value', 'archetype'];

export const DEFAULT_BALANCE_LAB_CONFIG: BalanceLabConfig = {
  seed: 'phase-6-balance-lab',
  runsPerProfile: 8,
  maxTurnsPerCombat: 24,
  combatsPerAct: 3,
  includeElites: true,
  includeBosses: true,
  factions: DEFAULT_FACTIONS,
  profiles: DEFAULT_PROFILES,
};

function withScopedMathRandom<T>(rng: SplitMix64, fn: () => T): T {
  const original = Math.random;
  Math.random = () => rng.nextFloat();
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

function chooseEnemy(
  act: 1 | 2 | 3,
  floor: number,
  rng: SplitMix64,
  includeElites: boolean,
  includeBosses: boolean,
): EnemyDefinition {
  if (includeBosses && floor === 99) {
    const boss = getBossByAct(act);
    if (boss) return boss;
  }
  if (includeElites && floor === 2) {
    const elites = getElitesByAct(act);
    if (elites.length > 0) return rng.pick(elites);
  }
  return rng.pick(getEnemiesByAct(act));
}

function textScore(card: CardInstance | CardDefinition, terms: string[]): number {
  const text = `${card.name} ${card.cardText} ${card.upgradeText ?? ''}`.toLowerCase();
  return terms.reduce((sum, term) => sum + (text.includes(term) ? 1 : 0), 0);
}

function scoreCardForPlay(card: CardInstance, profile: BotProfileId): number {
  const stats = getCardStats(card);
  let score = 10 - stats.cost;

  if (card.type === 'Curse') return -999;
  if (profile === 'random') return score;
  if (profile === 'aggressive') {
    score += card.type === 'Attack' ? 8 : 0;
    score += textScore(card, ['damage', 'burn', 'vulnerable', 'ignite']) * 4;
  } else if (profile === 'defensive') {
    score += card.type === 'Skill' ? 6 : 0;
    score += textScore(card, ['block', 'heal', 'weak', 'barrier']) * 5;
  } else if (profile === 'value') {
    score += textScore(card, ['draw', 'energy', 'power', 'at turn start', 'at end of turn']) * 5;
    score += card.type === 'Power' ? 7 : 0;
  } else if (profile === 'archetype') {
    score += (card.complexityTier ?? 1) * 3;
    score += textScore(card, ['heat', 'lumen', 'channel', 'augment', 'rift', 'flux']) * 5;
  }

  return score;
}

function choosePlayableCard(state: CombatState, profile: BotProfileId, rng: SplitMix64): CardInstance | null {
  const playable = state.hand.filter((card) => getCardStats(card).cost <= state.playerEnergy && card.type !== 'Curse');
  if (playable.length === 0) return null;
  if (profile === 'random') return rng.pick(playable);
  return [...playable].sort((a, b) => scoreCardForPlay(b, profile) - scoreCardForPlay(a, profile))[0] ?? null;
}

function chooseAugmentTarget(state: CombatState, augment: CardInstance, profile: BotProfileId): CardInstance | null {
  void augment;
  const candidates = state.hand.filter((card) => card.type !== 'Augment' && card.type !== 'Curse');
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => scoreCardForPlay(b, profile) - scoreCardForPlay(a, profile))[0] ?? null;
}

function chooseReward(
  options: CardDefinition[],
  profile: BotProfileId,
  rng: SplitMix64,
): CardDefinition | null {
  if (options.length === 0) return null;
  if (profile === 'random') return rng.chance(0.12) ? null : rng.pick(options);

  const scored = options.map((card) => {
    let score = 0;
    if (profile === 'aggressive') score += card.type === 'Attack' ? 8 : 0;
    if (profile === 'defensive') score += card.type === 'Skill' ? 8 : 0;
    if (profile === 'value') score += ({ Common: 1, Uncommon: 3, Rare: 6, Epic: 9, Legendary: 12 } as const)[card.rarity];
    if (profile === 'archetype') score += (card.complexityTier ?? 1) * 4;
    score += textScore(card, profile === 'aggressive'
      ? ['damage', 'burn', 'vulnerable', 'ignite']
      : profile === 'defensive'
        ? ['block', 'heal', 'weak', 'barrier']
        : profile === 'archetype'
          ? ['heat', 'lumen', 'channel', 'augment', 'rift', 'flux']
          : ['draw', 'energy', 'power']);
    return { card, score };
  }).sort((a, b) => b.score - a.score);

  const pick = scored[0]?.card ?? options[0];
  const skipChance = profile === 'value' ? 0.18 : 0.08;
  return rng.chance(skipChance) ? null : pick;
}

function simulateCombat(
  deck: CardInstance[],
  playerHealth: number,
  playerMaxHealth: number,
  enemy: EnemyDefinition,
  faction: Faction,
  profile: BotProfileId,
  rng: SplitMix64,
  maxTurns: number,
): { won: boolean; playerHealth: number; playerMaxHealth: number; turns: number } {
  return withScopedMathRandom(rng, () => {
    let state = initCombat(deck, playerHealth, playerMaxHealth, [], enemy, faction);
    let turns = 0;

    while (turns < maxTurns && state.phase !== 'combat_end_win' && state.phase !== 'combat_end_loss') {
      let safeguard = 80;
      while (safeguard-- > 0 && state.phase === 'player_turn') {
        const card = choosePlayableCard(state, profile, rng);
        if (!card) break;

        if (card.type === 'Augment') {
          const target = chooseAugmentTarget(state, card, profile);
          if (!target) break;
          state = applyAugment(state, card.instanceId, target.instanceId);
          continue;
        }

        const choice = getCardChoice(card);
        const textOverride = choice
          ? (profile === 'defensive' ? choice.optionB : choice.optionA)
          : undefined;
        const targetId = card.type === 'Attack' ? 'enemy' : undefined;
        state = playCard(state, card.instanceId, targetId, textOverride);
      }

      state = endPlayerTurn(state, []);
      if (state.phase === 'combat_end_win' || state.phase === 'combat_end_loss') break;
      state = executeEnemyTurn(state);
      turns++;
    }

    return {
      won: state.phase === 'combat_end_win' || (state.enemy.currentHealth <= 0 && state.playerHealth > 0),
      playerHealth: Math.max(1, state.playerHealth),
      playerMaxHealth: state.playerMaxHealth,
      turns,
    };
  });
}

export function simulateBalanceRun(
  faction: Faction,
  profile: BotProfileId,
  seed: string,
  config: Pick<BalanceLabConfig, 'maxTurnsPerCombat' | 'combatsPerAct' | 'includeElites' | 'includeBosses'> = DEFAULT_BALANCE_LAB_CONFIG,
): BalanceRunResult {
  const rng = SplitMix64.fromString(`${seed}:${faction}:${profile}`);
  let deck = getStarterCards(faction);
  let hp = 72;
  const maxHp = 72;
  const cardPicks: Record<string, number> = {};
  let totalTurns = 0;
  let combatsWon = 0;
  let cardsPicked = 0;
  let cardsSkipped = 0;

  for (const act of [1, 2, 3] as const) {
    const floors = Array.from({ length: config.combatsPerAct }, (_, i) => i + 1);
    if (config.includeBosses) floors.push(99);

    for (const floor of floors) {
      const enemy = chooseEnemy(act, floor, rng.derive(`enemy:${act}:${floor}`), config.includeElites, config.includeBosses);
      const combat = simulateCombat(
        deck,
        hp,
        maxHp,
        enemy,
        faction,
        profile,
        rng.derive(`combat:${act}:${floor}`),
        config.maxTurnsPerCombat,
      );

      totalTurns += combat.turns;
      if (!combat.won) {
        return {
          seed,
          faction,
          profile,
          won: false,
          deathAct: act,
          deathFloor: floor,
          combatsWon,
          combatsLost: 1,
          totalTurns,
          deckSize: deck.length,
          cardsPicked,
          cardsSkipped,
          cardPicks,
        };
      }

      combatsWon++;
      hp = Math.min(maxHp, combat.playerHealth + 5);

      if (floor !== 99) {
        const rewardRng = rng.derive(`reward:${act}:${floor}`);
        const options = generateRewardOptions(floor, act, faction, () => rewardRng.nextFloat(), deck);
        const pick = chooseReward(options, profile, rewardRng);
        if (pick) {
          deck = [...deck, createCardInstance(pick)];
          cardPicks[pick.id] = (cardPicks[pick.id] ?? 0) + 1;
          cardsPicked++;
        } else {
          cardsSkipped++;
        }
      }
    }
  }

  return {
    seed,
    faction,
    profile,
    won: true,
    deathAct: null,
    deathFloor: null,
    combatsWon,
    combatsLost: 0,
    totalTurns,
    deckSize: deck.length,
    cardsPicked,
    cardsSkipped,
    cardPicks,
  };
}

function summarizeBucket(faction: Faction, profile: BotProfileId, runs: BalanceRunResult[]): BalanceBucketSummary {
  const deaths = runs.filter((run) => !run.won && run.deathAct && run.deathFloor);
  const cardPicks: Record<string, number> = {};
  for (const run of runs) {
    for (const [cardId, count] of Object.entries(run.cardPicks)) {
      cardPicks[cardId] = (cardPicks[cardId] ?? 0) + count;
    }
  }

  return {
    faction,
    profile,
    runs: runs.length,
    winRate: runs.filter((run) => run.won).length / Math.max(1, runs.length),
    averageDeathFloor: deaths.length === 0
      ? null
      : deaths.reduce((sum, run) => {
        const localFloor = run.deathFloor === 99 ? 10 : run.deathFloor!;
        return sum + ((run.deathAct! - 1) * 10 + localFloor);
      }, 0) / deaths.length,
    averageTurns: runs.reduce((sum, run) => sum + run.totalTurns, 0) / Math.max(1, runs.length),
    averageDeckSize: runs.reduce((sum, run) => sum + run.deckSize, 0) / Math.max(1, runs.length),
    cardPicks,
  };
}

export function createBalanceReport(overrides: Partial<BalanceLabConfig> = {}): BalanceReport {
  const config: BalanceLabConfig = {
    ...DEFAULT_BALANCE_LAB_CONFIG,
    ...overrides,
    factions: overrides.factions ?? DEFAULT_BALANCE_LAB_CONFIG.factions,
    profiles: overrides.profiles ?? DEFAULT_BALANCE_LAB_CONFIG.profiles,
  };
  const runs: BalanceRunResult[] = [];

  for (const faction of config.factions) {
    for (const profile of config.profiles) {
      for (let i = 0; i < config.runsPerProfile; i++) {
        runs.push(simulateBalanceRun(faction, profile, `${config.seed}:${i}`, config));
      }
    }
  }

  const summaries = config.factions.flatMap((faction) =>
    config.profiles.map((profile) =>
      summarizeBucket(faction, profile, runs.filter((run) => run.faction === faction && run.profile === profile)),
    ),
  );

  const topCounts: Record<string, number> = {};
  for (const run of runs) {
    for (const [cardId, count] of Object.entries(run.cardPicks)) {
      topCounts[cardId] = (topCounts[cardId] ?? 0) + count;
    }
  }

  return {
    seed: config.seed,
    config,
    runs,
    summaries,
    topCardPicks: Object.entries(topCounts)
      .map(([cardId, picks]) => ({ cardId, picks }))
      .sort((a, b) => b.picks - a.picks)
      .slice(0, 15),
  };
}

export function formatBalanceReport(report: BalanceReport): string {
  const lines = [
    `STARFORGE Dungeon Balance Report`,
    `Seed: ${report.seed}`,
    `Runs: ${report.runs.length} (${report.config.runsPerProfile} per faction/profile)`,
    '',
    'Faction/Profile              Win%   AvgTurns   AvgDeck   Death',
  ];

  for (const summary of report.summaries) {
    const label = `${summary.faction}/${summary.profile}`.padEnd(28);
    const win = `${Math.round(summary.winRate * 100)}%`.padStart(4);
    const turns = summary.averageTurns.toFixed(1).padStart(8);
    const deck = summary.averageDeckSize.toFixed(1).padStart(7);
    const death = summary.averageDeathFloor === null ? 'n/a' : summary.averageDeathFloor.toFixed(1);
    lines.push(`${label} ${win} ${turns} ${deck}   ${death}`);
  }

  lines.push('', 'Top card picks:');
  if (report.topCardPicks.length === 0) {
    lines.push('  none');
  } else {
    for (const pick of report.topCardPicks) {
      lines.push(`  ${pick.cardId.padEnd(8)} ${pick.picks}`);
    }
  }

  return lines.join('\n');
}
