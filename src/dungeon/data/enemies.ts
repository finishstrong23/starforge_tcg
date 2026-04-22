import type { EnemyDefinition } from '../types';

export const ENEMY_POOL: EnemyDefinition[] = [];

export const getEnemiesByAct = (act: 1 | 2 | 3): EnemyDefinition[] =>
  ENEMY_POOL.filter((e) => e.acts.includes(act) && !e.isBoss && !e.isElite);

export const getElitesByAct = (act: 1 | 2 | 3): EnemyDefinition[] =>
  ENEMY_POOL.filter((e) => e.acts.includes(act) && e.isElite);

export const getBossByAct = (act: 1 | 2 | 3): EnemyDefinition | undefined =>
  ENEMY_POOL.find((e) => e.isBoss && e.acts.includes(act));
