/**
 * STARFORGE TCG - Campaign Story Mode Data
 *
 * Defines the 10-planet campaign: encounters, lore, progression rewards.
 * Players pick 1 of 2 starter planets, then fight through the galaxy
 * unlocking each planet they defeat.
 */

import { Race } from '../types/Race';
import { AIDifficulty } from '../ai/AIPlayer';

/**
 * A single planet encounter in the campaign
 */
export interface PlanetEncounter {
  race: Race;
  planet: string;
  title: string;
  /** Pre-battle flavor shown before the fight */
  introBriefing: string;
  /** The opponent's taunt before battle */
  enemyTaunt: string;
  /** Shown on victory */
  victoryText: string;
  /** Shown on defeat — should still feel rewarding/motivating */
  defeatText: string;
  /** Lore snippet revealed after first encounter (win or loss) */
  loreUnlock: string;
  /** AI difficulty for this encounter */
  difficulty: AIDifficulty;
  /** Visual accent color for the planet */
  color: string;
  /** Planet symbol/icon */
  icon: string;
}

/**
 * The two starter planet options offered to new players.
 * Pyroclast = aggressive/simple, Luminar = defensive/forgiving.
 * Both are beginner-friendly but feel very different.
 */
export const STARTER_PLANETS: [Race, Race] = [Race.PYROCLAST, Race.LUMINAR];

/**
 * Campaign encounter order — the galaxy conquest path.
 * Starts easy, ramps difficulty, ends with the hardest planets.
 * Player's home planet is skipped (you already own it).
 */
export const CAMPAIGN_ORDER: Race[] = [
  Race.HIVEMIND,         // Wave 1: Swarm is straightforward to fight
  Race.COGSMITHS,        // Wave 2: Mechs teach board trading
  Race.BIOTITANS,        // Wave 3: Big creatures teach tempo
  Race.PHANTOM_CORSAIRS, // Wave 4: Evasion teaches targeting
  Race.CRYSTALLINE,      // Wave 5: Spells teach resource management
  Race.ASTROMANCERS,     // Wave 6: Card draw teaches hand management
  Race.VOIDBORN,         // Wave 7: Disruption is a skill check
  Race.CHRONOBOUND,      // Wave 8: Time tricks are the ultimate test
  Race.PYROCLAST,        // Included for Luminar starters
  Race.LUMINAR,          // Included for Pyroclast starters
];

/**
 * Full encounter data for every planet
 */
export const PLANET_ENCOUNTERS: Record<Race, PlanetEncounter> = {
  [Race.PYROCLAST]: {
    race: Race.PYROCLAST,
    planet: 'Ignaros',
    title: 'The Burning World',
    color: '#ff4400',
    icon: '🔥',
    introBriefing: 'Ignaros blazes at the edge of the nebula — a world of eternal flame where the Pyroclast worship destruction itself. Their warriors burn bright and die fast, but the damage they leave behind is devastating.',
    enemyTaunt: '"Your fleet will be ash before it touches our atmosphere. Ignaros burns all who dare approach."',
    victoryText: 'The flames of Ignaros sputter and die. Flamecaller Ashyr kneels before you — the fire now yours to command. The Pyroclast war machine joins your conquest.',
    defeatText: 'Your ships retreat from the firestorm, hulls scorched but intact. The Pyroclast are fierce, but you learned their patterns. The flames burn hot — but they burn out fast.',
    loreUnlock: 'IGNAROS CODEX: The Pyroclast were not always destroyers. Ancient texts speak of a time when their fire was used to forge, not burn. The STARFORGE itself may have originated on Ignaros, before the Great Immolation turned their civilization to ash and rage.',
    difficulty: AIDifficulty.MEDIUM,
  },
  [Race.LUMINAR]: {
    race: Race.LUMINAR,
    planet: 'Solhaven',
    title: 'The Radiant Bastion',
    color: '#ffdd44',
    icon: '✨',
    introBriefing: 'Solhaven glows like a second sun — a fortress world protected by layers of light barriers. The Luminar are patient defenders who outlast every siege. Breaking through will require overwhelming force or endless patience.',
    enemyTaunt: '"The light of Solhaven has endured a thousand wars. You will break upon our barriers like every invader before you."',
    victoryText: 'The barriers of Solhaven dim and part. Archon Solarius extends a hand of light — not in surrender, but in recognition. The Luminar choose their allies carefully, and you have proven worthy.',
    defeatText: 'Their healing outpaced your damage, their barriers absorbed your strongest blows. But you saw the cracks — the moments between heals where Solhaven is vulnerable. Next time.',
    loreUnlock: 'SOLHAVEN CODEX: The Luminar\'s healing light is not divine — it\'s stellar radiation, channeled through living crystal lattices grown in their bodies since birth. Each Luminar is a walking solar battery, and Solhaven itself is one massive capacitor.',
    difficulty: AIDifficulty.MEDIUM,
  },
  [Race.HIVEMIND]: {
    race: Race.HIVEMIND,
    planet: 'Xenoptera',
    title: 'The Living World',
    color: '#44cc44',
    icon: '🐛',
    introBriefing: 'Xenoptera pulses with alien life — the entire planet is one organism. The Hivemind doesn\'t send soldiers, it grows them. Cut down one drone and two more claw their way from the soil. Speed is your only advantage.',
    enemyTaunt: '"We are Xenoptera. We are the soil, the air, the swarm. You fight a planet, little creature."',
    victoryText: 'The swarm retreats underground, the Overmind Skryx acknowledging a superior predator. Xenoptera\'s endless spawn now serve your campaign — an army that never stops growing.',
    defeatText: 'They overwhelmed you with sheer numbers — every drone you killed was replaced by two more. But you noticed: kill the big ones first. The swarm loses direction when its anchors fall.',
    loreUnlock: 'XENOPTERA CODEX: The Hivemind is not mindless — Overmind Skryx is one of the oldest intelligences in the galaxy. Each drone carries a fragment of its consciousness. When enough drones gather, they can perform calculations that rival the Astromancers\' cosmic sight.',
    difficulty: AIDifficulty.EASY,
  },
  [Race.COGSMITHS]: {
    race: Race.COGSMITHS,
    planet: 'Mechronis',
    title: 'The Machine World',
    color: '#cc8833',
    icon: '⚙️',
    introBriefing: 'Mechronis is a planet-sized factory, its surface covered in endless assembly lines and forge-cities. The Cogsmiths build war machines that grow stronger with every upgrade. Let them build too long and no force can stop them.',
    enemyTaunt: '"Every machine we build makes the next one better. Tick tock — your window to win is closing."',
    victoryText: 'The forges of Mechronis fall silent, then roar back to life — this time building for you. Constructor Prime Gearsmith tips his welding visor in respect. Your army gains the finest engineers in the galaxy.',
    defeatText: 'Their mechs snowballed out of control — each upgrade making the next more devastating. But early on, before the engines warmed up, they were vulnerable. Strike fast next time.',
    loreUnlock: 'MECHRONIS CODEX: The Cogsmiths didn\'t build Mechronis — they found it. The planet was already a factory when they arrived, built by a civilization that vanished millennia ago. The original blueprints in the deep forges contain designs for something called "The STARFORGE Protocol."',
    difficulty: AIDifficulty.EASY,
  },
  [Race.BIOTITANS]: {
    race: Race.BIOTITANS,
    planet: 'Primeva',
    title: 'The Primal World',
    color: '#33aa66',
    icon: '🌿',
    introBriefing: 'Primeva is a world where evolution runs at lightspeed. The Biotitans command creatures that adapt in real-time — each beast bigger and more dangerous than the last. Their late-game is terrifying, but their early turns are slow.',
    enemyTaunt: '"Nature always wins. We simply... accelerate the process. Your steel will rust. Our beasts will endure."',
    victoryText: 'The great beasts of Primeva bow before a greater predator. Worldshaper Thorna weaves a crown of living vines for you — the jungle\'s new alpha. Evolution now serves your campaign.',
    defeatText: 'Their creatures grew too large too fast — by the time you could react, a 12/12 beast was staring you down. But their early game was quiet. Aggression before turn 5 is the key.',
    loreUnlock: 'PRIMEVA CODEX: Primeva\'s rapid evolution is not natural — it\'s driven by microscopic STARFORGE fragments embedded in the planet\'s crust. Every living thing on Primeva is slowly being forged into something greater. The Biotitans learned to accelerate this process.',
    difficulty: AIDifficulty.MEDIUM,
  },
  [Race.PHANTOM_CORSAIRS]: {
    race: Race.PHANTOM_CORSAIRS,
    planet: 'Netherstorm',
    title: 'The Pirate Nebula',
    color: '#8844cc',
    icon: '👻',
    introBriefing: 'Netherstorm isn\'t a planet — it\'s a permanent storm of dark energy where the Phantom Corsairs make their hideout. Their ships phase between dimensions, striking from angles that shouldn\'t exist. You can\'t target what you can\'t see.',
    enemyTaunt: '"We don\'t fight fair, love. We fight from the shadows, and we take what we want. Including your best cards."',
    victoryText: 'Captain Shadowvane raises a phantom glass in salute. "Fair enough, you earned it." The Corsairs pledge their spectral fleet to your cause — pirates always follow the winning side.',
    defeatText: 'Their PHASE minions slipped past your defenses like ghosts. They stole your best cards and used them against you. But phase breaks when they attack — that\'s your moment to strike back.',
    loreUnlock: 'NETHERSTORM CODEX: The Phantom Corsairs discovered that the space between dimensions is navigable. Their PHASE technology lets them exist in two realities simultaneously. Captain Shadowvane was the first to survive the crossing — everyone before her went mad.',
    difficulty: AIDifficulty.MEDIUM,
  },
  [Race.CRYSTALLINE]: {
    race: Race.CRYSTALLINE,
    planet: 'Prismora',
    title: 'The Crystal Spires',
    color: '#44aaff',
    icon: '💎',
    introBriefing: 'Prismora\'s crystal spires reach into orbit, each one a lens focusing cosmic energy into devastating spell chains. The Crystalline don\'t fight with armies — they fight with pure energy, casting spell after spell until reality itself cracks.',
    enemyTaunt: '"Each crystal resonates with infinite power. Each spell amplifies the next. By the time you hear the first crack, it\'s already over."',
    victoryText: 'The crystal spires dim, their energy redirected to your cause. Geode Sage Lumis shatters a prism in acknowledgment — the Crystalline\'s spell-weaving mastery is yours to command.',
    defeatText: 'Their spell chains were relentless — each cast fueling the next in an endless cascade. But between the chains, when their crystals recharge, there\'s a gap. Fill their board and they can\'t cast.',
    loreUnlock: 'PRISMORA CODEX: The crystals of Prismora are not minerals — they\'re solidified spacetime, frozen moments of incredible energy. The Crystalline learned to "play" these crystals like instruments, and each spell is literally a note in a cosmic symphony.',
    difficulty: AIDifficulty.MEDIUM,
  },
  [Race.ASTROMANCERS]: {
    race: Race.ASTROMANCERS,
    planet: 'Celestara',
    title: 'The Observatory',
    color: '#9966ff',
    icon: '🔮',
    introBriefing: 'Celestara hovers between three stars, a world of libraries and observatories where the Astromancers chart the future. They see your moves before you make them and draw answers to every threat. Outthinking them seems impossible — but they\'re fragile.',
    enemyTaunt: '"We have already seen the outcome of this battle in the stars. Would you like to know how it ends? ...No. That would spoil the fun."',
    victoryText: 'Oracle Stellara closes her star charts with a knowing smile. "Interesting. The stars showed many outcomes, but not this one." Celestara\'s cosmic wisdom now guides your campaign.',
    defeatText: 'They always had the answer — drawing cards faster than you could play threats. But all that card draw costs health through fatigue. Push hard and make them pay for their greed.',
    loreUnlock: 'CELESTARA CODEX: The Astromancers don\'t predict the future — they calculate probability across infinite timelines. Oracle Stellara can see 10,000 possible futures simultaneously. But she confides that in ALL timelines, something called "The Convergence" is coming.',
    difficulty: AIDifficulty.HARD,
  },
  [Race.VOIDBORN]: {
    race: Race.VOIDBORN,
    planet: 'Nullheim',
    title: 'The Abyss World',
    color: '#663399',
    icon: '🕳️',
    introBriefing: 'Nullheim exists in a pocket of nothing — a world where reality frays at the edges. The Voidborn feed on absence, stripping your hand, banishing your minions, and leaving you with nothing. Fighting them means fighting with less every turn.',
    enemyTaunt: '"What is a warrior without weapons? A commander without soldiers? Nothing. We are masters of nothing."',
    victoryText: 'The void recedes. Prophet of the Abyss speaks from the darkness: "You filled the emptiness with will alone. The void... respects this." Nullheim\'s dread power joins your conquest.',
    defeatText: 'They stripped your hand bare and banished your best minions to the void. But void magic costs them too — their own board stays small. Aggro them down before they can dismantle you.',
    loreUnlock: 'NULLHEIM CODEX: The Voidborn were once scholars studying the space between galaxies. They stared too long into the abyss, and it stared back — then pulled them in. Nullheim is not their home. It is their prison, and the void itself is the warden.',
    difficulty: AIDifficulty.HARD,
  },
  [Race.CHRONOBOUND]: {
    race: Race.CHRONOBOUND,
    planet: 'Temporia',
    title: 'The Time-Shattered World',
    color: '#00cccc',
    icon: '⏳',
    introBriefing: 'Temporia exists in all moments simultaneously — past, present, and future collapsed into one fractured world. The Chronobound replay their best moves, echo their strongest minions, and in the worst case, take extra turns. This is the ultimate test.',
    enemyTaunt: '"We have fought this battle before. And before that. And before that. In every timeline, Temporia endures. But please — surprise us."',
    victoryText: 'Time snaps back into place. Timeshaper Chronus laughs — "Finally! A fixed point! Someone who cannot be erased!" Temporia\'s time-bending power now serves your campaign. The galaxy trembles.',
    defeatText: 'They echoed their best minions, replayed devastating turns, and seemed to have infinite resources. But ECHO copies vanish at end of turn — weathering the storm matters more than matching their output.',
    loreUnlock: 'TEMPORIA CODEX: The Chronobound broke time on purpose. They discovered that the STARFORGE exists outside time, and the only way to reach it was to shatter the temporal barrier around their world. They succeeded. They also doomed their planet to exist in all moments at once.',
    difficulty: AIDifficulty.HARD,
  },
  [Race.NEUTRAL]: {
    race: Race.NEUTRAL,
    planet: 'Various',
    title: 'The Neutral Grounds',
    color: '#888888',
    icon: '⚔️',
    introBriefing: '',
    enemyTaunt: '',
    victoryText: '',
    defeatText: '',
    loreUnlock: '',
    difficulty: AIDifficulty.MEDIUM,
  },
};

/**
 * Get the campaign encounters for a given home planet.
 * Returns encounters in order, excluding the player's home race.
 */
export function getCampaignEncounters(homeRace: Race): PlanetEncounter[] {
  return CAMPAIGN_ORDER
    .filter(race => race !== homeRace)
    .map(race => PLANET_ENCOUNTERS[race]);
}

/**
 * Starter planet descriptions shown during initial selection
 */
export const STARTER_DESCRIPTIONS: Record<Race, { pitch: string; strength: string; fantasy: string }> = {
  [Race.PYROCLAST]: {
    pitch: 'Burn everything. Ask questions never.',
    strength: 'Fast, aggressive, explosive — games end quickly and every turn feels impactful.',
    fantasy: 'You are Flamecaller Ashyr, commanding an army of fire warriors who deal damage just by existing. Play fast, hit hard, win before they stabilize.',
  },
  [Race.LUMINAR]: {
    pitch: 'Endure. Outlast. Overcome.',
    strength: 'Forgiving and resilient — healing lets you recover from mistakes while building a winning board.',
    fantasy: 'You are Archon Solarius, wielding the power of a living sun. Your minions heal, your barriers protect, and your patience is your greatest weapon.',
  },
  [Race.COGSMITHS]: { pitch: '', strength: '', fantasy: '' },
  [Race.VOIDBORN]: { pitch: '', strength: '', fantasy: '' },
  [Race.BIOTITANS]: { pitch: '', strength: '', fantasy: '' },
  [Race.CRYSTALLINE]: { pitch: '', strength: '', fantasy: '' },
  [Race.PHANTOM_CORSAIRS]: { pitch: '', strength: '', fantasy: '' },
  [Race.HIVEMIND]: { pitch: '', strength: '', fantasy: '' },
  [Race.ASTROMANCERS]: { pitch: '', strength: '', fantasy: '' },
  [Race.CHRONOBOUND]: { pitch: '', strength: '', fantasy: '' },
  [Race.NEUTRAL]: { pitch: '', strength: '', fantasy: '' },
};
