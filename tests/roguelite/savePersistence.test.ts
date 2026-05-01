/**
 * Save persistence smoke tests for the Dungeon mode's localStorage
 * snapshot layer. The actual hydrate/persist functions live inside the
 * context module and aren't trivially exported, but we can validate the
 * shape: the run-state snapshot must be JSON-serialisable losslessly
 * (since that's how it round-trips through localStorage).
 *
 * Plus the public clearDungeonSave() helper.
 */

import { clearDungeonSave } from '../../src/dungeon/context/DungeonRunContext';
import { initCombat } from '../../src/dungeon/engine/combat';
import { getStarterCards } from '../../src/dungeon/engine/draft';
import { ENEMY_POOL } from '../../src/dungeon/data/enemies';
import { generateActMap } from '../../src/dungeon/engine/mapgen';
import { POTION_POOL } from '../../src/dungeon/data/potions';
import type { RunState } from '../../src/dungeon/types';

// jsdom-less Jest runs default to node env; localStorage doesn't exist there.
// Polyfill a tiny in-memory store so the helpers we test don't crash.
class MemStore {
  private map = new Map<string, string>();
  getItem(k: string) { return this.map.get(k) ?? null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
  clear() { this.map.clear(); }
}

beforeAll(() => {
  // @ts-expect-error — assigning a Storage-shaped object on globalThis.
  globalThis.localStorage = new MemStore();
});

describe('save persistence — JSON serialisability', () => {
  it('a fresh combat state round-trips through JSON.stringify cleanly', () => {
    const enemy = ENEMY_POOL.find((e) => !e.isElite && !e.isBoss && e.acts.includes(1))!;
    const cs = initCombat(getStarterCards('Pyroclast'), 60, 60, [], enemy, 'Pyroclast');
    const json = JSON.stringify(cs);
    const restored = JSON.parse(json);
    expect(restored.phase).toBe(cs.phase);
    expect(restored.playerHealth).toBe(cs.playerHealth);
    expect(restored.enemy.name).toBe(cs.enemy.name);
    expect(restored.hand.length).toBe(cs.hand.length);
    // Card instance ids preserved
    expect(restored.hand[0].instanceId).toBe(cs.hand[0].instanceId);
  });

  it('a synthetic full RunState round-trips losslessly', () => {
    const enemy = ENEMY_POOL.find((e) => !e.isElite && !e.isBoss && e.acts.includes(1))!;
    const combat = initCombat(getStarterCards('Cogsmiths'), 72, 72, [], enemy, 'Cogsmiths');
    const run: RunState = {
      phase: 'combat',
      currentAct: 1,
      actMaps: [
        generateActMap(1, 'seed1'),
        generateActMap(2, 'seed1'),
        generateActMap(3, 'seed1'),
      ],
      deck: getStarterCards('Cogsmiths'),
      hand: [],
      relics: [],
      gold: 99,
      maxHealth: 72,
      currentHealth: 60,
      energy: 3,
      maxEnergy: 3,
      ascensionLevel: 3,
      combatState: combat,
      potions: [{ definitionId: POTION_POOL[0].id }, null, null],
      runStats: {
        totalCombats: 4,
        elitesDefeated: 1,
        bossesDefeated: 0,
        cardsPlayed: 18,
        totalDamageDealt: 84,
      },
    };

    const restored = JSON.parse(JSON.stringify(run)) as RunState;
    expect(restored.ascensionLevel).toBe(3);
    expect(restored.gold).toBe(99);
    expect(restored.runStats.totalCombats).toBe(4);
    expect(restored.potions[0]?.definitionId).toBe(POTION_POOL[0].id);
    expect(restored.combatState?.enemy.name).toBe(enemy.name);
    expect(restored.actMaps).toHaveLength(3);
  });
});

describe('clearDungeonSave', () => {
  it('removes the save key from localStorage', () => {
    localStorage.setItem('sf:dungeon:save:v1', '{"some":"data"}');
    expect(localStorage.getItem('sf:dungeon:save:v1')).not.toBeNull();
    clearDungeonSave();
    expect(localStorage.getItem('sf:dungeon:save:v1')).toBeNull();
  });

  it('is a no-op when no save exists', () => {
    expect(() => clearDungeonSave()).not.toThrow();
  });
});
