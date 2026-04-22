import {
  createNewRun,
  materializeStarterDeck,
  STARTER_DECKS,
  CARD_BY_ID,
} from '../../src/roguelite';

describe('createNewRun', () => {
  it('produces a valid fresh RunState for each faction', () => {
    const factions = ['Pyroclast', 'Luminar', 'Cogsmiths', 'WarpRiders'] as const;
    for (const f of factions) {
      const run = createNewRun({ factionId: f });
      expect(run.runId).toMatch(/[0-9a-f-]{10,}/i);
      expect(run.seed).toBeTruthy();
      expect(run.factionId).toEqual(f);
      expect(run.phase).toEqual('character_select');
      expect(run.currentAct).toEqual(1);
      expect(run.currentStep).toEqual(0);
      expect(run.deck.length).toEqual(10);
      expect(run.relics).toEqual([]);
      expect(run.potionSlots).toEqual([null, null, null]);
      expect(run.combatState).toBeNull();
      expect(run.schemaVersion).toEqual(1);
      expect(run.actMaps).toEqual([]);
      expect(run.runStats.totalCombats).toEqual(0);
    }
  });

  it('assigns unique instanceIds to every card in the starter deck', () => {
    const run = createNewRun({ factionId: 'Pyroclast' });
    const ids = new Set(run.deck.map((c) => c.instanceId));
    expect(ids.size).toEqual(run.deck.length);
  });

  it('materializes starter decks deterministically by count', () => {
    const deck = STARTER_DECKS.Pyroclast;
    const instances = materializeStarterDeck(deck);
    const perCardType = new Map<string, number>();
    for (const ci of instances) {
      perCardType.set(ci.cardId, (perCardType.get(ci.cardId) ?? 0) + 1);
    }
    for (const entry of deck.cards) {
      expect(perCardType.get(entry.cardId)).toEqual(entry.count);
    }
  });

  it('honors an explicit seed', () => {
    const r1 = createNewRun({ factionId: 'Cogsmiths', seed: 'fixed-seed-42' });
    const r2 = createNewRun({ factionId: 'Cogsmiths', seed: 'fixed-seed-42' });
    expect(r1.seed).toEqual('fixed-seed-42');
    expect(r1.seed).toEqual(r2.seed);
    // runIds differ — seed is for generation, not identity.
    expect(r1.runId).not.toEqual(r2.runId);
  });

  it('starter deck signature card is in CARD_BY_ID', () => {
    for (const f of ['Pyroclast', 'Luminar', 'Cogsmiths', 'WarpRiders'] as const) {
      const deck = STARTER_DECKS[f];
      expect(CARD_BY_ID.has(deck.signatureCardId)).toBe(true);
    }
  });
});
