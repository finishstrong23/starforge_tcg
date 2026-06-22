import type {
  CardDefinition,
  CardInstance,
  CombatState,
  ConditionDefinition,
  EffectDefinition,
  EffectTarget,
  Rift,
  StatusEffect,
  StatusEffectType,
} from '../types';
import { getCardText } from './cardStats';
import { addHeat } from './heat';

export function getActiveEffects(card: CardDefinition | CardInstance): EffectDefinition[] | undefined {
  if ('upgraded' in card && card.upgraded && card.upgradeEffects) return card.upgradeEffects;
  return card.effects;
}

export function hasStructuredEffects(card: CardDefinition | CardInstance): boolean {
  return (getActiveEffects(card)?.length ?? 0) > 0;
}

function getStack(effects: StatusEffect[], type: StatusEffectType): number {
  return effects.find((e) => e.type === type)?.stacks ?? 0;
}

function addEffect(effects: StatusEffect[], type: StatusEffectType, stacks: number, duration?: number): StatusEffect[] {
  const existing = effects.find((e) => e.type === type);
  if (existing) {
    return effects.map((e) => e.type === type ? { ...e, stacks: e.stacks + stacks } : e);
  }
  return [...effects, { type, stacks, duration }];
}

function calcDamage(base: number, attackerEffects: StatusEffect[], defenderEffects: StatusEffect[]): number {
  let dmg = base;
  const strength = getStack(attackerEffects, 'strength');
  if (strength > 0) dmg += strength;
  if (getStack(attackerEffects, 'weak') > 0) dmg = Math.floor(dmg * 0.75);
  if (getStack(defenderEffects, 'vulnerable') > 0) dmg = Math.floor(dmg * 1.25);
  return Math.max(0, dmg);
}

function applyShieldedDamage(shield: number, health: number, damage: number): { health: number; shield: number } {
  const shieldAbsorb = Math.min(shield, damage);
  const remainder = damage - shieldAbsorb;
  return {
    shield: Math.max(0, shield - shieldAbsorb),
    health: Math.max(0, health - remainder),
  };
}

function gainBlock(state: CombatState, amount: number): CombatState {
  if (amount <= 0) return state;
  const dex = getStack(state.playerStatusEffects, 'dexterity');
  return { ...state, playerShield: state.playerShield + amount + dex };
}

function log(state: CombatState, msg: string): CombatState {
  return {
    ...state,
    combatLog: [...state.combatLog, msg].slice(-8),
    lastAction: msg,
  };
}

function targetStatusEffects(state: CombatState, target: EffectTarget): StatusEffect[] {
  return target === 'player' ? state.playerStatusEffects : state.enemy.statusEffects;
}

function conditionMet(state: CombatState, card: CardInstance, condition: ConditionDefinition): boolean {
  switch (condition.type) {
    case 'heat_at_least':
      return state.playerHeat >= condition.amount;
    case 'has_status':
      return getStack(targetStatusEffects(state, condition.target), condition.status) >= (condition.stacksAtLeast ?? 1);
    case 'card_is_upgraded':
      return card.upgraded;
  }
}

function normalizeChoiceText(text: string): string {
  return text.toLowerCase().replace(/[.!?]+$/g, '').trim();
}

function drawCardsDeterministic(state: CombatState, amount: number): CombatState {
  let s = { ...state };
  for (let i = 0; i < amount; i++) {
    if (s.drawPile.length === 0) {
      if (s.discardPile.length === 0) break;
      s = { ...s, drawPile: [...s.discardPile], discardPile: [] };
    }
    const [card, ...rest] = s.drawPile;
    s = { ...s, drawPile: rest, hand: [...s.hand, card] };
  }
  return s;
}

function grantLumens(state: CombatState, amount: number, mode: 'each' | 'first' | 'distributed'): CombatState {
  const isChannel = (card: CardInstance): boolean =>
    card.keywords.includes('ILLUMINATE') && /(^|\s)channel\./i.test(getCardText(card));
  const channels = state.hand.filter(isChannel);
  if (channels.length === 0) return state;

  if (mode === 'each') {
    return {
      ...state,
      hand: state.hand.map((c) => isChannel(c) ? { ...c, lumens: (c.lumens ?? 0) + amount } : c),
    };
  }

  if (mode === 'first') {
    const idx = state.hand.findIndex(isChannel);
    return {
      ...state,
      hand: state.hand.map((c, i) => i === idx ? { ...c, lumens: (c.lumens ?? 0) + amount } : c),
    };
  }

  const per = Math.floor(amount / channels.length);
  const remainder = amount % channels.length;
  let firstAssigned = false;
  return {
    ...state,
    hand: state.hand.map((c) => {
      if (!isChannel(c)) return c;
      const extra = !firstAssigned ? remainder : 0;
      firstAssigned = true;
      return { ...c, lumens: (c.lumens ?? 0) + per + extra };
    }),
  };
}

function applyOneEffect(
  state: CombatState,
  card: CardInstance,
  effect: EffectDefinition,
  choiceOverride?: string,
): CombatState {
  switch (effect.type) {
    case 'damage': {
      const dmg = calcDamage(effect.amount, state.playerStatusEffects, state.enemy.statusEffects);
      const result = applyShieldedDamage(state.enemy.currentShield, state.enemy.currentHealth, dmg);
      let s = {
        ...state,
        enemy: { ...state.enemy, currentHealth: result.health, currentShield: result.shield },
      };
      if (card.keywords.includes('DRAIN')) {
        const heal = Math.floor(dmg / 2);
        s = { ...s, playerHealth: Math.min(s.playerMaxHealth, s.playerHealth + heal) };
      }
      return log(s, `${card.name} deals ${dmg} damage`);
    }
    case 'block':
      return log(gainBlock(state, effect.amount), `${card.name} grants ${effect.amount} Block`);
    case 'draw':
      return log(drawCardsDeterministic(state, effect.amount), `${card.name} draws ${effect.amount}`);
    case 'energy':
      return log({
        ...state,
        playerEnergy: Math.min(state.playerMaxEnergy + 3, state.playerEnergy + effect.amount),
      }, `${card.name} gains ${effect.amount} Energy`);
    case 'status': {
      if (effect.target === 'player') {
        return log({
          ...state,
          playerStatusEffects: addEffect(state.playerStatusEffects, effect.status, effect.stacks, effect.duration),
        }, `${card.name} applies ${effect.status} ${effect.stacks}`);
      }
      return log({
        ...state,
        enemy: {
          ...state.enemy,
          statusEffects: addEffect(state.enemy.statusEffects, effect.status, effect.stacks, effect.duration),
        },
      }, `${card.name} applies ${effect.status} ${effect.stacks}`);
    }
    case 'exhaust':
      return state;
    case 'heat': {
      const heat = addHeat(state.playerHeat, effect.amount);
      return log(
        { ...state, playerHeat: heat.next },
        heat.wasted > 0
          ? `${card.name} gains ${heat.gained} Heat (${heat.wasted} wasted at cap)`
          : `${card.name} gains ${heat.gained} Heat`,
      );
    }
    case 'heal':
      return log({
        ...state,
        playerHealth: Math.min(state.playerMaxHealth, state.playerHealth + effect.amount),
      }, `${card.name} heals ${effect.amount}`);
    case 'self_damage':
      return log({
        ...state,
        playerHealth: Math.max(0, state.playerHealth - effect.amount),
      }, `${card.name} costs ${effect.amount} HP`);
    case 'lumen':
      return log(grantLumens(state, effect.amount, effect.mode), `${card.name} grants ${effect.amount} Lumen`);
    case 'augment':
      return state;
    case 'summon': {
      const turns = effect.turns ?? -1;
      const summon: CardInstance = {
        id: `summon-${card.id}`,
        instanceId: `summon-${card.instanceId}-${state.playerBoard.length}`,
        name: effect.name,
        faction: card.faction,
        type: 'Minion',
        cost: 0,
        attack: effect.damage,
        health: effect.health,
        currentHealth: effect.health,
        keywords: [],
        cardText: `Summon. Auto-attacks for ${effect.damage} at turn end.`,
        rarity: 'Common',
        complexityTier: 1,
        upgraded: false,
        statusEffects: [],
        hasAttacked: true,
        summonAutoDamage: effect.damage,
        summonActionsPerTurn: effect.actionsPerTurn ?? 1,
        summonTurnsLeft: turns,
      };
      return log({ ...state, playerBoard: [...state.playerBoard, summon] }, `${card.name} summons ${effect.name}`);
    }
    case 'rift': {
      const rift: Rift = { type: effect.rift, turnsRemaining: effect.turns };
      return log({ ...state, playerRifts: [...state.playerRifts, rift] }, `${card.name} opens a ${effect.rift} Rift`);
    }
    case 'choice': {
      const picked = choiceOverride
        ? effect.options.find((o) => normalizeChoiceText(o.label) === normalizeChoiceText(choiceOverride))
        : effect.options[0];
      if (!picked) return state;
      return applyStructuredEffects(state, card, picked.effects);
    }
    case 'conditional':
      return conditionMet(state, card, effect.condition)
        ? applyStructuredEffects(state, card, effect.effects, choiceOverride)
        : state;
    case 'trigger':
      return effect.trigger === 'play'
        ? applyStructuredEffects(state, card, effect.effects, choiceOverride)
        : state;
  }
}

export function applyStructuredEffects(
  state: CombatState,
  card: CardInstance,
  effects: EffectDefinition[],
  choiceOverride?: string,
): CombatState {
  return effects.reduce(
    (s, effect) => applyOneEffect(s, card, effect, choiceOverride),
    state,
  );
}

export function applyStructuredCardEffects(
  state: CombatState,
  card: CardInstance,
  choiceOverride?: string,
): CombatState {
  return applyStructuredEffects(state, card, getActiveEffects(card) ?? [], choiceOverride);
}

