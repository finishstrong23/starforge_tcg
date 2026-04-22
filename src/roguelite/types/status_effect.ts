// Status effect identifiers used across the roguelite.
// Combat engine (later phase) attaches resolution logic to each.
export type StatusEffectId =
  // Universal
  | 'Block'
  | 'Vulnerable'
  | 'Weak'
  | 'Strength'
  | 'Dexterity'
  | 'Retain'
  | 'Exhaust'
  | 'Artifact'
  | 'Intangible'
  | 'Frail'
  | 'Poison'
  // Pyroclast
  | 'Burn'
  | 'Ignite'
  // Luminar
  | 'Lumens'
  | 'Channel'
  | 'Release'
  // Cogsmiths
  | 'Augment'
  | 'Slot'
  | 'Drone'
  | 'Sentry'
  | 'Titan'
  | 'Overcharge'
  // Warp Riders
  | 'Flux'
  | 'Lock'
  | 'Reroll'
  | 'Rift';

export interface StatusEffect {
  id: StatusEffectId;
  stacks: number;
  duration?: number;   // undefined = permanent for combat
}
