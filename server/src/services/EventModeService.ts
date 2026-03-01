/**
 * STARFORGE TCG - Event Mode Service
 *
 * Manages rotating game modes: Tavern Brawl, Weekly Events, Friendly Challenge.
 * Each week features a different rule-bending mode to keep the game fresh.
 */

export interface EventMode {
  id: string;
  name: string;
  description: string;
  rules: string[];
  type: 'tavern_brawl' | 'weekly_event' | 'seasonal_event';
  startDate: Date;
  endDate: Date;
  rewards: EventReward[];
  isActive: boolean;
  deckRules: DeckRules;
}

export interface EventReward {
  description: string;
  requirement: string;
  gold?: number;
  packs?: number;
  cosmeticId?: string;
}

export interface DeckRules {
  usePrebuilt?: boolean; // Players get a pre-made deck
  customDeck?: boolean; // Players build their own
  deckSize?: number;
  maxCopies?: number;
  allowedRarities?: string[];
  restrictedCards?: string[];
  randomDeck?: boolean;
  allCards?: boolean; // Access to all cards regardless of collection
}

// Weekly rotation of event modes
const EVENT_MODES: Omit<EventMode, 'startDate' | 'endDate' | 'isActive'>[] = [
  {
    id: 'brawl_random_decks',
    name: 'Total Chaos',
    description: 'Both players get random 30-card decks. No collection required!',
    rules: ['Decks are randomly generated', 'All cards available', 'Best of 1'],
    type: 'tavern_brawl',
    rewards: [
      { description: '1 free pack', requirement: 'Win 1 game', packs: 1 },
    ],
    deckRules: { randomDeck: true, allCards: true, deckSize: 30 },
  },
  {
    id: 'brawl_all_legendary',
    name: 'Legends Only',
    description: 'Every card in your deck is Legendary. Who needs commons?',
    rules: ['Only Legendary cards allowed', 'Build a 20-card deck', '2 copies max'],
    type: 'tavern_brawl',
    rewards: [
      { description: '150 Gold', requirement: 'Win 3 games', gold: 150 },
    ],
    deckRules: { customDeck: true, deckSize: 20, allowedRarities: ['legendary'], maxCopies: 2, allCards: true },
  },
  {
    id: 'brawl_double_hp',
    name: 'Fortified',
    description: 'Heroes start with 60 health instead of 30. The long game wins.',
    rules: ['Heroes start with 60 HP', 'Normal deckbuilding', '10 max crystals'],
    type: 'tavern_brawl',
    rewards: [
      { description: '1 free pack', requirement: 'Win 2 games', packs: 1 },
    ],
    deckRules: { customDeck: true },
  },
  {
    id: 'brawl_top_2',
    name: 'Top Two',
    description: 'Build a deck with only 2 different cards (15 copies each).',
    rules: ['Only 2 unique cards allowed', '15 copies of each', 'All cards available'],
    type: 'tavern_brawl',
    rewards: [
      { description: '100 Gold', requirement: 'Win 1 game', gold: 100 },
    ],
    deckRules: { customDeck: true, deckSize: 30, maxCopies: 15, allCards: true },
  },
  {
    id: 'brawl_free_spells',
    name: 'Spell Surge',
    description: 'All spells cost (0). Minions cost normal. Spell-heavy decks shine!',
    rules: ['All spells cost 0 mana', 'Minion costs unchanged', 'Normal deckbuilding'],
    type: 'tavern_brawl',
    rewards: [
      { description: '1 free pack', requirement: 'Win 2 games', packs: 1 },
    ],
    deckRules: { customDeck: true, allCards: true },
  },
  {
    id: 'brawl_swap_decks',
    name: 'Identity Crisis',
    description: 'You play with your opponent\'s deck. Build to confuse!',
    rules: ['Decks are swapped after mulligan', 'Build a deck for your enemy to play', 'All cards available'],
    type: 'tavern_brawl',
    rewards: [
      { description: '150 Gold', requirement: 'Win 3 games', gold: 150 },
    ],
    deckRules: { customDeck: true, allCards: true },
  },
  {
    id: 'brawl_minions_only',
    name: 'Board Wars',
    description: 'No spells allowed. Pure minion combat decides the winner.',
    rules: ['Only minion cards allowed', 'No spells, no weapons', 'All cards available'],
    type: 'tavern_brawl',
    rewards: [
      { description: '1 free pack', requirement: 'Win 1 game', packs: 1 },
    ],
    deckRules: { customDeck: true, allCards: true },
  },
  {
    id: 'brawl_crossover',
    name: 'Faction Fusion',
    description: 'Build a deck using cards from any TWO factions.',
    rules: ['Choose 2 factions', 'Mix cards from both', 'All cards available'],
    type: 'tavern_brawl',
    rewards: [
      { description: '200 Gold', requirement: 'Win 5 games', gold: 200 },
    ],
    deckRules: { customDeck: true, allCards: true },
  },
];

// Seasonal events
const SEASONAL_EVENTS: Omit<EventMode, 'isActive'>[] = [
  {
    id: 'event_launch_celebration',
    name: 'Launch Celebration',
    description: 'Celebrate the launch of StarForge TCG! Double XP and bonus rewards.',
    rules: ['Double XP from all sources', 'Bonus daily quest reward', 'Free Legendary card for first win'],
    type: 'seasonal_event',
    startDate: new Date('2026-03-01'),
    endDate: new Date('2026-03-14'),
    rewards: [
      { description: 'Free Legendary', requirement: 'Win 1 game', packs: 1 },
      { description: 'Launch Card Back', requirement: 'Win 5 games', cosmeticId: 'cardback_launch' },
      { description: '500 Gold', requirement: 'Win 10 games', gold: 500 },
    ],
    deckRules: { customDeck: true },
  },
];

/**
 * Get the currently active event mode.
 */
export function getCurrentEvent(): EventMode | null {
  const now = new Date();

  // Check seasonal events first
  for (const event of SEASONAL_EVENTS) {
    if (now >= event.startDate && now <= event.endDate) {
      return { ...event, isActive: true };
    }
  }

  // Determine which weekly brawl is active (rotates weekly)
  const weekNumber = Math.floor((now.getTime() - new Date('2026-01-01').getTime()) / (7 * 24 * 60 * 60 * 1000));
  const brawlIndex = weekNumber % EVENT_MODES.length;
  const brawl = EVENT_MODES[brawlIndex];

  // Calculate this week's start/end
  const weekStart = new Date('2026-01-01');
  weekStart.setDate(weekStart.getDate() + weekNumber * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  return {
    ...brawl,
    startDate: weekStart,
    endDate: weekEnd,
    isActive: true,
  };
}

/**
 * Get upcoming event schedule.
 */
export function getEventSchedule(weeks: number = 4): EventMode[] {
  const now = new Date();
  const schedule: EventMode[] = [];

  for (let w = 0; w < weeks; w++) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() + w * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekNumber = Math.floor((weekStart.getTime() - new Date('2026-01-01').getTime()) / (7 * 24 * 60 * 60 * 1000));
    const brawlIndex = weekNumber % EVENT_MODES.length;

    schedule.push({
      ...EVENT_MODES[brawlIndex],
      startDate: weekStart,
      endDate: weekEnd,
      isActive: w === 0,
    });
  }

  return schedule;
}

/**
 * Get all available event modes (for admin/preview).
 */
export function getAllEventModes(): typeof EVENT_MODES {
  return EVENT_MODES;
}

/**
 * Validate a deck against event mode rules.
 */
export function validateEventDeck(
  eventId: string,
  cardIds: string[],
  _cardData: { id: string; rarity: string; type: string }[],
): { valid: boolean; errors: string[] } {
  const event = EVENT_MODES.find(e => e.id === eventId) || SEASONAL_EVENTS.find(e => e.id === eventId);
  if (!event) return { valid: false, errors: ['Event not found'] };

  const errors: string[] = [];
  const rules = event.deckRules;

  if (rules.deckSize && cardIds.length !== rules.deckSize) {
    errors.push(`Deck must contain exactly ${rules.deckSize} cards`);
  }

  if (rules.maxCopies) {
    const counts = new Map<string, number>();
    for (const id of cardIds) {
      counts.set(id, (counts.get(id) || 0) + 1);
    }
    for (const [id, count] of counts) {
      if (count > rules.maxCopies) {
        errors.push(`Card ${id}: max ${rules.maxCopies} copies allowed, found ${count}`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Create a friendly challenge room.
 */
export function createFriendlyChallenge(
  hostPlayerId: string,
  options?: {
    useAllCards?: boolean;
    allowSpectators?: boolean;
  },
): {
  roomCode: string;
  expiresAt: Date;
} {
  const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  return {
    roomCode,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min expiry
  };
}
