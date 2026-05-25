import { EVENT_POOL, eventsForAct } from '../../src/dungeon/data/events';
import { choicesForFaction, pickEventForNode, validateEventDefinitions } from '../../src/dungeon/engine/eventSelection';

describe('Phase 5 dungeon event content', () => {
  it('ships eight structured Act 1 events', () => {
    const act1Events = eventsForAct(1);
    expect(act1Events).toHaveLength(8);
    expect(new Set(act1Events.map((event) => event.id)).size).toBe(8);
  });

  it('all event definitions pass structural validation', () => {
    expect(validateEventDefinitions(EVENT_POOL)).toEqual([]);
  });

  it('every event has at least two choices with visible effect text', () => {
    for (const event of EVENT_POOL) {
      expect(event.choices.length).toBeGreaterThanOrEqual(2);
      for (const choice of event.choices) {
        expect(choice.label.length).toBeGreaterThan(0);
        expect(choice.effectText.length).toBeGreaterThan(0);
      }
    }
  });

  it('covers richer deck, relic, potion, and max-HP event effects', () => {
    const effectTypes = new Set(
      EVENT_POOL.flatMap((event) => event.choices.flatMap((choice) => choice.effects.map((effect) => effect.type))),
    );

    expect(effectTypes.has('add_card')).toBe(true);
    expect(effectTypes.has('remove_card')).toBe(true);
    expect(effectTypes.has('upgrade_card')).toBe(true);
    expect(effectTypes.has('add_relic')).toBe(true);
    expect(effectTypes.has('add_potion')).toBe(true);
    expect(effectTypes.has('max_hp')).toBe(true);
    expect(effectTypes.has('add_curse')).toBe(true);
    expect(effectTypes.has('map_modifier')).toBe(true);
    expect(effectTypes.has('class_resource')).toBe(true);
  });

  it('validation rejects references to missing card, relic, potion, curse, and modifier ids', () => {
    expect(validateEventDefinitions([
      {
        ...EVENT_POOL[0],
        choices: [
          { id: 'bad-card', label: 'Bad card', effectText: 'Bad.', effects: [{ type: 'add_card', cardId: 'NOPE-001' }] },
          { id: 'bad-relic', label: 'Bad relic', effectText: 'Bad.', effects: [{ type: 'add_relic', relicId: 'NOPE-R' }] },
          { id: 'bad-potion', label: 'Bad potion', effectText: 'Bad.', effects: [{ type: 'add_potion', potionId: 'nope_potion' }] },
          { id: 'bad-curse', label: 'Bad curse', effectText: 'Bad.', effects: [{ type: 'add_curse', curseId: 'nope_curse' }] },
          { id: 'bad-modifier', label: 'Bad modifier', effectText: 'Bad.', effects: [{ type: 'map_modifier', modifierId: 'nope_modifier' }] },
        ],
      },
    ])).toEqual([
      'act1-derelict-signal.bad-card: unknown card id NOPE-001',
      'act1-derelict-signal.bad-relic: unknown relic id NOPE-R',
      'act1-derelict-signal.bad-potion: unknown potion id nope_potion',
      'act1-derelict-signal.bad-curse: unknown curse id nope_curse',
      'act1-derelict-signal.bad-modifier: unknown modifier id nope_modifier',
    ]);
  });

  it('includes class-aware event choices for at least two factions', () => {
    const factions = new Set(
      EVENT_POOL.flatMap((event) => event.choices.map((choice) => choice.requiresFaction).filter(Boolean)),
    );

    expect(factions.size).toBeGreaterThanOrEqual(2);
    expect(factions.has('Pyroclast')).toBe(true);
    expect(factions.has('Luminar')).toBe(true);
  });

  it('selects events deterministically from seed, act, and node id', () => {
    const a = pickEventForNode(1, 'phase-five-seed', 'n-2-1');
    const b = pickEventForNode(1, 'phase-five-seed', 'n-2-1');
    const c = pickEventForNode(1, 'phase-five-seed', 'n-4-2');

    expect(a).toBe(b);
    expect(eventsForAct(1)).toContain(a);
    expect(eventsForAct(1)).toContain(c);
  });

  it('filters class-specific choices by faction while keeping shared choices', () => {
    const event = EVENT_POOL.find((candidate) => candidate.id === 'act1-cinder-market')!;
    const pyroChoices = choicesForFaction(event, 'Pyroclast');
    const luminarChoices = choicesForFaction(event, 'Luminar');

    expect(pyroChoices.map((choice) => choice.id)).toContain('pyroclast-barter');
    expect(luminarChoices.map((choice) => choice.id)).not.toContain('pyroclast-barter');
    expect(luminarChoices.length).toBeGreaterThanOrEqual(2);
  });
});
