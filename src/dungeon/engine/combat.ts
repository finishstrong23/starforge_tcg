/**
 * STARFORGE TCG — Dungeon Run Combat Engine
 *
 * Pure function library for the Slay the Spire-style dungeon mode.
 * No internal state — all state lives in the Zustand store.
 * Each function takes relevant state slices and returns updates.
 */

import type {
  RunCard,
  DungeonEnemy,
  BoardMinion,
  StatusEffect,
  StatusType,
  CombatPhase,
  FloatingText,
} from '../types';

// ─── Utilities ─────────────────────────────────────────────

/** Simple seeded PRNG (mulberry32). */
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return () => {
    h |= 0;
    h = h + 0x6d2b79f5 | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Create a unique ID. */
export function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Shuffle an array using an optional seeded random. Returns a new array. */
export function shuffleArray<T>(array: T[], seed?: string): T[] {
  const result = [...array];
  const rand = seed ? seededRandom(seed) : Math.random;
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ─── Constants ─────────────────────────────────────────────

const OPENING_HAND_SIZE = 5;
const MAX_BOARD_SIZE = 5;
const MAX_STRUCTURES = 3;

// ─── Combat Initialization ─────────────────────────────────

/** Initialize combat: shuffle the deck and draw an opening hand. */
export function initCombat(deck: RunCard[]): {
  drawPile: RunCard[];
  hand: RunCard[];
  discardPile: RunCard[];
  exhaustPile: RunCard[];
} {
  const drawPile = shuffleArray(deck);
  const hand = drawPile.splice(0, OPENING_HAND_SIZE);
  return {
    drawPile,
    hand,
    discardPile: [],
    exhaustPile: [],
  };
}

// ─── Drawing ───────────────────────────────────────────────

/** Draw cards from the draw pile. If it runs out, shuffle the discard pile in. */
export function drawCards(
  drawPile: RunCard[],
  discardPile: RunCard[],
  hand: RunCard[],
  count: number,
): { drawPile: RunCard[]; discardPile: RunCard[]; hand: RunCard[] } {
  const newDrawPile = [...drawPile];
  let newDiscardPile = [...discardPile];
  const newHand = [...hand];

  for (let i = 0; i < count; i++) {
    if (newDrawPile.length === 0) {
      if (newDiscardPile.length === 0) break;
      const reshuffled = shuffleArray(newDiscardPile);
      newDrawPile.push(...reshuffled);
      newDiscardPile = [];
    }
    const card = newDrawPile.shift();
    if (card) {
      newHand.push(card);
    }
  }

  return { drawPile: newDrawPile, discardPile: newDiscardPile, hand: newHand };
}

// ─── Card Playability ──────────────────────────────────────

/** Check if a card can be played given energy, board space, and structure limits. */
export function canPlayCard(
  card: RunCard,
  energy: number,
  boardSize: number,
  structureCount: number,
): boolean {
  const cost = card.upgraded && card.upgradedCost !== undefined ? card.upgradedCost : card.cost;
  if (energy < cost) return false;

  if (card.type === 'Minion' && boardSize >= MAX_BOARD_SIZE) return false;
  if (card.type === 'Structure' && structureCount >= MAX_STRUCTURES) return false;

  return true;
}

// ─── Play Minion ───────────────────────────────────────────

/** Play a minion card: create a BoardMinion and handle keyword-based entry effects. */
export function playMinion(card: RunCard): BoardMinion {
  const keywords = card.upgraded && card.upgradedKeywords ? card.upgradedKeywords : card.keywords;
  const statusEffects: StatusEffect[] = [];

  // Map keywords to initial status effects
  if (keywords.includes('GUARDIAN')) {
    statusEffects.push({ type: 'GUARDIAN', stacks: 1 });
  }
  if (keywords.includes('BARRIER')) {
    statusEffects.push({ type: 'BARRIER', stacks: 1 });
  }
  if (keywords.includes('DRAIN')) {
    statusEffects.push({ type: 'DRAIN', stacks: 1 });
  }
  if (keywords.includes('PHASE')) {
    statusEffects.push({ type: 'PHASE', stacks: 1 });
  }
  if (keywords.includes('CLOAK')) {
    statusEffects.push({ type: 'CLOAK', stacks: 1 });
  }
  if (keywords.includes('SWIFT')) {
    statusEffects.push({ type: 'SWIFT', stacks: 1 });
  }
  if (keywords.includes('DOUBLE_STRIKE')) {
    statusEffects.push({ type: 'DOUBLE_STRIKE', stacks: 1 });
  }
  if (keywords.includes('ENRAGE')) {
    statusEffects.push({ type: 'ENRAGE', stacks: 1 });
  }

  const hasSwiftOrBlitz = keywords.includes('SWIFT') || keywords.includes('BLITZ');

  return {
    instanceId: card.instanceId,
    card,
    currentAttack: card.attack ?? 0,
    currentHealth: card.health ?? 1,
    maxHealth: card.health ?? 1,
    hasAttacked: !hasSwiftOrBlitz,
    statusEffects,
    summonedThisTurn: true,
  };
}

// ─── Status Effect Helpers ─────────────────────────────────

/** Apply (or stack) a status effect on a target. Returns a new array. */
export function applyStatus(
  effects: StatusEffect[],
  type: StatusType,
  stacks: number,
  duration?: number,
): StatusEffect[] {
  const result = effects.map((e) => ({ ...e }));
  const existing = result.find((e) => e.type === type);
  if (existing) {
    existing.stacks += stacks;
    if (duration !== undefined) {
      existing.duration = Math.max(existing.duration ?? 0, duration);
    }
  } else {
    result.push({ type, stacks, duration });
  }
  return result;
}

/** Get the number of stacks for a status type. Returns 0 if not present. */
export function getStatusStacks(effects: StatusEffect[], type: StatusType): number {
  const found = effects.find((e) => e.type === type);
  return found ? found.stacks : 0;
}

/** Check whether a status type is present on the target. */
export function hasStatus(effects: StatusEffect[], type: StatusType): boolean {
  return effects.some((e) => e.type === type && e.stacks > 0);
}

/** Tick status durations at end of turn. Reduces duration; removes expired statuses. */
export function tickStatuses(effects: StatusEffect[]): StatusEffect[] {
  const result: StatusEffect[] = [];
  for (const effect of effects) {
    const e = { ...effect };

    // BURN: deal damage tracked externally, reduce stacks by 1
    if (e.type === 'BURN') {
      e.stacks -= 1;
      if (e.stacks > 0) result.push(e);
      continue;
    }

    // Duration-based effects (VULNERABLE, WEAK, etc.)
    if (e.duration !== undefined) {
      e.duration -= 1;
      if (e.duration > 0) {
        result.push(e);
      }
      continue;
    }

    // Permanent effects (STRENGTH, DEXTERITY, DRAIN, GUARDIAN, etc.)
    result.push(e);
  }
  return result;
}

// ─── Intent Damage Preview ────────────────────────────────

/**
 * Compute the damage number displayed on an enemy's intent icon.
 * Accounts for attacker Strength/Weak and defender Vulnerable.
 * This is the single source of truth for what the player sees.
 */
export function computeDisplayedDamage(
  baseDamage: number,
  attackerEffects: StatusEffect[],
  defenderEffects: StatusEffect[],
): number {
  let damage = baseDamage + getStatusStacks(attackerEffects, 'STRENGTH');
  damage = Math.max(0, damage);
  if (hasStatus(attackerEffects, 'WEAK')) {
    damage = Math.floor(damage * 0.75);
  }
  if (hasStatus(defenderEffects, 'VULNERABLE')) {
    damage = Math.floor(damage * 1.5);
  }
  return Math.max(0, damage);
}

// ─── Damage Resolution ─────────────────────────────────────

/**
 * Core damage resolution.
 *
 * Order of operations:
 *   1. Add attacker STRENGTH to raw damage
 *   2. If attacker is WEAK, multiply by 0.75 (floor)
 *   3. If target is VULNERABLE, multiply by 1.5 (floor)
 *   4. BARRIER: negates one entire instance of damage, then breaks
 *   5. Block absorbs damage before health
 */
export function resolveDamage(
  rawAttack: number,
  attackerEffects: StatusEffect[],
  targetHealth: number,
  targetBlock: number,
  targetEffects: StatusEffect[],
): {
  damage: number;
  remainingHealth: number;
  remainingBlock: number;
  blocked: number;
  barrierBroken: boolean;
  overkill: boolean;
} {
  // 1. Strength
  let damage = rawAttack + getStatusStacks(attackerEffects, 'STRENGTH');
  damage = Math.max(0, damage);

  // 2. Weak on attacker
  if (hasStatus(attackerEffects, 'WEAK')) {
    damage = Math.floor(damage * 0.75);
  }

  // 3. Vulnerable on target
  if (hasStatus(targetEffects, 'VULNERABLE')) {
    damage = Math.floor(damage * 1.5);
  }

  // 4. Barrier
  if (hasStatus(targetEffects, 'BARRIER') && damage > 0) {
    return {
      damage: 0,
      remainingHealth: targetHealth,
      remainingBlock: targetBlock,
      blocked: 0,
      barrierBroken: true,
      overkill: false,
    };
  }

  // 5. Block absorbs damage
  let remainingBlock = targetBlock;
  let remainingDamage = damage;
  let blocked = 0;

  if (remainingBlock > 0) {
    blocked = Math.min(remainingBlock, remainingDamage);
    remainingBlock -= blocked;
    remainingDamage -= blocked;
  }

  const remainingHealth = targetHealth - remainingDamage;
  const overkill = remainingHealth < 0;

  return {
    damage,
    remainingHealth,
    remainingBlock,
    blocked,
    barrierBroken: false,
    overkill,
  };
}

// ─── Minion → Enemy Attack ─────────────────────────────────

/** Resolve a minion attacking an enemy. Returns updated copies. */
export function resolveMinionAttack(
  minion: BoardMinion,
  target: DungeonEnemy,
): {
  enemy: DungeonEnemy;
  minion: BoardMinion;
  damageDealt: number;
  drainHeal: number;
} {
  const result = resolveDamage(
    minion.currentAttack,
    minion.statusEffects,
    target.currentHealth,
    target.block,
    target.statusEffects,
  );

  let updatedEnemyEffects = [...target.statusEffects];

  // If barrier broke, remove it
  if (result.barrierBroken) {
    updatedEnemyEffects = updatedEnemyEffects.filter((e) => e.type !== 'BARRIER');
  }

  // BANE / LETHAL: if any health damage was dealt, target dies
  const healthDamage = result.damage - result.blocked;
  const hasLethal = hasStatus(minion.statusEffects, 'BURN'); // BANE mapped via keywords externally
  // We check for keywords on the card for LETHAL-like behavior
  const keywords = minion.card.keywords;
  const isBaneOrLethal = keywords.includes('BANE') || keywords.includes('LETHAL');
  const lethalKill = isBaneOrLethal && healthDamage > 0 && !result.barrierBroken;

  const enemyHealth = lethalKill ? 0 : result.remainingHealth;

  const updatedEnemy: DungeonEnemy = {
    ...target,
    currentHealth: enemyHealth,
    block: result.remainingBlock,
    statusEffects: updatedEnemyEffects,
  };

  // DRAIN: heal hero for health damage dealt (not blocked damage)
  const drainHeal = hasStatus(minion.statusEffects, 'DRAIN')
    ? Math.max(0, healthDamage)
    : 0;

  const updatedMinion: BoardMinion = {
    ...minion,
    hasAttacked: true,
    // Remove CLOAK after attacking
    statusEffects: minion.statusEffects.filter((e) => e.type !== 'CLOAK'),
  };

  return {
    enemy: updatedEnemy,
    minion: updatedMinion,
    damageDealt: result.barrierBroken ? 0 : result.damage,
    drainHeal,
  };
}

// ─── Enemy → Hero Attack ───────────────────────────────────

/** Resolve an enemy attacking the hero. */
export function resolveEnemyAttack(
  enemy: DungeonEnemy,
  heroHealth: number,
  heroBlock: number,
  heroEffects: StatusEffect[],
): {
  heroHealth: number;
  heroBlock: number;
  damageDealt: number;
} {
  const rawDamage = enemy.intent.value ?? 0;

  const result = resolveDamage(
    rawDamage,
    enemy.statusEffects,
    heroHealth,
    heroBlock,
    heroEffects,
  );

  return {
    heroHealth: result.remainingHealth,
    heroBlock: result.remainingBlock,
    damageDealt: result.barrierBroken ? 0 : result.damage,
  };
}

// ─── Enemy → Minion Attack ─────────────────────────────────

/** Resolve an enemy attacking a minion on the player's board. */
export function resolveEnemyAttackMinion(
  enemy: DungeonEnemy,
  target: BoardMinion,
): {
  target: BoardMinion;
  damageDealt: number;
} {
  const rawDamage = enemy.intent.value ?? 0;

  const result = resolveDamage(
    rawDamage,
    enemy.statusEffects,
    target.currentHealth,
    0, // minions don't have block
    target.statusEffects,
  );

  let updatedEffects = [...target.statusEffects];
  if (result.barrierBroken) {
    updatedEffects = updatedEffects.filter((e) => e.type !== 'BARRIER');
  }

  // ENRAGE: gain attack when damaged
  let bonusAttack = 0;
  if (hasStatus(target.statusEffects, 'ENRAGE') && !result.barrierBroken && result.damage > 0) {
    bonusAttack = getStatusStacks(target.statusEffects, 'ENRAGE');
  }

  const updatedTarget: BoardMinion = {
    ...target,
    currentHealth: result.remainingHealth,
    currentAttack: target.currentAttack + bonusAttack,
    statusEffects: updatedEffects,
  };

  return {
    target: updatedTarget,
    damageDealt: result.barrierBroken ? 0 : result.damage,
  };
}

// ─── Death Triggers ────────────────────────────────────────

/** Process LAST_WORDS effects when a minion dies. Parses the card text for effects. */
export function processLastWords(minion: BoardMinion): {
  damageToEnemy: number;
  damageToAll: number;
  healHero: number;
  drawCards: number;
  otherEffects: string[];
} {
  const result = {
    damageToEnemy: 0,
    damageToAll: 0,
    healHero: 0,
    drawCards: 0,
    otherEffects: [] as string[],
  };

  const keywords = minion.card.upgraded && minion.card.upgradedKeywords
    ? minion.card.upgradedKeywords
    : minion.card.keywords;

  if (!keywords.includes('LAST_WORDS')) return result;

  const text = minion.card.upgraded && minion.card.upgradedText
    ? minion.card.upgradedText
    : minion.card.cardText;

  // Parse "Deal X damage" patterns
  const damageMatch = text.match(/[Dd]eal\s+(\d+)\s+damage/);
  if (damageMatch) {
    if (text.toLowerCase().includes('all enemies') || text.toLowerCase().includes('all enemy')) {
      result.damageToAll = parseInt(damageMatch[1], 10);
    } else {
      result.damageToEnemy = parseInt(damageMatch[1], 10);
    }
  }

  // Parse "Restore/Heal X health"
  const healMatch = text.match(/(?:[Rr]estore|[Hh]eal)\s+(\d+)\s+(?:health|HP)/);
  if (healMatch) {
    result.healHero = parseInt(healMatch[1], 10);
  }

  // Parse "Draw X card(s)"
  const drawMatch = text.match(/[Dd]raw\s+(\d+)\s+card/);
  if (drawMatch) {
    result.drawCards = parseInt(drawMatch[1], 10);
  }

  return result;
}

/** Process IMMOLATE on minion death. Returns damage dealt to the enemy hero. */
export function processImmolate(minion: BoardMinion): number {
  const stacks = getStatusStacks(minion.statusEffects, 'IMMOLATE_STACKS');
  if (stacks <= 0) {
    // Also check keywords
    const keywords = minion.card.upgraded && minion.card.upgradedKeywords
      ? minion.card.upgradedKeywords
      : minion.card.keywords;
    if (!keywords.includes('IMMOLATE')) return 0;

    // Parse immolate value from card text
    const text = minion.card.upgraded && minion.card.upgradedText
      ? minion.card.upgradedText
      : minion.card.cardText;
    const match = text.match(/[Ii]mmolate[:\s]+(\d+)/);
    return match ? parseInt(match[1], 10) : minion.currentAttack;
  }
  return stacks;
}

// ─── Guardian / Targeting ──────────────────────────────────

/** Check if any minion on the board has GUARDIAN. */
export function hasGuardian(board: BoardMinion[]): boolean {
  return board.some(
    (m) => hasStatus(m.statusEffects, 'GUARDIAN') && m.currentHealth > 0,
  );
}

/**
 * Get valid attack targets considering GUARDIAN, CLOAK, and PHASE.
 *
 * - If any board minion has GUARDIAN, only guardians can be targeted (among minions).
 * - Minions with CLOAK cannot be targeted (until they attack).
 * - Minions with PHASE cannot be targeted by attacks.
 * - Enemies are always valid attack targets for the player.
 *
 * Returns an array of target IDs (minion instanceIds or enemy IDs).
 */
export function getValidTargets(board: BoardMinion[], enemies: DungeonEnemy[]): string[] {
  const targets: string[] = [];

  // Enemies are always targetable by the player
  for (const enemy of enemies) {
    if (enemy.currentHealth > 0) {
      targets.push(enemy.id);
    }
  }

  // For enemy targeting player minions:
  // Filter out cloaked and phased minions
  const targetableMinions = board.filter(
    (m) =>
      m.currentHealth > 0 &&
      !hasStatus(m.statusEffects, 'CLOAK') &&
      !hasStatus(m.statusEffects, 'PHASE'),
  );

  const guardians = targetableMinions.filter((m) => hasStatus(m.statusEffects, 'GUARDIAN'));

  if (guardians.length > 0) {
    for (const g of guardians) {
      targets.push(g.instanceId);
    }
  } else {
    for (const m of targetableMinions) {
      targets.push(m.instanceId);
    }
  }

  return targets;
}

// ─── End of Turn ───────────────────────────────────────────

/** End the player's turn: discard the entire hand. */
export function endPlayerTurn(
  hand: RunCard[],
  discardPile: RunCard[],
): {
  hand: RunCard[];
  discardPile: RunCard[];
} {
  return {
    hand: [],
    discardPile: [...discardPile, ...hand],
  };
}

// ─── Spell Parsing ─────────────────────────────────────────

/**
 * Parse a spell card's text to extract mechanical effects.
 * Looks for common patterns in card text strings.
 */
export function parseSpellEffect(card: RunCard): {
  damage: number;
  heal: number;
  block: number;
  draw: number;
  aoeMultiplier: boolean;
  selfBuff: { attack: number; health: number } | null;
  targetBuff: { attack: number; health: number } | null;
  applyStatus: { type: StatusType; stacks: number } | null;
} {
  const text = card.upgraded && card.upgradedText ? card.upgradedText : card.cardText;
  const lowerText = text.toLowerCase();

  let damage = 0;
  let heal = 0;
  let block = 0;
  let draw = 0;
  let aoeMultiplier = false;
  let selfBuff: { attack: number; health: number } | null = null;
  let targetBuff: { attack: number; health: number } | null = null;
  let statusToApply: { type: StatusType; stacks: number } | null = null;

  // Damage
  const damageMatch = text.match(/[Dd]eal\s+(\d+)\s+damage/);
  if (damageMatch) {
    damage = parseInt(damageMatch[1], 10);
  }

  // AOE check
  if (lowerText.includes('all enemies') || lowerText.includes('all enemy') || lowerText.includes('each enemy')) {
    aoeMultiplier = true;
  }

  // Heal
  const healMatch = text.match(/(?:[Rr]estore|[Hh]eal)\s+(\d+)\s*(?:health|HP)?/);
  if (healMatch) {
    heal = parseInt(healMatch[1], 10);
  }

  // Block / Shield
  const blockMatch = text.match(/(?:[Gg]ain|[Aa]dd)\s+(\d+)\s+[Bb]lock/);
  if (blockMatch) {
    block = parseInt(blockMatch[1], 10);
  }

  // Draw
  const drawMatch = text.match(/[Dd]raw\s+(\d+)\s+card/);
  if (drawMatch) {
    draw = parseInt(drawMatch[1], 10);
  }

  // Buff: "+X/+Y" or "gain +X attack"
  const buffMatch = text.match(/[Gg]ive.*?\+(\d+)\/\+(\d+)/);
  if (buffMatch) {
    const buffValue = { attack: parseInt(buffMatch[1], 10), health: parseInt(buffMatch[2], 10) };
    if (lowerText.includes('friendly') || lowerText.includes('ally') || lowerText.includes('minion')) {
      targetBuff = buffValue;
    } else {
      selfBuff = buffValue;
    }
  }

  // Self attack buff
  if (!selfBuff) {
    const atkMatch = text.match(/[Gg]ain\s+\+?(\d+)\s+[Aa]ttack/);
    if (atkMatch) {
      selfBuff = { attack: parseInt(atkMatch[1], 10), health: 0 };
    }
  }

  // Status application
  const statusMap: Array<{ pattern: RegExp; type: StatusType }> = [
    { pattern: /(\d+)\s+[Vv]ulnerable/, type: 'VULNERABLE' },
    { pattern: /(\d+)\s+[Ww]eak/, type: 'WEAK' },
    { pattern: /(\d+)\s+[Ss]trength/, type: 'STRENGTH' },
    { pattern: /(\d+)\s+[Bb]urn/, type: 'BURN' },
  ];

  for (const { pattern, type } of statusMap) {
    const match = text.match(pattern);
    if (match) {
      statusToApply = { type, stacks: parseInt(match[1], 10) };
      break;
    }
  }

  // Also check "Apply Vulnerable/Weak" patterns without numeric prefix (default 1 stack)
  if (!statusToApply) {
    if (lowerText.includes('apply vulnerable')) {
      statusToApply = { type: 'VULNERABLE', stacks: 1 };
    } else if (lowerText.includes('apply weak')) {
      statusToApply = { type: 'WEAK', stacks: 1 };
    }
  }

  return {
    damage,
    heal,
    block,
    draw,
    aoeMultiplier,
    selfBuff,
    targetBuff,
    applyStatus: statusToApply,
  };
}
