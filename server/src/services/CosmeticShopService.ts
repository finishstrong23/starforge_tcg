/**
 * STARFORGE TCG - Cosmetic Shop Service
 *
 * Manages cosmetic items: card backs, hero skins, board themes, emotes.
 * All cosmetics are purchasable with Nebula Gems (premium) or Gold.
 * No gameplay impact — cosmetics only.
 */

import { query, withTransaction } from '../config/database';
import * as EconomyService from './EconomyService';

export type CosmeticType = 'card_back' | 'hero_skin' | 'board_theme' | 'emote' | 'profile_icon';

export interface CosmeticItem {
  id: string;
  name: string;
  description: string;
  type: CosmeticType;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  race?: string; // Faction-specific cosmetics
  priceGold: number; // 0 = not purchasable with gold
  priceGems: number; // 0 = not purchasable with gems
  previewUrl: string;
  isLimited: boolean;
  availableUntil?: Date;
}

export interface PlayerCosmetic {
  cosmeticId: string;
  source: string;
  equippedSlot?: string;
  obtainedAt: Date;
}

// Cosmetic catalog
const COSMETICS: CosmeticItem[] = [
  // Card Backs
  { id: 'cardback_default', name: 'Standard', description: 'Default StarForge card back', type: 'card_back', rarity: 'common', priceGold: 0, priceGems: 0, previewUrl: '/cosmetics/cardback_default.png', isLimited: false },
  { id: 'cardback_nebula', name: 'Nebula Swirl', description: 'A swirling galaxy adorns your cards', type: 'card_back', rarity: 'rare', priceGold: 500, priceGems: 100, previewUrl: '/cosmetics/cardback_nebula.png', isLimited: false },
  { id: 'cardback_void', name: 'Void Shadow', description: 'Dark tendrils of void energy', type: 'card_back', rarity: 'epic', priceGold: 1000, priceGems: 200, previewUrl: '/cosmetics/cardback_void.png', isLimited: false },
  { id: 'cardback_golden', name: 'Golden Frame', description: 'Gilded elegance for your collection', type: 'card_back', rarity: 'epic', priceGold: 1500, priceGems: 300, previewUrl: '/cosmetics/cardback_golden.png', isLimited: false },
  { id: 'cardback_fire', name: 'Pyroclast Flame', description: 'Burning embers dance on your cards', type: 'card_back', rarity: 'rare', race: 'pyroclast', priceGold: 800, priceGems: 150, previewUrl: '/cosmetics/cardback_fire.png', isLimited: false },
  { id: 'cardback_crystal', name: 'Crystalline Prism', description: 'Refracting light in every color', type: 'card_back', rarity: 'rare', race: 'crystalline', priceGold: 800, priceGems: 150, previewUrl: '/cosmetics/cardback_crystal.png', isLimited: false },
  { id: 'cardback_mech', name: 'Cogsmith Blueprint', description: 'Technical schematics of a master engineer', type: 'card_back', rarity: 'rare', race: 'cogsmiths', priceGold: 800, priceGems: 150, previewUrl: '/cosmetics/cardback_mech.png', isLimited: false },
  { id: 'cardback_hive', name: 'Hivemind Chitin', description: 'Organic armor of the swarm', type: 'card_back', rarity: 'rare', race: 'hivemind', priceGold: 800, priceGems: 150, previewUrl: '/cosmetics/cardback_hive.png', isLimited: false },
  { id: 'cardback_season1', name: 'Season 1 Champion', description: 'Awarded to Season 1 Legend players', type: 'card_back', rarity: 'legendary', priceGold: 0, priceGems: 0, previewUrl: '/cosmetics/cardback_season1.png', isLimited: true },
  { id: 'cardback_founders', name: 'Founders Edition', description: 'For players who joined during beta', type: 'card_back', rarity: 'legendary', priceGold: 0, priceGems: 0, previewUrl: '/cosmetics/cardback_founders.png', isLimited: true },

  // Hero Skins
  { id: 'skin_pyro_inferno', name: 'Inferno Lord', description: 'Alternate Pyroclast hero: wreathed in flame', type: 'hero_skin', rarity: 'legendary', race: 'pyroclast', priceGold: 0, priceGems: 600, previewUrl: '/cosmetics/skin_pyro_inferno.png', isLimited: false },
  { id: 'skin_void_eclipse', name: 'Eclipse Harbinger', description: 'Alternate Voidborn hero: shadow made flesh', type: 'hero_skin', rarity: 'legendary', race: 'voidborn', priceGold: 0, priceGems: 600, previewUrl: '/cosmetics/skin_void_eclipse.png', isLimited: false },
  { id: 'skin_luminar_dawn', name: 'Dawnbringer', description: 'Alternate Luminar hero: radiant sunguard', type: 'hero_skin', rarity: 'legendary', race: 'luminar', priceGold: 0, priceGems: 600, previewUrl: '/cosmetics/skin_luminar_dawn.png', isLimited: false },
  { id: 'skin_cog_titan', name: 'Titan Forge', description: 'Alternate Cogsmiths hero: giant mech suit', type: 'hero_skin', rarity: 'legendary', race: 'cogsmiths', priceGold: 0, priceGems: 600, previewUrl: '/cosmetics/skin_cog_titan.png', isLimited: false },
  { id: 'skin_bio_ancient', name: 'Ancient Colossus', description: 'Alternate Biotitans hero: primordial giant', type: 'hero_skin', rarity: 'legendary', race: 'biotitans', priceGold: 0, priceGems: 600, previewUrl: '/cosmetics/skin_bio_ancient.png', isLimited: false },
  { id: 'skin_corsair_ghost', name: 'Ghost Captain', description: 'Alternate Phantom Corsairs hero: spectral pirate', type: 'hero_skin', rarity: 'legendary', race: 'phantom_corsairs', priceGold: 0, priceGems: 600, previewUrl: '/cosmetics/skin_corsair_ghost.png', isLimited: false },
  { id: 'skin_astro_oracle', name: 'Starweaver Oracle', description: 'Alternate Astromancers hero: cosmic seer', type: 'hero_skin', rarity: 'legendary', race: 'astromancers', priceGold: 0, priceGems: 600, previewUrl: '/cosmetics/skin_astro_oracle.png', isLimited: false },
  { id: 'skin_chrono_paradox', name: 'Paradox Walker', description: 'Alternate Chronobound hero: time-fractured', type: 'hero_skin', rarity: 'legendary', race: 'chronobound', priceGold: 0, priceGems: 600, previewUrl: '/cosmetics/skin_chrono_paradox.png', isLimited: false },
  { id: 'skin_crystal_prism', name: 'Prism Archon', description: 'Alternate Crystalline hero: living crystal', type: 'hero_skin', rarity: 'legendary', race: 'crystalline', priceGold: 0, priceGems: 600, previewUrl: '/cosmetics/skin_crystal_prism.png', isLimited: false },
  { id: 'skin_hive_queen', name: 'Brood Empress', description: 'Alternate Hivemind hero: matriarch form', type: 'hero_skin', rarity: 'legendary', race: 'hivemind', priceGold: 0, priceGems: 600, previewUrl: '/cosmetics/skin_hive_queen.png', isLimited: false },

  // Board Themes
  { id: 'board_default', name: 'Star Station', description: 'Default orbital station board', type: 'board_theme', rarity: 'common', priceGold: 0, priceGems: 0, previewUrl: '/cosmetics/board_default.png', isLimited: false },
  { id: 'board_volcanic', name: 'Volcanic Rift', description: 'Molten lava flows beneath the board', type: 'board_theme', rarity: 'epic', race: 'pyroclast', priceGold: 2000, priceGems: 400, previewUrl: '/cosmetics/board_volcanic.png', isLimited: false },
  { id: 'board_crystal', name: 'Crystal Cavern', description: 'Glowing crystals illuminate the field', type: 'board_theme', rarity: 'epic', race: 'crystalline', priceGold: 2000, priceGems: 400, previewUrl: '/cosmetics/board_crystal.png', isLimited: false },
  { id: 'board_void', name: 'Void Expanse', description: 'Infinite darkness with distant stars', type: 'board_theme', rarity: 'epic', race: 'voidborn', priceGold: 2000, priceGems: 400, previewUrl: '/cosmetics/board_void.png', isLimited: false },
  { id: 'board_forest', name: 'Bioluminescent Grove', description: 'Living forest with glowing flora', type: 'board_theme', rarity: 'epic', race: 'biotitans', priceGold: 2000, priceGems: 400, previewUrl: '/cosmetics/board_forest.png', isLimited: false },
  { id: 'board_clockwork', name: 'Clockwork Workshop', description: 'Gears and steam surround the board', type: 'board_theme', rarity: 'epic', race: 'cogsmiths', priceGold: 2000, priceGems: 400, previewUrl: '/cosmetics/board_clockwork.png', isLimited: false },
  { id: 'board_pirate', name: 'Phantom Ship', description: 'Ghostly ship deck in the nebula', type: 'board_theme', rarity: 'epic', race: 'phantom_corsairs', priceGold: 2000, priceGems: 400, previewUrl: '/cosmetics/board_pirate.png', isLimited: false },
  { id: 'board_cathedral', name: 'Solar Cathedral', description: 'Sacred temple bathed in light', type: 'board_theme', rarity: 'epic', race: 'luminar', priceGold: 2000, priceGems: 400, previewUrl: '/cosmetics/board_cathedral.png', isLimited: false },
  { id: 'board_hive', name: 'The Hive Core', description: 'Organic tunnels of the swarm hive', type: 'board_theme', rarity: 'epic', race: 'hivemind', priceGold: 2000, priceGems: 400, previewUrl: '/cosmetics/board_hive.png', isLimited: false },
  { id: 'board_observatory', name: 'Celestial Observatory', description: 'Telescopes and star charts', type: 'board_theme', rarity: 'epic', race: 'astromancers', priceGold: 2000, priceGems: 400, previewUrl: '/cosmetics/board_observatory.png', isLimited: false },
  { id: 'board_temporal', name: 'Temporal Rift', description: 'Time streams flow and converge', type: 'board_theme', rarity: 'epic', race: 'chronobound', priceGold: 2000, priceGems: 400, previewUrl: '/cosmetics/board_temporal.png', isLimited: false },

  // Emotes
  { id: 'emote_gg', name: 'Good Game', description: 'A sportsman\'s salute', type: 'emote', rarity: 'common', priceGold: 100, priceGems: 20, previewUrl: '/cosmetics/emote_gg.png', isLimited: false },
  { id: 'emote_wow', name: 'Wow!', description: 'Express amazement', type: 'emote', rarity: 'common', priceGold: 100, priceGems: 20, previewUrl: '/cosmetics/emote_wow.png', isLimited: false },
  { id: 'emote_thanks', name: 'Thanks', description: 'Express gratitude', type: 'emote', rarity: 'common', priceGold: 100, priceGems: 20, previewUrl: '/cosmetics/emote_thanks.png', isLimited: false },
  { id: 'emote_sorry', name: 'Oops', description: 'Express regret', type: 'emote', rarity: 'common', priceGold: 100, priceGems: 20, previewUrl: '/cosmetics/emote_sorry.png', isLimited: false },
  { id: 'emote_think', name: 'Hmm...', description: 'Deep in thought', type: 'emote', rarity: 'rare', priceGold: 300, priceGems: 60, previewUrl: '/cosmetics/emote_think.png', isLimited: false },
  { id: 'emote_threat', name: 'Watch This', description: 'A confident prediction', type: 'emote', rarity: 'rare', priceGold: 300, priceGems: 60, previewUrl: '/cosmetics/emote_threat.png', isLimited: false },
  { id: 'emote_laugh', name: 'Ha!', description: 'Amused by the situation', type: 'emote', rarity: 'epic', priceGold: 500, priceGems: 100, previewUrl: '/cosmetics/emote_laugh.png', isLimited: false },

  // Profile Icons
  { id: 'icon_default', name: 'Recruit', description: 'Default profile icon', type: 'profile_icon', rarity: 'common', priceGold: 0, priceGems: 0, previewUrl: '/cosmetics/icon_default.png', isLimited: false },
  { id: 'icon_legend', name: 'Legend', description: 'Reached Legend rank', type: 'profile_icon', rarity: 'legendary', priceGold: 0, priceGems: 0, previewUrl: '/cosmetics/icon_legend.png', isLimited: true },
  { id: 'icon_collector', name: 'Collector', description: 'Collected 500+ cards', type: 'profile_icon', rarity: 'epic', priceGold: 0, priceGems: 0, previewUrl: '/cosmetics/icon_collector.png', isLimited: true },
  { id: 'icon_star', name: 'Star Commander', description: 'Won 100+ games', type: 'profile_icon', rarity: 'rare', priceGold: 500, priceGems: 100, previewUrl: '/cosmetics/icon_star.png', isLimited: false },
];

/**
 * Get all available cosmetics, optionally filtered.
 */
export function getShopItems(filters?: {
  type?: CosmeticType;
  rarity?: string;
  race?: string;
  purchasable?: boolean;
}): CosmeticItem[] {
  let items = [...COSMETICS];

  if (filters?.type) items = items.filter(i => i.type === filters.type);
  if (filters?.rarity) items = items.filter(i => i.rarity === filters.rarity);
  if (filters?.race) items = items.filter(i => !i.race || i.race === filters.race);
  if (filters?.purchasable) items = items.filter(i => i.priceGold > 0 || i.priceGems > 0);

  return items;
}

/**
 * Get a player's owned cosmetics.
 */
export async function getPlayerCosmetics(playerId: string): Promise<PlayerCosmetic[]> {
  const result = await query(
    `SELECT cosmetic_id, source, equipped_slot, created_at
     FROM player_cosmetics WHERE player_id = $1
     ORDER BY created_at DESC`,
    [playerId]
  );

  return result.rows.map(row => ({
    cosmeticId: row.cosmetic_id,
    source: row.source,
    equippedSlot: row.equipped_slot,
    obtainedAt: row.created_at,
  }));
}

/**
 * Purchase a cosmetic item with Gold or Gems.
 */
export async function purchaseCosmetic(
  playerId: string,
  cosmeticId: string,
  currency: 'gold' | 'gems',
): Promise<{ success: boolean; cosmetic: CosmeticItem }> {
  const item = COSMETICS.find(c => c.id === cosmeticId);
  if (!item) throw new Error('Cosmetic not found');

  if (item.isLimited && (item.priceGold === 0 && item.priceGems === 0)) {
    throw new Error('This cosmetic cannot be purchased');
  }

  // Check if already owned
  const owned = await query(
    'SELECT id FROM player_cosmetics WHERE player_id = $1 AND cosmetic_id = $2',
    [playerId, cosmeticId]
  );
  if (owned.rows.length > 0) {
    throw new Error('Already owned');
  }

  // Deduct currency
  if (currency === 'gold') {
    if (item.priceGold <= 0) throw new Error('Cannot purchase with Gold');
    await EconomyService.spendGold(playerId, item.priceGold, `cosmetic:${cosmeticId}`);
  } else {
    if (item.priceGems <= 0) throw new Error('Cannot purchase with Gems');
    await EconomyService.spendNebulaGems(playerId, item.priceGems, `cosmetic:${cosmeticId}`);
  }

  // Grant cosmetic
  await query(
    `INSERT INTO player_cosmetics (player_id, cosmetic_id, source, created_at)
     VALUES ($1, $2, $3, NOW())`,
    [playerId, cosmeticId, `shop:${currency}`]
  );

  return { success: true, cosmetic: item };
}

/**
 * Equip a cosmetic to a slot.
 */
export async function equipCosmetic(
  playerId: string,
  cosmeticId: string,
): Promise<void> {
  const item = COSMETICS.find(c => c.id === cosmeticId);
  if (!item) throw new Error('Cosmetic not found');

  // Verify ownership
  const owned = await query(
    'SELECT id FROM player_cosmetics WHERE player_id = $1 AND cosmetic_id = $2',
    [playerId, cosmeticId]
  );
  if (owned.rows.length === 0) throw new Error('Cosmetic not owned');

  // Unequip current cosmetic of same type
  await query(
    `UPDATE player_cosmetics SET equipped_slot = NULL
     WHERE player_id = $1 AND equipped_slot = $2`,
    [playerId, item.type]
  );

  // Equip new cosmetic
  await query(
    `UPDATE player_cosmetics SET equipped_slot = $1
     WHERE player_id = $2 AND cosmetic_id = $3`,
    [item.type, playerId, cosmeticId]
  );
}

/**
 * Get currently equipped cosmetics for a player.
 */
export async function getEquippedCosmetics(playerId: string): Promise<Record<string, string>> {
  const result = await query(
    `SELECT cosmetic_id, equipped_slot FROM player_cosmetics
     WHERE player_id = $1 AND equipped_slot IS NOT NULL`,
    [playerId]
  );

  const equipped: Record<string, string> = {};
  for (const row of result.rows) {
    equipped[row.equipped_slot] = row.cosmetic_id;
  }
  return equipped;
}

/**
 * Get featured/rotating shop items.
 */
export function getFeaturedItems(): CosmeticItem[] {
  // Rotate based on day of year
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const purchasable = COSMETICS.filter(c => c.priceGold > 0 || c.priceGems > 0);

  const featured: CosmeticItem[] = [];
  for (let i = 0; i < 6 && i < purchasable.length; i++) {
    featured.push(purchasable[(dayOfYear + i * 7) % purchasable.length]);
  }

  return featured;
}
