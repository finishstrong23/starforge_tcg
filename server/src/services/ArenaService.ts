import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import * as AuthService from './AuthService';

const ARENA_ENTRY_GOLD = 150;
const PICKS_PER_DRAFT = 30;
const CHOICES_PER_PICK = 3;
const MAX_WINS = 12;
const MAX_LOSSES = 3;

export interface ArenaRun {
  id: string;
  playerId: string;
  wins: number;
  losses: number;
  deckCards: string[];
  isActive: boolean;
  rewardsClaimed: boolean;
}

export interface ArenaPick {
  pickNumber: number;
  choices: ArenaCardChoice[];
}

export interface ArenaCardChoice {
  cardId: string;
  name: string;
  race: string;
  manaCost: number;
  attack: number;
  health: number;
  rarity: string;
  keywords: string[];
}

interface ArenaRewards {
  gold: number;
  stardust: number;
  packs: number;
  goldenCard: boolean;
}

const ARENA_REWARDS: Record<number, ArenaRewards> = {
  0:  { gold: 25,  stardust: 0,   packs: 1, goldenCard: false },
  1:  { gold: 35,  stardust: 10,  packs: 1, goldenCard: false },
  2:  { gold: 45,  stardust: 20,  packs: 1, goldenCard: false },
  3:  { gold: 60,  stardust: 25,  packs: 1, goldenCard: false },
  4:  { gold: 80,  stardust: 30,  packs: 1, goldenCard: false },
  5:  { gold: 100, stardust: 40,  packs: 1, goldenCard: false },
  6:  { gold: 130, stardust: 50,  packs: 1, goldenCard: false },
  7:  { gold: 160, stardust: 60,  packs: 1, goldenCard: true },
  8:  { gold: 200, stardust: 80,  packs: 2, goldenCard: true },
  9:  { gold: 240, stardust: 100, packs: 2, goldenCard: true },
  10: { gold: 280, stardust: 120, packs: 2, goldenCard: true },
  11: { gold: 340, stardust: 150, packs: 2, goldenCard: true },
  12: { gold: 400, stardust: 200, packs: 3, goldenCard: true },
};

export async function startArenaRun(playerId: string): Promise<{ run: ArenaRun; firstPick: ArenaPick }> {
  // Check if player has an active run
  const activeRun = await query(
    'SELECT id FROM arena_runs WHERE player_id = $1 AND is_active = true',
    [playerId]
  );

  if (activeRun.rows.length > 0) {
    throw new Error('You already have an active arena run');
  }

  // Check if player can afford entry
  const player = await query('SELECT gold FROM players WHERE id = $1', [playerId]);
  if (player.rows[0].gold < ARENA_ENTRY_GOLD) {
    throw new Error(`Need ${ARENA_ENTRY_GOLD} gold to enter Arena`);
  }

  // Deduct entry fee
  await AuthService.addCurrency(playerId, { gold: -ARENA_ENTRY_GOLD });

  // Create run
  const runId = uuidv4();
  await query(
    `INSERT INTO arena_runs (id, player_id, deck_cards, offered_cards, started_at)
     VALUES ($1, $2, '[]', '[]', NOW())`,
    [runId, playerId]
  );

  const run: ArenaRun = {
    id: runId,
    playerId,
    wins: 0,
    losses: 0,
    deckCards: [],
    isActive: true,
    rewardsClaimed: false,
  };

  // Generate first pick
  const firstPick = await generatePick(1, []);

  return { run, firstPick };
}

export async function makePick(playerId: string, cardId: string): Promise<{ run: ArenaRun; nextPick: ArenaPick | null; draftComplete: boolean }> {
  const result = await query(
    'SELECT * FROM arena_runs WHERE player_id = $1 AND is_active = true',
    [playerId]
  );

  if (result.rows.length === 0) {
    throw new Error('No active arena run');
  }

  const row = result.rows[0];
  const currentCards: string[] = JSON.parse(row.deck_cards || '[]');

  if (currentCards.length >= PICKS_PER_DRAFT) {
    throw new Error('Draft is already complete');
  }

  currentCards.push(cardId);
  const draftComplete = currentCards.length >= PICKS_PER_DRAFT;

  await query(
    'UPDATE arena_runs SET deck_cards = $1 WHERE id = $2',
    [JSON.stringify(currentCards), row.id]
  );

  const run: ArenaRun = {
    id: row.id,
    playerId,
    wins: row.wins,
    losses: row.losses,
    deckCards: currentCards,
    isActive: true,
    rewardsClaimed: false,
  };

  let nextPick: ArenaPick | null = null;
  if (!draftComplete) {
    nextPick = await generatePick(currentCards.length + 1, currentCards);
  }

  return { run, nextPick, draftComplete };
}

export async function recordArenaGame(playerId: string, won: boolean): Promise<ArenaRun> {
  const result = await query(
    'SELECT * FROM arena_runs WHERE player_id = $1 AND is_active = true',
    [playerId]
  );

  if (result.rows.length === 0) {
    throw new Error('No active arena run');
  }

  const row = result.rows[0];
  const newWins = row.wins + (won ? 1 : 0);
  const newLosses = row.losses + (won ? 0 : 1);
  const isComplete = newWins >= MAX_WINS || newLosses >= MAX_LOSSES;

  await query(
    `UPDATE arena_runs SET wins = $1, losses = $2, is_active = $3,
     completed_at = CASE WHEN $3 = false THEN NOW() ELSE NULL END
     WHERE id = $4`,
    [newWins, newLosses, !isComplete, row.id]
  );

  // Update player arena stats
  if (isComplete) {
    await query(
      `UPDATE player_stats SET arena_wins = arena_wins + $1,
       arena_best_run = GREATEST(arena_best_run, $1)
       WHERE player_id = $2`,
      [newWins, playerId]
    );
  }

  return {
    id: row.id,
    playerId,
    wins: newWins,
    losses: newLosses,
    deckCards: JSON.parse(row.deck_cards || '[]'),
    isActive: !isComplete,
    rewardsClaimed: false,
  };
}

export async function claimArenaRewards(playerId: string): Promise<ArenaRewards> {
  const result = await query(
    `SELECT * FROM arena_runs WHERE player_id = $1 AND is_active = false AND rewards_claimed = false
     ORDER BY completed_at DESC LIMIT 1`,
    [playerId]
  );

  if (result.rows.length === 0) {
    throw new Error('No completed arena run to claim');
  }

  const row = result.rows[0];
  const rewards = ARENA_REWARDS[row.wins] || ARENA_REWARDS[0];

  await AuthService.addCurrency(playerId, {
    gold: rewards.gold,
    stardust: rewards.stardust,
  });

  await query('UPDATE arena_runs SET rewards_claimed = true WHERE id = $1', [row.id]);

  return rewards;
}

export async function getActiveArenaRun(playerId: string): Promise<ArenaRun | null> {
  const result = await query(
    'SELECT * FROM arena_runs WHERE player_id = $1 AND is_active = true',
    [playerId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    playerId,
    wins: row.wins,
    losses: row.losses,
    deckCards: JSON.parse(row.deck_cards || '[]'),
    isActive: true,
    rewardsClaimed: false,
  };
}

export async function getArenaHistory(playerId: string, limit = 10): Promise<ArenaRun[]> {
  const result = await query(
    `SELECT * FROM arena_runs WHERE player_id = $1 AND is_active = false
     ORDER BY completed_at DESC LIMIT $2`,
    [playerId, limit]
  );

  return result.rows.map(row => ({
    id: row.id,
    playerId,
    wins: row.wins,
    losses: row.losses,
    deckCards: JSON.parse(row.deck_cards || '[]'),
    isActive: false,
    rewardsClaimed: row.rewards_claimed,
  }));
}

async function generatePick(pickNumber: number, currentCards: string[]): Promise<ArenaPick> {
  // Rarity distribution for arena picks
  const rarityRoll = Math.random();
  let targetRarity: string;
  if (rarityRoll < 0.55) targetRarity = 'common';
  else if (rarityRoll < 0.80) targetRarity = 'uncommon';
  else if (rarityRoll < 0.93) targetRarity = 'rare';
  else if (rarityRoll < 0.98) targetRarity = 'epic';
  else targetRarity = 'legendary';

  // First pick gives a legendary to start with excitement
  if (pickNumber === 1) targetRarity = 'legendary';

  // Every 10th pick guarantees at least rare
  if (pickNumber % 10 === 0 && ['common', 'uncommon'].includes(targetRarity)) {
    targetRarity = 'rare';
  }

  const result = await query(
    `SELECT id, name, race, mana_cost, attack, health, rarity, keywords
     FROM cards
     WHERE rarity = $1 AND is_collectible = true AND id != ALL($2)
     ORDER BY RANDOM()
     LIMIT $3`,
    [targetRarity, currentCards, CHOICES_PER_PICK]
  );

  // If not enough cards of target rarity, fallback to any rarity
  if (result.rows.length < CHOICES_PER_PICK) {
    const fallback = await query(
      `SELECT id, name, race, mana_cost, attack, health, rarity, keywords
       FROM cards
       WHERE is_collectible = true AND id != ALL($1)
       ORDER BY RANDOM()
       LIMIT $2`,
      [currentCards, CHOICES_PER_PICK]
    );
    result.rows.push(...fallback.rows);
  }

  return {
    pickNumber,
    choices: result.rows.slice(0, CHOICES_PER_PICK).map(row => ({
      cardId: row.id,
      name: row.name,
      race: row.race,
      manaCost: row.mana_cost,
      attack: row.attack || 0,
      health: row.health || 0,
      rarity: row.rarity,
      keywords: row.keywords || [],
    })),
  };
}
