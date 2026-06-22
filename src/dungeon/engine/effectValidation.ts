import type { CardDefinition, EffectDefinition } from '../types';
import { getActiveEffects } from './structuredEffects';

export interface EffectValidationFailure {
  cardId: string;
  path: string;
  message: string;
}

const KNOWN_EFFECT_TYPES = new Set([
  'damage',
  'block',
  'draw',
  'energy',
  'status',
  'exhaust',
  'heat',
  'vent_damage',
  'heal',
  'self_damage',
  'lumen',
  'augment',
  'summon',
  'rift',
  'choice',
  'conditional',
  'trigger',
]);

function positiveInteger(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function validateEffect(cardId: string, effect: EffectDefinition, path: string): EffectValidationFailure[] {
  const failures: EffectValidationFailure[] = [];
  const type = (effect as { type?: unknown }).type;
  if (typeof type !== 'string' || !KNOWN_EFFECT_TYPES.has(type)) {
    return [{ cardId, path, message: `unknown effect type: ${String(type)}` }];
  }

  switch (effect.type) {
    case 'damage':
    case 'block':
    case 'draw':
    case 'energy':
    case 'heat':
    case 'heal':
    case 'self_damage':
      if (!positiveInteger(effect.amount)) failures.push({ cardId, path, message: `${effect.type}.amount must be a positive integer` });
      break;
    case 'vent_damage':
      if (!positiveInteger(effect.base)) failures.push({ cardId, path, message: 'vent_damage.base must be a positive integer' });
      if (!positiveInteger(effect.perHeat)) failures.push({ cardId, path, message: 'vent_damage.perHeat must be a positive integer' });
      if (!positiveInteger(effect.maxHeat)) failures.push({ cardId, path, message: 'vent_damage.maxHeat must be a positive integer' });
      break;
    case 'status':
      if (!positiveInteger(effect.stacks)) failures.push({ cardId, path, message: 'status.stacks must be a positive integer' });
      break;
    case 'lumen':
      if (!positiveInteger(effect.amount)) failures.push({ cardId, path, message: 'lumen.amount must be a positive integer' });
      break;
    case 'summon':
      if (!effect.name.trim()) failures.push({ cardId, path, message: 'summon.name is required' });
      if (!positiveInteger(effect.health)) failures.push({ cardId, path, message: 'summon.health must be a positive integer' });
      if (!positiveInteger(effect.damage)) failures.push({ cardId, path, message: 'summon.damage must be a positive integer' });
      break;
    case 'rift':
      if (!positiveInteger(effect.turns)) failures.push({ cardId, path, message: 'rift.turns must be a positive integer' });
      break;
    case 'choice':
      if (effect.options.length < 2) failures.push({ cardId, path, message: 'choice requires at least two options' });
      effect.options.forEach((option, index) => {
        if (!option.id.trim()) failures.push({ cardId, path: `${path}.options[${index}]`, message: 'choice option id is required' });
        if (!option.label.trim()) failures.push({ cardId, path: `${path}.options[${index}]`, message: 'choice option label is required' });
        failures.push(...validateEffects(cardId, option.effects, `${path}.options[${index}].effects`));
      });
      break;
    case 'conditional':
      failures.push(...validateEffects(cardId, effect.effects, `${path}.effects`));
      break;
    case 'trigger':
      failures.push(...validateEffects(cardId, effect.effects, `${path}.effects`));
      break;
    case 'augment':
    case 'exhaust':
      break;
  }

  return failures;
}

function validateEffects(cardId: string, effects: EffectDefinition[], path: string): EffectValidationFailure[] {
  if (effects.length === 0) {
    return [{ cardId, path, message: 'effect list must not be empty' }];
  }
  return effects.flatMap((effect, index) => validateEffect(cardId, effect, `${path}[${index}]`));
}

export function validateCardEffects(cards: CardDefinition[]): EffectValidationFailure[] {
  const failures: EffectValidationFailure[] = [];
  for (const card of cards) {
    if (card.effects) failures.push(...validateEffects(card.id, card.effects, 'effects'));
    if (card.upgradeEffects) failures.push(...validateEffects(card.id, card.upgradeEffects, 'upgradeEffects'));
  }
  return failures;
}

export function cardsUsingStructuredEffects(cards: CardDefinition[]): CardDefinition[] {
  return cards.filter((card) => (getActiveEffects(card)?.length ?? card.effects?.length ?? 0) > 0);
}

