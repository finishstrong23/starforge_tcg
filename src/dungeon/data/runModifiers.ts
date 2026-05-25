import type { RunModifierDefinition } from '../types';

export const RUN_MODIFIER_POOL: RunModifierDefinition[] = [
  {
    id: 'smoldering-heart',
    name: 'Smoldering Heart',
    description: 'Start the next combat with 4 Heat.',
    duration: 'next_combat',
    effects: [{ type: 'heat', amount: 4 }],
  },
  {
    id: 'calibrated-rigs',
    name: 'Calibrated Rigs',
    description: 'Start the next combat with 2 Strength.',
    duration: 'next_combat',
    effects: [{ type: 'player_status', status: 'strength', stacks: 2 }],
  },
  {
    id: 'sunless-aegis',
    name: 'Sunless Aegis',
    description: 'Start the next combat with 10 Block.',
    duration: 'next_combat',
    effects: [{ type: 'block', amount: 10 }],
  },
  {
    id: 'unstable-rift',
    name: 'Unstable Rift',
    description: 'Start the next combat with a 2-turn energy Rift.',
    duration: 'next_combat',
    effects: [{ type: 'rift', rift: 'energy', turns: 2 }],
  },
  {
    id: 'marked-path',
    name: 'Marked Path',
    description: 'The next enemy starts with 2 Vulnerable.',
    duration: 'next_combat',
    effects: [{ type: 'enemy_status', status: 'vulnerable', stacks: 2, duration: 2 }],
  },
];

export function getRunModifierDef(modifierId: string): RunModifierDefinition | undefined {
  return RUN_MODIFIER_POOL.find((modifier) => modifier.id === modifierId);
}
