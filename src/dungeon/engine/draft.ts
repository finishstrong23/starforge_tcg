import type { CardDefinition, CardInstance, Faction } from '../types';
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

// 10-card starting decks: 5 basic attack + 4 basic block + 1 utility per faction.
const STARTER_IDS: Record<Faction, string[]> = {
  Cogsmiths:  ['C-001','C-001','C-001','C-001','C-001','C-002','C-002','C-002','C-002','C-041'],
  Pyroclast:  ['P-001','P-001','P-001','P-001','P-001','P-002','P-002','P-002','P-002','P-041'],
  Luminar:    ['L-001','L-001','L-001','L-001','L-001','L-002','L-002','L-002','L-002','L-041'],
  WarpRiders: ['W-001','W-001','W-001','W-001','W-001','W-002','W-002','W-002','W-002','W-003'],
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
  const chosen: CardDefinition[] = [];
  const usedIds = new Set<string>();

  const maxAttempts = 200;
  let attempts = 0;

  while (chosen.length < 4 && attempts < maxAttempts) {
    attempts++;

    // Decide pool: 70 % faction, 30 % any (or all when no faction given)
    const useFaction = faction && Math.random() < 0.7;
    const pool = useFaction
      ? CARD_POOL.filter((c) => c.faction === faction)
      : CARD_POOL;

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
