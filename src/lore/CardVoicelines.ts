/**
 * STARFORGE TCG - Card Voicelines System (8.4.2)
 *
 * Voiceline data and playback system:
 * - All Legendary cards have play/attack/death voicelines
 * - Heroes have expanded emotes
 * - Interaction voicelines for rival/ally pairs
 * - STARFORGE transformation voicelines
 * - Audio processing descriptors for faction-specific effects
 */

import { Race } from '../types/Race';

/**
 * Voice event triggers
 */
export enum VoiceEvent {
  PLAY = 'PLAY',
  ATTACK = 'ATTACK',
  DEATH = 'DEATH',
  STARFORGE = 'STARFORGE',
}

/**
 * Hero emote types
 */
export enum HeroEmote {
  GREETINGS = 'GREETINGS',
  WELL_PLAYED = 'WELL_PLAYED',
  THANKS = 'THANKS',
  SORRY = 'SORRY',
  THREATEN = 'THREATEN',
  WOW = 'WOW',
  OOPS = 'OOPS',
}

/**
 * Audio processing effect for faction flavor
 */
export type AudioEffect = 'reverb' | 'echo' | 'distortion' | 'pitch_low' | 'pitch_high' | 'alien' | 'ethereal' | 'mechanical' | 'swarm';

/**
 * A single voiceline
 */
export interface Voiceline {
  text: string;
  audioEffect?: AudioEffect;
}

/**
 * Card voiceline set
 */
export interface CardVoicelines {
  cardId: string;
  cardName: string;
  race: Race;
  play: Voiceline[];
  attack: Voiceline[];
  death: Voiceline[];
  starforge?: Voiceline[];
}

/**
 * Hero voiceline set
 */
export interface HeroVoicelines {
  race: Race;
  heroName: string;
  emotes: Record<HeroEmote, Voiceline[]>;
  gameStart: Voiceline[];
  lowHealth: Voiceline[];
  victory: Voiceline[];
  defeat: Voiceline[];
}

/**
 * Interaction trigger
 */
export interface VoiceInteraction {
  triggerCardId: string;
  responseCardId: string;
  line: Voiceline;
}

// ─── Faction Audio Effects ──────────────────────────────────────────────────

export const FACTION_AUDIO_EFFECTS: Record<Race, AudioEffect> = {
  [Race.COGSMITHS]: 'mechanical',
  [Race.LUMINAR]: 'ethereal',
  [Race.PYROCLAST]: 'distortion',
  [Race.VOIDBORN]: 'echo',
  [Race.BIOTITANS]: 'pitch_low',
  [Race.CRYSTALLINE]: 'reverb',
  [Race.PHANTOM_CORSAIRS]: 'echo',
  [Race.HIVEMIND]: 'swarm',
  [Race.ASTROMANCERS]: 'ethereal',
  [Race.CHRONOBOUND]: 'alien',
  [Race.NEUTRAL]: 'reverb',
};

// ─── Legendary Card Voicelines ──────────────────────────────────────────────

export const LEGENDARY_VOICELINES: CardVoicelines[] = [
  // COGSMITHS
  {
    cardId: 'cog_legendary_1',
    cardName: 'Grand Mechanist Zara',
    race: Race.COGSMITHS,
    play: [
      { text: 'Every gear has its purpose. Even you.', audioEffect: 'mechanical' },
      { text: 'The machine awakens!', audioEffect: 'mechanical' },
      { text: 'Witness the pinnacle of engineering!', audioEffect: 'mechanical' },
    ],
    attack: [
      { text: 'Recalibrate and FIRE!', audioEffect: 'mechanical' },
      { text: 'Target acquired.', audioEffect: 'mechanical' },
    ],
    death: [
      { text: 'But... the calculations were perfect...', audioEffect: 'mechanical' },
      { text: 'Systems... failing...', audioEffect: 'mechanical' },
    ],
    starforge: [
      { text: 'BEHOLD! The Omega Engine!', audioEffect: 'mechanical' },
    ],
  },
  // LUMINAR
  {
    cardId: 'lum_legendary_1',
    cardName: 'Archon of Radiance',
    race: Race.LUMINAR,
    play: [
      { text: 'The light shall judge all.', audioEffect: 'ethereal' },
      { text: 'Solhaven answers your prayer!', audioEffect: 'ethereal' },
      { text: 'I am the dawn made manifest.', audioEffect: 'ethereal' },
    ],
    attack: [
      { text: 'Burn in holy fire!', audioEffect: 'ethereal' },
      { text: 'Light consumes!', audioEffect: 'ethereal' },
    ],
    death: [
      { text: 'The light... never fades...', audioEffect: 'ethereal' },
      { text: 'I return to the sun...', audioEffect: 'ethereal' },
    ],
    starforge: [
      { text: 'A STAR IS BORN WITHIN ME!', audioEffect: 'ethereal' },
    ],
  },
  // PYROCLAST
  {
    cardId: 'pyr_legendary_1',
    cardName: 'Inferno Lord Kaelos',
    race: Race.PYROCLAST,
    play: [
      { text: 'BURN! BURN IT ALL!', audioEffect: 'distortion' },
      { text: 'Ignaros hungers for ash!', audioEffect: 'distortion' },
      { text: 'The flame remembers every slight.', audioEffect: 'distortion' },
    ],
    attack: [
      { text: 'INCINERATE!', audioEffect: 'distortion' },
      { text: 'Nothing remains but cinder!', audioEffect: 'distortion' },
    ],
    death: [
      { text: 'Even in death... I burn...', audioEffect: 'distortion' },
      { text: 'My flame... is... eternal...', audioEffect: 'distortion' },
    ],
    starforge: [
      { text: 'I AM THE SUPERNOVA!', audioEffect: 'distortion' },
    ],
  },
  // VOIDBORN
  {
    cardId: 'void_legendary_1',
    cardName: 'The Hollow King',
    race: Race.VOIDBORN,
    play: [
      { text: 'I am the silence between stars.', audioEffect: 'echo' },
      { text: 'Your thoughts are... delicious.', audioEffect: 'echo' },
      { text: 'Nullheim consumes all meaning.', audioEffect: 'echo' },
    ],
    attack: [
      { text: 'Into the void with you.', audioEffect: 'echo' },
      { text: 'Nothing escapes the dark.', audioEffect: 'echo' },
    ],
    death: [
      { text: 'The void... is patient...', audioEffect: 'echo' },
      { text: 'I was never truly here...', audioEffect: 'echo' },
    ],
    starforge: [
      { text: 'I AM THE VOID INCARNATE!', audioEffect: 'echo' },
    ],
  },
  // BIOTITANS
  {
    cardId: 'bio_legendary_1',
    cardName: 'Primeval Colossus',
    race: Race.BIOTITANS,
    play: [
      { text: 'Nature bows to no one!', audioEffect: 'pitch_low' },
      { text: 'TREMBLE before evolution!', audioEffect: 'pitch_low' },
      { text: 'I am ten thousand years of growth.', audioEffect: 'pitch_low' },
    ],
    attack: [
      { text: 'CRUSH!', audioEffect: 'pitch_low' },
      { text: 'The earth shakes!', audioEffect: 'pitch_low' },
    ],
    death: [
      { text: 'From my body... new life grows...', audioEffect: 'pitch_low' },
      { text: 'The cycle... continues...', audioEffect: 'pitch_low' },
    ],
    starforge: [
      { text: 'EVOLUTION REACHES ITS APEX!', audioEffect: 'pitch_low' },
    ],
  },
  // CRYSTALLINE
  {
    cardId: 'crys_legendary_1',
    cardName: 'Prism Archmage',
    race: Race.CRYSTALLINE,
    play: [
      { text: 'Reality bends to my will.', audioEffect: 'reverb' },
      { text: 'Every crystal is a universe.', audioEffect: 'reverb' },
      { text: 'The lattice of magic obeys!', audioEffect: 'reverb' },
    ],
    attack: [
      { text: 'Shatter!', audioEffect: 'reverb' },
      { text: 'Feel the resonance!', audioEffect: 'reverb' },
    ],
    death: [
      { text: 'The crystal... fractures...', audioEffect: 'reverb' },
      { text: 'My magic... disperses...', audioEffect: 'reverb' },
    ],
    starforge: [
      { text: 'INFINITE REFRACTION!', audioEffect: 'reverb' },
    ],
  },
  // PHANTOM CORSAIRS
  {
    cardId: 'phan_legendary_1',
    cardName: 'Captain Vex Nightstorm',
    race: Race.PHANTOM_CORSAIRS,
    play: [
      { text: 'Your treasure is mine, friend.', audioEffect: 'echo' },
      { text: 'The Netherstorm delivers!', audioEffect: 'echo' },
      { text: 'Did you miss me? Because I didn\'t miss you.', audioEffect: 'echo' },
    ],
    attack: [
      { text: 'Plunder and pillage!', audioEffect: 'echo' },
      { text: 'A ghost never misses!', audioEffect: 'echo' },
    ],
    death: [
      { text: 'You\'ll never find... the loot...', audioEffect: 'echo' },
      { text: 'I\'ll haunt your nightmares...', audioEffect: 'echo' },
    ],
    starforge: [
      { text: 'BEHOLD THE PHANTOM FLEET!', audioEffect: 'echo' },
    ],
  },
  // HIVEMIND
  {
    cardId: 'hive_legendary_1',
    cardName: 'Overmind Zyx',
    race: Race.HIVEMIND,
    play: [
      { text: 'We are one. We are many. We are ALL.', audioEffect: 'swarm' },
      { text: 'The swarm cannot be stopped.', audioEffect: 'swarm' },
      { text: 'Every mind belongs to the Hive.', audioEffect: 'swarm' },
    ],
    attack: [
      { text: 'CONSUME!', audioEffect: 'swarm' },
      { text: 'The swarm feeds!', audioEffect: 'swarm' },
    ],
    death: [
      { text: 'One falls... millions remain...', audioEffect: 'swarm' },
      { text: 'The hive... remembers...', audioEffect: 'swarm' },
    ],
    starforge: [
      { text: 'ALL SHALL JOIN THE HIVEMIND!', audioEffect: 'swarm' },
    ],
  },
  // ASTROMANCERS
  {
    cardId: 'astro_legendary_1',
    cardName: 'Star Weaver Lunara',
    race: Race.ASTROMANCERS,
    play: [
      { text: 'I have seen the end of all things.', audioEffect: 'ethereal' },
      { text: 'The stars align in my favor.', audioEffect: 'ethereal' },
      { text: 'Celestara calls!', audioEffect: 'ethereal' },
    ],
    attack: [
      { text: 'A constellation of pain!', audioEffect: 'ethereal' },
      { text: 'By starlight!', audioEffect: 'ethereal' },
    ],
    death: [
      { text: 'My star... goes dark...', audioEffect: 'ethereal' },
      { text: 'I foresaw this... and came anyway...', audioEffect: 'ethereal' },
    ],
    starforge: [
      { text: 'I WEAVE A NEW CONSTELLATION!', audioEffect: 'ethereal' },
    ],
  },
  // CHRONOBOUND
  {
    cardId: 'chrono_legendary_1',
    cardName: 'Temporal Archon Epoch',
    race: Race.CHRONOBOUND,
    play: [
      { text: 'Time is not a river. It is a weapon.', audioEffect: 'alien' },
      { text: 'I\'ve already seen how this ends.', audioEffect: 'alien' },
      { text: 'Temporia echoes through eternity!', audioEffect: 'alien' },
    ],
    attack: [
      { text: 'Your future ends HERE!', audioEffect: 'alien' },
      { text: 'Time strikes!', audioEffect: 'alien' },
    ],
    death: [
      { text: 'This timeline... ends...', audioEffect: 'alien' },
      { text: 'I will return... in another age...', audioEffect: 'alien' },
    ],
    starforge: [
      { text: 'TIME ITSELF BOWS TO ME!', audioEffect: 'alien' },
    ],
  },
];

// ─── Hero Voicelines ────────────────────────────────────────────────────────

export const HERO_VOICELINES: HeroVoicelines[] = [
  {
    race: Race.COGSMITHS,
    heroName: 'Engineer Prime',
    emotes: {
      [HeroEmote.GREETINGS]: [{ text: 'Systems online. Ready to engage.' }],
      [HeroEmote.WELL_PLAYED]: [{ text: 'Optimal performance detected.' }],
      [HeroEmote.THANKS]: [{ text: 'Your contribution is... noted.' }],
      [HeroEmote.SORRY]: [{ text: 'Recalculating strategy.' }],
      [HeroEmote.THREATEN]: [{ text: 'Your defeat is already calculated.' }],
      [HeroEmote.WOW]: [{ text: 'Fascinating engineering!' }],
      [HeroEmote.OOPS]: [{ text: 'Minor malfunction.' }],
    },
    gameStart: [{ text: 'Initiating combat protocol.' }],
    lowHealth: [{ text: 'Systems critical! Rerouting power!' }],
    victory: [{ text: 'Victory: optimal outcome achieved.' }],
    defeat: [{ text: 'Total systems failure...' }],
  },
  {
    race: Race.LUMINAR,
    heroName: 'High Priestess Sol',
    emotes: {
      [HeroEmote.GREETINGS]: [{ text: 'The light of Solhaven shines upon you.' }],
      [HeroEmote.WELL_PLAYED]: [{ text: 'A worthy display of faith.' }],
      [HeroEmote.THANKS]: [{ text: 'Blessings upon you.' }],
      [HeroEmote.SORRY]: [{ text: 'The light forgives my error.' }],
      [HeroEmote.THREATEN]: [{ text: 'The sun burns ALL who oppose it.' }],
      [HeroEmote.WOW]: [{ text: 'By the radiant sun!' }],
      [HeroEmote.OOPS]: [{ text: 'Even the sun casts shadows.' }],
    },
    gameStart: [{ text: 'Let the light guide our battle.' }],
    lowHealth: [{ text: 'The light... will sustain me!' }],
    victory: [{ text: 'Solhaven\'s glory endures!' }],
    defeat: [{ text: 'The light fades... but never dies...' }],
  },
  {
    race: Race.PYROCLAST,
    heroName: 'Firelord Kazen',
    emotes: {
      [HeroEmote.GREETINGS]: [{ text: 'Feel the heat? That\'s just my opening.' }],
      [HeroEmote.WELL_PLAYED]: [{ text: 'Not bad... for kindling.' }],
      [HeroEmote.THANKS]: [{ text: 'Your fuel is appreciated.' }],
      [HeroEmote.SORRY]: [{ text: 'Oops. Didn\'t mean to leave that much ash.' }],
      [HeroEmote.THREATEN]: [{ text: 'BURN. BURN. BURN.' }],
      [HeroEmote.WOW]: [{ text: 'Now THAT\'S a blaze!' }],
      [HeroEmote.OOPS]: [{ text: 'Heh, wrong target.' }],
    },
    gameStart: [{ text: 'Let the INFERNO begin!' }],
    lowHealth: [{ text: 'You only made the fire ANGRIER!' }],
    victory: [{ text: 'NOTHING BUT ASH REMAINS!' }],
    defeat: [{ text: 'The flame... sputters out...' }],
  },
  {
    race: Race.VOIDBORN,
    heroName: 'Void Herald Nyx',
    emotes: {
      [HeroEmote.GREETINGS]: [{ text: '...you are not afraid? You should be.' }],
      [HeroEmote.WELL_PLAYED]: [{ text: 'Interesting. The void takes note.' }],
      [HeroEmote.THANKS]: [{ text: 'Your offering is... consumed.' }],
      [HeroEmote.SORRY]: [{ text: 'The void cares not for apologies.' }],
      [HeroEmote.THREATEN]: [{ text: 'I will unmake everything you are.' }],
      [HeroEmote.WOW]: [{ text: 'Even the void is surprised.' }],
      [HeroEmote.OOPS]: [{ text: 'A ripple in the nothingness.' }],
    },
    gameStart: [{ text: 'Stare into the abyss. It stares back.' }],
    lowHealth: [{ text: 'The void feeds on my pain!' }],
    victory: [{ text: 'Nullheim claims another soul.' }],
    defeat: [{ text: 'The void... is patient...' }],
  },
  {
    race: Race.BIOTITANS,
    heroName: 'Warden Thorne',
    emotes: {
      [HeroEmote.GREETINGS]: [{ text: 'Nature stands ready.' }],
      [HeroEmote.WELL_PLAYED]: [{ text: 'You grow strong, like ancient oak.' }],
      [HeroEmote.THANKS]: [{ text: 'The forest remembers this kindness.' }],
      [HeroEmote.SORRY]: [{ text: 'Even nature makes... adjustments.' }],
      [HeroEmote.THREATEN]: [{ text: 'The wild will devour you WHOLE.' }],
      [HeroEmote.WOW]: [{ text: 'What magnificent evolution!' }],
      [HeroEmote.OOPS]: [{ text: 'A thorn in my own side.' }],
    },
    gameStart: [{ text: 'Let the strong survive.' }],
    lowHealth: [{ text: 'Life... finds a way!' }],
    victory: [{ text: 'Primeva reigns supreme!' }],
    defeat: [{ text: 'Even titans... fall...' }],
  },
  {
    race: Race.CRYSTALLINE,
    heroName: 'Crystal Sage Lyra',
    emotes: {
      [HeroEmote.GREETINGS]: [{ text: 'The crystals hum with anticipation.' }],
      [HeroEmote.WELL_PLAYED]: [{ text: 'Elegant spellwork.' }],
      [HeroEmote.THANKS]: [{ text: 'My gratitude resonates.' }],
      [HeroEmote.SORRY]: [{ text: 'A flaw in the lattice.' }],
      [HeroEmote.THREATEN]: [{ text: 'I will SHATTER your reality.' }],
      [HeroEmote.WOW]: [{ text: 'Such arcane brilliance!' }],
      [HeroEmote.OOPS]: [{ text: 'The spell... misfired.' }],
    },
    gameStart: [{ text: 'Let the crystals sing.' }],
    lowHealth: [{ text: 'The prism fractures... but holds!' }],
    victory: [{ text: 'Prismora\'s light refracts eternal!' }],
    defeat: [{ text: 'The crystal... goes dark...' }],
  },
  {
    race: Race.PHANTOM_CORSAIRS,
    heroName: 'Admiral Shade',
    emotes: {
      [HeroEmote.GREETINGS]: [{ text: 'Ahoy! Your loot looks heavy. Let me help.' }],
      [HeroEmote.WELL_PLAYED]: [{ text: 'Arrr, that was a good one!' }],
      [HeroEmote.THANKS]: [{ text: 'Much obliged, matey.' }],
      [HeroEmote.SORRY]: [{ text: 'Sorry \'bout your stuff. It\'s mine now.' }],
      [HeroEmote.THREATEN]: [{ text: 'The ghost fleet comes for you!' }],
      [HeroEmote.WOW]: [{ text: 'Blow me down!' }],
      [HeroEmote.OOPS]: [{ text: 'Heh, wrong pocket.' }],
    },
    gameStart: [{ text: 'Set sail for PLUNDER!' }],
    lowHealth: [{ text: 'You can\'t kill what\'s already DEAD!' }],
    victory: [{ text: 'Another haul for the Phantom Fleet!' }],
    defeat: [{ text: 'Back to Davy Jones...' }],
  },
  {
    race: Race.HIVEMIND,
    heroName: 'Brood Mother Ix',
    emotes: {
      [HeroEmote.GREETINGS]: [{ text: 'We... welcome you... to the swarm.' }],
      [HeroEmote.WELL_PLAYED]: [{ text: 'The hive acknowledges your strength.' }],
      [HeroEmote.THANKS]: [{ text: 'Your tribute sustains the brood.' }],
      [HeroEmote.SORRY]: [{ text: 'A minor error in the collective.' }],
      [HeroEmote.THREATEN]: [{ text: 'You will be ASSIMILATED.' }],
      [HeroEmote.WOW]: [{ text: 'The swarm is... impressed.' }],
      [HeroEmote.OOPS]: [{ text: 'A drone misfired.' }],
    },
    gameStart: [{ text: 'The swarm descends.' }],
    lowHealth: [{ text: 'Cut one down, ten more rise!' }],
    victory: [{ text: 'ALL BELONG TO THE HIVE.' }],
    defeat: [{ text: 'The queen... falls...' }],
  },
  {
    race: Race.ASTROMANCERS,
    heroName: 'Stargazer Celene',
    emotes: {
      [HeroEmote.GREETINGS]: [{ text: 'The stars foretold our meeting.' }],
      [HeroEmote.WELL_PLAYED]: [{ text: 'Written in the stars.' }],
      [HeroEmote.THANKS]: [{ text: 'The cosmos smile upon you.' }],
      [HeroEmote.SORRY]: [{ text: 'Even I misread the stars sometimes.' }],
      [HeroEmote.THREATEN]: [{ text: 'Your fate is sealed in starlight.' }],
      [HeroEmote.WOW]: [{ text: 'By all the constellations!' }],
      [HeroEmote.OOPS]: [{ text: 'A stellar miscalculation.' }],
    },
    gameStart: [{ text: 'The celestial dance begins.' }],
    lowHealth: [{ text: 'The stars... rally to my cause!' }],
    victory: [{ text: 'The stars have spoken!' }],
    defeat: [{ text: 'My constellation... fades...' }],
  },
  {
    race: Race.CHRONOBOUND,
    heroName: 'Timekeeper Aeon',
    emotes: {
      [HeroEmote.GREETINGS]: [{ text: 'We\'ve met before. You just don\'t remember.' }],
      [HeroEmote.WELL_PLAYED]: [{ text: 'A move I didn\'t foresee. Impressive.' }],
      [HeroEmote.THANKS]: [{ text: 'Your generosity echoes through time.' }],
      [HeroEmote.SORRY]: [{ text: 'I\'ll undo that in the next timeline.' }],
      [HeroEmote.THREATEN]: [{ text: 'I\'ve already WON in six timelines.' }],
      [HeroEmote.WOW]: [{ text: 'A temporal anomaly!' }],
      [HeroEmote.OOPS]: [{ text: 'Wrong timeline.' }],
    },
    gameStart: [{ text: 'Time bends to the Chronobound.' }],
    lowHealth: [{ text: 'I\'ll just... rewind that!' }],
    victory: [{ text: 'Inevitable across all timelines.' }],
    defeat: [{ text: 'This timeline... was not meant to be...' }],
  },
];

// ─── Interaction Voicelines ─────────────────────────────────────────────────

export const VOICE_INTERACTIONS: VoiceInteraction[] = [
  // Rivals
  { triggerCardId: 'pyr_legendary_1', responseCardId: 'lum_legendary_1', line: { text: 'Kaelos! Your flames will be EXTINGUISHED!' } },
  { triggerCardId: 'lum_legendary_1', responseCardId: 'pyr_legendary_1', line: { text: 'Archon! I\'ll melt your precious light!' } },
  { triggerCardId: 'void_legendary_1', responseCardId: 'astro_legendary_1', line: { text: 'Lunara! The void swallows even STARS!' } },
  { triggerCardId: 'astro_legendary_1', responseCardId: 'void_legendary_1', line: { text: 'Hollow King! The stars defy the darkness!' } },
  { triggerCardId: 'bio_legendary_1', responseCardId: 'cog_legendary_1', line: { text: 'Nature crushes your pathetic machines!' } },
  { triggerCardId: 'cog_legendary_1', responseCardId: 'bio_legendary_1', line: { text: 'Organic obsolescence detected.' } },
  // Allies
  { triggerCardId: 'hive_legendary_1', responseCardId: 'bio_legendary_1', line: { text: 'The swarm and the wild... united!' } },
  { triggerCardId: 'phan_legendary_1', responseCardId: 'void_legendary_1', line: { text: 'Shall we raid the void together, shadow king?' } },
  { triggerCardId: 'chrono_legendary_1', responseCardId: 'astro_legendary_1', line: { text: 'Time and stars... an unstoppable force.' } },
];

// ─── STARFORGE Transformation Lines ─────────────────────────────────────────

export const STARFORGE_LINES: Voiceline[] = [
  { text: 'I am REBORN!' },
  { text: 'Witness my TRUE FORM!' },
  { text: 'The star within me IGNITES!' },
  { text: 'POWER BEYOND MORTAL LIMITS!' },
  { text: 'I have been FORGED IN STARFIRE!' },
];

// ─── Utility Functions ──────────────────────────────────────────────────────

/**
 * Get a random voiceline for a card event
 */
export function getCardVoiceline(cardId: string, event: VoiceEvent): Voiceline | null {
  const card = LEGENDARY_VOICELINES.find(v => v.cardId === cardId);
  if (!card) return null;

  let lines: Voiceline[];
  switch (event) {
    case VoiceEvent.PLAY: lines = card.play; break;
    case VoiceEvent.ATTACK: lines = card.attack; break;
    case VoiceEvent.DEATH: lines = card.death; break;
    case VoiceEvent.STARFORGE: lines = card.starforge || STARFORGE_LINES; break;
  }

  return lines[Math.floor(Math.random() * lines.length)] || null;
}

/**
 * Get hero emote voiceline
 */
export function getHeroEmote(race: Race, emote: HeroEmote): Voiceline | null {
  const hero = HERO_VOICELINES.find(h => h.race === race);
  if (!hero) return null;

  const lines = hero.emotes[emote];
  return lines[Math.floor(Math.random() * lines.length)] || null;
}

/**
 * Get hero event voiceline (start, low health, victory, defeat)
 */
export function getHeroEventLine(race: Race, event: 'gameStart' | 'lowHealth' | 'victory' | 'defeat'): Voiceline | null {
  const hero = HERO_VOICELINES.find(h => h.race === race);
  if (!hero) return null;

  const lines = hero[event];
  return lines[Math.floor(Math.random() * lines.length)] || null;
}

/**
 * Check if there's an interaction line between two cards
 */
export function getInteractionLine(playedCardId: string, boardCardId: string): Voiceline | null {
  const interaction = VOICE_INTERACTIONS.find(
    i => i.triggerCardId === playedCardId && i.responseCardId === boardCardId
  );
  return interaction?.line || null;
}

/**
 * Get a random STARFORGE transformation line
 */
export function getStarforgeLine(): Voiceline {
  return STARFORGE_LINES[Math.floor(Math.random() * STARFORGE_LINES.length)];
}
