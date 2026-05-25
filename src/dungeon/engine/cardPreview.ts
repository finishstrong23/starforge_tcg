import type {
  CardInstance,
  CombatState,
  ConditionDefinition,
  EffectDefinition,
  EffectTarget,
  StatusEffect,
  StatusEffectType,
} from '../types';
import { getActiveEffects, hasStructuredEffects } from './structuredEffects';

export interface CardPlayPreview {
  exact: boolean;
  lines: string[];
}

function getStack(effects: StatusEffect[], type: StatusEffectType): number {
  return effects.find((e) => e.type === type)?.stacks ?? 0;
}

function calcDamage(base: number, attackerEffects: StatusEffect[], defenderEffects: StatusEffect[]): number {
  let dmg = base;
  const strength = getStack(attackerEffects, 'strength');
  if (strength > 0) dmg += strength;
  if (getStack(attackerEffects, 'weak') > 0) dmg = Math.floor(dmg * 0.75);
  if (getStack(defenderEffects, 'vulnerable') > 0) dmg = Math.floor(dmg * 1.25);
  return Math.max(0, dmg);
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

function addUnique(lines: string[], line: string): void {
  if (!lines.includes(line)) lines.push(line);
}

function summarizeEffects(state: CombatState, card: CardInstance, effects: EffectDefinition[]): string[] {
  const lines: string[] = [];

  for (const effect of effects) {
    switch (effect.type) {
      case 'damage': {
        const dmg = calcDamage(effect.amount, state.playerStatusEffects, state.enemy.statusEffects);
        addUnique(lines, `Deal ${dmg}`);
        if (card.keywords.includes('DRAIN')) addUnique(lines, `Heal ${Math.floor(dmg / 2)}`);
        break;
      }
      case 'block': {
        const block = effect.amount + getStack(state.playerStatusEffects, 'dexterity');
        addUnique(lines, `Block +${block}`);
        break;
      }
      case 'draw':
        addUnique(lines, `Draw ${effect.amount}`);
        break;
      case 'energy':
        addUnique(lines, `Energy +${effect.amount}`);
        break;
      case 'status':
        addUnique(lines, `${effect.target === 'player' ? 'Self' : 'Enemy'} ${effect.status} +${effect.stacks}`);
        break;
      case 'heat':
        addUnique(lines, `Heat +${effect.amount}`);
        break;
      case 'heal':
        addUnique(lines, `Heal ${effect.amount}`);
        break;
      case 'self_damage':
        addUnique(lines, `Lose ${effect.amount} HP`);
        break;
      case 'lumen': {
        const channelCount = state.hand.filter((c) => c.keywords.includes('ILLUMINATE')).length;
        if (channelCount > 0) addUnique(lines, `Lumen +${effect.amount}`);
        break;
      }
      case 'summon':
        addUnique(lines, `Summon ${effect.name}`);
        break;
      case 'rift':
        addUnique(lines, `${effect.rift} Rift ${effect.turns}t`);
        break;
      case 'choice': {
        const options = effect.options.map((option) => summarizeEffects(state, card, option.effects).join(', '));
        addUnique(lines, `Choose: ${options.join(' or ')}`);
        break;
      }
      case 'conditional':
        if (conditionMet(state, card, effect.condition)) {
          for (const line of summarizeEffects(state, card, effect.effects)) addUnique(lines, line);
        }
        break;
      case 'trigger':
        if (effect.trigger === 'play') {
          for (const line of summarizeEffects(state, card, effect.effects)) addUnique(lines, line);
        }
        break;
      case 'augment':
      case 'exhaust':
        break;
    }
  }

  return lines;
}

export function getCardPlayPreview(state: CombatState, card: CardInstance): CardPlayPreview | null {
  if (!hasStructuredEffects(card)) return null;
  if ((card.augments?.length ?? 0) > 0) return null;
  const effects = getActiveEffects(card);
  if (!effects || effects.length === 0) return null;

  const lines = summarizeEffects(state, card, effects);
  if (lines.length === 0) return null;

  return {
    exact: true,
    lines: lines.slice(0, 3),
  };
}

