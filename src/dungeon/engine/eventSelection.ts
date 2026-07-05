import { EVENT_POOL, eventsForAct } from '../data/events';
import { CARD_POOL } from '../data/cards';
import { CURSE_POOL } from '../data/curses';
import { POTION_POOL } from '../data/potions';
import { RELIC_POOL } from '../data/relics';
import { RUN_MODIFIER_POOL } from '../data/runModifiers';
import type { DungeonEventChoiceDefinition, DungeonEventDefinition, Faction } from '../types';
import { hashSeed } from './seededRng';

export function pickEventForNode(
  act: 1 | 2 | 3,
  runSeed: string,
  nodeId: string,
  pool: DungeonEventDefinition[] = EVENT_POOL,
): DungeonEventDefinition {
  const candidates = pool.filter((event) => event.act === act);
  const fallback = eventsForAct(act)[0] ?? EVENT_POOL[0];
  if (candidates.length === 0) return fallback;
  const idx = hashSeed(`${runSeed}:${act}:${nodeId}`) % candidates.length;
  return candidates[idx];
}

export function choicesForFaction(
  event: DungeonEventDefinition,
  faction?: Faction | null,
): DungeonEventChoiceDefinition[] {
  return event.choices.filter((choice) => !choice.requiresFaction || choice.requiresFaction === faction);
}

export function validateEventDefinitions(events: DungeonEventDefinition[]): string[] {
  const failures: string[] = [];
  const ids = new Set<string>();
  for (const event of events) {
    if (ids.has(event.id)) failures.push(`${event.id}: duplicate event id`);
    ids.add(event.id);
    if (event.choices.length < 2) failures.push(`${event.id}: event must have at least two choices`);
    const choiceIds = new Set<string>();
    for (const choice of event.choices) {
      if (choiceIds.has(choice.id)) failures.push(`${event.id}.${choice.id}: duplicate choice id`);
      choiceIds.add(choice.id);
      if (choice.effects.length === 0) failures.push(`${event.id}.${choice.id}: choice must have at least one effect`);
      for (const effect of choice.effects) {
        if ('amount' in effect && !Number.isInteger(effect.amount)) {
          failures.push(`${event.id}.${choice.id}: ${effect.type}.amount must be an integer`);
        }
        if ((effect.type === 'heal' || effect.type === 'damage' || effect.type === 'max_hp') && effect.amount <= 0) {
          failures.push(`${event.id}.${choice.id}: ${effect.type}.amount must be positive`);
        }
        if (effect.type === 'add_card' && !CARD_POOL.some((card) => card.id === effect.cardId)) {
          failures.push(`${event.id}.${choice.id}: unknown card id ${effect.cardId}`);
        }
        if (effect.type === 'add_relic' && !RELIC_POOL.some((relic) => relic.id === effect.relicId)) {
          failures.push(`${event.id}.${choice.id}: unknown relic id ${effect.relicId}`);
        }
        if (effect.type === 'add_potion' && !POTION_POOL.some((potion) => potion.id === effect.potionId)) {
          failures.push(`${event.id}.${choice.id}: unknown potion id ${effect.potionId}`);
        }
        if (effect.type === 'add_curse' && !CURSE_POOL.some((curse) => curse.id === effect.curseId)) {
          failures.push(`${event.id}.${choice.id}: unknown curse id ${effect.curseId}`);
        }
        if ((effect.type === 'map_modifier' || effect.type === 'class_resource')
          && !RUN_MODIFIER_POOL.some((modifier) => modifier.id === effect.modifierId)) {
          failures.push(`${event.id}.${choice.id}: unknown modifier id ${effect.modifierId}`);
        }
      }
    }
  }
  return failures;
}
