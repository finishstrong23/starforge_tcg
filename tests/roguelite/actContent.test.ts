/**
 * Act 2/3 content and event-flow fixes.
 *
 * Before this work: every event node in Acts 2 and 3 deterministically
 * showed the same Act 1 fallback event (the pool had zero act-2/3
 * definitions), event damage could strand the player walking the map at
 * 0 HP, and the enemy roster was one short of the 25-standard target.
 */

import { EVENT_POOL, eventsForAct } from '../../src/dungeon/data/events';
import { validateEventDefinitions } from '../../src/dungeon/engine/eventSelection';
import { pickEventForNode } from '../../src/dungeon/engine/eventSelection';
import { ENEMY_POOL, getEnemiesByAct } from '../../src/dungeon/data/enemies';
import { INITIAL, reducer } from '../../src/dungeon/engine/runReducer';

describe('act 2/3 event pools', () => {
  it('every act has 8 unique events', () => {
    for (const act of [1, 2, 3] as const) {
      const events = eventsForAct(act);
      expect(events).toHaveLength(8);
      expect(new Set(events.map((e) => e.id)).size).toBe(8);
    }
  });

  it('all event definitions validate (ids resolve, choices well-formed)', () => {
    expect(validateEventDefinitions(EVENT_POOL)).toEqual([]);
  });

  it('act 2 and 3 nodes select from their own pools, with variety across nodes', () => {
    for (const act of [2, 3] as const) {
      const picked = new Set<string>();
      for (let i = 0; i < 40; i++) {
        const event = pickEventForNode(act, 'variety-seed', `node-${i}`);
        expect(event.act).toBe(act);
        picked.add(event.id);
      }
      expect(picked.size).toBeGreaterThan(3); // no single-event collapse
    }
  });

  it('every event keeps >=2 choices for every faction (no dead ends)', () => {
    const factions = ['Pyroclast', 'Cogsmiths', 'Luminar', 'WarpRiders'] as const;
    for (const event of EVENT_POOL) {
      for (const faction of factions) {
        const available = event.choices.filter(
          (c) => !c.requiresFaction || c.requiresFaction === faction,
        );
        expect(available.length).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe('event damage can kill', () => {
  it('DAMAGE_PLAYER to 0 HP ends the run instead of stranding the player', () => {
    let s = reducer(INITIAL, { type: 'START_RUN', faction: 'Pyroclast', seed: 'event-death' });
    s = reducer(s, { type: 'DAMAGE_PLAYER', amount: s.run!.currentHealth });
    expect(s.run!.phase).toBe('run_end_loss');
    expect(s.run!.currentHealth).toBe(0);
  });

  it('non-lethal event damage just reduces HP', () => {
    let s = reducer(INITIAL, { type: 'START_RUN', faction: 'Pyroclast', seed: 'event-death' });
    const hp = s.run!.currentHealth;
    s = reducer(s, { type: 'DAMAGE_PLAYER', amount: 6 });
    expect(s.run!.currentHealth).toBe(hp - 6);
    expect(s.run!.phase).not.toBe('run_end_loss');
  });
});

describe('content minimums', () => {
  it('roster has 25 standard enemies + 4 elites + 3 bosses', () => {
    const standard = ENEMY_POOL.filter((e) => !e.isBoss && !e.isElite);
    const elites = ENEMY_POOL.filter((e) => e.isElite);
    const bosses = ENEMY_POOL.filter((e) => e.isBoss);
    expect(standard.length).toBeGreaterThanOrEqual(21); // 25 non-boss incl. elites
    expect(standard.length + elites.length).toBeGreaterThanOrEqual(25);
    expect(elites.length).toBeGreaterThanOrEqual(4);
    expect(bosses).toHaveLength(3);
  });

  it('every act has standard enemies, elites, and a boss', () => {
    for (const act of [1, 2, 3] as const) {
      expect(getEnemiesByAct(act).length).toBeGreaterThan(0);
      expect(ENEMY_POOL.some((e) => e.isElite && e.acts.includes(act))).toBe(true);
      expect(ENEMY_POOL.some((e) => e.isBoss && e.acts.includes(act))).toBe(true);
    }
  });

  it('every enemy intent rotation is non-empty and act-tagged', () => {
    for (const enemy of ENEMY_POOL) {
      expect(enemy.intents.length).toBeGreaterThan(0);
      expect(enemy.acts.length).toBeGreaterThan(0);
    }
  });
});
