import { BLESSING_POOL, applyBlessing, rollBlessings } from '../../../src/dungeon/data/blessings';
import { CARD_POOL } from '../../../src/dungeon/data/cards';
import { createCurseInstance } from '../../../src/dungeon/data/curses';
import { getBossByAct, getElitesByAct, getEnemiesByAct } from '../../../src/dungeon/data/enemies';
import { getPotionDef, potionShopPrice, rollPotionDrop, rollShopPotions, applyPotion } from '../../../src/dungeon/data/potions';
import { RELIC_POOL } from '../../../src/dungeon/data/relics';
import { getRunModifierDef } from '../../../src/dungeon/data/runModifiers';
import { getAscensionMods } from '../../../src/dungeon/engine/ascension';
import {
  applyAugment,
  endPlayerTurn,
  executeEnemyTurn,
  getCardChoice,
  initCombat,
  playCard,
} from '../../../src/dungeon/engine/combat';
import { createCardInstance, generateDraftOptions, generateRewardOptions, getStarterCards } from '../../../src/dungeon/engine/draft';
import { choicesForFaction, pickEventForNode } from '../../../src/dungeon/engine/eventSelection';
import { generateActMap, getAvailableNodes, visitNode } from '../../../src/dungeon/engine/mapgen';
import { applyRelicsToCombat, applyRelicsToRun } from '../../../src/dungeon/engine/relicEffects';
import { applyRunModifiersToCombat, consumeNextCombatModifiers } from '../../../src/dungeon/engine/runModifiers';
import { getCardStats } from '../../../src/dungeon/engine/cardStats';
import { SplitMix64 } from '../../../src/roguelite/engine/rng';
import type {
  CardDefinition,
  CardInstance,
  CombatState,
  DungeonEventChoiceDefinition,
  EnemyDefinition,
  Faction,
  MapNode,
  NodeType,
  PotionContext,
  PotionInstance,
  RelicDefinition,
  RunState,
} from '../../../src/dungeon/types';

export interface CertifiedRunOptions {
  maxActs?: 1 | 2 | 3;
  maxTurnsPerCombat?: number;
  maxNodesPerAct?: number;
}

export interface CertifiedRunSummary {
  seed: string;
  won: boolean;
  finalPhase: RunState['phase'];
  currentAct: 1 | 2 | 3;
  currentHealth: number;
  maxHealth: number;
  deckSize: number;
  relicCount: number;
  potionCount: number;
  gold: number;
  visitedNodeTypes: NodeType[];
  combatsStarted: number;
  combatsWon: number;
  combatsLost: number;
  turnCaps: number;
  rewardsTaken: number;
  potionsGained: number;
  potionsUsed: number;
  relicsGained: number;
  cardsAdded: number;
  cardsRemoved: number;
  cardsUpgraded: number;
  eventsResolved: number;
  shopsVisited: number;
  restsVisited: number;
  invariantFailures: string[];
}

interface CombatResult {
  state: CombatState;
  won: boolean;
  lost: boolean;
  turnCapped: boolean;
  potionsUsed: number;
}

const CARD_PRICE: Record<string, number> = {
  Common: 50,
  Uncommon: 75,
  Rare: 100,
  Epic: 140,
  Legendary: 175,
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

function scoreCard(card: CardInstance | CardDefinition): number {
  const stats = getCardStats(card);
  const text = `${card.name} ${stats.text}`.toLowerCase();
  let score = 10 - stats.cost;
  if (card.type === 'Curse') return -999;
  if (card.type === 'Attack') score += 8;
  if (card.type === 'Skill' && /block|heal|weak/i.test(text)) score += 6;
  if (card.type === 'Power') score += 7;
  if (/heat|vent|ignite|damage|draw|energy|vulnerable/.test(text)) score += 5;
  score += (card.complexityTier ?? 1) * 2;
  return score;
}

function choosePlayableCard(state: CombatState): CardInstance | null {
  const playable = state.hand
    .filter((card) => getCardStats(card).cost <= state.playerEnergy && card.type !== 'Curse')
    .sort((a, b) => scoreCard(b) - scoreCard(a));
  return playable[0] ?? null;
}

function chooseEnemy(act: 1 | 2 | 3, type: NodeType, rng: SplitMix64): EnemyDefinition | null {
  if (type === 'boss') return getBossByAct(act) ?? null;
  if (type === 'elite') {
    const elites = getElitesByAct(act);
    return elites.length > 0 ? rng.pick(elites) : null;
  }
  const enemies = getEnemiesByAct(act);
  return enemies.length > 0 ? rng.pick(enemies) : null;
}

function firstEmptyPotionSlot(potions: (PotionInstance | null)[]): number {
  return potions.findIndex((potion) => potion === null);
}

function addPotionToRun(run: RunState, potion: PotionInstance): { run: RunState; gained: boolean } {
  const potions = [...run.potions];
  const empty = firstEmptyPotionSlot(potions);
  const slot = empty >= 0 ? empty : 0;
  potions[slot] = potion;
  return { run: { ...run, potions }, gained: true };
}

function assertRunInvariants(run: RunState, failures: string[], label: string): void {
  if (run.currentHealth < 0) failures.push(`${label}: currentHealth < 0`);
  if (run.maxHealth < 1) failures.push(`${label}: maxHealth < 1`);
  if (run.currentHealth > run.maxHealth) failures.push(`${label}: currentHealth > maxHealth`);
  if (run.gold < 0) failures.push(`${label}: gold < 0`);
  if (run.deck.length < 1) failures.push(`${label}: deck is empty`);
  if (run.potions.length !== 3) failures.push(`${label}: potion inventory is not 3 slots`);
  if (run.potions.filter(Boolean).length > 3) failures.push(`${label}: potion inventory overflow`);
  if (new Set(run.deck.map((card) => card.instanceId)).size !== run.deck.length) {
    failures.push(`${label}: duplicate deck instanceId`);
  }
}

function assertCombatInvariants(state: CombatState, failures: string[], label: string): void {
  if (state.playerHealth < 0) failures.push(`${label}: playerHealth < 0`);
  if (state.playerHealth > state.playerMaxHealth) failures.push(`${label}: playerHealth > max`);
  if (state.enemy.currentHealth < 0) failures.push(`${label}: enemy health < 0`);
  if (state.playerEnergy < 0) failures.push(`${label}: playerEnergy < 0`);
  if (state.playerHeat < 0 || state.playerHeat > 10) failures.push(`${label}: playerHeat out of bounds`);
  if (!Number.isFinite(state.turn)) failures.push(`${label}: turn is not finite`);
}

function useFirstPotionIfUseful(
  state: CombatState,
  potions: (PotionInstance | null)[],
  rng: SplitMix64,
): { state: CombatState; potions: (PotionInstance | null)[]; used: boolean } {
  if (state.phase !== 'player_turn') return { state, potions, used: false };
  const filled = potions
    .map((potion, index) => ({ potion, index }))
    .filter((slot): slot is { potion: PotionInstance; index: number } => Boolean(slot.potion));
  if (filled.length === 0) return { state, potions, used: false };

  const preferred = filled.find((slot) => {
    const def = getPotionDef(slot.potion.definitionId);
    if (!def) return false;
    if (def.category === 'Recovery') return state.playerHealth <= Math.floor(state.playerMaxHealth * 0.45);
    if (def.category === 'Defense') return state.playerShield === 0;
    if (def.category === 'Damage') return state.enemy.currentHealth > 0;
    return state.turn > 1 || rng.chance(0.35);
  });
  if (!preferred) return { state, potions, used: false };

  const def = getPotionDef(preferred.potion.definitionId);
  const ctx: PotionContext | undefined = def?.targeting === 'enemy' ? { targetId: 'enemy' } : undefined;
  const result = applyPotion(state, preferred.potion.definitionId, ctx);
  if (!result.ok) return { state, potions, used: false };

  const nextPotions = [...potions];
  nextPotions[preferred.index] = null;
  return { state: result.state, potions: nextPotions, used: true };
}

function simulateCombat(
  run: RunState,
  faction: Faction,
  node: MapNode,
  rng: SplitMix64,
  maxTurns: number,
  failures: string[],
): { run: RunState; result: CombatResult } {
  const enemy = chooseEnemy(run.currentAct, node.type, rng.derive(`enemy:${node.id}`));
  if (!enemy) {
    failures.push(`${node.id}: missing enemy for ${node.type}`);
    return {
      run,
      result: {
        state: run.combatState ?? initCombat(run.deck, run.currentHealth, run.maxHealth, [], getEnemiesByAct(run.currentAct)[0], faction),
        won: false,
        lost: true,
        turnCapped: false,
        potionsUsed: 0,
      },
    };
  }

  const mods = getAscensionMods(run.ascensionLevel);
  let combat = withScopedMathRandom(rng.derive(`combat:init:${node.id}`), () =>
    initCombat(run.deck, run.currentHealth, run.maxHealth, run.relics, enemy, faction, {
      enemyHpMul: mods.enemyHpMul,
      enemyDamageMul: mods.enemyDamageMul,
      bossStrength: mods.bossStrength,
      drawPerTurn: mods.drawPerTurn,
    }),
  );
  combat = applyRunModifiersToCombat(combat, run.runModifiers ?? []);
  let nextRun = consumeNextCombatModifiers(run);
  combat = applyRelicsToCombat('combat_start', nextRun.relics, combat, {
    combatIndex: nextRun.runStats.totalCombats,
  });

  let potions = [...nextRun.potions];
  let potionsUsed = 0;
  let turns = 0;

  while (turns < maxTurns && combat.phase !== 'combat_end_win' && combat.phase !== 'combat_end_loss') {
    assertCombatInvariants(combat, failures, `${node.id}:turn-${turns}`);

    const potionResult = useFirstPotionIfUseful(combat, potions, rng.derive(`potion:${node.id}:${turns}`));
    combat = potionResult.state;
    potions = potionResult.potions;
    if (potionResult.used) potionsUsed++;

    let safeguard = 80;
    while (safeguard-- > 0 && combat.phase === 'player_turn') {
      const card = choosePlayableCard(combat);
      if (!card) break;

      if (card.type === 'Augment') {
        const target = combat.hand
          .filter((candidate) => candidate.instanceId !== card.instanceId && candidate.type !== 'Augment' && candidate.type !== 'Curse')
          .sort((a, b) => scoreCard(b) - scoreCard(a))[0];
        if (!target) break;
        combat = applyAugment(combat, card.instanceId, target.instanceId);
        continue;
      }

      const choice = getCardChoice(card);
      const textOverride = choice ? choice.optionA : undefined;
      const targetId = card.type === 'Attack' ? 'enemy' : undefined;
      const before = combat;
      combat = playCard(combat, card.instanceId, targetId, textOverride);
      if (combat === before) break;
    }

    if (combat.phase === 'combat_end_win' || combat.phase === 'combat_end_loss') break;
    combat = endPlayerTurn(combat, nextRun.relics);
    if (combat.phase === 'combat_end_win' || combat.phase === 'combat_end_loss') break;
    combat = executeEnemyTurn(combat);
    turns++;
  }

  const turnCapped = combat.phase !== 'combat_end_win' && combat.phase !== 'combat_end_loss';
  if (turnCapped) failures.push(`${node.id}: combat hit turn cap against ${enemy.id}`);

  const won = combat.phase === 'combat_end_win' || (combat.enemy.currentHealth <= 0 && combat.playerHealth > 0);
  const lost = combat.phase === 'combat_end_loss' || combat.playerHealth <= 0;

  nextRun = {
    ...nextRun,
    currentHealth: Math.max(0, Math.min(combat.playerHealth, combat.playerMaxHealth)),
    maxHealth: combat.playerMaxHealth,
    potions,
    combatState: null,
    runStats: {
      ...nextRun.runStats,
      totalCombats: nextRun.runStats.totalCombats + 1,
      elitesDefeated: nextRun.runStats.elitesDefeated + (won && node.type === 'elite' ? 1 : 0),
      bossesDefeated: nextRun.runStats.bossesDefeated + (won && node.type === 'boss' ? 1 : 0),
    },
  };

  if (won) {
    nextRun = applyRelicsToRun('combat_end', nextRun.relics, nextRun);
  }

  return {
    run: nextRun,
    result: { state: combat, won, lost, turnCapped, potionsUsed },
  };
}

function pickRelic(rng: SplitMix64, owned: RelicDefinition[], boss = false): RelicDefinition | null {
  const ownedIds = new Set(owned.map((relic) => relic.id));
  const pool = RELIC_POOL.filter((relic) =>
    !ownedIds.has(relic.id) && (boss ? relic.rarity === 'Boss' : relic.rarity !== 'Boss'),
  );
  return pool.length > 0 ? rng.pick(pool) : null;
}

function applyReward(
  run: RunState,
  node: MapNode,
  faction: Faction,
  rng: SplitMix64,
  summary: CertifiedRunSummary,
): RunState {
  const isBoss = node.type === 'boss';
  const isElite = node.type === 'elite';
  const roomNumber = run.actMaps[run.currentAct - 1].nodes.filter((n) => n.visited).length;
  let next = {
    ...run,
    gold: run.gold + (isBoss ? 55 : isElite ? 30 : 14),
  };

  const options = generateRewardOptions(roomNumber, run.currentAct, faction, () => rng.nextFloat(), next.deck);
  const chosen = [...options].sort((a, b) => scoreCard(b) - scoreCard(a))[0];
  if (chosen) {
    next = { ...next, deck: [...next.deck, createCardInstance(chosen)] };
    summary.cardsAdded++;
  }

  const potion = rollPotionDrop({ isElite, isBoss, rng: () => rng.nextFloat() });
  if (potion) {
    const added = addPotionToRun(next, potion);
    next = added.run;
    summary.potionsGained += added.gained ? 1 : 0;
  }

  if (isBoss || isElite || next.runStats.totalCombats % 3 === 0) {
    const relic = pickRelic(rng.derive(`relic:${node.id}`), next.relics, isBoss);
    if (relic) {
      next = { ...next, relics: [...next.relics, relic] };
      summary.relicsGained++;
    }
  }

  summary.rewardsTaken++;
  return next;
}

function applyShop(run: RunState, faction: Faction, rng: SplitMix64, summary: CertifiedRunSummary): RunState {
  summary.shopsVisited++;
  let next = run;
  const potionPrice = potionShopPrice(run.currentAct);
  const shopPotions = rollShopPotions(3, () => rng.nextFloat());
  const potion = shopPotions[0];
  if (potion && next.gold >= potionPrice) {
    const added = addPotionToRun(next, potion);
    next = { ...added.run, gold: next.gold - potionPrice };
    summary.potionsGained += added.gained ? 1 : 0;
  }

  const candidates = CARD_POOL
    .filter((card) => card.faction === faction)
    .sort((a, b) => scoreCard(b) - scoreCard(a));
  const buyCard = candidates[rng.nextInt(0, Math.min(8, candidates.length))];
  const cardPrice = buyCard ? CARD_PRICE[buyCard.rarity] ?? 75 : Infinity;
  if (buyCard && next.gold >= cardPrice) {
    next = { ...next, gold: next.gold - cardPrice, deck: [...next.deck, createCardInstance(buyCard)] };
    summary.cardsAdded++;
  }

  const removable = next.deck.find((card) => card.complexityTier === 1);
  if (removable && next.deck.length > 8 && next.gold >= 75 && rng.chance(0.45)) {
    next = {
      ...next,
      gold: next.gold - 75,
      deck: next.deck.filter((card) => card.instanceId !== removable.instanceId),
    };
    summary.cardsRemoved++;
  }

  return next;
}

function applyRest(run: RunState, summary: CertifiedRunSummary): RunState {
  summary.restsVisited++;
  const shouldHeal = run.currentHealth <= Math.floor(run.maxHealth * 0.55);
  if (shouldHeal) {
    return {
      ...run,
      currentHealth: Math.min(run.maxHealth, run.currentHealth + Math.floor(run.maxHealth * 0.3)),
    };
  }

  const target = run.deck.find((card) => !card.upgraded);
  if (!target) return run;
  summary.cardsUpgraded++;
  return {
    ...run,
    deck: run.deck.map((card) => card.instanceId === target.instanceId ? { ...card, upgraded: true } : card),
  };
}

function applyEventChoice(
  run: RunState,
  faction: Faction,
  choice: DungeonEventChoiceDefinition,
  summary: CertifiedRunSummary,
): RunState {
  let next = run;
  for (const effect of choice.effects) {
    if (effect.type === 'gold') {
      next = { ...next, gold: Math.max(0, next.gold + effect.amount) };
    } else if (effect.type === 'heal') {
      next = { ...next, currentHealth: Math.min(next.maxHealth, next.currentHealth + effect.amount) };
    } else if (effect.type === 'damage') {
      next = { ...next, currentHealth: Math.max(0, next.currentHealth - effect.amount) };
    } else if (effect.type === 'max_hp') {
      const maxHealth = Math.max(1, next.maxHealth + effect.amount);
      next = {
        ...next,
        maxHealth,
        currentHealth: Math.min(maxHealth, next.currentHealth + (effect.heal === false ? 0 : effect.amount)),
      };
    } else if (effect.type === 'add_card') {
      const def = CARD_POOL.find((card) => card.id === effect.cardId);
      if (def) {
        next = { ...next, deck: [...next.deck, createCardInstance(def)] };
        summary.cardsAdded++;
      }
    } else if (effect.type === 'upgrade_card') {
      const target = next.deck.find((card) => !card.upgraded);
      if (target) {
        next = {
          ...next,
          deck: next.deck.map((card) => card.instanceId === target.instanceId ? { ...card, upgraded: true } : card),
        };
        summary.cardsUpgraded++;
      }
    } else if (effect.type === 'remove_card') {
      const target = effect.mode === 'first_starter'
        ? next.deck.find((card) => card.complexityTier === 1)
        : next.deck[0];
      if (target && next.deck.length > 1) {
        next = { ...next, deck: next.deck.filter((card) => card.instanceId !== target.instanceId) };
        summary.cardsRemoved++;
      }
    } else if (effect.type === 'add_relic') {
      const relic = RELIC_POOL.find((candidate) => candidate.id === effect.relicId);
      if (relic) {
        next = { ...next, relics: [...next.relics, relic] };
        summary.relicsGained++;
      }
    } else if (effect.type === 'add_potion') {
      const potion = getPotionDef(effect.potionId);
      if (potion) {
        const added = addPotionToRun(next, { definitionId: potion.id });
        next = added.run;
        summary.potionsGained += added.gained ? 1 : 0;
      }
    } else if (effect.type === 'add_curse') {
      const curse = createCurseInstance(effect.curseId, faction);
      if (curse) {
        next = { ...next, deck: [...next.deck, curse] };
        summary.cardsAdded++;
      }
    } else if (effect.type === 'map_modifier' || effect.type === 'class_resource') {
      const modifier = getRunModifierDef(effect.modifierId);
      if (modifier) {
        next = { ...next, runModifiers: [...(next.runModifiers ?? []), modifier] };
      }
    }
  }
  summary.eventsResolved++;
  return next;
}

function applyEvent(run: RunState, faction: Faction, node: MapNode, summary: CertifiedRunSummary): RunState {
  const event = pickEventForNode(run.currentAct, run.seed ?? summary.seed, node.id);
  const choices = choicesForFaction(event, faction);
  const safeChoice = choices
    .filter((choice) => choice.effects.every((effect) => effect.type !== 'damage' || effect.amount < run.currentHealth))
    .sort((a, b) => b.effects.length - a.effects.length)[0] ?? choices[0];
  if (!safeChoice) return run;
  return applyEventChoice(run, faction, safeChoice, summary);
}

function chooseNode(nodes: MapNode[], seenTypes: Set<NodeType>, rng: SplitMix64): MapNode {
  const priority: NodeType[] = ['combat', 'elite', 'shop', 'rest', 'event', 'treasure', 'boss'];
  for (const type of priority) {
    const matching = nodes.filter((node) => node.type === type && !seenTypes.has(type));
    if (matching.length > 0) return rng.pick(matching);
  }
  return rng.pick(nodes);
}

export function simulateCertifiedPyroclastRun(
  seed: string,
  options: CertifiedRunOptions = {},
): CertifiedRunSummary {
  const faction: Faction = 'Pyroclast';
  const maxActs = options.maxActs ?? 1;
  const maxTurnsPerCombat = options.maxTurnsPerCombat ?? 36;
  const maxNodesPerAct = options.maxNodesPerAct ?? 9;
  const rng = SplitMix64.fromString(seed);

  return withScopedMathRandom(rng.derive('certification-math-random'), () => {
  let deck = getStarterCards(faction);
  for (let round = 1; round <= 3; round++) {
    const draftOptions = generateDraftOptions(round, deck, faction);
    const pick = [...draftOptions].sort((a, b) => scoreCard(b) - scoreCard(a))[0];
    if (pick) deck = [...deck, createCardInstance(pick)];
  }

  let run: RunState = {
    phase: 'blessing',
    seed,
    currentAct: 1,
    actMaps: [1, 2, 3].map((act) => generateActMap(act as 1 | 2 | 3, seed)),
    deck,
    hand: [],
    relics: [],
    gold: 99,
    maxHealth: 72,
    currentHealth: 72,
    energy: 3,
    maxEnergy: 3,
    ascensionLevel: 0,
    combatState: null,
    potions: [null, null, null],
    runModifiers: [],
    runStats: {
      totalCombats: 0,
      elitesDefeated: 0,
      bossesDefeated: 0,
      cardsPlayed: 0,
      totalDamageDealt: 0,
    },
  };

  const summary: CertifiedRunSummary = {
    seed,
    won: false,
    finalPhase: run.phase,
    currentAct: run.currentAct,
    currentHealth: run.currentHealth,
    maxHealth: run.maxHealth,
    deckSize: run.deck.length,
    relicCount: run.relics.length,
    potionCount: 0,
    gold: run.gold,
    visitedNodeTypes: [],
    combatsStarted: 0,
    combatsWon: 0,
    combatsLost: 0,
    turnCaps: 0,
    rewardsTaken: 0,
    potionsGained: 0,
    potionsUsed: 0,
    relicsGained: 0,
    cardsAdded: 0,
    cardsRemoved: 0,
    cardsUpgraded: 0,
    eventsResolved: 0,
    shopsVisited: 0,
    restsVisited: 0,
    invariantFailures: [],
  };

  const blessing = rollBlessings(3, () => rng.nextFloat(), faction)[0] ?? BLESSING_POOL[0];
  const blessingResult = applyBlessing(blessing, run, () => rng.nextFloat());
  run = { ...run, ...blessingResult.patch, phase: 'map' };
  if (blessingResult.pickedCard) {
    run = { ...run, deck: [...run.deck, createCardInstance(blessingResult.pickedCard)] };
    summary.cardsAdded++;
  }

  for (const act of [1, 2, 3] as const) {
    if (act > maxActs || run.phase === 'run_end_loss') break;
    run = { ...run, currentAct: act, phase: 'map' };
    let nodesVisitedThisAct = 0;
    const seenTypes = new Set<NodeType>();

    while (nodesVisitedThisAct < maxNodesPerAct && run.phase === 'map') {
      const actIndex = run.currentAct - 1;
      const currentMap = run.actMaps[actIndex];
      const available = getAvailableNodes(currentMap, currentMap.currentNodeId);
      if (available.length === 0) {
        summary.invariantFailures.push(`act-${act}: no available nodes from ${currentMap.currentNodeId ?? 'start'}`);
        break;
      }

      const node = chooseNode(available, seenTypes, rng.derive(`node:${act}:${nodesVisitedThisAct}`));
      seenTypes.add(node.type);
      summary.visitedNodeTypes.push(node.type);
      run = {
        ...run,
        actMaps: run.actMaps.map((map, index) => index === actIndex ? visitNode(map, node.id) : map),
      };

      if (node.type === 'combat' || node.type === 'elite' || node.type === 'boss') {
        summary.combatsStarted++;
        const { run: afterCombat, result } = simulateCombat(
          run,
          faction,
          node,
          rng.derive(`combat:${act}:${node.id}`),
          maxTurnsPerCombat,
          summary.invariantFailures,
        );
        run = afterCombat;
        summary.potionsUsed += result.potionsUsed;
        if (result.turnCapped) summary.turnCaps++;
        if (result.lost || !result.won) {
          summary.combatsLost++;
          run = { ...run, phase: 'run_end_loss', currentHealth: 0 };
          break;
        }
        summary.combatsWon++;
        run = applyReward(run, node, faction, rng.derive(`reward:${act}:${node.id}`), summary);
        if (node.type === 'boss') {
          if (act === maxActs) {
            run = { ...run, phase: 'run_end_win' };
          } else {
            run = { ...run, phase: 'blessing' };
          }
          break;
        }
      } else if (node.type === 'shop') {
        run = applyShop(run, faction, rng.derive(`shop:${act}:${node.id}`), summary);
      } else if (node.type === 'rest') {
        run = applyRest(run, summary);
      } else if (node.type === 'event') {
        run = applyEvent(run, faction, node, summary);
      } else if (node.type === 'treasure') {
        const relic = pickRelic(rng.derive(`treasure:${act}:${node.id}`), run.relics);
        if (relic) {
          run = { ...run, relics: [...run.relics, relic], gold: run.gold + 25 };
          summary.relicsGained++;
        }
      }

      assertRunInvariants(run, summary.invariantFailures, `act-${act}:${node.id}`);
      if (run.currentHealth <= 0) {
        run = { ...run, phase: 'run_end_loss' };
        break;
      }
      run = { ...run, phase: 'map' };
      nodesVisitedThisAct++;
    }
  }

  summary.won = run.phase === 'run_end_win';
  summary.finalPhase = run.phase;
  summary.currentAct = run.currentAct;
  summary.currentHealth = run.currentHealth;
  summary.maxHealth = run.maxHealth;
  summary.deckSize = run.deck.length;
  summary.relicCount = run.relics.length;
  summary.potionCount = run.potions.filter(Boolean).length;
  summary.gold = run.gold;
  return summary;
  });
}
