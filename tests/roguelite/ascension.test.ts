/**
 * Ascension modifier tests. Each level adds one specific change on top of
 * the previous; the test pins the exact ladder so future tweaks are
 * intentional.
 */

import { getAscensionMods, describeAscension } from '../../src/dungeon/engine/ascension';
import { initCombat } from '../../src/dungeon/engine/combat';
import { getStarterCards } from '../../src/dungeon/engine/draft';
import { ENEMY_POOL } from '../../src/dungeon/data/enemies';
import { generateActMap } from '../../src/dungeon/engine/mapgen';

describe('getAscensionMods — ladder', () => {
  it('A0 is the baseline (no modifiers)', () => {
    const m = getAscensionMods(0);
    expect(m.enemyHpMul).toBe(1);
    expect(m.extraEliteNodes).toBe(0);
    expect(m.shopPriceMul).toBe(1);
    expect(m.bossStrength).toBe(0);
    expect(m.startingHpPenalty).toBe(0);
    expect(m.enemyDamageMul).toBe(1);
    expect(m.goldRewardMul).toBe(1);
    expect(m.rareRelicMul).toBe(1);
    expect(m.drawPerTurn).toBe(5);
  });

  it('A1 enemy HP +10%', () => {
    expect(getAscensionMods(1).enemyHpMul).toBeCloseTo(1.1);
  });

  it('A2 +1 elite per act', () => {
    expect(getAscensionMods(2).extraEliteNodes).toBe(1);
  });

  it('A3 shop prices +25%', () => {
    expect(getAscensionMods(3).shopPriceMul).toBeCloseTo(1.25);
  });

  it('A4 bosses +2 Strength', () => {
    expect(getAscensionMods(4).bossStrength).toBe(2);
  });

  it('A5 starting HP -10', () => {
    expect(getAscensionMods(5).startingHpPenalty).toBe(10);
  });

  it('A6 enemy damage +10%', () => {
    expect(getAscensionMods(6).enemyDamageMul).toBeCloseTo(1.1);
  });

  it('A7 gold rewards -25%', () => {
    expect(getAscensionMods(7).goldRewardMul).toBeCloseTo(0.75);
  });

  it('A8 rare relic drop rate halved', () => {
    expect(getAscensionMods(8).rareRelicMul).toBeCloseTo(0.5);
  });

  it('A9 draw 4 per turn (was 5)', () => {
    expect(getAscensionMods(9).drawPerTurn).toBe(4);
  });

  it('A10 amplifies A4 + A6', () => {
    const m = getAscensionMods(10);
    expect(m.bossStrength).toBe(4);            // upgraded from +2
    expect(m.enemyDamageMul).toBeCloseTo(1.2); // upgraded from 1.1
    // Lower-level modifiers still active
    expect(m.enemyHpMul).toBeCloseTo(1.1);
    expect(m.extraEliteNodes).toBe(1);
    expect(m.drawPerTurn).toBe(4);
  });
});

describe('describeAscension — readability', () => {
  it('returns one line per active modifier', () => {
    expect(describeAscension(0)).toEqual([]);
    expect(describeAscension(1)).toHaveLength(1);
    expect(describeAscension(5)).toHaveLength(5);
    expect(describeAscension(10)).toHaveLength(10);
  });
});

describe('initCombat — ascension wiring', () => {
  const enemy = ENEMY_POOL.find((e) => !e.isElite && !e.isBoss && e.acts.includes(1))!;
  const boss  = ENEMY_POOL.find((e) => e.isBoss)!;
  const deck  = getStarterCards('Pyroclast');

  it('A0 leaves enemy HP unchanged', () => {
    const cs = initCombat(deck, 60, 60, [], enemy, 'Pyroclast');
    expect(cs.enemy.maxHealth).toBe(enemy.maxHealth);
    expect(cs.enemy.attack).toBe(enemy.attack);
    expect(cs.enemy.statusEffects).toHaveLength(0);
    expect(cs.drawPerTurn).toBe(5);
  });

  it('A1 mods bump enemy HP by ~10%', () => {
    const m = getAscensionMods(1);
    const cs = initCombat(deck, 60, 60, [], enemy, 'Pyroclast', { enemyHpMul: m.enemyHpMul });
    expect(cs.enemy.maxHealth).toBe(Math.round(enemy.maxHealth * 1.1));
  });

  it('A4 mods give the boss +2 Strength', () => {
    const m = getAscensionMods(4);
    const cs = initCombat(deck, 60, 60, [], boss, 'Pyroclast', { bossStrength: m.bossStrength });
    expect(cs.enemy.statusEffects.find((e) => e.type === 'strength')?.stacks).toBe(2);
  });

  it('A4 strength buff does NOT apply to non-bosses', () => {
    const m = getAscensionMods(4);
    const cs = initCombat(deck, 60, 60, [], enemy, 'Pyroclast', { bossStrength: m.bossStrength });
    expect(cs.enemy.statusEffects).toHaveLength(0);
  });

  it('A9 reduces draw count to 4 cards per turn', () => {
    const m = getAscensionMods(9);
    const cs = initCombat(deck, 60, 60, [], enemy, 'Pyroclast', { drawPerTurn: m.drawPerTurn });
    expect(cs.drawPerTurn).toBe(4);
    expect(cs.hand).toHaveLength(4);
  });

  it('A10 stacks the right combo', () => {
    const m = getAscensionMods(10);
    const cs = initCombat(deck, 60, 60, [], boss, 'Pyroclast', {
      enemyHpMul:     m.enemyHpMul,
      enemyDamageMul: m.enemyDamageMul,
      bossStrength:   m.bossStrength,
      drawPerTurn:    m.drawPerTurn,
    });
    expect(cs.enemy.maxHealth).toBe(Math.round(boss.maxHealth * 1.1));
    expect(cs.enemy.attack).toBe(Math.round(boss.attack * 1.2));
    expect(cs.enemy.statusEffects.find((e) => e.type === 'strength')?.stacks).toBe(4);
    expect(cs.drawPerTurn).toBe(4);
  });
});

describe('generateActMap — ascension wiring', () => {
  it('extraElites=0 keeps default elite count for Act 1 (2 elites)', () => {
    const map = generateActMap(1, 'test-seed', 0);
    const elites = map.nodes.filter((n) => n.type === 'elite').length;
    expect(elites).toBe(2);
  });

  it('extraElites=1 adds one elite to Act 1 (3 elites)', () => {
    const map = generateActMap(1, 'test-seed', 1);
    const elites = map.nodes.filter((n) => n.type === 'elite').length;
    expect(elites).toBe(3);
  });

  it('extra elites take from the combat pool, total slots stays at 18', () => {
    const map = generateActMap(1, 'test-seed', 1);
    // Rows 1-6, 3 cols = 18 procedural nodes (plus row 0 starts and row 7 rests).
    const proceduralNodes = map.nodes.filter((n) => n.row >= 1 && n.row <= 6);
    expect(proceduralNodes).toHaveLength(18);
  });
});
