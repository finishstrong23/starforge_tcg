import type { CombatState, RelicDefinition, RelicTrigger, RunState } from '../types';

export function applyRelicTrigger(
  _trigger: RelicTrigger,
  _relics: RelicDefinition[],
  state: CombatState | RunState,
  _context?: Record<string, unknown>,
): CombatState | RunState {
  return state;
}
