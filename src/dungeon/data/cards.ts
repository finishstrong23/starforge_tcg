import type { CardDefinition, Faction, Rarity } from '../types';

// ─── Cogsmiths (40 cards) ────────────────────────────────────────────────────

const COGSMITHS_CARDS: CardDefinition[] = [
  {
    id: 'C-001', name: 'Rivet Strike', faction: 'Cogsmiths', type: 'Attack', cost: 1,
    keywords: [], rarity: 'Common',
    cardText: 'Deal 7 damage.',
    upgradeText: 'Deal 10 damage.',
  },
  {
    id: 'C-002', name: 'Plate Shield', faction: 'Cogsmiths', type: 'Skill', cost: 1,
    keywords: [], rarity: 'Common',
    cardText: 'Gain 6 Block.',
    upgradeText: 'Gain 8 Block.',
  },
  {
    id: 'C-003', name: 'Tinker', faction: 'Cogsmiths', type: 'Skill', cost: 0,
    keywords: [], rarity: 'Common',
    cardText: 'Draw 1 card. The next Augment you play this turn costs 0.',
    upgradeText: 'Draw 1 card. The next 2 Augments you play this turn cost 0.',
  },
  {
    id: 'C-004', name: 'Socket Wrench', faction: 'Cogsmiths', type: 'Attack', cost: 1,
    keywords: [], rarity: 'Common',
    cardText: 'Deal 5 damage + 3 damage per Augment on this card.',
    upgradeText: 'Deal 6 damage + 4 damage per Augment on this card.',
  },
  {
    id: 'C-005', name: 'Hammer Blow', faction: 'Cogsmiths', type: 'Attack', cost: 1,
    keywords: [], rarity: 'Common',
    cardText: 'Deal 9 damage. Exhaust.',
    upgradeText: 'Deal 12 damage. Exhaust.',
  },
  {
    id: 'C-006', name: 'Bolt Thrower', faction: 'Cogsmiths', type: 'Attack', cost: 1,
    keywords: ['BLITZ'], rarity: 'Common',
    cardText: 'Deal 3 damage twice.',
    upgradeText: 'Deal 4 damage twice.',
  },
  {
    id: 'C-007', name: 'Gear Shift', faction: 'Cogsmiths', type: 'Skill', cost: 1,
    keywords: [], rarity: 'Common',
    cardText: 'Gain 4 Block. Draw 1 card.',
    upgradeText: 'Gain 5 Block. Draw 2 cards.',
  },
  {
    id: 'C-008', name: 'Pneumatic Jab', faction: 'Cogsmiths', type: 'Attack', cost: 2,
    keywords: [], rarity: 'Common',
    cardText: 'Deal 13 damage.',
    upgradeText: 'Deal 16 damage.',
  },
  {
    id: 'C-009', name: 'Crosswire', faction: 'Cogsmiths', type: 'Skill', cost: 0,
    keywords: [], rarity: 'Common',
    cardText: 'Your next Attack this turn costs 0.',
    upgradeText: 'Your next 2 Attacks this turn cost 0.',
  },
  {
    id: 'C-010', name: 'Servo Shield', faction: 'Cogsmiths', type: 'Power', cost: 1,
    keywords: [], rarity: 'Common',
    cardText: 'At start of each turn, gain 3 Block.',
    upgradeText: 'At start of each turn, gain 4 Block.',
  },
  {
    id: 'C-011', name: 'Deploy Drone', faction: 'Cogsmiths', type: 'Skill', cost: 1,
    keywords: ['DEPLOY'], rarity: 'Common',
    cardText: 'Summon a Drone (5 HP, deals 3 damage at turn end, lasts 3 turns).',
    upgradeText: 'Summon a Scout (7 HP, deals 4 damage at turn end, lasts 4 turns).',
  },
  {
    id: 'C-012', name: 'Toolkit', faction: 'Cogsmiths', type: 'Skill', cost: 1,
    keywords: [], rarity: 'Common',
    cardText: 'Add a random Augment to your hand.',
    upgradeText: 'Add 2 random Augments to your hand.',
  },
  {
    id: 'C-013', name: 'Overdrive', faction: 'Cogsmiths', type: 'Skill', cost: 1,
    keywords: [], rarity: 'Common',
    cardText: 'Gain 1 Energy. Draw 2 cards. Take 3 damage.',
    upgradeText: 'Gain 1 Energy. Draw 2 cards. Take 2 damage.',
  },
  {
    id: 'C-014', name: 'Augment: Edge', faction: 'Cogsmiths', type: 'Augment', cost: 1,
    keywords: ['UPGRADE'], rarity: 'Common',
    cardText: 'Attach to a card in hand: card deals +3 damage. Exhaust.',
    upgradeText: 'Attach to a card in hand: card deals +5 damage. Exhaust.',
  },
  {
    id: 'C-015', name: 'Augment: Plate', faction: 'Cogsmiths', type: 'Augment', cost: 1,
    keywords: ['UPGRADE'], rarity: 'Common',
    cardText: 'Attach to a card in hand: card grants +3 Block. Exhaust.',
    upgradeText: 'Attach to a card in hand: card grants +5 Block. Exhaust.',
  },
  {
    id: 'C-016', name: 'Augment: Jolt', faction: 'Cogsmiths', type: 'Augment', cost: 1,
    keywords: ['UPGRADE'], rarity: 'Common',
    cardText: 'Attach to an Attack in hand: attack applies Weak 1. Exhaust.',
    upgradeText: 'Attach to an Attack in hand: attack applies Weak 2. Exhaust.',
  },
  {
    id: 'C-017', name: 'Heavy Wrench', faction: 'Cogsmiths', type: 'Attack', cost: 2,
    keywords: [], rarity: 'Uncommon',
    cardText: 'Deal 16 damage.',
    upgradeText: 'Deal 20 damage.',
  },
  {
    id: 'C-018', name: 'Shock Coil', faction: 'Cogsmiths', type: 'Attack', cost: 2,
    keywords: [], rarity: 'Uncommon',
    cardText: 'Deal 5 damage. Apply Weak 2.',
    upgradeText: 'Deal 7 damage. Apply Weak 3.',
  },
  {
    id: 'C-019', name: 'Deploy Sentry', faction: 'Cogsmiths', type: 'Skill', cost: 2,
    keywords: ['DEPLOY'], rarity: 'Uncommon',
    cardText: 'Summon a Sentry (8 HP, deals 6 damage at turn end, lasts 4 turns).',
    upgradeText: 'Summon a Vanguard (12 HP, deals 8 damage at turn end, lasts 4 turns).',
  },
  {
    id: 'C-020', name: 'Full Plate', faction: 'Cogsmiths', type: 'Skill', cost: 2,
    keywords: [], rarity: 'Uncommon',
    cardText: 'Gain 14 Block.',
    upgradeText: 'Gain 18 Block.',
  },
  {
    id: 'C-021', name: 'Modular Strike', faction: 'Cogsmiths', type: 'Attack', cost: 1,
    keywords: [], rarity: 'Uncommon',
    cardText: 'Deal 6 damage + 4 damage per Augment on any card in your deck.',
    upgradeText: 'Deal 8 damage + 5 damage per Augment on any card in your deck.',
  },
  {
    id: 'C-022', name: 'Automate', faction: 'Cogsmiths', type: 'Skill', cost: 1,
    keywords: [], rarity: 'Uncommon',
    cardText: 'Copy an Augment from a card in your deck and add it to your hand.',
    upgradeText: 'Copy 2 Augments from cards in your deck and add them to your hand.',
  },
  {
    id: 'C-023', name: 'Precision Bore', faction: 'Cogsmiths', type: 'Attack', cost: 2,
    keywords: [], rarity: 'Uncommon',
    cardText: 'Deal 10 damage that ignores Block.',
    upgradeText: 'Deal 14 damage that ignores Block.',
  },
  {
    id: 'C-024', name: 'Whirring Blades', faction: 'Cogsmiths', type: 'Attack', cost: 2,
    keywords: ['BLITZ'], rarity: 'Uncommon',
    cardText: 'Deal 4 damage 3 times.',
    upgradeText: 'Deal 5 damage 3 times.',
  },
  {
    id: 'C-025', name: 'Repair Nanites', faction: 'Cogsmiths', type: 'Skill', cost: 1,
    keywords: [], rarity: 'Uncommon',
    cardText: 'Heal 8 HP.',
    upgradeText: 'Heal 12 HP.',
  },
  {
    id: 'C-026', name: 'Assembly Line', faction: 'Cogsmiths', type: 'Power', cost: 2,
    keywords: [], rarity: 'Uncommon',
    cardText: 'At end of turn, if you played 3 or more cards this turn, draw 1 card.',
    upgradeText: 'At end of turn, if you played 3 or more cards this turn, draw 2 cards.',
  },
  {
    id: 'C-027', name: 'Augment: Core', faction: 'Cogsmiths', type: 'Augment', cost: 1,
    keywords: ['UPGRADE'], rarity: 'Uncommon',
    cardText: 'Attach to a card in hand: card draws a card when played. Exhaust.',
    upgradeText: 'Attach to a card in hand: card draws 2 cards when played. Exhaust.',
  },
  {
    id: 'C-028', name: 'Augment: Gyro', faction: 'Cogsmiths', type: 'Augment', cost: 1,
    keywords: ['UPGRADE'], rarity: 'Uncommon',
    cardText: 'Attach to a card in hand: card costs 1 less Energy (min 0). Exhaust.',
    upgradeText: 'Attach to a card in hand: card costs 2 less Energy (min 0). Exhaust.',
  },
  {
    id: 'C-029', name: 'Augment: Bulwark', faction: 'Cogsmiths', type: 'Augment', cost: 1,
    keywords: ['UPGRADE'], rarity: 'Uncommon',
    cardText: 'Attach to a Skill in hand: Block from this card retains for 1 turn. Exhaust.',
    upgradeText: 'Attach to a Skill in hand: Block from this card retains for 1 turn and gains +2. Exhaust.',
  },
  {
    id: 'C-030', name: 'Augment: Amp', faction: 'Cogsmiths', type: 'Augment', cost: 1,
    keywords: ['UPGRADE'], rarity: 'Uncommon',
    cardText: 'Attach to an Attack in hand: once per combat, this card deals double damage. Exhaust.',
    upgradeText: 'Attach to an Attack in hand: twice per combat, this card deals double damage. Exhaust.',
  },
  {
    id: 'C-031', name: 'Mecha Form', faction: 'Cogsmiths', type: 'Power', cost: 3,
    keywords: [], rarity: 'Rare',
    cardText: 'Gain 3 Strength. All Augment cards cost 0 for the rest of this combat.',
    upgradeText: 'Gain 4 Strength. All Augment cards cost 0 for the rest of this combat.',
  },
  {
    id: 'C-032', name: 'Warforge', faction: 'Cogsmiths', type: 'Power', cost: 2,
    keywords: [], rarity: 'Rare',
    cardText: 'All Augment effects are doubled.',
    upgradeText: 'All Augment effects are tripled.',
  },
  {
    id: 'C-033', name: 'Colossus Strike', faction: 'Cogsmiths', type: 'Attack', cost: 3,
    keywords: [], rarity: 'Rare',
    cardText: 'Deal 30 damage + 25 damage per Augment on this card.',
    upgradeText: 'Deal 35 damage + 30 damage per Augment on this card.',
  },
  {
    id: 'C-034', name: 'Deploy Titan', faction: 'Cogsmiths', type: 'Skill', cost: 3,
    keywords: ['DEPLOY'], rarity: 'Rare',
    cardText: 'Summon a Titan (25 HP, takes 2 actions per turn dealing 10 damage each).',
    upgradeText: 'Summon a Warmind (35 HP, takes 2 actions per turn dealing 14 damage each).',
  },
  {
    id: 'C-035', name: 'Iron Commandment', faction: 'Cogsmiths', type: 'Power', cost: 3,
    keywords: [], rarity: 'Rare',
    cardText: 'The first Attack you play each turn is treated as having an extra Edge and Jolt Augment.',
    upgradeText: 'The first 2 Attacks you play each turn are treated as having an extra Edge and Jolt Augment.',
  },
  {
    id: 'C-036', name: 'Overclocked Core', faction: 'Cogsmiths', type: 'Power', cost: 2,
    keywords: [], rarity: 'Rare',
    cardText: 'At combat start, gain 1 extra Energy this turn. Take 2 damage at end of each turn.',
    upgradeText: 'At combat start, gain 2 extra Energy this turn. Take 2 damage at end of each turn.',
  },
  {
    id: 'C-037', name: 'Machine God', faction: 'Cogsmiths', type: 'Power', cost: 3,
    keywords: [], rarity: 'Rare',
    cardText: 'All Drones, Sentries, and Titans you summon have +5 HP and +2 damage.',
    upgradeText: 'All Drones, Sentries, and Titans you summon have +8 HP and +3 damage.',
  },
  {
    id: 'C-038', name: 'Augment: Exotic Core', faction: 'Cogsmiths', type: 'Augment', cost: 1,
    keywords: ['UPGRADE'], rarity: 'Rare',
    cardText: 'Attach to a card in hand: card costs 0 and does not exhaust for the rest of this combat. Exhaust.',
    upgradeText: 'Attach to a card in hand: card costs 0, does not exhaust, and duplicates on play for the rest of this combat. Exhaust.',
  },
  {
    id: 'C-039', name: 'Augment: Inverter', faction: 'Cogsmiths', type: 'Augment', cost: 2,
    keywords: ['UPGRADE'], rarity: 'Rare',
    cardText: 'Attach to a card in hand: attack hits all enemies / skill applies to all allies. Exhaust.',
    upgradeText: 'Attach to a card in hand: attack hits all enemies / skill applies to all allies. Effect is doubled. Exhaust.',
  },
  {
    id: 'C-040', name: 'Reinforce Protocol', faction: 'Cogsmiths', type: 'Skill', cost: 3,
    keywords: ['UPGRADE'], rarity: 'Rare',
    cardText: 'Attach a random Augment to every card in your hand. Exhaust.',
    upgradeText: 'Attach 2 random Augments to every card in your hand. Exhaust.',
  },
];

// ─── Pyroclast (40 cards) ────────────────────────────────────────────────────

const PYROCLAST_CARDS: CardDefinition[] = [
  {
    id: 'P-001', name: 'Cinder Strike', faction: 'Pyroclast', type: 'Attack', cost: 1,
    keywords: [], rarity: 'Common',
    cardText: 'Deal 6 damage.',
    upgradeText: 'Deal 9 damage.',
  },
  {
    id: 'P-002', name: 'Scale Guard', faction: 'Pyroclast', type: 'Skill', cost: 1,
    keywords: [], rarity: 'Common',
    cardText: 'Gain 5 Block.',
    upgradeText: 'Gain 7 Block and 1 Heat.',
  },
  {
    id: 'P-003', name: 'Kindle', faction: 'Pyroclast', type: 'Skill', cost: 0,
    keywords: [], rarity: 'Common',
    cardText: 'Gain 3 Heat.',
    upgradeText: 'Gain 4 Heat. Next attack this turn deals +2 damage.',
  },
  {
    id: 'P-004', name: 'Flame Lash', faction: 'Pyroclast', type: 'Attack', cost: 1,
    keywords: [], rarity: 'Common',
    cardText: 'Deal 8 damage. If Heat >= 3, apply Ignite 2.',
    upgradeText: 'Deal 10 damage. Apply Ignite 3.',
  },
  {
    id: 'P-005', name: 'Ember Volley', faction: 'Pyroclast', type: 'Attack', cost: 1,
    keywords: ['BLITZ'], rarity: 'Common',
    cardText: 'Deal 3 damage 3 times.',
    upgradeText: 'Deal 4 damage 3 times.',
  },
  {
    id: 'P-006', name: 'Ash Cloud', faction: 'Pyroclast', type: 'Skill', cost: 1,
    keywords: [], rarity: 'Common',
    cardText: 'Apply 2 Weak to all enemies.',
    upgradeText: 'Apply 2 Weak to all enemies. Gain 5 Block.',
  },
  {
    id: 'P-007', name: 'Oil Flask', faction: 'Pyroclast', type: 'Skill', cost: 0,
    keywords: [], rarity: 'Common',
    cardText: 'Your next Attack applies Ignite 2.',
    upgradeText: 'Your next 2 Attacks apply Ignite 2.',
  },
  {
    id: 'P-008', name: 'Magma Fist', faction: 'Pyroclast', type: 'Attack', cost: 2,
    keywords: [], rarity: 'Common',
    cardText: 'Deal 13 damage.',
    upgradeText: 'Deal 16 damage. Apply Ignite 2.',
  },
  {
    id: 'P-009', name: 'Heat Shimmer', faction: 'Pyroclast', type: 'Skill', cost: 1,
    keywords: [], rarity: 'Common',
    cardText: 'Gain 4 Block and 1 Heat.',
    upgradeText: 'Gain 6 Block and 2 Heat.',
  },
  {
    id: 'P-010', name: 'Blazing Charge', faction: 'Pyroclast', type: 'Attack', cost: 1,
    keywords: [], rarity: 'Common',
    cardText: 'Deal 4 damage + 4 per Heat spent (up to 5 Heat).',
    upgradeText: 'Deal 4 damage + 6 per Heat spent (up to 5 Heat).',
  },
  {
    id: 'P-011', name: 'Cauterize', faction: 'Pyroclast', type: 'Skill', cost: 1,
    keywords: [], rarity: 'Common',
    cardText: 'Heal 4 HP. Take 2 damage.',
    upgradeText: 'Heal 6 HP. Take 1 damage.',
  },
  {
    id: 'P-012', name: 'Spark', faction: 'Pyroclast', type: 'Skill', cost: 0,
    keywords: [], rarity: 'Common',
    cardText: 'Gain 1 Heat. Draw 1 card.',
    upgradeText: 'Gain 2 Heat. Draw 1 card.',
  },
  {
    id: 'P-013', name: 'Hot Wind', faction: 'Pyroclast', type: 'Skill', cost: 0,
    keywords: [], rarity: 'Common',
    cardText: 'Deal 2 damage to all enemies. Gain 1 Heat.',
    upgradeText: 'Deal 3 damage to all enemies. Gain 2 Heat.',
  },
  {
    id: 'P-014', name: 'Pyre Lance', faction: 'Pyroclast', type: 'Attack', cost: 2,
    keywords: [], rarity: 'Common',
    cardText: 'Deal 14 damage. Consume all Heat.',
    upgradeText: 'Deal 14 damage + damage equal to Heat consumed.',
  },
  {
    id: 'P-015', name: 'Rekindle', faction: 'Pyroclast', type: 'Skill', cost: 1,
    keywords: [], rarity: 'Common',
    cardText: 'Return a Pyroclast card from your discard pile to your hand.',
    upgradeText: 'Return any card from your discard pile to your hand.',
  },
  {
    id: 'P-016', name: 'Glowing Resolve', faction: 'Pyroclast', type: 'Skill', cost: 1,
    keywords: [], rarity: 'Common',
    cardText: 'Gain 3 Block per Heat (up to 4 Heat counted).',
    upgradeText: 'Gain 4 Block per Heat (up to 4 Heat counted).',
  },
  {
    id: 'P-017', name: 'Dragonbreath', faction: 'Pyroclast', type: 'Attack', cost: 2,
    keywords: [], rarity: 'Uncommon',
    cardText: 'Deal 7 damage to all enemies.',
    upgradeText: 'Deal 9 damage to all enemies. Apply Ignite 1 to all.',
  },
  {
    id: 'P-018', name: 'Forge Heart', faction: 'Pyroclast', type: 'Power', cost: 2,
    keywords: [], rarity: 'Uncommon',
    cardText: 'Whenever you gain Heat, gain 1 Block.',
    upgradeText: 'Whenever you gain Heat, gain 1 Block. Gain 1 Strength at Heat 10+.',
  },
  {
    id: 'P-019', name: 'Molten Skin', faction: 'Pyroclast', type: 'Power', cost: 1,
    keywords: [], rarity: 'Uncommon',
    cardText: 'At end of turn, if you have Block, gain 2 Heat.',
    upgradeText: 'At end of turn, if you have Block, gain 2 Heat. Keep 5 Block next turn.',
  },
  {
    id: 'P-020', name: 'Overclock', faction: 'Pyroclast', type: 'Skill', cost: 1,
    keywords: [], rarity: 'Uncommon',
    cardText: 'Draw 2 cards. Apply Ignite 2 to yourself.',
    upgradeText: 'Draw 3 cards. Apply Ignite 2 to yourself.',
  },
  {
    id: 'P-021', name: 'Pyroclasm', faction: 'Pyroclast', type: 'Attack', cost: 2,
    keywords: [], rarity: 'Uncommon',
    cardText: 'Deal 9 damage to all enemies. Spend 5 Heat for +6 damage to each.',
    upgradeText: 'Deal 11 damage to all enemies. Spend 5 Heat for +8 damage to each.',
  },
  {
    id: 'P-022', name: 'Soot Burst', faction: 'Pyroclast', type: 'Skill', cost: 0,
    keywords: [], rarity: 'Uncommon',
    cardText: 'Apply Vulnerable 1 to all enemies.',
    upgradeText: 'Apply Vulnerable 2 to all enemies.',
  },
  {
    id: 'P-023', name: 'Meltdown', faction: 'Pyroclast', type: 'Attack', cost: 3,
    keywords: [], rarity: 'Uncommon',
    cardText: 'Deal damage equal to your current Heat x 3.',
    upgradeText: 'Deal damage equal to your current Heat x 4.',
  },
  {
    id: 'P-024', name: 'Glass Cannon', faction: 'Pyroclast', type: 'Skill', cost: 1,
    keywords: [], rarity: 'Uncommon',
    cardText: 'Your next Attack deals +12 damage. Lose 5 HP.',
    upgradeText: 'Your next Attack deals +15 damage. Lose 3 HP.',
  },
  {
    id: 'P-025', name: 'Combustion', faction: 'Pyroclast', type: 'Attack', cost: 2,
    keywords: [], rarity: 'Uncommon',
    cardText: 'Deal 10 damage. If target has Ignite, trigger it immediately.',
    upgradeText: 'Deal 10 damage. If target has Ignite, trigger it and spread remaining to all enemies.',
  },
  {
    id: 'P-026', name: 'Ash Dancer', faction: 'Pyroclast', type: 'Attack', cost: 1,
    keywords: [], rarity: 'Uncommon',
    cardText: 'Deal 7 damage. If this kills the target, draw 2 cards.',
    upgradeText: 'Deal 9 damage. If this kills the target, draw 2 cards.',
  },
  {
    id: 'P-027', name: 'Fuel the Flames', faction: 'Pyroclast', type: 'Skill', cost: 1,
    keywords: [], rarity: 'Uncommon',
    cardText: 'Exhaust a card from hand. Gain 3 Heat per its cost.',
    upgradeText: 'Exhaust a card from hand. Gain 4 Heat per its cost.',
  },
  {
    id: 'P-028', name: 'Searing Resolve', faction: 'Pyroclast', type: 'Skill', cost: 1,
    keywords: [], rarity: 'Uncommon',
    cardText: 'Gain 8 Block. If at full HP, gain 3 Heat.',
    upgradeText: 'Gain 10 Block and 3 Heat.',
  },
  {
    id: 'P-029', name: 'Incinerator', faction: 'Pyroclast', type: 'Attack', cost: 2,
    keywords: [], rarity: 'Uncommon',
    cardText: 'Deal 9 damage. Exhaust. If this kills, add a copy to hand.',
    upgradeText: 'Deal 9 damage. Exhaust. If this kills, add 2 copies to hand.',
  },
  {
    id: 'P-030', name: 'Spirit of Fire', faction: 'Pyroclast', type: 'Power', cost: 2,
    keywords: [], rarity: 'Uncommon',
    cardText: 'At turn start, gain 2 Heat.',
    upgradeText: 'At turn start, gain 3 Heat. Once per combat, survive lethal at 10 HP.',
  },
  {
    id: 'P-031', name: 'Sunfire Blade', faction: 'Pyroclast', type: 'Attack', cost: 2,
    keywords: [], rarity: 'Rare',
    cardText: 'Deal 18 damage and apply Ignite 4.',
    upgradeText: 'Deal 22 damage and apply Ignite 5.',
  },
  {
    id: 'P-032', name: 'Volcano', faction: 'Pyroclast', type: 'Power', cost: 3,
    keywords: [], rarity: 'Rare',
    cardText: 'At start of each turn, deal 4 damage to all enemies.',
    upgradeText: 'At start of each turn, deal 6 damage to all enemies.',
  },
  {
    id: 'P-033', name: 'Immolate', faction: 'Pyroclast', type: 'Attack', cost: 2,
    keywords: ['IMMOLATE'], rarity: 'Rare',
    cardText: 'Deal 22 damage. Shuffle 2 Burn cards into your discard pile.',
    upgradeText: 'Deal 28 damage. Shuffle 2 Burn cards (dealing half damage) into discard.',
  },
  {
    id: 'P-034', name: 'Phoenix Form', faction: 'Pyroclast', type: 'Power', cost: 3,
    keywords: [], rarity: 'Rare',
    cardText: 'Once per combat, when reduced to 0 HP, restore 15 HP and gain 3 Heat.',
    upgradeText: 'Once per combat, when reduced to 0 HP, restore 25 HP and gain 5 Heat.',
  },
  {
    id: 'P-035', name: 'Ring of Fire', faction: 'Pyroclast', type: 'Power', cost: 2,
    keywords: [], rarity: 'Rare',
    cardText: 'Whenever attacked, deal 2 damage back. Deal 4 if Heat >= 5.',
    upgradeText: 'Whenever attacked, deal 4 damage back. Deal 6 if Heat >= 5.',
  },
  {
    id: 'P-036', name: "Sun's Fury", faction: 'Pyroclast', type: 'Attack', cost: 3,
    keywords: [], rarity: 'Rare',
    cardText: 'Deal 28 damage. If Heat >= 8, deal 14 more damage.',
    upgradeText: 'Deal 32 damage. If Heat >= 6, deal 14 more damage.',
  },
  {
    id: 'P-037', name: 'Forge Master', faction: 'Pyroclast', type: 'Power', cost: 2,
    keywords: [], rarity: 'Rare',
    cardText: 'Every 3 Heat spent this combat, draw 1 card.',
    upgradeText: 'Every 2 Heat spent this combat, draw 1 card.',
  },
  {
    id: 'P-038', name: 'Everburn', faction: 'Pyroclast', type: 'Power', cost: 2,
    keywords: [], rarity: 'Rare',
    cardText: 'Combat starts with 5 Heat. Gain 1 Heat at turn start.',
    upgradeText: 'Combat starts with 8 Heat. Gain 2 Heat at turn start.',
  },
  {
    id: 'P-039', name: 'Magma Tide', faction: 'Pyroclast', type: 'Attack', cost: 2,
    keywords: [], rarity: 'Rare',
    cardText: 'Deal damage equal to Heat to 3 random enemies.',
    upgradeText: 'Deal damage equal to Heat to 4 chosen enemies.',
  },
  {
    id: 'P-040', name: "Dragon's Roar", faction: 'Pyroclast', type: 'Attack', cost: 1,
    keywords: [], rarity: 'Rare',
    cardText: 'Apply Vulnerable 3 to all enemies. Gain 4 Heat.',
    upgradeText: 'Apply Vulnerable 4 and Weak 2 to all enemies. Gain 5 Heat.',
  },
];

// ─── Pool & helpers ───────────────────────────────────────────────────────────

export const CARD_POOL: CardDefinition[] = [
  ...COGSMITHS_CARDS,
  ...PYROCLAST_CARDS,
  // Luminar, WarpRiders added in subsequent phases
];

export const getCardsByFaction = (faction: Faction): CardDefinition[] =>
  CARD_POOL.filter((c) => c.faction === faction);

export const getCardsByRarity = (rarity: Rarity): CardDefinition[] =>
  CARD_POOL.filter((c) => c.rarity === rarity);
