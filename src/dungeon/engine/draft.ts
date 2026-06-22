import type { CardDefinition, CardInstance, ComplexityTier, Faction, Rarity } from '../types';
import { CARD_POOL } from '../data/cards';

// ─── Instance factory ─────────────────────────────────────────────────────────

let _seq = 0;

export function createCardInstance(def: CardDefinition): CardInstance {
  const instanceId = `${def.id}-${++_seq}-${Math.random().toString(36).slice(2, 7)}`;
  return {
    ...def,
    instanceId,
    upgraded: false,
    statusEffects: [],
    currentHealth: def.health,
    hasAttacked: false,
  };
}

// ─── Starter decks ────────────────────────────────────────────────────────────

// 10-card starting decks. Pyroclast MVP teaches Build -> Vent immediately.
const STARTER_IDS: Record<Faction, string[]> = {
  Cogsmiths:  ['C-001','C-001','C-001','C-001','C-001','C-002','C-002','C-002','C-002','C-041'],
  Pyroclast:  ['P-001','P-001','P-001','P-001','P-002','P-002','P-002','P-003','P-003','P-010'],
  Luminar:    ['L-001','L-001','L-001','L-001','L-001','L-002','L-002','L-002','L-002','L-041'],
  WarpRiders: ['W-041','W-041','W-041','W-041','W-041','W-042','W-042','W-042','W-042','W-043'],
};

const DEF_BY_ID = new Map<string, CardDefinition>(CARD_POOL.map((c) => [c.id, c]));

export function getStarterCards(faction: Faction): CardInstance[] {
  return STARTER_IDS[faction].map((id) => {
    const def = DEF_BY_ID.get(id);
    if (!def) throw new Error(`Starter card ${id} not found`);
    return createCardInstance(def);
  });
}

// ─── Draft generation ─────────────────────────────────────────────────────────

// Rarity weights per draft round (1-indexed; clamped to 3).
//   round 1: heavy Commons
//   round 2: Commons + Uncommons
//   round 3: Uncommons + Rares
const RARITY_WEIGHTS: Record<number, Record<string, number>> = {
  1: { Common: 70, Uncommon: 25, Rare: 5 },
  2: { Common: 40, Uncommon: 45, Rare: 15 },
  3: { Common: 10, Uncommon: 45, Rare: 45 },
};

const PYRO_OPENING_DRAFT_IDS = ['P-003', 'P-010', 'P-016', 'P-007'];

function weightedRarityPick(round: number): 'Common' | 'Uncommon' | 'Rare' {
  const weights = RARITY_WEIGHTS[Math.min(round, 3)];
  const roll = Math.random() * 100;
  if (roll < weights['Common']) return 'Common';
  if (roll < weights['Common'] + weights['Uncommon']) return 'Uncommon';
  return 'Rare';
}

function countCopies(deck: CardInstance[], defId: string): number {
  return deck.filter((c) => c.id === defId).length;
}

/**
 * Returns 4 unique card choices for a draft pick.
 *
 * @param round       1-indexed draft round (affects rarity distribution)
 * @param existingDeck current deck (used to cap duplicates at 3)
 * @param faction     player's primary faction (receives 70 % of offers)
 */
export function generateDraftOptions(
  round: number,
  existingDeck: CardInstance[],
  faction?: Faction,
): CardDefinition[] {
  if (faction === 'Pyroclast' && round === 1) {
    return PYRO_OPENING_DRAFT_IDS
      .map((id) => DEF_BY_ID.get(id))
      .filter((def): def is CardDefinition => Boolean(def))
      .filter((def) => countCopies(existingDeck, def.id) < 3);
  }

  const chosen: CardDefinition[] = [];
  const usedIds = new Set<string>();

  const maxAttempts = 200;
  let attempts = 0;

  while (chosen.length < 4 && attempts < maxAttempts) {
    attempts++;

    // Faction lock: only show cards from the player's chosen faction. Other
    // factions' cards reference mechanics this player can't use (Channel /
    // Lumens, Augments, Flux, Heat) and feel like dead picks. If no faction
    // was provided, fall back to the full pool.
    const pool = faction ? CARD_POOL.filter((c) => c.faction === faction) : CARD_POOL;

    const rarity = weightedRarityPick(round);
    const candidates = pool.filter(
      (c) =>
        c.rarity === rarity &&
        !usedIds.has(c.id) &&
        countCopies(existingDeck, c.id) < 3,
    );

    if (candidates.length === 0) continue;

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    usedIds.add(pick.id);
    chosen.push(pick);
  }

  return chosen;
}

// ─── Phase 1.5 — In-run reward roller ─────────────────────────────────────────
//
// Card rewards offered after combat are weighted by **room depth in the
// current act** (NOT cumulative across acts — each act restarts at room 1).
// A new player at room 1 sees mostly Tier 1 (foundational) cards. By room 8+
// the curve flips toward Tier 2 (mechanic-introducing) and Tier 3 (mechanic-
// payoff) so the deck builds engagement gradually.

export interface RewardWeights {
  tier1: number;
  tier2: number;
  tier3: number;
}

/** Tier weights by room depth (1-indexed). Restarts each act. */
export function getRewardWeights(roomNumber: number): RewardWeights {
  if (roomNumber <= 3) return { tier1: 80, tier2: 20, tier3: 0 };
  if (roomNumber <= 7) return { tier1: 50, tier2: 40, tier3: 10 };
  return { tier1: 25, tier2: 45, tier3: 30 };
}

/** Rarity weights by act number — same curve as the existing reward gen. */
const ACT_RARITY_WEIGHTS: Record<1 | 2 | 3, Record<Rarity, number>> = {
  1: { Common: 60, Uncommon: 30, Rare: 10, Epic: 0, Legendary: 0 },
  2: { Common: 30, Uncommon: 45, Rare: 25, Epic: 0, Legendary: 0 },
  3: { Common: 10, Uncommon: 40, Rare: 50, Epic: 0, Legendary: 0 },
};

function pickTier(rng: () => number, w: RewardWeights): ComplexityTier {
  const total = w.tier1 + w.tier2 + w.tier3;
  const roll = rng() * total;
  if (roll < w.tier1) return 1;
  if (roll < w.tier1 + w.tier2) return 2;
  return 3;
}

function pickRarity(rng: () => number, weights: Record<Rarity, number>): Rarity {
  const total = weights.Common + weights.Uncommon + weights.Rare;
  const roll = rng() * total;
  if (roll < weights.Common) return 'Common';
  if (roll < weights.Common + weights.Uncommon) return 'Uncommon';
  return 'Rare';
}

/**
 * Generate 3 card-reward options weighted by room depth and act.
 *
 * @param roomNumber  1-indexed room number within the current act
 * @param act         1, 2, or 3
 * @param faction     player faction (every offer comes from this faction)
 * @param deck        player's current deck — used to skip cards the player
 *                    already owns in upgraded form. (Phase 5 integration:
 *                    if a player has Cinder Strike+, the roller must NOT
 *                    offer base Cinder Strike — it would be strictly weaker
 *                    than what they already own. Locked-in policy: skip the
 *                    card entirely. Players who want more copies must
 *                    re-roll via shop or another reward.)
 * @param rng         RNG (defaults to Math.random; injectable for tests)
 *
 * The roller first picks a tier, then a rarity, then filters the pool. If no
 * card matches both constraints (e.g. no T3 Commons exist for this faction),
 * the tier is re-rolled up to a small attempt cap before falling back to any
 * tier. This avoids blocking the offer when the matrix is sparse.
 */
export function generateRewardOptions(
  roomNumber: number,
  act: 1 | 2 | 3,
  faction?: Faction,
  rng: () => number = Math.random,
  deck: CardInstance[] = [],
): CardDefinition[] {
  const tierWeights = getRewardWeights(roomNumber);
  const rarityWeights = ACT_RARITY_WEIGHTS[act];

  // Phase 5: ids of cards the player already owns in upgraded form. The
  // reward roller never offers a base copy of a card whose upgraded variant
  // is already in the player's deck.
  const ownedUpgradedIds = new Set(
    deck.filter((c) => c.upgraded).map((c) => c.id),
  );

  const picks: CardDefinition[] = [];
  const usedIds = new Set<string>();
  const maxAttempts = 200;
  let attempts = 0;

  // Faction lock: every reward card comes from the player's chosen faction.
  // Cross-faction picks (Channel cards for a Pyroclast, Augments for a Luminar,
  // Flux for a Cogsmith, etc.) are mechanically dead because the player can't
  // engage with the other faction's mechanic. Unlock requires a future
  // "neutral / colourless" tag which doesn't exist yet.
  const factionPool = faction
    ? CARD_POOL.filter((c) => c.faction === faction && !ownedUpgradedIds.has(c.id))
    : CARD_POOL.filter((c) => !ownedUpgradedIds.has(c.id));

  while (picks.length < 3 && attempts < maxAttempts) {
    attempts++;

    const tier = pickTier(rng, tierWeights);
    const rarity = pickRarity(rng, rarityWeights);

    let candidates = factionPool.filter(
      (c) =>
        (c.complexityTier ?? 1) === tier &&
        c.rarity === rarity &&
        !usedIds.has(c.id),
    );

    // Fallback: if the tier×rarity matrix is empty, drop the tier filter.
    if (candidates.length === 0) {
      candidates = factionPool.filter(
        (c) => c.rarity === rarity && !usedIds.has(c.id),
      );
    }
    // Last-resort fallback: if rarity is also empty (small faction pools),
    // accept any unused card from the faction so we never offer 0 options.
    if (candidates.length === 0) {
      candidates = factionPool.filter((c) => !usedIds.has(c.id));
    }
    if (candidates.length === 0) continue;

    const pick = candidates[Math.floor(rng() * candidates.length)];
    usedIds.add(pick.id);
    picks.push(pick);
  }

  return picks;
}
