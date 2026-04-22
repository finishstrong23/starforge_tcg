// Starter-deck-only signature Power cards. Not in any faction's 40-card pool.
// One per faction; given to the character as their identity-teaching 1-of.

import type { Card } from '../types';

export const SIGNATURE_CARDS: Card[] = [
  {
    id: 'SIG-PY-001',
    name: 'Molten Core',
    rarity: 'Special',
    type: 'Power',
    cost: 1,
    description: 'At turn start, if Heat >= 3, gain 1 Strength.',
    archetype: 'Signature',
    factionId: 'Pyroclast',
  },
  {
    id: 'SIG-LU-001',
    name: 'Inner Sun',
    rarity: 'Special',
    type: 'Power',
    cost: 1,
    description: 'At start of each turn, gain 1 Lumen on your leftmost Channel card.',
    archetype: 'Signature',
    factionId: 'Luminar',
  },
  {
    id: 'SIG-CO-001',
    name: 'Modular Core',
    rarity: 'Special',
    type: 'Power',
    cost: 1,
    description: 'The first Augment you play each combat costs 0.',
    archetype: 'Signature',
    factionId: 'Cogsmiths',
  },
  {
    id: 'SIG-WR-001',
    name: 'Probability Anchor',
    rarity: 'Special',
    type: 'Power',
    cost: 1,
    description: 'Once per turn, lock one Flux card in your hand to its current state.',
    archetype: 'Signature',
    factionId: 'WarpRiders',
  },
];
