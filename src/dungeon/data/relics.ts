import type { RelicDefinition } from '../types';

// All 26 relics from docs/roguelite/relics-design.md and relics.xlsx.
// Effects/flavor copied verbatim; triggers mapped to the dungeon
// RelicTrigger union. `per_combat` → `combat_start`, `card_played` →
// `on_card_play`, `card_retained` / `flux_shift` / `every_third_combat` →
// `passive` (handled by bespoke logic in relicEffects.ts).

// Tier 'Starter' maps to 'Common' rarity (dungeon rarity has no Starter).
// Tier 'Anomaly' maps to 'Rare'.

export const RELIC_POOL: RelicDefinition[] = [
  // ─── Starter Relics (4) — one per faction ─────────────────────────────────
  {
    id: 'R-S01', name: 'Forgeheart Ember', rarity: 'Common', trigger: 'combat_start', art: 'FIR',
    description: 'Combat start: gain 2 Heat.',
    flavor: "The dying coal from your father's forge, still warm.",
  },
  {
    id: 'R-S02', name: 'Pattern Caliper', rarity: 'Common', trigger: 'passive', art: 'CAL',
    description: 'The first Augment attached to each card in your deck costs 0.',
    flavor: 'A gauge for measuring modifications. Inherited.',
  },
  {
    id: 'R-S03', name: "Suncaller's Lens", rarity: 'Common', trigger: 'passive', art: 'SUN',
    description: 'All Channel cards in hand have +1 Max Lumens.',
    flavor: 'Focuses the morning light through prayer.',
  },
  {
    id: 'R-S04', name: "Navigator's Bone", rarity: 'Common', trigger: 'combat_start', art: 'NAV',
    description: 'Once per combat, force-reroll one Flux card in hand.',
    flavor: 'A Warp Rider finger bone, still warm.',
  },

  // ─── Common Relics (8) — no faction affinity ──────────────────────────────
  {
    id: 'R-C01', name: 'Ironbark Amulet', rarity: 'Common', trigger: 'passive', art: 'AMU',
    description: 'Max HP +8.',
    flavor: 'Dense wood plating from a Bloodoak tree, cured in ash.',
  },
  {
    id: 'R-C02', name: 'Fueled Boots', rarity: 'Common', trigger: 'combat_start', art: 'BOT',
    description: 'Gain 1 Energy on the first turn of every combat.',
    flavor: 'Pyroclast-forged, hum when you walk.',
  },
  {
    id: 'R-C03', name: 'Stasis Cube', rarity: 'Common', trigger: 'combat_start', art: 'CUB',
    description: 'Add 1 random Block card to your hand.',
    flavor: 'A 2-inch cube that vibrates at a frequency just below hearing.',
  },
  {
    id: 'R-C04', name: "Preserver's Salve", rarity: 'Common', trigger: 'combat_end', art: 'SLV',
    description: 'Combat end: heal 2 HP.',
    flavor: 'Stolen from a Luminar infirmary.',
  },
  {
    id: 'R-C05', name: "Archivist's Orb", rarity: 'Common', trigger: 'combat_start', art: 'ORB',
    description: 'Draw 1 additional card at combat start.',
    flavor: 'A recording device that remembers only the strong.',
  },
  {
    id: 'R-C06', name: 'Stasis Coil', rarity: 'Common', trigger: 'on_card_play', art: 'COI',
    description: '10% chance: the card played costs 1 less this turn.',
    flavor: 'Wraps around your arm. Cold to the touch.',
  },
  {
    id: 'R-C07', name: 'Gutterspeak Coin', rarity: 'Common', trigger: 'combat_end', art: 'GLD',
    description: 'Combat end: gain 1 gold.',
    flavor: 'A coin from a faction that no longer exists.',
  },
  {
    id: 'R-C08', name: "Sparkthief's Glove", rarity: 'Common', trigger: 'combat_start', art: 'GLV',
    description: 'Once per combat, the first Attack you play deals +3 damage.',
    flavor: 'Charges from electrical ambient. Crackles softly.',
  },

  // ─── Uncommon Relics (5) ──────────────────────────────────────────────────
  {
    id: 'R-U01', name: "Forgemaster's Sigil", rarity: 'Uncommon', trigger: 'combat_start', art: 'SIG',
    description: 'The first card you play each combat is temporarily augmented with +2 damage or +2 Block.',
    flavor: 'Brand of a Cogsmith master artisan.',
  },
  {
    id: 'R-U02', name: "Starseer's Pendant", rarity: 'Uncommon', trigger: 'turn_end', art: 'STR',
    description: 'Whenever you retain a card between turns, gain 1 Block.',
    flavor: 'Crystallized starlight. Warm to the touch.',
  },
  {
    id: 'R-U03', name: 'Void Compass', rarity: 'Uncommon', trigger: 'combat_start', art: 'CMP',
    description: "Combat start: preview the first enemy's telegraphed action for the next 3 turns.",
    flavor: 'Points at something, but not north.',
  },
  {
    id: 'R-U04', name: 'Overclocked Core', rarity: 'Uncommon', trigger: 'combat_start', art: 'PWR',
    description: 'Gain 1 additional Energy at combat start. Lose 5 Max HP (permanent).',
    flavor: 'A reactor chip that has forgotten how to be safe.',
  },
  {
    id: 'R-U05', name: "Cursebreaker's Medallion", rarity: 'Uncommon', trigger: 'combat_start', art: 'MED',
    description: 'Combat start: remove one random debuff status from your hand.',
    flavor: "Burns away what shouldn't be on you.",
  },

  // ─── Rare Relics (5) ──────────────────────────────────────────────────────
  {
    id: 'R-R01', name: 'Crown of the Unburnt', rarity: 'Rare', trigger: 'passive', art: 'CRN',
    description: 'The first time each combat you Vent 5+ Heat, gain 2 HP.',
    flavor: 'A crown forged from congealed lava. Heavy.',
  },
  {
    id: 'R-R02', name: 'The Chorus Shard', rarity: 'Rare', trigger: 'passive', art: 'CHR',
    description: 'All Release effects are triggered twice.',
    flavor: 'A piece of the Cosmic Choir, carved small.',
  },
  {
    id: 'R-R03', name: 'Modular Heart', rarity: 'Rare', trigger: 'passive', art: 'HRT',
    description: 'Every card in your deck gains a third Augment slot.',
    flavor: 'An engine that is also a blueprint.',
  },
  {
    id: 'R-R04', name: 'The Unmoored Eye', rarity: 'Rare', trigger: 'turn_start', art: 'EYE',
    description: 'Turn start: you may lock one Flux card in your hand to a state of your choice.',
    flavor: 'An eye that cannot settle on what it sees.',
  },
  {
    id: 'R-R05', name: "Runekeeper's Tome", rarity: 'Rare', trigger: 'combat_start', art: 'TOM',
    description: 'Every third combat: add a random rare card to your hand at combat start.',
    flavor: "A book that remembers every fight you've won.",
  },

  // ─── Boss Relics (3) ──────────────────────────────────────────────────────
  {
    id: 'R-B01', name: "The Hierophant's Censer", rarity: 'Boss', trigger: 'combat_start', art: 'CEN',
    description: 'Combat start: draw 2 extra cards. All cards cost +1 Energy for the first turn only.',
    flavor: 'The relic of a fallen Hivemind priest.',
  },
  {
    id: 'R-B02', name: 'Spire-Glass Lens', rarity: 'Boss', trigger: 'on_kill', art: 'LEN',
    description: 'Killing an enemy: +1 Max HP. Taking HP damage: cannot heal this combat.',
    flavor: 'Cracked but functional.',
  },
  {
    id: 'R-B03', name: 'Heartwake Echo', rarity: 'Boss', trigger: 'combat_start', art: 'ECH',
    description: 'Combat start: copy the effect of a random relic in your collection for this fight. Permanently lose 10% max HP.',
    flavor: 'A fragment of the final boss, reluctantly yours.',
  },

  // ─── Anomaly Relic (1) ────────────────────────────────────────────────────
  {
    id: 'R-A01', name: 'Shard of the Choir', rarity: 'Rare', trigger: 'on_card_play', art: 'CHO',
    description: 'Whenever a Flux card shifts: deal 2 damage to a random enemy. Whenever you play any card: take 1 damage.',
    flavor: 'A piece of disembodied singing, trapped in obsidian.',
  },
];
