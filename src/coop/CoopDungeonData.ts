/**
 * STARFORGE TCG - Co-op Dungeon Run Data
 *
 * Map generation, co-op events, shop items, co-op relics,
 * and boss scaling for 2-player cooperative dungeon runs.
 */

import { Race } from '../types/Race';
import { DUNGEON_BOSSES, type DungeonBoss, type DungeonRelic, type CardBundle } from '../dungeon/DungeonData';
import { TEAM_SYNERGIES, type TeamSynergy } from '../tagteam/TagTeamData';
import { getDungeonStarterDeck, getCardBundleChoices } from '../dungeon/DungeonData';

// ─── MAP TYPES ──────────────────────────────────────────────────────────────

export type MapNodeType = 'COMBAT' | 'ELITE' | 'EVENT' | 'SHOP' | 'REST' | 'TREASURE' | 'BOSS';

export interface MapNode {
  id: string;
  type: MapNodeType;
  row: number;
  col: number;
  connections: string[]; // IDs of nodes in next row
  visited: boolean;
  icon: string;
}

export interface CoopMap {
  act: number;
  nodes: MapNode[];
  startNodeId: string;
  bossNodeId: string;
}

// ─── CO-OP EVENTS ───────────────────────────────────────────────────────────

export interface CoopEvent {
  id: string;
  title: string;
  description: string;
  icon: string;
  choices: CoopEventChoice[];
}

export interface CoopEventChoice {
  label: string;
  description: string;
  effect: CoopEventEffect;
}

export type CoopEventEffect =
  | { type: 'heal'; amount: number }
  | { type: 'damage'; amount: number }
  | { type: 'gold'; amount: number }
  | { type: 'relic'; relicId: string }
  | { type: 'upgrade_random_card' }
  | { type: 'remove_card' }
  | { type: 'draw_cards'; count: number }
  | { type: 'max_hp'; amount: number }
  | { type: 'composite'; effects: CoopEventEffect[] };

// ─── CO-OP RELICS ───────────────────────────────────────────────────────────

export const COOP_RELICS: DungeonRelic[] = [
  {
    id: 'relic_resonance_core',
    name: 'Resonance Core',
    description: 'When your partner plays a spell, gain +1 crystal next turn.',
    icon: '\u{1F4A0}',
    tier: 'rare',
  },
  {
    id: 'relic_shared_shield',
    name: 'Shared Shield',
    description: 'Both players start each fight with 2 Barrier on their hero.',
    icon: '\u{1F6E1}',
    tier: 'rare',
  },
  {
    id: 'relic_dual_draw',
    name: 'Dual Draw',
    description: 'Both players draw an extra card on their first turn.',
    icon: '\u{1F0CF}',
    tier: 'common',
  },
  {
    id: 'relic_bond_of_flame',
    name: 'Bond of Flame',
    description: 'When either player destroys a minion, deal 1 damage to the boss.',
    icon: '\u{1F525}',
    tier: 'common',
  },
  {
    id: 'relic_synergy_amplifier',
    name: 'Synergy Amplifier',
    description: 'Your team synergy bonus is doubled.',
    icon: '\u26A1',
    tier: 'legendary',
  },
  {
    id: 'relic_emergency_protocol',
    name: 'Emergency Protocol',
    description: 'When shared HP drops below 10, both players draw 2 cards.',
    icon: '\u{1F6A8}',
    tier: 'common',
  },
  {
    id: 'relic_crystaline_bond',
    name: 'Crystalline Bond',
    description: 'Both players start with +1 max crystal.',
    icon: '\u{1F48E}',
    tier: 'rare',
  },
  {
    id: 'relic_revival_pact',
    name: 'Revival Pact',
    description: 'Once per fight: when a friendly minion dies, resummon it as a 1/1.',
    icon: '\u{1F31F}',
    tier: 'legendary',
  },
  {
    id: 'relic_gold_rush',
    name: 'Gold Rush',
    description: 'Earn +5 gold after each combat.',
    icon: '\u{1FA99}',
    tier: 'common',
  },
  {
    id: 'relic_war_council',
    name: 'War Council',
    description: 'Both players can see the top card of their deck.',
    icon: '\u{1F4DC}',
    tier: 'common',
  },
];

// ─── CO-OP EVENTS ───────────────────────────────────────────────────────────

export const COOP_EVENTS: CoopEvent[] = [
  {
    id: 'event_alien_forge',
    title: 'The Alien Forge',
    description: 'You discover a shimmering forge powered by unknown energy. It hums with potential.',
    icon: '\u{1F525}',
    choices: [
      {
        label: 'Use the Forge',
        description: 'Upgrade a random card. Lose 3 HP.',
        effect: { type: 'composite', effects: [{ type: 'upgrade_random_card' }, { type: 'damage', amount: 3 }] },
      },
      {
        label: 'Salvage for Parts',
        description: 'Gain 15 gold.',
        effect: { type: 'gold', amount: 15 },
      },
    ],
  },
  {
    id: 'event_void_rift',
    title: 'Void Rift',
    description: 'A tear in space-time radiates dark energy. Something powerful lies within.',
    icon: '\u{1F30C}',
    choices: [
      {
        label: 'Reach In',
        description: 'Gain a rare relic. Lose 5 HP.',
        effect: { type: 'composite', effects: [{ type: 'relic', relicId: 'relic_bond_of_flame' }, { type: 'damage', amount: 5 }] },
      },
      {
        label: 'Walk Away',
        description: 'Nothing happens.',
        effect: { type: 'heal', amount: 0 },
      },
    ],
  },
  {
    id: 'event_training_grounds',
    title: 'Training Grounds',
    description: 'An abandoned arena offers a chance to hone your skills.',
    icon: '\u2694',
    choices: [
      {
        label: 'Train Hard',
        description: 'Remove a card from each deck.',
        effect: { type: 'remove_card' },
      },
      {
        label: 'Rest Instead',
        description: 'Heal 5 HP.',
        effect: { type: 'heal', amount: 5 },
      },
    ],
  },
  {
    id: 'event_crystal_cache',
    title: 'Crystalline Cache',
    description: 'Glowing crystals pulse with healing energy deep in an alcove.',
    icon: '\u{1F48E}',
    choices: [
      {
        label: 'Absorb the Energy',
        description: 'Heal 8 HP.',
        effect: { type: 'heal', amount: 8 },
      },
      {
        label: 'Harvest the Crystals',
        description: 'Gain 20 gold.',
        effect: { type: 'gold', amount: 20 },
      },
    ],
  },
  {
    id: 'event_smuggler',
    title: "Smuggler's Deal",
    description: 'A cloaked figure offers you a mysterious deal. "Trust me," they whisper.',
    icon: '\u{1F575}',
    choices: [
      {
        label: 'Pay 15 Gold',
        description: 'Gain a random relic.',
        effect: { type: 'composite', effects: [{ type: 'gold', amount: -15 }, { type: 'relic', relicId: 'relic_gold_rush' }] },
      },
      {
        label: 'Decline',
        description: 'Keep your gold. Heal 3 HP.',
        effect: { type: 'heal', amount: 3 },
      },
    ],
  },
  {
    id: 'event_temporal_echo',
    title: 'Temporal Echo',
    description: 'Time distorts around you. Echoes of past battles materialize.',
    icon: '\u231B',
    choices: [
      {
        label: 'Embrace the Echo',
        description: 'Both players draw 2 extra cards next fight.',
        effect: { type: 'draw_cards', count: 2 },
      },
      {
        label: 'Resist',
        description: 'Gain +3 max HP.',
        effect: { type: 'max_hp', amount: 3 },
      },
    ],
  },
  {
    id: 'event_star_shrine',
    title: 'Star Shrine',
    description: 'An ancient shrine hums with stellar energy.',
    icon: '\u2B50',
    choices: [
      {
        label: 'Pray',
        description: 'Heal 12 HP but lose 10 gold.',
        effect: { type: 'composite', effects: [{ type: 'heal', amount: 12 }, { type: 'gold', amount: -10 }] },
      },
      {
        label: 'Offer Gold',
        description: 'Pay 20 gold. Increase max HP by 5.',
        effect: { type: 'composite', effects: [{ type: 'gold', amount: -20 }, { type: 'max_hp', amount: 5 }] },
      },
    ],
  },
];

// ─── SHOP ITEMS ─────────────────────────────────────────────────────────────

export interface ShopItem {
  id: string;
  type: 'card_bundle' | 'relic' | 'heal' | 'remove_card';
  name: string;
  description: string;
  cost: number;
  bundleData?: CardBundle;
  relicData?: DungeonRelic;
  healAmount?: number;
}

export function generateShopItems(
  act: number,
  playerRaces: [Race, Race],
  ownedRelicIds: string[],
  seed: number,
): ShopItem[] {
  const items: ShopItem[] = [];

  // Card bundles (one per player race)
  for (const race of playerRaces) {
    const bundles = getCardBundleChoices([], seed + items.length);
    if (bundles.length > 0) {
      items.push({
        id: `shop_bundle_${race}_${seed}`,
        type: 'card_bundle',
        name: bundles[0].name,
        description: bundles[0].description,
        cost: 20 + act * 5,
        bundleData: bundles[0],
      });
    }
  }

  // A relic
  const availableRelics = COOP_RELICS.filter(r => !ownedRelicIds.includes(r.id));
  if (availableRelics.length > 0) {
    const relic = availableRelics[seed % availableRelics.length];
    items.push({
      id: `shop_relic_${seed}`,
      type: 'relic',
      name: relic.name,
      description: relic.description,
      cost: relic.tier === 'legendary' ? 50 : relic.tier === 'rare' ? 35 : 20,
      relicData: relic,
    });
  }

  // Heal
  items.push({
    id: `shop_heal_${seed}`,
    type: 'heal',
    name: 'Repair Station',
    description: 'Restore 10 shared HP.',
    cost: 15,
    healAmount: 10,
  });

  // Card removal
  items.push({
    id: `shop_remove_${seed}`,
    type: 'remove_card',
    name: 'Data Purge',
    description: 'Remove a card from your deck.',
    cost: 10 + act * 5,
  });

  return items;
}

// ─── MAP GENERATION ─────────────────────────────────────────────────────────

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export const NODE_ICONS: Record<MapNodeType, string> = {
  COMBAT: '\u2694',
  ELITE: '\u{1F480}',
  EVENT: '?',
  SHOP: '\u{1FA99}',
  REST: '\u{1F3D5}',
  TREASURE: '\u{1F4E6}',
  BOSS: '\u{1F451}',
};

export function generateCoopMap(act: number, seed: number): CoopMap {
  const rng = seededRandom(seed + act * 1000);
  const nodes: MapNode[] = [];
  const rows = 4; // 4 rows of encounters before boss
  const nodesPerRow = 3;

  // Start node
  const startNode: MapNode = {
    id: `act${act}_start`,
    type: 'COMBAT',
    row: -1,
    col: 1,
    connections: [],
    visited: false,
    icon: NODE_ICONS.COMBAT,
  };
  nodes.push(startNode);

  // Generate rows of nodes
  for (let row = 0; row < rows; row++) {
    const rowNodes: MapNode[] = [];
    for (let col = 0; col < nodesPerRow; col++) {
      const nodeType = pickNodeType(row, act, rng);
      const node: MapNode = {
        id: `act${act}_r${row}_c${col}`,
        type: nodeType,
        row,
        col,
        connections: [],
        visited: false,
        icon: NODE_ICONS[nodeType],
      };
      rowNodes.push(node);
    }
    nodes.push(...rowNodes);
  }

  // Boss node
  const bossNode: MapNode = {
    id: `act${act}_boss`,
    type: 'BOSS',
    row: rows,
    col: 1,
    connections: [],
    visited: false,
    icon: NODE_ICONS.BOSS,
  };
  nodes.push(bossNode);

  // Wire connections: start → row 0
  const row0 = nodes.filter(n => n.row === 0);
  startNode.connections = row0.map(n => n.id);

  // Each row connects to next row (each node connects to 1-2 nodes in next row)
  for (let row = 0; row < rows - 1; row++) {
    const currentRow = nodes.filter(n => n.row === row);
    const nextRow = nodes.filter(n => n.row === row + 1);
    for (let i = 0; i < currentRow.length; i++) {
      // Always connect to same column, sometimes to adjacent
      const mainTarget = nextRow[i];
      if (mainTarget) currentRow[i].connections.push(mainTarget.id);
      if (rng() > 0.5 && i + 1 < nextRow.length) {
        currentRow[i].connections.push(nextRow[i + 1].id);
      }
      if (rng() > 0.5 && i - 1 >= 0) {
        currentRow[i].connections.push(nextRow[i - 1].id);
      }
      // Deduplicate
      currentRow[i].connections = [...new Set(currentRow[i].connections)];
    }
  }

  // Last row → boss
  const lastRow = nodes.filter(n => n.row === rows - 1);
  for (const n of lastRow) {
    n.connections.push(bossNode.id);
  }

  return {
    act,
    nodes,
    startNodeId: startNode.id,
    bossNodeId: bossNode.id,
  };
}

function pickNodeType(row: number, act: number, rng: () => number): MapNodeType {
  const r = rng();
  // Row 0: mostly combat
  if (row === 0) {
    return r < 0.7 ? 'COMBAT' : r < 0.85 ? 'EVENT' : 'TREASURE';
  }
  // Middle rows: mix of everything
  if (r < 0.30) return 'COMBAT';
  if (r < 0.45) return 'ELITE';
  if (r < 0.60) return 'EVENT';
  if (r < 0.75) return 'SHOP';
  if (r < 0.90) return 'REST';
  return 'TREASURE';
}

// ─── BOSS SELECTION ─────────────────────────────────────────────────────────

export function getCoopBoss(act: number, seed: number): DungeonBoss {
  const tier = Math.min(act, 3) as 1 | 2 | 3;
  const bosses = DUNGEON_BOSSES.filter(b => b.tier === tier);
  return bosses[seed % bosses.length];
}

/** Scale boss HP for 2-player co-op */
export function scaleCoopBossHP(boss: DungeonBoss, act: number): number {
  // Co-op bosses have ~1.5x HP since 2 players are attacking
  return Math.round(boss.startingHealth * 1.5) + (act - 1) * 10;
}

// ─── SYNERGY LOOKUP ─────────────────────────────────────────────────────────

export function getTeamSynergy(race1: Race, race2: Race): TeamSynergy | null {
  return TEAM_SYNERGIES.find(
    s => (s.races[0] === race1 && s.races[1] === race2) ||
         (s.races[0] === race2 && s.races[1] === race1),
  ) || null;
}

// ─── RANDOM EVENT ───────────────────────────────────────────────────────────

export function getRandomEvent(seed: number, visitedEventIds: string[]): CoopEvent {
  const available = COOP_EVENTS.filter(e => !visitedEventIds.includes(e.id));
  if (available.length === 0) return COOP_EVENTS[seed % COOP_EVENTS.length];
  return available[seed % available.length];
}

// ─── STARTER DECKS ──────────────────────────────────────────────────────────

export { getDungeonStarterDeck };
