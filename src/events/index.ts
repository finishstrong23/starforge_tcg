/**
 * STARFORGE TCG - Events Module Index
 */

export {
  GameEventType,
  createEvent,
  createCardDrawnEvent,
  createCardPlayedEvent,
  createDamageEvent,
  createHealEvent,
} from './GameEvent';

export type {
  GameEvent,
  EventData,
  GameStartedData,
  GameEndedData,
  TurnEventData,
  CardEventData,
  CombatEventData,
  DamageEventData,
  HealEventData,
  StatsChangedData,
  KeywordEventData,
  CrystalsChangedData,
  EffectEventData,
  ChoiceEventData,
  StarforgeEventData,
  ZoneChangedData,
  GenericEventData,
} from './GameEvent';

export {
  EventEmitter,
  waitForEvent,
  createEventCollector,
} from './EventEmitter';

export type {
  EventListener,
  EventFilter,
  Subscription,
} from './EventEmitter';
