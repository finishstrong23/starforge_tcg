/**
 * STARFORGE TCG - Content Pipeline Service
 *
 * Manages card data as server-side content (not hardcoded TypeScript).
 * Supports expansion framework, card reveals, and hot-swappable card data.
 */

import { query } from '../config/database';

export interface Expansion {
  id: string;
  name: string;
  description: string;
  cardCount: number;
  newKeyword?: string;
  newKeywordDescription?: string;
  releaseDate: Date;
  revealStartDate: Date;
  status: 'development' | 'reveal_season' | 'released' | 'rotated';
  preorderAvailable: boolean;
}

export interface CardReveal {
  cardId: string;
  cardName: string;
  expansionId: string;
  revealDate: Date;
  revealedBy: string; // Content creator or official
  isRevealed: boolean;
}

export interface ServerCardData {
  id: string;
  name: string;
  race: string;
  type: string;
  rarity: string;
  manaCost: number;
  attack?: number;
  health?: number;
  keywords: string[];
  effectText: string;
  flavorText: string;
  expansion: string;
  isActive: boolean; // Can be toggled for Standard rotation
}

// Expansion catalog
const EXPANSIONS: Expansion[] = [
  {
    id: 'core',
    name: 'Core Set',
    description: 'The foundation of StarForge TCG',
    cardCount: 800,
    releaseDate: new Date('2026-01-01'),
    revealStartDate: new Date('2025-12-01'),
    status: 'released',
    preorderAvailable: false,
  },
  {
    id: 'exp1_shattered_stars',
    name: 'Shattered Stars',
    description: 'A cataclysm tears the galaxy apart. New alliances form in the chaos.',
    cardCount: 130,
    newKeyword: 'FRACTURE',
    newKeywordDescription: 'When this minion takes damage, split into two smaller copies.',
    releaseDate: new Date('2026-05-01'),
    revealStartDate: new Date('2026-04-15'),
    status: 'development',
    preorderAvailable: true,
  },
  {
    id: 'exp2_void_convergence',
    name: 'Void Convergence',
    description: 'The Void reaches into every corner of space. Choose a side.',
    cardCount: 130,
    newKeyword: 'CORRUPT',
    newKeywordDescription: 'If you played a card costing 6+ this game, this card gains a bonus effect.',
    releaseDate: new Date('2026-09-01'),
    revealStartDate: new Date('2026-08-15'),
    status: 'development',
    preorderAvailable: false,
  },
  {
    id: 'exp3_temporal_war',
    name: 'Temporal War',
    description: 'Time itself is weaponized. Past and future collide on the battlefield.',
    cardCount: 130,
    newKeyword: 'REWIND',
    newKeywordDescription: 'Return this minion to your hand. It costs (1) less.',
    releaseDate: new Date('2027-01-01'),
    revealStartDate: new Date('2026-12-15'),
    status: 'development',
    preorderAvailable: false,
  },
];

// Card reveals for upcoming expansions
const cardReveals: CardReveal[] = [
  { cardId: 'exp1_001', cardName: 'Star Splitter', expansionId: 'exp1_shattered_stars', revealDate: new Date('2026-04-15'), revealedBy: 'Official', isRevealed: false },
  { cardId: 'exp1_002', cardName: 'Fracture Elemental', expansionId: 'exp1_shattered_stars', revealDate: new Date('2026-04-16'), revealedBy: 'StarForgeGaming', isRevealed: false },
  { cardId: 'exp1_003', cardName: 'Void Rift Opener', expansionId: 'exp1_shattered_stars', revealDate: new Date('2026-04-17'), revealedBy: 'TCGPro', isRevealed: false },
  { cardId: 'exp1_004', cardName: 'Nebula Guardian', expansionId: 'exp1_shattered_stars', revealDate: new Date('2026-04-18'), revealedBy: 'Official', isRevealed: false },
  { cardId: 'exp1_005', cardName: 'Shattered Colossus', expansionId: 'exp1_shattered_stars', revealDate: new Date('2026-04-19'), revealedBy: 'CardMaster', isRevealed: false },
];

/**
 * Get all expansions.
 */
export function getExpansions(): Expansion[] {
  return EXPANSIONS;
}

/**
 * Get a specific expansion.
 */
export function getExpansion(id: string): Expansion | undefined {
  return EXPANSIONS.find(e => e.id === id);
}

/**
 * Get card reveals for an expansion.
 */
export function getCardReveals(expansionId: string): CardReveal[] {
  const now = new Date();
  return cardReveals
    .filter(r => r.expansionId === expansionId)
    .map(r => ({
      ...r,
      isRevealed: r.revealDate <= now,
    }));
}

/**
 * Get today's card reveal (if any).
 */
export function getTodaysReveal(): CardReveal | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return cardReveals.find(r =>
    r.revealDate >= today && r.revealDate < tomorrow
  ) || null;
}

/**
 * Get card data from server (supports hot-patching).
 */
export async function getServerCardData(filters?: {
  expansion?: string;
  race?: string;
  rarity?: string;
  isActive?: boolean;
}): Promise<ServerCardData[]> {
  try {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (filters?.expansion) {
      conditions.push(`expansion = $${idx++}`);
      values.push(filters.expansion);
    }
    if (filters?.race) {
      conditions.push(`race = $${idx++}`);
      values.push(filters.race);
    }
    if (filters?.rarity) {
      conditions.push(`rarity = $${idx++}`);
      values.push(filters.rarity);
    }
    if (filters?.isActive !== undefined) {
      conditions.push(`is_active = $${idx++}`);
      values.push(filters.isActive);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await query(
      `SELECT * FROM cards ${where} ORDER BY mana_cost, name`,
      values
    );

    return result.rows.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      name: row.name as string,
      race: row.race as string,
      type: row.type as string,
      rarity: row.rarity as string,
      manaCost: row.mana_cost as number,
      attack: row.attack as number | undefined,
      health: row.health as number | undefined,
      keywords: JSON.parse(row.keywords as string || '[]'),
      effectText: row.effect_text as string,
      flavorText: row.flavor_text as string,
      expansion: row.expansion as string,
      isActive: row.is_active as boolean,
    }));
  } catch {
    return [];
  }
}

/**
 * Update a card's data (for balance patches).
 */
export async function updateCardData(
  cardId: string,
  updates: Partial<ServerCardData>,
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (updates.manaCost !== undefined) { sets.push(`mana_cost = $${idx++}`); values.push(updates.manaCost); }
  if (updates.attack !== undefined) { sets.push(`attack = $${idx++}`); values.push(updates.attack); }
  if (updates.health !== undefined) { sets.push(`health = $${idx++}`); values.push(updates.health); }
  if (updates.effectText !== undefined) { sets.push(`effect_text = $${idx++}`); values.push(updates.effectText); }
  if (updates.isActive !== undefined) { sets.push(`is_active = $${idx++}`); values.push(updates.isActive); }

  if (sets.length > 0) {
    values.push(cardId);
    await query(
      `UPDATE cards SET ${sets.join(', ')} WHERE id = $${idx}`,
      values
    );
  }
}

/**
 * Get Standard rotation info (which expansions are active).
 */
export function getStandardRotation(): {
  activeExpansions: string[];
  nextRotation: Date;
  rotatingOut: string[];
} {
  return {
    activeExpansions: EXPANSIONS.filter(e => e.status === 'released').map(e => e.id),
    nextRotation: new Date('2027-04-01'),
    rotatingOut: [], // No rotations yet (game is new)
  };
}

/**
 * Get upcoming content schedule.
 */
export function getContentSchedule(): {
  event: string;
  date: Date;
  description: string;
}[] {
  return [
    { event: 'Balance Patch 1.1', date: new Date('2026-03-15'), description: 'Bi-weekly micro-patch' },
    { event: 'Balance Patch 1.2', date: new Date('2026-04-01'), description: 'Monthly major balance patch' },
    { event: 'Shattered Stars Reveal Season', date: new Date('2026-04-15'), description: 'Daily card reveals for 2 weeks' },
    { event: 'Shattered Stars Launch', date: new Date('2026-05-01'), description: '130 new cards, FRACTURE keyword' },
    { event: 'Mid-Season Balance', date: new Date('2026-06-15'), description: 'Major balance pass post-expansion' },
    { event: 'Void Convergence Reveal', date: new Date('2026-08-15'), description: 'Expansion 2 card reveals' },
    { event: 'Void Convergence Launch', date: new Date('2026-09-01'), description: '130 new cards, CORRUPT keyword' },
  ];
}
