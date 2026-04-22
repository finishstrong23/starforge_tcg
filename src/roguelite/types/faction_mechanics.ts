// ─── Pyroclast: Heat ────────────────────────────────────────────────────────
// Combat-scoped, shared across all Pyroclast cards in play. Not per-instance.
export interface HeatState {
  currentHeat: number;
  maxHeat: number;               // default 12
}

export const DEFAULT_MAX_HEAT = 12;

// ─── Luminar: Lumens / Channel ─────────────────────────────────────────────
// Per-card-instance state. Two copies of the same Channel card track Lumens
// independently. Lost when the card is shuffled back into the draw pile.
export interface LumenState {
  currentLumens: number;
  maxLumens: number;             // default 5, raisable by powers like Sun's Blessing
  hasChannel: boolean;           // True = card has the Channel keyword
}

export const DEFAULT_MAX_LUMENS = 5;

// ─── Cogsmiths: Augments ───────────────────────────────────────────────────
// Per-card-instance. Augments attach to a host card and persist across combats.
// When a card is removed from the deck, its augments go with it.
export interface AugmentRef {
  augmentCardId: string;          // e.g. 'C-017' (Augment: Edge)
  augmentInstanceId: string;      // the instance consumed to attach it
}

export interface AugmentState {
  slots: [AugmentRef | null, AugmentRef | null];
  slotCount: number;              // default 2
}

export const DEFAULT_AUGMENT_SLOTS = 2;

// ─── Warp Riders: Flux ─────────────────────────────────────────────────────
// Per-card-instance. State rerolls at the start of each turn unless locked.
export interface FluxState {
  currentState: 'A' | 'B' | 'C';
  isLocked: boolean;
}

// ─── Warp Riders: Rifts ────────────────────────────────────────────────────
// Board-scoped entity opened by Warp Rider cards. Multiple Rifts stack.
export type RiftType =
  | 'Cost'
  | 'Damage'
  | 'Flux'
  | 'Echo'
  | 'Genesis';

export interface RiftInstance {
  riftId: string;
  type: RiftType;
  turnsRemaining: number;
}
