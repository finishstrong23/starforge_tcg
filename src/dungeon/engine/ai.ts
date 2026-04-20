import type { CombatState, EnemyInstance, EnemyIntent } from '../types';

export function getNextIntent(enemy: EnemyInstance): EnemyIntent {
  return enemy.intents[enemy.intentIndex % enemy.intents.length];
}

export function executeIntent(state: CombatState, _intent: EnemyIntent): CombatState {
  return state;
}
