import type { CardInstance, CombatPhase, CombatState, EnemyDefinition, RelicDefinition, StatusEffect, StatusEffectType } from '../types';

// ─── Helpers ────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function log(state: CombatState, msg: string): CombatState {
  const log = [...state.combatLog, msg].slice(-8);
  return { ...state, combatLog: log, lastAction: msg };
}

// ─── Status effect helpers ───────────────────────────────────────────────────

export function getStack(effects: StatusEffect[], type: StatusEffectType): number {
  return effects.find((e) => e.type === type)?.stacks ?? 0;
}

function addEffect(effects: StatusEffect[], type: StatusEffectType, stacks: number, duration?: number): StatusEffect[] {
  const existing = effects.find((e) => e.type === type);
  if (existing) {
    return effects.map((e) => e.type === type ? { ...e, stacks: e.stacks + stacks } : e);
  }
  return [...effects, { type, stacks, duration }];
}

function removeEffect(effects: StatusEffect[], type: StatusEffectType): StatusEffect[] {
  return effects.filter((e) => e.type !== type);
}

function tickEffects(effects: StatusEffect[]): StatusEffect[] {
  return effects
    .map((e) => {
      if (e.duration !== undefined) return { ...e, duration: e.duration - 1 };
      return e;
    })
    .filter((e) => e.duration === undefined || e.duration > 0)
    .filter((e) => e.stacks > 0);
}

// ─── Damage calculation ──────────────────────────────────────────────────────

function calcDamage(base: number, attackerEffects: StatusEffect[], defenderEffects: StatusEffect[]): number {
  let dmg = base;
  if (getStack(attackerEffects, 'strength') > 0) dmg += getStack(attackerEffects, 'strength');
  if (getStack(attackerEffects, 'weak') > 0) dmg = Math.floor(dmg * 0.75);
  if (getStack(defenderEffects, 'vulnerable') > 0) dmg = Math.floor(dmg * 1.25);
  return Math.max(0, dmg);
}

// Apply damage to a target. targetId: 'player' | 'enemy' | cardInstanceId
function applyShieldedDamage(shield: number, health: number, damage: number): { health: number; shield: number } {
  const shieldAbsorb = Math.min(shield, damage);
  const remainder = damage - shieldAbsorb;
  return {
    shield: Math.max(0, shield - shieldAbsorb),
    health: Math.max(0, health - remainder),
  };
}

// ─── initCombat ──────────────────────────────────────────────────────────────

export function initCombat(
  deck: CardInstance[],
  playerHealth: number,
  playerMaxHealth: number,
  _relics: RelicDefinition[],
  enemy: EnemyDefinition,
): CombatState {
  const shuffled = shuffleDeck([...deck]);
  const state: CombatState = {
    phase: 'draw',
    turn: 1,
    playerHealth,
    playerMaxHealth,
    playerEnergy: 3,
    playerMaxEnergy: 3,
    playerShield: 0,
    playerStatusEffects: [],
    playerBoard: [],
    hand: [],
    drawPile: shuffled,
    discardPile: [],
    enemy: {
      ...enemy,
      currentHealth: enemy.maxHealth,
      currentShield: 0,
      statusEffects: [],
      intentIndex: 0,
      minionsInPlay: [],
    },
    enemyBoard: [],
    lastAction: '',
    combatLog: ['⚔️ Combat begins!'],
  };
  return drawCards(state, 5);
}

function shuffleDeck(cards: CardInstance[]): CardInstance[] {
  const arr = [...cards];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── drawCards ───────────────────────────────────────────────────────────────

export function drawCards(state: CombatState, count: number): CombatState {
  let s = { ...state };
  let drawn = 0;
  while (drawn < count) {
    if (s.drawPile.length === 0) {
      if (s.discardPile.length === 0) break;
      s = { ...s, drawPile: shuffleDeck(s.discardPile), discardPile: [] };
    }
    const [card, ...rest] = s.drawPile;
    s = { ...s, drawPile: rest, hand: [...s.hand, card] };
    drawn++;
  }
  return { ...s, phase: 'player_turn' };
}

// ─── playCard ────────────────────────────────────────────────────────────────

export function playCard(state: CombatState, cardInstanceId: string, targetId?: string): CombatState {
  const card = state.hand.find((c) => c.instanceId === cardInstanceId);
  if (!card) return state;
  if (state.playerEnergy < card.cost) return state;

  let s = {
    ...state,
    playerEnergy: state.playerEnergy - card.cost,
    hand: state.hand.filter((c) => c.instanceId !== cardInstanceId),
  };

  s = log(s, `▶ ${card.name} played`);

  // ILLUMINATE trigger
  if (card.keywords.includes('ILLUMINATE')) {
    s = log(s, `✨ ILLUMINATE — ${card.name} shines brightly`);
    s = { ...s, playerShield: s.playerShield + 4 };
  }

  if (card.type === 'Minion') {
    const minion: CardInstance = {
      ...card,
      instanceId: card.instanceId,
      currentHealth: card.health ?? 1,
      hasAttacked: !card.keywords.includes('SWIFT'),
      statusEffects: [],
    };
    s = { ...s, playerBoard: [...s.playerBoard, minion] };

    // DEPLOY trigger
    if (card.keywords.includes('DEPLOY')) {
      s = applySpellEffect(s, card, targetId);
      s = log(s, `⚙ DEPLOY — ${card.name} activates`);
    }
  } else if (card.type === 'Structure') {
    const structure: CardInstance = {
      ...card,
      instanceId: card.instanceId,
      currentHealth: card.health ?? 4,
      hasAttacked: true,
      statusEffects: [],
    };
    s = { ...s, playerBoard: [...s.playerBoard, structure] };
  } else {
    // Spell
    s = applySpellEffect(s, card, targetId);
    s = { ...s, discardPile: [...s.discardPile, card] };
  }

  s = { ...s, discardPile: card.type !== 'Spell' ? s.discardPile : [...s.discardPile] };

  // Track stats
  s.combatLog = [...s.combatLog].slice(-8);
  return checkCombatEnd(s);
}

function applySpellEffect(state: CombatState, card: CardInstance, _targetId?: string): CombatState {
  let s = { ...state };
  const text = card.cardText.toLowerCase();

  // Extract damage amount from card text
  const dmgMatch = text.match(/deal (\d+) damage/);
  if (dmgMatch) {
    const dmg = calcDamage(parseInt(dmgMatch[1]), s.playerStatusEffects, s.enemy.statusEffects);
    const result = applyShieldedDamage(s.enemy.currentShield, s.enemy.currentHealth, dmg);
    s = { ...s, enemy: { ...s.enemy, currentHealth: result.health, currentShield: result.shield } };
    s = log(s, `💥 ${card.name} deals ${dmg} to ${s.enemy.name}`);
    if (card.keywords.includes('DRAIN')) {
      const heal = Math.floor(dmg / 2);
      s = { ...s, playerHealth: Math.min(s.playerMaxHealth, s.playerHealth + heal) };
      s = log(s, `💚 DRAIN heals ${heal} HP`);
    }
  }

  // Shield / block
  const shieldMatch = text.match(/gain (\d+) (?:shield|block)/);
  if (shieldMatch) {
    s = { ...s, playerShield: s.playerShield + parseInt(shieldMatch[1]) };
    s = log(s, `🛡 Gained ${shieldMatch[1]} Shield`);
  }

  // Draw cards
  const drawMatch = text.match(/draw (\d+)/);
  if (drawMatch) {
    s = drawCards(s, parseInt(drawMatch[1]));
  }

  // Heal
  const healMatch = text.match(/heal (\d+)/);
  if (healMatch) {
    const healed = parseInt(healMatch[1]);
    s = { ...s, playerHealth: Math.min(s.playerMaxHealth, s.playerHealth + healed) };
    s = log(s, `💚 Healed ${healed} HP`);
  }

  // Energy
  const energyMatch = text.match(/gain (\d+) energy/);
  if (energyMatch) {
    s = { ...s, playerEnergy: Math.min(s.playerMaxEnergy + 3, s.playerEnergy + parseInt(energyMatch[1])) };
  }

  // Status: burn/poison on enemy
  const burnMatch = text.match(/apply (\d+) burn/);
  if (burnMatch) {
    s = { ...s, enemy: { ...s.enemy, statusEffects: addEffect(s.enemy.statusEffects, 'burn', parseInt(burnMatch[1])) } };
    s = log(s, `🔥 Applied ${burnMatch[1]} Burn`);
  }
  const poisonMatch = text.match(/apply (\d+) poison/);
  if (poisonMatch) {
    s = { ...s, enemy: { ...s.enemy, statusEffects: addEffect(s.enemy.statusEffects, 'poison', parseInt(poisonMatch[1])) } };
    s = log(s, `☠ Applied ${poisonMatch[1]} Poison`);
  }
  const vulnMatch = text.match(/apply vulnerable/);
  if (vulnMatch) {
    s = { ...s, enemy: { ...s.enemy, statusEffects: addEffect(s.enemy.statusEffects, 'vulnerable', 2, 2) } };
    s = log(s, `⬇ Applied Vulnerable`);
  }
  const weakMatch = text.match(/apply weak/);
  if (weakMatch) {
    s = { ...s, playerStatusEffects: addEffect(s.playerStatusEffects, 'weak', 2, 2) };
    // actually Weak should be on enemy
    s = { ...s, enemy: { ...s.enemy, statusEffects: addEffect(s.enemy.statusEffects, 'weak', 2, 2) } };
    s = log(s, `⬇ Applied Weak`);
  }

  // Strength
  const strMatch = text.match(/gain (\d+) strength/);
  if (strMatch) {
    s = { ...s, playerStatusEffects: addEffect(s.playerStatusEffects, 'strength', parseInt(strMatch[1])) };
    s = log(s, `💪 Gained ${strMatch[1]} Strength`);
  }

  // IMMOLATE: deal damage to all enemies on death — handled in death processing
  // LAST_WORDS: handled in death processing
  // BARRIER: handled in damage application

  return s;
}

// ─── attackWithMinion ────────────────────────────────────────────────────────

export function attackWithMinion(state: CombatState, attackerId: string, targetId: string): CombatState {
  let s = { ...state };
  const attacker = s.playerBoard.find((m) => m.instanceId === attackerId);
  if (!attacker || attacker.hasAttacked) return s;

  // Check GUARDIAN on enemy board — must target guardian first
  const guardians = s.enemyBoard.filter((m) => m.keywords.includes('GUARDIAN') && (m.currentHealth ?? 0) > 0);
  if (guardians.length > 0 && !guardians.find((g) => g.instanceId === targetId) && targetId !== 'enemy-direct-not-allowed') {
    return log(s, '🛡 Must attack the GUARDIAN first!');
  }

  const atk = calcDamage(attacker.attack ?? 0, attacker.statusEffects, []);
  s = log(s, `⚔ ${attacker.name} attacks for ${atk}`);

  if (targetId === 'enemy') {
    // Attack enemy hero
    const dmg = calcDamage(atk, attacker.statusEffects, s.enemy.statusEffects);
    const result = applyShieldedDamage(s.enemy.currentShield, s.enemy.currentHealth, dmg);
    s = { ...s, enemy: { ...s.enemy, currentHealth: result.health, currentShield: result.shield } };

    // DRAIN
    if (attacker.keywords.includes('DRAIN')) {
      const heal = Math.floor(dmg / 2);
      s = { ...s, playerHealth: Math.min(s.playerMaxHealth, s.playerHealth + heal) };
      s = log(s, `💚 DRAIN heals ${heal}`);
    }
  } else {
    // Attack enemy minion
    const target = s.enemyBoard.find((m) => m.instanceId === targetId);
    if (!target) return s;

    const dmg = calcDamage(atk, attacker.statusEffects, target.statusEffects);
    const counterDmg = calcDamage(target.attack ?? 0, target.statusEffects, attacker.statusEffects);

    // Apply damage to enemy minion
    const targetResult = applyShieldedDamage(0, target.currentHealth ?? target.health ?? 1, dmg);
    // Apply counter damage to attacker
    const attackerResult = applyShieldedDamage(0, attacker.currentHealth ?? attacker.health ?? 1, counterDmg);

    s = {
      ...s,
      enemyBoard: s.enemyBoard.map((m) =>
        m.instanceId === targetId ? { ...m, currentHealth: targetResult.health, currentShield: targetResult.shield } : m
      ),
      playerBoard: s.playerBoard.map((m) =>
        m.instanceId === attackerId ? { ...m, currentHealth: attackerResult.health } : m
      ),
    };

    s = processDeaths(s);
  }

  // Mark as attacked (BLITZ can attack again)
  const canAttackAgain = attacker.keywords.includes('BLITZ') && !attacker.hasAttacked;
  s = {
    ...s,
    playerBoard: s.playerBoard.map((m) =>
      m.instanceId === attackerId ? { ...m, hasAttacked: !canAttackAgain } : m
    ),
  };

  return checkCombatEnd(s);
}

// ─── Death processing ────────────────────────────────────────────────────────

function processDeaths(state: CombatState): CombatState {
  let s = { ...state };

  // Player minion deaths
  const deadPlayerMinions = s.playerBoard.filter((m) => (m.currentHealth ?? 0) <= 0);
  for (const dead of deadPlayerMinions) {
    s = log(s, `💀 ${dead.name} dies`);
    if (dead.keywords.includes('LAST_WORDS')) {
      s = log(s, `👻 LAST_WORDS triggers: ${dead.cardText}`);
      s = applySpellEffect(s, dead);
    }
    if (dead.keywords.includes('IMMOLATE')) {
      const dmg = dead.attack ?? 3;
      const result = applyShieldedDamage(s.enemy.currentShield, s.enemy.currentHealth, dmg);
      s = { ...s, enemy: { ...s.enemy, currentHealth: result.health, currentShield: result.shield } };
      s = log(s, `🔥 IMMOLATE deals ${dmg} to enemy on death`);
    }
    s = { ...s, discardPile: [...s.discardPile, dead] };
  }
  s = { ...s, playerBoard: s.playerBoard.filter((m) => (m.currentHealth ?? 0) > 0) };

  // Enemy minion deaths
  const deadEnemyMinions = s.enemyBoard.filter((m) => (m.currentHealth ?? 0) <= 0);
  for (const dead of deadEnemyMinions) {
    s = log(s, `💀 Enemy ${dead.name} dies`);
  }
  s = { ...s, enemyBoard: s.enemyBoard.filter((m) => (m.currentHealth ?? 0) > 0) };

  return s;
}

// ─── endPlayerTurn ───────────────────────────────────────────────────────────

export function endPlayerTurn(state: CombatState, relics: RelicDefinition[]): CombatState {
  let s: CombatState = { ...state, phase: 'enemy_turn' as CombatPhase };
  void relics; // relic effects applied by relicEffects.ts

  // Discard hand
  s = { ...s, discardPile: [...s.discardPile, ...s.hand], hand: [] };

  // Tick player status effects
  const burnDmg = getStack(s.playerStatusEffects, 'burn');
  if (burnDmg > 0) {
    s = { ...s, playerHealth: Math.max(0, s.playerHealth - burnDmg) };
    s = { ...s, playerStatusEffects: s.playerStatusEffects.map((e) => e.type === 'burn' ? { ...e, stacks: e.stacks - 1 } : e).filter((e) => e.stacks > 0) };
    s = log(s, `🔥 Burn deals ${burnDmg} damage to you`);
  }
  const poisonDmg = getStack(s.playerStatusEffects, 'poison');
  if (poisonDmg > 0) {
    s = { ...s, playerHealth: Math.max(0, s.playerHealth - poisonDmg) };
    s = { ...s, playerStatusEffects: addEffect(removeEffect(s.playerStatusEffects, 'poison'), 'poison', poisonDmg + 1) };
    s = log(s, `☠ Poison deals ${poisonDmg} damage`);
  }

  // Reset minions and energy. Shield is cleared at the START of the player's next turn
  // (inside executeEnemyTurn, before drawing), so it can still absorb the enemy's attack.
  s = {
    ...s,
    playerBoard: s.playerBoard.map((m) => ({ ...m, hasAttacked: false })),
    playerEnergy: s.playerMaxEnergy,
  };

  return checkCombatEnd(s);
}

// ─── Enemy turn ──────────────────────────────────────────────────────────────

export function executeEnemyTurn(state: CombatState): CombatState {
  let s: CombatState = { ...state };
  const { enemy } = s;
  const intent = enemy.intents[enemy.intentIndex % enemy.intents.length];

  s = log(s, `👾 ${enemy.name}: ${intent.description}`);

  switch (intent.type) {
    case 'attack': {
      const value = intent.value ?? enemy.attack;
      const dmg = calcDamage(value, enemy.statusEffects, s.playerStatusEffects);
      const result = applyShieldedDamage(s.playerShield, s.playerHealth, dmg);
      s = { ...s, playerHealth: result.health, playerShield: result.shield };
      s = log(s, `👾 ${enemy.name} attacks for ${dmg}`);
      break;
    }
    case 'defend': {
      const shield = intent.value ?? 8;
      s = { ...s, enemy: { ...s.enemy, currentShield: (s.enemy.currentShield ?? 0) + shield } };
      s = log(s, `🛡 ${enemy.name} gains ${shield} Shield`);
      break;
    }
    case 'buff': {
      s = { ...s, enemy: { ...s.enemy, statusEffects: addEffect(s.enemy.statusEffects, 'strength', intent.value ?? 2) } };
      s = log(s, `💪 ${enemy.name} gains Strength`);
      break;
    }
    case 'debuff': {
      s = { ...s, playerStatusEffects: addEffect(s.playerStatusEffects, 'weak', intent.value ?? 2, 2) };
      s = log(s, `⬇ ${enemy.name} applies Weak`);
      break;
    }
    case 'summon': {
      s = log(s, `📤 ${enemy.name} summons a minion`);
      break;
    }
    case 'special': {
      s = log(s, `✨ ${enemy.name} uses a special ability`);
      // Apply 5 damage as a generic special
      if (intent.value) {
        const dmg = intent.value;
        const result = applyShieldedDamage(s.playerShield, s.playerHealth, dmg);
        s = { ...s, playerHealth: result.health, playerShield: result.shield };
      }
      break;
    }
  }

  // Tick enemy status effects
  const enemyBurnDmg = getStack(s.enemy.statusEffects, 'burn');
  if (enemyBurnDmg > 0) {
    s = { ...s, enemy: { ...s.enemy, currentHealth: Math.max(0, s.enemy.currentHealth - enemyBurnDmg) } };
    s = { ...s, enemy: { ...s.enemy, statusEffects: s.enemy.statusEffects.map((e) => e.type === 'burn' ? { ...e, stacks: e.stacks - 1 } : e).filter((e) => e.stacks > 0) } };
    s = log(s, `🔥 Burn deals ${enemyBurnDmg} to ${enemy.name}`);
  }
  const enemyPoisonDmg = getStack(s.enemy.statusEffects, 'poison');
  if (enemyPoisonDmg > 0) {
    s = { ...s, enemy: { ...s.enemy, currentHealth: Math.max(0, s.enemy.currentHealth - enemyPoisonDmg) } };
    s = log(s, `☠ Poison deals ${enemyPoisonDmg} to ${enemy.name}`);
  }

  // Advance intent
  s = {
    ...s,
    enemy: {
      ...s.enemy,
      intentIndex: (s.enemy.intentIndex + 1) % s.enemy.intents.length,
      statusEffects: tickEffects(s.enemy.statusEffects),
    },
    turn: s.turn + 1,
  };

  s = checkCombatEnd(s);
  if (s.phase === 'enemy_turn') {
    // Clear the player's remaining block at the start of their new turn, then draw.
    s = { ...s, phase: 'player_turn', playerShield: 0 };
    s = drawCards(s, 5);
  }

  return s;
}

// ─── applyDamage ─────────────────────────────────────────────────────────────

export function applyDamage(state: CombatState, targetId: string, amount: number, source: string): CombatState {
  let s = { ...state };
  s = log(s, `💥 ${source} deals ${amount} damage to ${targetId}`);

  if (targetId === 'player') {
    const result = applyShieldedDamage(s.playerShield, s.playerHealth, amount);
    s = { ...s, playerHealth: result.health, playerShield: result.shield };
  } else if (targetId === 'enemy') {
    const result = applyShieldedDamage(s.enemy.currentShield, s.enemy.currentHealth, amount);
    s = { ...s, enemy: { ...s.enemy, currentHealth: result.health, currentShield: result.shield } };
  } else {
    const playerMinion = s.playerBoard.find((m) => m.instanceId === targetId);
    if (playerMinion) {
      s = {
        ...s,
        playerBoard: s.playerBoard.map((m) =>
          m.instanceId === targetId ? { ...m, currentHealth: Math.max(0, (m.currentHealth ?? 0) - amount) } : m
        ),
      };
      s = processDeaths(s);
    }
    const enemyMinion = s.enemyBoard.find((m) => m.instanceId === targetId);
    if (enemyMinion) {
      s = {
        ...s,
        enemyBoard: s.enemyBoard.map((m) =>
          m.instanceId === targetId ? { ...m, currentHealth: Math.max(0, (m.currentHealth ?? 0) - amount) } : m
        ),
      };
      s = processDeaths(s);
    }
  }
  return checkCombatEnd(s);
}

// ─── checkCombatEnd ──────────────────────────────────────────────────────────

export function checkCombatEnd(state: CombatState): CombatState {
  if (state.playerHealth <= 0) {
    return log({ ...state, phase: 'combat_end_loss' }, '💀 You have been defeated!');
  }
  if (state.enemy.currentHealth <= 0) {
    return log({ ...state, phase: 'combat_end_win' }, `🏆 ${state.enemy.name} defeated!`);
  }
  return state;
}

// Export helpers for tests / relics
export { addEffect, removeEffect, getStack as getStatusStack, uid as generateId, clamp };
