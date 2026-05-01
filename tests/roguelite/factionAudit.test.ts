/**
 * Programmatic faction audit + crash resistance.
 *
 * For each faction, we sim many short combats by running random-but-legal
 * actions through the engine and assert no exceptions are thrown. This
 * doesn't measure win rate or balance — it's the "does the engine handle
 * every card text?" smoke test that catches regressions when we touch
 * applySpellEffect.
 *
 * Each combat:
 *   1. initCombat with a starter deck for the faction + a random Act 1 enemy
 *   2. Up to MAX_TURNS player turns, each turn:
 *      a. Try to play any affordable card. For Attack cards, pick an enemy
 *         target; for choice cards, just submit option A; for augment cards,
 *         attach to a random non-augment hand card; for lumen-allocation
 *         cards, distribute evenly.
 *      b. Play until energy runs out OR no more affordable cards.
 *      c. End turn.
 *   3. Combat is considered "complete" when phase becomes combat_end_*
 *      OR turn cap is hit.
 *
 * Asserts: no exceptions, every combat reaches a terminal phase or turn cap,
 * every faction's starter deck is playable.
 */

import {
  initCombat,
  playCard,
  endPlayerTurn,
  executeEnemyTurn,
  applyAugment,
  isChannelCard,
} from '../../src/dungeon/engine/combat';
import { getStarterCards } from '../../src/dungeon/engine/draft';
import { getEnemiesByAct } from '../../src/dungeon/data/enemies';
import { getCardChoice } from '../../src/dungeon/engine/combat';
import type { CardInstance, CombatState, Faction } from '../../src/dungeon/types';

const FACTIONS: Faction[] = ['Cogsmiths', 'Pyroclast', 'Luminar', 'WarpRiders'];
const MAX_TURNS = 30;
const COMBATS_PER_FACTION = 50;

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function findPlayableCard(state: CombatState): CardInstance | null {
  return state.hand.find((c) => c.cost <= state.playerEnergy) ?? null;
}

function simulateOneCombat(faction: Faction): { ok: boolean; reason?: string; turns: number; phase: string } {
  const deck = getStarterCards(faction);
  const enemy = pickRandom(getEnemiesByAct(1));
  let state = initCombat(deck, 60, 60, [], enemy, faction);

  let turns = 0;
  while (turns < MAX_TURNS) {
    if (state.phase === 'combat_end_win' || state.phase === 'combat_end_loss') break;

    // Play affordable cards until none left or energy drained.
    let safeguard = 50; // prevent infinite loops on a buggy card
    while (safeguard-- > 0 && state.phase === 'player_turn') {
      const card = findPlayableCard(state);
      if (!card) break;

      // Augment: attach to a random non-augment hand card.
      if (card.type === 'Augment') {
        const target = state.hand.find((c) => c.instanceId !== card.instanceId && c.type !== 'Augment');
        if (!target) {
          // Skip — engine would just not play it; force-end the turn instead.
          break;
        }
        state = applyAugment(state, card.instanceId, target.instanceId);
        continue;
      }

      // Choice card: pick option A.
      const choice = getCardChoice(card);
      if (choice) {
        state = playCard(state, card.instanceId, 'enemy', choice.optionA);
        continue;
      }

      // Lumen Infusion-style cards aren't a Card type — they're potions. N/A here.

      // Attack: target main enemy. Otherwise no target.
      const targetId = card.type === 'Attack' ? 'enemy' : undefined;
      state = playCard(state, card.instanceId, targetId);
    }

    state = endPlayerTurn(state, []);
    if (state.phase === 'combat_end_win' || state.phase === 'combat_end_loss') break;
    state = executeEnemyTurn(state);
    turns++;
  }

  return { ok: true, turns, phase: state.phase };
}

describe('faction audit — crash resistance', () => {
  for (const faction of FACTIONS) {
    describe(`${faction}`, () => {
      let results: ReturnType<typeof simulateOneCombat>[];

      beforeAll(() => {
        results = [];
        for (let i = 0; i < COMBATS_PER_FACTION; i++) {
          // Wrap each combat to capture exceptions per-trial.
          try {
            results.push(simulateOneCombat(faction));
          } catch (err) {
            results.push({
              ok: false,
              reason: err instanceof Error ? err.message : String(err),
              turns: 0,
              phase: 'crash',
            });
          }
        }
      });

      it('every simulated combat completes without throwing', () => {
        const failures = results.filter((r) => !r.ok);
        if (failures.length > 0) {
          console.error(`${faction} failures:`, failures);
        }
        expect(failures).toHaveLength(0);
      });

      it('every combat reaches a terminal phase or turn cap', () => {
        for (const r of results) {
          expect(['combat_end_win', 'combat_end_loss', 'player_turn', 'enemy_turn']).toContain(r.phase);
        }
      });

      it('starter deck is the right size (10 cards)', () => {
        const deck = getStarterCards(faction);
        expect(deck).toHaveLength(10);
      });

      it('every starter card has a complexityTier of 1 (foundational)', () => {
        const deck = getStarterCards(faction);
        for (const c of deck) {
          expect(c.complexityTier).toBe(1);
        }
      });

      it('reports turn-distribution stats for the faction', () => {
        const turns = results.map((r) => r.turns);
        const min = Math.min(...turns);
        const max = Math.max(...turns);
        const avg = turns.reduce((a, b) => a + b, 0) / turns.length;
        // Pure smoke: at least one combat must have actually progressed.
        expect(max).toBeGreaterThan(0);
        // Light bound: AI-driver combats shouldn't all instantly end.
        expect(avg).toBeGreaterThan(0);
        // Just for visibility in the test report:
        // eslint-disable-next-line no-console
        console.log(`  ${faction}: avg ${avg.toFixed(1)} turns, range ${min}-${max}`);
      });
    });
  }
});

describe('Channel detection — sanity', () => {
  it('starter Channel card (Glimmer) is recognised', () => {
    const deck = getStarterCards('Luminar');
    const glimmer = deck.find((c) => c.id === 'L-041');
    expect(glimmer).toBeDefined();
    expect(isChannelCard(glimmer!)).toBe(true);
  });
});
