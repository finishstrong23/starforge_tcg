import type { FactionId, StarterDeck } from '../types';

// Character names + deck composition verified against each faction's Starter
// Deck sheet in docs/roguelite/factions/*.xlsx. Basic card IDs (5x/4x) match
// the P-001/L-001/etc. common entries in the main pool; signature IDs come
// from signature_cards.ts.

export const STARTER_DECKS: Record<FactionId, StarterDeck> = {
  Pyroclast: {
    factionId: 'Pyroclast',
    characterName: 'Pyroclast Ignitor',
    cards: [
      { cardId: 'P-001', count: 5 },      // Cinder Strike
      { cardId: 'P-002', count: 4 },      // Scale Guard
      { cardId: 'SIG-PY-001', count: 1 }, // Molten Core
    ],
    signatureCardId: 'SIG-PY-001',
  },
  Luminar: {
    factionId: 'Luminar',
    characterName: 'Luminar Channeler',
    cards: [
      { cardId: 'L-001', count: 5 },      // Light Jab
      { cardId: 'L-002', count: 4 },      // Glow Ward
      { cardId: 'SIG-LU-001', count: 1 }, // Inner Sun
    ],
    signatureCardId: 'SIG-LU-001',
  },
  Cogsmiths: {
    factionId: 'Cogsmiths',
    characterName: 'Cogsmith Artificer',
    cards: [
      { cardId: 'C-001', count: 5 },      // Rivet Strike
      { cardId: 'C-002', count: 4 },      // Plate Shield
      { cardId: 'SIG-CO-001', count: 1 }, // Modular Core
    ],
    signatureCardId: 'SIG-CO-001',
  },
  WarpRiders: {
    factionId: 'WarpRiders',
    characterName: 'Warp Rider Shiftblade',
    cards: [
      { cardId: 'W-001', count: 5 },      // Glitch Strike
      { cardId: 'W-002', count: 4 },      // Warp Step
      { cardId: 'SIG-WR-001', count: 1 }, // Probability Anchor
    ],
    signatureCardId: 'SIG-WR-001',
  },
};
