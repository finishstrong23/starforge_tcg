/**
 * Act-start blessings (STS-style "Neow's Bounty" + boss-rest blessings).
 *
 * Shown twice in a run:
 *   - Once at the very start of Act 1 (after draft, before first map).
 *   - Once at the start of each subsequent act (after the prior boss is
 *     defeated; the player is ALSO healed to full HP at this point).
 *
 * Player is offered 3 random options from the pool. Picking one applies
 * its effect and routes to the act's map.
 */

import type { CardDefinition, RelicDefinition, RunState } from '../types';
import { CARD_POOL } from './cards';
import { RELIC_POOL } from './relics';

export type BlessingId =
  | 'vigor'
  | 'fortune'
  | 'treasure'
  | 'arsenal'
  | 'sanctuary'
  | 'channel';

export interface Blessing {
  id: BlessingId;
  name: string;
  flavor: string;
  /** Short, one-sentence description shown on the blessing card. */
  effect: string;
  fallback: string;
  /** Color theme on the card. */
  color: string;
}

/**
 * Pool of available blessings. The act-start screen rolls 3 distinct
 * blessings from this list each time it shows. Can grow without
 * touching the engine - the apply step switches on `id`.
 */
export const BLESSING_POOL: Blessing[] = [
  {
    id: 'vigor',
    name: 'Vigor of the Forge',
    flavor: 'A second wind, hammered hot.',
    effect: 'Increase max HP by 10. Heal to new max.',
    fallback: 'HP',
    color: '#ff5566',
  },
  {
    id: 'fortune',
    name: 'Merchant\'s Favor',
    flavor: 'Gold finds you, for a while.',
    effect: 'Gain 100 gold.',
    fallback: 'GLD',
    color: '#ffcc44',
  },
  {
    id: 'treasure',
    name: 'Forgotten Cache',
    flavor: 'Something useful, left behind.',
    effect: 'Gain a random Uncommon relic.',
    fallback: 'REL',
    color: '#4adfff',
  },
  {
    id: 'arsenal',
    name: 'Sharpened Steel',
    flavor: 'A weapon worthy of the climb.',
    effect: 'Add a random Rare card to your deck.',
    fallback: 'ATK',
    color: '#ff8844',
  },
  {
    id: 'sanctuary',
    name: 'Sanctuary',
    flavor: 'Rest, then rise stronger.',
    effect: 'Heal to full and gain 1 max Energy next combat.',
    fallback: 'RST',
    color: '#88ff88',
  },
  {
    id: 'channel',
    name: 'Resonant Echo',
    flavor: 'The deck remembers.',
    effect: 'Duplicate a random non-starter card from your deck.',
    fallback: 'ECO',
    color: '#c27dff',
  },
];

/**
 * Result of applying a blessing - the patch to merge into RunState plus
 * any side-data the UI may want to surface (e.g. which relic was rolled).
 */
export interface BlessingResult {
  patch: Partial<RunState>;
  pickedRelic?: RelicDefinition;
  pickedCard?: CardDefinition;
  /** Currently we sneak energy boosts in via a transient flag. */
  bonusEnergyNextCombat?: number;
}

function pickRandom<T>(arr: T[], rng: () => number): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * Pick `count` distinct blessings from the pool. Faction parameter is
 * accepted but not currently used - placeholder for future
 * faction-specific blessings (e.g. a Pyroclast-only "+5 starting Heat").
 */
export function rollBlessings(
  count = 3,
  rng: () => number = Math.random,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _faction?: string,
): Blessing[] {
  const pool = [...BLESSING_POOL];
  const out: Blessing[] = [];
  for (let i = 0; i < count && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return out;
}

/**
 * Apply a blessing to the run state. Returns the patch the reducer
 * should merge into RunState plus any side-data for the UI.
 *
 * Caller is responsible for actually applying the patch (so the reducer
 * stays the single source of truth on state transitions). All randomness
 * goes through the supplied `rng` so the test suite can pin outcomes.
 */
export function applyBlessing(
  blessing: Blessing,
  run: RunState,
  rng: () => number = Math.random,
): BlessingResult {
  switch (blessing.id) {
    case 'vigor': {
      const newMax = run.maxHealth + 10;
      return {
        patch: { maxHealth: newMax, currentHealth: newMax },
      };
    }
    case 'fortune': {
      return { patch: { gold: run.gold + 100 } };
    }
    case 'treasure': {
      const owned = new Set(run.relics.map((r) => r.id));
      const eligible = RELIC_POOL.filter(
        (r) => r.rarity === 'Uncommon' && !owned.has(r.id),
      );
      const picked = pickRandom(eligible, rng);
      if (!picked) return { patch: {} };
      return {
        patch: { relics: [...run.relics, picked] },
        pickedRelic: picked,
      };
    }
    case 'arsenal': {
      const eligible = CARD_POOL.filter((c) => c.rarity === 'Rare');
      const picked = pickRandom(eligible, rng);
      if (!picked) return { patch: {} };
      // Note: the deck holds CardInstances, not CardDefinitions. The
      // reducer is responsible for wrapping `picked` via createCardInstance
      // before persisting; we surface the definition here so the reducer
      // owns instance-id generation (keeps imports tidy).
      return { patch: {}, pickedCard: picked };
    }
    case 'sanctuary': {
      return {
        patch: { currentHealth: run.maxHealth },
        bonusEnergyNextCombat: 1,
      };
    }
    case 'channel': {
      // Duplicate a random non-Common card from the player's deck.
      // Falls back to a starter card if no rares/uncommons are present.
      const candidates = run.deck.filter((c) => c.rarity !== 'Common');
      const fallback   = run.deck;
      const pool = candidates.length > 0 ? candidates : fallback;
      const target = pickRandom(pool, rng);
      if (!target) return { patch: {} };
      // Reducer wraps a fresh instance (keeps instance ids unique).
      return { patch: {}, pickedCard: target };
    }
  }
}
