import type { CardInstance, CombatState, EnemyDefinition, RelicDefinition } from '../types';

export function initCombat(
  _deck: CardInstance[],
  _playerHealth: number,
  _playerMaxHealth: number,
  _relics: RelicDefinition[],
  _enemy: EnemyDefinition,
): CombatState {
  throw new Error('initCombat not implemented');
}

export function drawCards(state: CombatState, _count: number): CombatState {
  return state;
}

export function playCard(state: CombatState, _cardInstanceId: string, _targetId?: string): CombatState {
  return state;
}

export function attackWithMinion(state: CombatState, _attackerId: string, _targetId: string): CombatState {
  return state;
}

export function endPlayerTurn(state: CombatState, _relics: RelicDefinition[]): CombatState {
  return state;
}

export function applyDamage(state: CombatState, _targetId: string, _amount: number, _source: string): CombatState {
  return state;
}

export function checkCombatEnd(state: CombatState): CombatState {
  return state;
}
