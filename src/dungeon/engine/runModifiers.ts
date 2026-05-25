import type { CombatState, RunModifierDefinition, RunState, StatusEffect } from '../types';

function addStatus(
  effects: StatusEffect[],
  status: StatusEffect['type'],
  stacks: number,
  duration?: number,
): StatusEffect[] {
  const existing = effects.find((effect) => effect.type === status && effect.duration === duration);
  if (!existing) return [...effects, { type: status, stacks, duration }];
  return effects.map((effect) =>
    effect === existing ? { ...effect, stacks: effect.stacks + stacks } : effect,
  );
}

export function applyRunModifiersToCombat(
  state: CombatState,
  modifiers: RunModifierDefinition[] = [],
): CombatState {
  let next = state;
  for (const modifier of modifiers) {
    for (const effect of modifier.effects) {
      if (effect.type === 'player_status') {
        next = {
          ...next,
          playerStatusEffects: addStatus(
            next.playerStatusEffects,
            effect.status,
            effect.stacks,
            effect.duration,
          ),
        };
      } else if (effect.type === 'enemy_status') {
        next = {
          ...next,
          enemy: {
            ...next.enemy,
            statusEffects: addStatus(
              next.enemy.statusEffects,
              effect.status,
              effect.stacks,
              effect.duration,
            ),
          },
        };
      } else if (effect.type === 'heat') {
        next = { ...next, playerHeat: next.playerHeat + effect.amount };
      } else if (effect.type === 'block') {
        next = { ...next, playerShield: next.playerShield + effect.amount };
      } else if (effect.type === 'energy') {
        next = {
          ...next,
          playerEnergy: next.playerEnergy + effect.amount,
          playerMaxEnergy: next.playerMaxEnergy + effect.amount,
        };
      } else if (effect.type === 'rift') {
        next = {
          ...next,
          playerRifts: [...next.playerRifts, { type: effect.rift, turnsRemaining: effect.turns }],
        };
      }
    }
    next = {
      ...next,
      combatLog: [...next.combatLog, `${modifier.name}: ${modifier.description}`].slice(-8),
    };
  }
  return next;
}

export function consumeNextCombatModifiers(run: RunState): RunState {
  const modifiers = run.runModifiers ?? [];
  return {
    ...run,
    runModifiers: modifiers.filter((modifier) => modifier.duration !== 'next_combat'),
  };
}
