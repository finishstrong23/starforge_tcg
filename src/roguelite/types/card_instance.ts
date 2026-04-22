import type { EvolutionProgress } from './evolution';
import type { AugmentState, FluxState, LumenState } from './faction_mechanics';
import type { StatusEffect } from './status_effect';

// Per-instance card state. Every copy in a deck is a distinct object.
// Mechanics that are per-card (Lumens, Augments, Flux state) live here,
// NOT on the shared Card definition.
export interface CardInstance {
  instanceId: string;
  cardId: string;
  evolutionProgress: EvolutionProgress;

  // Universal status effects the card itself may carry (e.g. a card marked
  // Retain this turn, a card that has been Ethereal'd). Combat-engine owns
  // application, combat-end cleanup, and persistence rules.
  statusEffects: StatusEffect[];

  // Faction-specific extensions. Exactly zero or one should be set per
  // instance, matching the card's factionId. All combat-engine code must
  // treat these as nullable.
  lumenState?: LumenState;        // Luminar Channel cards
  augmentState?: AugmentState;    // All non-Augment Cogsmith cards
  fluxState?: FluxState;          // Warp Rider Flux cards
}
