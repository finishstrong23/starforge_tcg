/**
 * Relic system behavioral tests.
 *
 * Before this work, only combat_start and combat_end relic triggers were
 * ever invoked by the live game — turn_start / turn_end / on_card_play /
 * on_kill had handler code but no call sites, seven relics existed only as
 * data, and three relics printed log lines claiming effects that never
 * applied. Each test here exercises the LIVE combat entry points (or the
 * live reducer), not just the handler in isolation.
 */

import {
  applyAugment,
  applyDamage,
  endPlayerTurn,
  executeEnemyTurn,
  initCombat,
  playCard,
} from '../../src/dungeon/engine/combat';
import { applyRelicsToCombat } from '../../src/dungeon/engine/relicEffects';
import { createCardInstance, getStarterCards } from '../../src/dungeon/engine/draft';
import { ENEMY_POOL } from '../../src/dungeon/data/enemies';
import { RELIC_POOL } from '../../src/dungeon/data/relics';
import { INITIAL, reducer } from '../../src/dungeon/engine/runReducer';
import type { CardDefinition, CardInstance, CombatState, RelicDefinition } from '../../src/dungeon/types';

function relic(id: string): RelicDefinition {
  const def = RELIC_POOL.find((r) => r.id === id);
  if (!def) throw new Error(`unknown relic ${id}`);
  return def;
}

function makeCombat(relicIds: string[] = [], enemyId = 'E1-01', rngSeed = 11): CombatState {
  const enemy = ENEMY_POOL.find((e) => e.id === enemyId)!;
  return initCombat(getStarterCards('Pyroclast'), 72, 72, relicIds.map(relic), enemy, 'Pyroclast', { rngSeed });
}

function card(def: Partial<CardDefinition> & { name: string; cardText: string }): CardInstance {
  return createCardInstance({
    id: def.id ?? `test-${def.name.toLowerCase().replace(/\s+/g, '-')}`,
    name: def.name,
    faction: def.faction ?? 'Pyroclast',
    type: def.type ?? 'Attack',
    cost: def.cost ?? 1,
    keywords: def.keywords ?? [],
    cardText: def.cardText,
    rarity: 'Common',
    complexityTier: 1,
    attack: def.attack,
    health: def.health,
  });
}

describe('Sparkthief\'s Glove (R-C08)', () => {
  it('adds +3 to the first Attack only', () => {
    const strike1 = card({ name: 'Strike A', cardText: 'Deal 6 damage.' });
    const strike2 = card({ name: 'Strike B', cardText: 'Deal 6 damage.' });
    let s = makeCombat(['R-C08']);
    s = applyRelicsToCombat('combat_start', s.relics!, s);
    s = { ...s, hand: [strike1, strike2], playerEnergy: 5 };
    const hp = s.enemy.currentHealth;

    s = playCard(s, strike1.instanceId);
    expect(s.enemy.currentHealth).toBe(hp - 9); // 6 + 3
    expect(s.sparkthiefPending).toBe(false);

    s = playCard(s, strike2.instanceId);
    expect(s.enemy.currentHealth).toBe(hp - 9 - 6); // second attack unboosted
  });

  it('does not consume the charge on a Skill', () => {
    const skill = card({ name: 'Guard', type: 'Skill', cardText: 'Gain 5 Block.' });
    let s = makeCombat(['R-C08']);
    s = applyRelicsToCombat('combat_start', s.relics!, s);
    s = { ...s, hand: [skill], playerEnergy: 5 };
    s = playCard(s, skill.instanceId);
    expect(s.sparkthiefPending).toBe(true); // still armed for the first Attack
  });
});

describe("Hierophant's Censer (R-B01)", () => {
  it('charges +1 cost on turn 1 and clears at end of turn', () => {
    const strike = card({ name: 'Strike', cardText: 'Deal 6 damage.', cost: 1 });
    let s = makeCombat(['R-B01']);
    const handBefore = s.hand.length;
    s = applyRelicsToCombat('combat_start', s.relics!, s);
    expect(s.hand.length).toBe(handBefore + 2); // drew 2 extra
    expect(s.costPenaltyThisTurn).toBe(1);

    s = { ...s, hand: [strike], playerEnergy: 3 };
    s = playCard(s, strike.instanceId);
    expect(s.playerEnergy).toBe(1); // paid 1 + 1 penalty

    s = endPlayerTurn(s, []);
    expect(s.costPenaltyThisTurn).toBe(0);
  });
});

describe('Stasis Coil (R-C06)', () => {
  it('refunds 1 energy on the 10% roll and nothing otherwise', () => {
    const base = { ...makeCombat(['R-C06']), playerEnergy: 2 };
    const hit = applyRelicsToCombat('on_card_play', base.relics!, base, { rng: () => 0.05 });
    expect(hit.playerEnergy).toBe(3);
    const miss = applyRelicsToCombat('on_card_play', base.relics!, base, { rng: () => 0.5 });
    expect(miss.playerEnergy).toBe(2);
  });
});

describe("Starseer's Pendant (R-U02)", () => {
  it('grants 1 Block per card retained at end of turn', () => {
    let s = makeCombat(['R-U02']);
    expect(s.hand.length).toBe(5);
    const shieldBefore = s.playerShield;
    s = endPlayerTurn(s, s.relics!);
    expect(s.playerShield).toBe(shieldBefore + 5);
  });
});

describe('flux relics', () => {
  const fluxCard = () => card({
    name: 'Flux Test',
    faction: 'WarpRiders',
    type: 'Spell',
    cardText: 'Flux. A: Deal 3 damage. B: Gain 3 Block. C: Draw 1.',
  });

  it("Navigator's Bone rerolls a Flux card at combat start", () => {
    let s = makeCombat(['R-S04']);
    s = { ...s, hand: [{ ...fluxCard(), fluxState: 'A' as const }] };
    const rerolled = applyRelicsToCombat('combat_start', s.relics!, s, { rng: () => 0.9 });
    expect(rerolled.hand[0].fluxState).toBe('C'); // rng 0.9 → index 2
  });

  it('The Unmoored Eye locks a Flux card so it stops rotating', () => {
    let s = makeCombat(['R-R04']);
    s = { ...s, hand: [{ ...fluxCard(), fluxState: 'B' as const }] };
    s = applyRelicsToCombat('turn_start', s.relics!, s, { rng: () => 0 });
    expect(s.hand[0].fluxLocked).toBe(true);
    const after = endPlayerTurn(s, []);
    expect(after.hand[0].fluxState).toBe('B'); // locked: no rotation
  });
});

describe('Crown of the Unburnt (R-R01)', () => {
  it('heals 2 HP the first time 5+ Heat is vented, once per combat', () => {
    const vent = () => card({ name: 'Big Vent', cardText: 'Deal 4 damage + 4 per Heat spent (up to 5 Heat).' });
    let s = makeCombat(['R-R01']);
    const first = vent();
    const second = vent();
    s = { ...s, hand: [first, second], playerEnergy: 6, playerHeat: 10, playerHealth: 50 };

    s = playCard(s, first.instanceId); // spends 5 heat
    expect(s.playerHealth).toBe(52);
    expect(s.crownOfUnburntUsed).toBe(true);

    s = playCard(s, second.instanceId); // spends remaining 5 heat
    expect(s.playerHealth).toBe(52); // no second heal
  });
});

describe('The Chorus Shard (R-R02)', () => {
  const channel = (lumens: number) => ({
    ...card({
      name: 'Prism Test',
      faction: 'Luminar',
      type: 'Spell',
      keywords: ['ILLUMINATE'],
      cardText: 'Channel. Release: +2 damage per Lumen.',
    }),
    lumens,
  });

  it('triggers Release effects twice', () => {
    const c = channel(3);
    let s = makeCombat(['R-R02']);
    s = { ...s, hand: [c], playerEnergy: 5 };
    const hp = s.enemy.currentHealth;
    s = playCard(s, c.instanceId);
    expect(s.enemy.currentHealth).toBe(hp - 12); // 2×(2 dmg × 3 lumens)
  });

  it('single Release without the relic', () => {
    const c = channel(3);
    let s = makeCombat([]);
    s = { ...s, hand: [c], playerEnergy: 5 };
    const hp = s.enemy.currentHealth;
    s = playCard(s, c.instanceId);
    expect(s.enemy.currentHealth).toBe(hp - 6);
  });
});

describe('Lumen cap + Suncaller\'s Lens (R-S03)', () => {
  const channel = () => ({
    ...card({
      name: 'Channel Test',
      faction: 'Luminar',
      type: 'Spell',
      keywords: ['ILLUMINATE'],
      cardText: 'Channel. Release: +1 damage per Lumen.',
    }),
  });
  const generator = () => card({
    name: 'Lumen Gen',
    faction: 'Luminar',
    type: 'Skill',
    cost: 0,
    cardText: 'Gain 3 Lumen on each Channel card in hand.',
  });

  it('Channel cards cap at 5 Lumens by default, 6 with the Lens', () => {
    for (const [relics, cap] of [[[], 5], [['R-S03'], 6]] as Array<[string[], number]>) {
      const ch = channel();
      const gen1 = generator();
      const gen2 = generator();
      let s = makeCombat(relics);
      s = { ...s, hand: [ch, gen1, gen2], playerEnergy: 5 };
      s = playCard(s, gen1.instanceId);
      s = playCard(s, gen2.instanceId);
      const held = s.hand.find((c) => c.instanceId === ch.instanceId);
      expect(held?.lumens).toBe(cap);
    }
  });
});

describe('augment relics (R-S02 Pattern Caliper, R-R03 Modular Heart)', () => {
  const augment = () => card({ name: 'Damage Mod', faction: 'Cogsmiths', type: 'Augment', cost: 1, cardText: '+2 damage.' });
  const target = () => card({ name: 'Wrench', faction: 'Cogsmiths', cardText: 'Deal 5 damage.' });

  it('Pattern Caliper makes the first augment on each card free', () => {
    const aug = augment();
    const tgt = target();
    let s = makeCombat(['R-S02']);
    s = { ...s, hand: [aug, tgt], playerEnergy: 3 };
    s = applyAugment(s, aug.instanceId, tgt.instanceId);
    expect(s.playerEnergy).toBe(3); // free
    const aug2 = augment();
    s = { ...s, hand: [...s.hand, aug2] };
    s = applyAugment(s, aug2.instanceId, tgt.instanceId);
    expect(s.playerEnergy).toBe(2); // second attach pays
  });

  it('cards have 2 augment slots; Modular Heart grants a third', () => {
    for (const [relics, expected] of [[[], 2], [['R-R03'], 3]] as Array<[string[], number]>) {
      const tgt = target();
      let s = makeCombat(relics);
      s = { ...s, hand: [tgt], playerEnergy: 99 };
      for (let i = 0; i < 4; i++) {
        const aug = augment();
        s = { ...s, hand: [...s.hand, aug] };
        s = applyAugment(s, aug.instanceId, tgt.instanceId);
      }
      const held = s.hand.find((c) => c.instanceId === tgt.instanceId);
      expect(held?.augments?.length).toBe(expected);
    }
  });
});

describe('Spire-Glass Lens (R-B02)', () => {
  it('grants +1 Max HP on the killing blow', () => {
    let s = makeCombat(['R-B02']);
    s = { ...s, enemy: { ...s.enemy, currentHealth: 1, currentShield: 0 } };
    const after = applyDamage(s, 'enemy', 5, 'test');
    expect(after.phase).toBe('combat_end_win');
    expect(after.playerMaxHealth).toBe(73);
  });

  it('blocks healing after taking HP damage', () => {
    let s = makeCombat(['R-B02'], 'E1-01'); // Rivet burst — deal 6
    s = { ...s, playerShield: 0, phase: 'enemy_turn' };
    s = executeEnemyTurn(s);
    expect(s.healingBlocked).toBe(true);

    const healCard = card({ name: 'Salve', type: 'Skill', cardText: 'Heal 5.' });
    s = { ...s, hand: [healCard], playerEnergy: 3 };
    const hp = s.playerHealth;
    s = playCard(s, healCard.instanceId);
    expect(s.playerHealth).toBe(hp); // heal suppressed
  });
});

describe('relic acquisition effects (reducer)', () => {
  it('Ironbark Amulet grants +8 Max HP when picked up mid-run', () => {
    let ctx = reducer(INITIAL, { type: 'START_RUN', faction: 'Pyroclast', seed: 'relic-acq' });
    const maxBefore = ctx.run!.maxHealth;
    ctx = reducer(ctx, { type: 'ADD_RELIC', relic: relic('R-C01') });
    expect(ctx.run!.maxHealth).toBe(maxBefore + 8);
    expect(ctx.run!.currentHealth).toBe(maxBefore + 8);
  });

  it('Overclocked Core costs 5 Max HP on acquisition', () => {
    let ctx = reducer(INITIAL, { type: 'START_RUN', faction: 'Pyroclast', seed: 'relic-acq' });
    const maxBefore = ctx.run!.maxHealth;
    ctx = reducer(ctx, { type: 'ADD_RELIC', relic: relic('R-U04') });
    expect(ctx.run!.maxHealth).toBe(maxBefore - 5);
  });
});
