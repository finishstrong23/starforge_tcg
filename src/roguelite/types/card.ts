export type FactionId = 'Pyroclast' | 'Luminar' | 'Cogsmiths' | 'WarpRiders';

export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Basic' | 'Special';

export type CardType = 'Attack' | 'Skill' | 'Power' | 'Augment';

export type AugmentCategory =
  | 'edge'
  | 'plate'
  | 'jolt'
  | 'core'
  | 'gyro'
  | 'bulwark'
  | 'amp'
  | 'exotic_core'
  | 'inverter';

export interface Card {
  id: string;
  name: string;
  rarity: Rarity;
  type: CardType;
  cost: number;
  description: string;
  archetype: string;
  factionId: FactionId;

  // Present only on evolved-form Card entries. Points at the base card id.
  basedOn?: string;

  // Evolution rule for base cards. Evolved cards do not carry this.
  evolutionRule?: import('./evolution').EvolutionRule;

  // Cogsmiths-only. Non-Augment cards have augmentCategory === undefined.
  augmentCategory?: AugmentCategory;

  // Warp Riders-only. Only Flux cards carry this; non-Flux cards leave it undefined.
  fluxStates?: { A: string; B: string; C: string };
}
