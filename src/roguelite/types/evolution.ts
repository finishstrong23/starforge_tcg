// Every trigger type observed across all 4 faction spreadsheets.
// The combat engine (later phase) parses conditionText to apply nuance
// beyond what this discriminator captures.
export type TriggerType =
  | 'play_count'             // "Played N times" — no extra condition
  | 'play_with_condition'    // "Played N times at Heat ≥ X", "with no self-damage", etc.
  | 'play_in_boss'           // "Played in N boss fights"
  | 'play_all_flux_states'   // "Played in all 3 states" (Warp Rider)
  | 'hold_turns'             // "Held N turns"
  | 'hold_then_play'         // "Held N turns then played"
  | 'kill_count'             // "Killed N targets/enemies with this"
  | 'trigger_count'          // "Triggered N times"
  | 'trigger_with_condition' // "Triggered with 5+ Channel cards", 2x-outcome chains
  | 'ability_use_count'      // "Used ability N times" (Power cards)
  | 'attach_count'           // "Attached N times" (Cogsmith Augments)
  | 'release_count'          // "Released N times" (Luminar)
  | 'release_with_condition' // "Released at N+ Lumens"
  | 'survived_combats'       // "Survived N combats"
  | 'survived_attacks'       // "Survived N attacks"
  | 'revived'                // "Revived at least once"
  | 'draw_via_this'          // "Drew N cards via this effect"
  | 'rift_open_count';       // "Opened N Rifts" (Warp Rider)

export interface EvolutionRule {
  triggerType: TriggerType;
  threshold: number;
  conditionText: string;     // Verbatim "Evolution Trigger" column — engine parses later
  evolvesTo: string;         // Id of the evolved Card (e.g. 'P-001-EVOLVED')
  evolvedDescription: string; // Verbatim "Evolved Effect" column
}

// Per-instance progress toward evolution. Combat engine increments this.
export interface EvolutionProgress {
  count: number;
  evolved: boolean;
}
