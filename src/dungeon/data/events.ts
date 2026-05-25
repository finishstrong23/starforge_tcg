import type { DungeonEventDefinition } from '../types';

export const EVENT_POOL: DungeonEventDefinition[] = [
  {
    id: 'act1-derelict-signal',
    name: 'Derelict Signal',
    act: 1,
    tone: 'mystery',
    body: 'A half-buried relay blinks under the dungeon stone. Its compartments still have power, but every hatch answers a different kind of hunger.',
    choices: [
      { id: 'strip-cache', label: 'Strip the cache', effectText: 'Gain 45 gold. Find a Swift Brew.', effects: [{ type: 'gold', amount: 45 }, { type: 'add_potion', potionId: 'swift_brew' }] },
      { id: 'patch-hull', label: 'Patch the hull', effectText: 'Heal 12 HP.', effects: [{ type: 'heal', amount: 12 }] },
      {
        id: 'force-door',
        label: 'Force the door',
        effectText: 'Take 6 damage. Gain 90 gold. Add Void Debt.',
        effects: [{ type: 'damage', amount: 6 }, { type: 'gold', amount: 90 }, { type: 'add_curse', curseId: 'void_debt' }],
      },
    ],
  },
  {
    id: 'act1-cinder-market',
    name: 'Cinder Market',
    act: 1,
    tone: 'trade',
    body: 'A row of masked vendors warms its hands over a blue flame. Every price is spoken as if it were already paid.',
    choices: [
      { id: 'sell-scrap', label: 'Sell scrap', effectText: 'Gain 55 gold.', effects: [{ type: 'gold', amount: 55 }] },
      { id: 'buy-tonic', label: 'Buy bitter tonic', effectText: 'Lose 25 gold. Heal 18 HP. Find a Kindling Flask.', effects: [{ type: 'gold', amount: -25 }, { type: 'heal', amount: 18 }, { type: 'add_potion', potionId: 'kindling_flask' }] },
      {
        id: 'pyroclast-barter',
        label: 'Trade in live embers',
        effectText: 'Pyroclast only. Take 5 damage. Add Ember Tap. Start next combat with 4 Heat.',
        requiresFaction: 'Pyroclast',
        effects: [{ type: 'damage', amount: 5 }, { type: 'add_card', cardId: 'P-012' }, { type: 'class_resource', modifierId: 'smoldering-heart' }],
      },
    ],
  },
  {
    id: 'act1-sunless-shrine',
    name: 'Sunless Shrine',
    act: 1,
    tone: 'light',
    body: 'A temple without windows hums with patient light. The altar is cold, but your shadow bends toward it.',
    choices: [
      { id: 'kneel', label: 'Kneel', effectText: 'Gain 4 max HP. Heal 4 HP. Start next combat with 10 Block.', effects: [{ type: 'max_hp', amount: 4, heal: true }, { type: 'map_modifier', modifierId: 'sunless-aegis' }] },
      { id: 'take-offering', label: 'Take the offering', effectText: 'Gain 70 gold. Take 7 damage.', effects: [{ type: 'gold', amount: 70 }, { type: 'damage', amount: 7 }] },
      {
        id: 'luminar-prayer',
        label: 'Answer the hymn',
        effectText: 'Luminar only. Add Radiance. Heal 24 HP.',
        requiresFaction: 'Luminar',
        effects: [{ type: 'add_card', cardId: 'L-005' }, { type: 'heal', amount: 24 }],
      },
    ],
  },
  {
    id: 'act1-clockwork-morgue',
    name: 'Clockwork Morgue',
    act: 1,
    tone: 'forge',
    body: 'Brass hands sort broken automata into neat piles. A repair table clicks open, waiting for a patient.',
    choices: [
      { id: 'salvage-copper', label: 'Salvage copper', effectText: 'Gain 60 gold. Take Stasis Cube.', effects: [{ type: 'gold', amount: 60 }, { type: 'add_relic', relicId: 'R-C03' }] },
      { id: 'use-table', label: 'Use the repair table', effectText: 'Heal 14 HP. Take 3 damage.', effects: [{ type: 'heal', amount: 14 }, { type: 'damage', amount: 3 }] },
      {
        id: 'cogsmith-overhaul',
        label: 'Recalibrate the rigs',
        effectText: 'Cogsmiths only. Add Augment: Edge. Start next combat with 2 Strength.',
        requiresFaction: 'Cogsmiths',
        effects: [{ type: 'add_card', cardId: 'C-014' }, { type: 'class_resource', modifierId: 'calibrated-rigs' }],
      },
    ],
  },
  {
    id: 'act1-rift-well',
    name: 'Rift Well',
    act: 1,
    tone: 'mystery',
    body: 'A well hangs upside down in the air. Coins dropped into it fall out of your memories a moment later.',
    choices: [
      { id: 'skim-surface', label: 'Skim the surface', effectText: 'Gain 35 gold.', effects: [{ type: 'gold', amount: 35 }] },
      { id: 'reach-deep', label: 'Reach deep', effectText: 'Take 8 damage. Gain 100 gold.', effects: [{ type: 'damage', amount: 8 }, { type: 'gold', amount: 100 }] },
      {
        id: 'warp-step-through',
        label: 'Step through sideways',
        effectText: 'Warp Riders only. Add Void Whisper. Start next combat with an energy Rift.',
        requiresFaction: 'WarpRiders',
        effects: [{ type: 'add_card', cardId: 'W-010' }, { type: 'class_resource', modifierId: 'unstable-rift' }],
      },
    ],
  },
  {
    id: 'act1-glass-orchard',
    name: 'Glass Orchard',
    act: 1,
    tone: 'hazard',
    body: 'Transparent fruit grows from black branches. Each one reflects a healthier version of you.',
    choices: [
      { id: 'eat-carefully', label: 'Eat carefully', effectText: 'Gain 5 max HP. Heal 5 HP.', effects: [{ type: 'max_hp', amount: 5, heal: true }] },
      { id: 'fill-pockets', label: 'Fill your pockets', effectText: 'Gain 50 gold. Take 4 damage.', effects: [{ type: 'gold', amount: 50 }, { type: 'damage', amount: 4 }] },
      { id: 'break-branch', label: 'Break a branch', effectText: 'Take 10 damage. Gain 120 gold. Take Ironbark Amulet. Add Glass Splinter.', effects: [{ type: 'damage', amount: 10 }, { type: 'gold', amount: 120 }, { type: 'add_relic', relicId: 'R-C01' }, { type: 'add_curse', curseId: 'glass_splinter' }] },
    ],
  },
  {
    id: 'act1-bone-toll',
    name: 'Bone Toll',
    act: 1,
    tone: 'trade',
    body: 'A gate of pale ribs blocks the path. It opens one finger-width for every sacrifice it respects.',
    choices: [
      { id: 'pay-coin', label: 'Pay coin', effectText: 'Lose 35 gold. Remove a starter card.', effects: [{ type: 'gold', amount: -35 }, { type: 'remove_card', mode: 'first_starter' }] },
      { id: 'pay-blood', label: 'Pay blood', effectText: 'Take 9 damage. Upgrade a card.', effects: [{ type: 'damage', amount: 9 }, { type: 'upgrade_card', mode: 'first_unupgraded' }] },
      { id: 'argue-with-gate', label: 'Argue with the gate', effectText: 'Gain 20 gold. Take 5 damage. The next enemy starts Vulnerable.', effects: [{ type: 'gold', amount: 20 }, { type: 'damage', amount: 5 }, { type: 'map_modifier', modifierId: 'marked-path' }] },
    ],
  },
  {
    id: 'act1-forgotten-camp',
    name: 'Forgotten Camp',
    act: 1,
    tone: 'mystery',
    body: 'Cold bedrolls circle a dead fire. The supplies are untouched, which somehow makes them less comforting.',
    choices: [
      { id: 'rest-short', label: 'Rest briefly', effectText: 'Heal 18 HP.', effects: [{ type: 'heal', amount: 18 }] },
      { id: 'search-packs', label: 'Search the packs', effectText: "Gain 65 gold. Find a Tactician's Brew.", effects: [{ type: 'gold', amount: 65 }, { type: 'add_potion', potionId: 'tacticians_brew' }] },
      { id: 'take-everything', label: 'Take everything', effectText: 'Gain 95 gold. Take 6 damage.', effects: [{ type: 'gold', amount: 95 }, { type: 'damage', amount: 6 }] },
    ],
  },
];

export function eventsForAct(act: 1 | 2 | 3): DungeonEventDefinition[] {
  return EVENT_POOL.filter((event) => event.act === act);
}
