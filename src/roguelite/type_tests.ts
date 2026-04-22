// Compile-time type exercises. This file has no runtime behavior — its
// purpose is to fail `tsc` if the type shape regresses. Importing it from
// the index ensures the compiler type-checks it as part of the build.

import type {
  Card,
  CardInstance,
  StarterDeck,
  StatusEffect,
  HeatState,
  LumenState,
  AugmentState,
  FluxState,
  RiftInstance,
  EvolutionRule,
} from './types';
import {
  DEFAULT_MAX_HEAT,
  DEFAULT_MAX_LUMENS,
  DEFAULT_AUGMENT_SLOTS,
} from './types';

// Pyroclast: Heat (combat-scoped, not per-instance)
const _heat: HeatState = {
  currentHeat: 0,
  maxHeat: DEFAULT_MAX_HEAT,
};

// Luminar: Lumens (per-card-instance)
const _lumenState: LumenState = {
  currentLumens: 3,
  maxLumens: DEFAULT_MAX_LUMENS,
  hasChannel: true,
};

const _luminarInstance: CardInstance = {
  instanceId: 'li-1',
  cardId: 'L-010',
  evolutionProgress: { count: 0, evolved: false },
  statusEffects: [],
  lumenState: _lumenState,
};

// Cogsmiths: Augments (per-card-instance)
const _augmentState: AugmentState = {
  slots: [
    { augmentCardId: 'C-017', augmentInstanceId: 'aug-1' },
    null,
  ],
  slotCount: DEFAULT_AUGMENT_SLOTS,
};

const _cogInstance: CardInstance = {
  instanceId: 'ci-1',
  cardId: 'C-001',
  evolutionProgress: { count: 2, evolved: false },
  statusEffects: [],
  augmentState: _augmentState,
};

// Warp Riders: Flux (per-card-instance)
const _fluxState: FluxState = { currentState: 'B', isLocked: false };

const _wrInstance: CardInstance = {
  instanceId: 'wi-1',
  cardId: 'W-001',
  evolutionProgress: { count: 0, evolved: false },
  statusEffects: [],
  fluxState: _fluxState,
};

const _rift: RiftInstance = {
  riftId: 'rf-1',
  type: 'Cost',
  turnsRemaining: 2,
};

// Evolution rule: exercise every trigger category
const _triggerCategories: EvolutionRule[] = [
  { triggerType: 'play_count', threshold: 10, conditionText: 'Played 10 times', evolvesTo: 'X-001', evolvedDescription: '' },
  { triggerType: 'play_with_condition', threshold: 6, conditionText: 'Played 6 times at Heat >= 5', evolvesTo: 'X-002', evolvedDescription: '' },
  { triggerType: 'play_in_boss', threshold: 3, conditionText: 'Played in 3 boss fights', evolvesTo: 'X-003', evolvedDescription: '' },
  { triggerType: 'play_all_flux_states', threshold: 1, conditionText: 'Played in all 3 states', evolvesTo: 'X-004', evolvedDescription: '' },
  { triggerType: 'hold_turns', threshold: 5, conditionText: 'Held 5 turns', evolvesTo: 'X-005', evolvedDescription: '' },
  { triggerType: 'hold_then_play', threshold: 3, conditionText: 'Held 3 turns then played', evolvesTo: 'X-006', evolvedDescription: '' },
  { triggerType: 'kill_count', threshold: 3, conditionText: 'Killed 3 targets with this', evolvesTo: 'X-007', evolvedDescription: '' },
  { triggerType: 'trigger_count', threshold: 10, conditionText: 'Triggered 10 times', evolvesTo: 'X-008', evolvedDescription: '' },
  { triggerType: 'trigger_with_condition', threshold: 5, conditionText: 'Triggered with 5+ Channel cards', evolvesTo: 'X-009', evolvedDescription: '' },
  { triggerType: 'ability_use_count', threshold: 8, conditionText: 'Used ability 8 times', evolvesTo: 'X-010', evolvedDescription: '' },
  { triggerType: 'attach_count', threshold: 5, conditionText: 'Attached 5 times', evolvesTo: 'X-011', evolvedDescription: '' },
  { triggerType: 'release_count', threshold: 5, conditionText: 'Released 5 times', evolvesTo: 'X-012', evolvedDescription: '' },
  { triggerType: 'release_with_condition', threshold: 5, conditionText: 'Released at 5 Lumens', evolvesTo: 'X-013', evolvedDescription: '' },
  { triggerType: 'survived_combats', threshold: 5, conditionText: 'Survived 5 combats', evolvesTo: 'X-014', evolvedDescription: '' },
  { triggerType: 'survived_attacks', threshold: 10, conditionText: 'Survived 10 attacks', evolvesTo: 'X-015', evolvedDescription: '' },
  { triggerType: 'revived', threshold: 1, conditionText: 'Revived at least once', evolvesTo: 'X-016', evolvedDescription: '' },
  { triggerType: 'draw_via_this', threshold: 10, conditionText: 'Drew 10 cards via this effect', evolvesTo: 'X-017', evolvedDescription: '' },
  { triggerType: 'rift_open_count', threshold: 10, conditionText: 'Opened 10 Rifts', evolvesTo: 'X-018', evolvedDescription: '' },
];

// Status effects across all categories
const _statuses: StatusEffect[] = [
  { id: 'Block', stacks: 8 },
  { id: 'Vulnerable', stacks: 2, duration: 2 },
  { id: 'Ignite', stacks: 4, duration: 3 },
  { id: 'Lumens', stacks: 3 },
  { id: 'Augment', stacks: 1 },
  { id: 'Flux', stacks: 1 },
];

// Card literal exercising all optional fields
const _compositeCard: Card = {
  id: 'TYPE-TEST-001',
  name: 'Compile-Time Proof',
  rarity: 'Rare',
  type: 'Attack',
  cost: 2,
  description: 'Flux. A: Deal 5. B: Deal 7. C: Deal 6 and draw 1.',
  archetype: 'Typecheck',
  factionId: 'WarpRiders',
  fluxStates: { A: 'Deal 5.', B: 'Deal 7.', C: 'Deal 6 and draw 1.' },
  evolutionRule: _triggerCategories[0],
};

const _augmentCard: Card = {
  id: 'TYPE-TEST-002',
  name: 'Compile-Time Augment',
  rarity: 'Common',
  type: 'Augment',
  cost: 1,
  description: 'Attach to a card in hand: +3 damage. Exhaust.',
  archetype: 'Typecheck',
  factionId: 'Cogsmiths',
  augmentCategory: 'edge',
};

const _deck: StarterDeck = {
  factionId: 'Pyroclast',
  characterName: 'Test',
  cards: [{ cardId: 'P-001', count: 5 }],
  signatureCardId: 'SIG-PY-001',
};

// Mark everything as used so ESLint no-unused-vars doesn't complain.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _allReferenced = [
  _heat,
  _luminarInstance,
  _cogInstance,
  _wrInstance,
  _rift,
  _triggerCategories,
  _statuses,
  _compositeCard,
  _augmentCard,
  _deck,
];
