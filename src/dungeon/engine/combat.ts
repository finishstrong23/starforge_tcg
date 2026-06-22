import type { CardInstance, CombatPhase, CombatState, EffectDefinition, EnemyDefinition, RelicDefinition, Rift, StatusEffect, StatusEffectType } from '../types';
import { getCardStats, getCardText, getCardCost, setActiveCardText, setActiveCardCost } from './cardStats';
import { applyStructuredCardEffects, hasStructuredEffects } from './structuredEffects';
import { MVP_FACTION } from '../config/mvp';
import { addHeat } from './heat';

// ─── Helpers ────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

const NUMBER_WORD: Record<string, number> = {
  one: 1,
  two: 2,
  twice: 2,
  three: 3,
  thrice: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
};

function parseCount(raw: string | undefined): number | null {
  if (!raw) return null;
  return NUMBER_WORD[raw] ?? (Number.isFinite(Number(raw)) ? parseInt(raw, 10) : null);
}

function parseRepeatedEnemyAttack(description: string, fallbackDamage: number): { damage: number; hits: number } {
  const text = description.toLowerCase();
  const match = text.match(
    /deal\s+(\d+)(?:\s+damage)?\s+(?:(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+times?|(twice|thrice))/,
  );
  if (!match) return { damage: fallbackDamage, hits: 1 };

  const hits = parseCount(match[2] ?? match[3]) ?? 1;
  return {
    damage: fallbackDamage,
    hits: Math.max(1, hits),
  };
}

// ─── Flux helpers ───────────────────────────────────────────────────────────

const FLUX_STATES: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];

export function isFluxCard(card: CardInstance): boolean {
  return /^\s*flux\./i.test(card.cardText);
}

// ─── Block / Dexterity helper ────────────────────────────────────────────────

/**
 * Player gains block. Auto-adds the player's Dexterity stack count to every
 * block grant (STS-style). All player-source block routes through this so
 * Dexterity scales them uniformly.
 */
export function gainBlock(state: CombatState, amount: number): CombatState {
  if (amount <= 0) return state;
  const dex = getStack(state.playerStatusEffects, 'dexterity');
  return { ...state, playerShield: state.playerShield + amount + dex };
}

/**
 * Luminar Channel card: has the ILLUMINATE keyword AND its text starts with
 * (or contains the word) "Channel.". Lumen generators target these cards in hand.
 */
export function isChannelCard(card: CardInstance): boolean {
  return card.keywords.includes('ILLUMINATE') && /(^|\s)channel\./i.test(card.cardText);
}

// ─── Power-card segment parsing ──────────────────────────────────────────────
// Power cards persist on the player side and emit effects on different
// triggers. A card text like "At combat start, gain 1 Energy. Take 2 damage
// at end of each turn." has TWO segments:
//   - "gain 1 Energy" (trigger: play)
//   - "take 2 damage" (trigger: turn-end)
// We split on ". " and look for trigger keywords inside each sentence.

type PowerTrigger = 'play' | 'turn-start' | 'turn-end';

function classifyPowerSegment(sentence: string): PowerTrigger {
  const s = sentence.toLowerCase();
  if (/at end of (?:each |every |the )?turn|at turn end|end of turn/.test(s)) return 'turn-end';
  if (/at (?:start of (?:each |every |the )?turn|turn start)|at start of each turn|at the start of/.test(s)) return 'turn-start';
  return 'play';
}

function powerSegmentsForTrigger(card: CardInstance, trigger: PowerTrigger): string[] {
  const text = getCardText(card);
  return text
    .split(/\.\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => classifyPowerSegment(s) === trigger);
}

function randomFluxState(): 'A' | 'B' | 'C' {
  return FLUX_STATES[Math.floor(Math.random() * 3)];
}

function shiftFlux(s: 'A' | 'B' | 'C'): 'A' | 'B' | 'C' {
  return s === 'A' ? 'B' : s === 'B' ? 'C' : 'A';
}

/**
 * Pull just the active state's body out of "Flux. A: ... B: ... C: ..." text.
 *
 * Splits on uppercase variant labels (A:/B:/C:) - anything between two
 * labels is the prior label's body. Phase 4 fix: previous regex used
 * `[^A-C]*?` with case-insensitive flag, which silently excluded
 * lowercase a/b/c too - so any variant body starting with words like
 * "Deal" / "Apply" / "Gain" got cut after the first non-vowel character
 * and the function fell back to returning the WHOLE text. The fall-back
 * caused the regex parser to read the FIRST variant's numbers instead
 * of the active variant's. Discovered by Phase 4 cross-cut tests.
 */
export function activeFluxText(card: CardInstance): string {
  if (!isFluxCard(card) || !card.fluxState) return getCardText(card);
  const text = getCardText(card);
  const parts = text.split(/\b([A-C]):\s*/);
  // parts[0] = "Flux. " preamble; then alternating [label, body, label, body, ...]
  for (let i = 1; i < parts.length; i += 2) {
    if (parts[i] === card.fluxState) {
      return (parts[i + 1] ?? '').trim();
    }
  }
  return text;
}

function ensureFluxState<T extends CardInstance>(card: T): T {
  if (!isFluxCard(card)) return card;
  if (card.fluxState) return card;
  return { ...card, fluxState: randomFluxState() };
}

function log(state: CombatState, msg: string): CombatState {
  const log = [...state.combatLog, msg].slice(-8);
  return { ...state, combatLog: log, lastAction: msg };
}

function applyForgemasterSigilToText(text: string): string {
  return text
    .replace(
      /deal (\d+) to (\d+)( damage)/gi,
      (_, lo, hi, rest) => `Deal ${parseInt(lo) + 2} to ${parseInt(hi) + 2}${rest}`,
    )
    .replace(
      /deal (\d+)( damage)/gi,
      (_, n, rest) => `Deal ${parseInt(n) + 2}${rest}`,
    )
    .replace(
      /gain (\d+)( block)/gi,
      (_, n, rest) => `Gain ${parseInt(n) + 2}${rest}`,
    );
}

function applyForgemasterSigilToEffects(effects: EffectDefinition[] | undefined): EffectDefinition[] | undefined {
  if (!effects) return undefined;

  return effects.map((effect): EffectDefinition => {
    switch (effect.type) {
      case 'damage':
      case 'block':
        return { ...effect, amount: effect.amount + 2 };
      case 'choice':
        return {
          ...effect,
          options: effect.options.map((option) => ({
            ...option,
            effects: applyForgemasterSigilToEffects(option.effects) ?? option.effects,
          })),
        };
      case 'conditional':
        return {
          ...effect,
          effects: applyForgemasterSigilToEffects(effect.effects) ?? effect.effects,
        };
      case 'trigger':
        return {
          ...effect,
          effects: applyForgemasterSigilToEffects(effect.effects) ?? effect.effects,
        };
      default:
        return effect;
    }
  });
}

function applyForgemasterSigilToCard(card: CardInstance): CardInstance {
  const patched = setActiveCardText(card, applyForgemasterSigilToText(getCardText(card)));
  return {
    ...patched,
    effects: applyForgemasterSigilToEffects(patched.effects),
    upgradeEffects: applyForgemasterSigilToEffects(patched.upgradeEffects),
  };
}

// ─── Status effect helpers ───────────────────────────────────────────────────

export function getStack(effects: StatusEffect[], type: StatusEffectType): number {
  return effects.find((e) => e.type === type)?.stacks ?? 0;
}

export function addEffect(effects: StatusEffect[], type: StatusEffectType, stacks: number, duration?: number): StatusEffect[] {
  const existing = effects.find((e) => e.type === type);
  if (existing) {
    return effects.map((e) => e.type === type ? { ...e, stacks: e.stacks + stacks } : e);
  }
  return [...effects, { type, stacks, duration }];
}

function removeEffect(effects: StatusEffect[], type: StatusEffectType): StatusEffect[] {
  return effects.filter((e) => e.type !== type);
}

function tickEffects(effects: StatusEffect[]): StatusEffect[] {
  return effects
    .map((e) => {
      if (e.duration !== undefined) return { ...e, duration: e.duration - 1 };
      return e;
    })
    .filter((e) => e.duration === undefined || e.duration > 0)
    .filter((e) => e.stacks > 0);
}

// ─── Damage calculation ──────────────────────────────────────────────────────

function calcDamage(base: number, attackerEffects: StatusEffect[], defenderEffects: StatusEffect[]): number {
  let dmg = base;
  if (getStack(attackerEffects, 'strength') > 0) dmg += getStack(attackerEffects, 'strength');
  if (getStack(attackerEffects, 'weak') > 0) dmg = Math.floor(dmg * 0.75);
  if (getStack(defenderEffects, 'vulnerable') > 0) dmg = Math.floor(dmg * 1.25);
  return Math.max(0, dmg);
}

// Apply damage to a target. targetId: 'player' | 'enemy' | cardInstanceId
export function applyShieldedDamage(shield: number, health: number, damage: number): { health: number; shield: number } {
  const shieldAbsorb = Math.min(shield, damage);
  const remainder = damage - shieldAbsorb;
  return {
    shield: Math.max(0, shield - shieldAbsorb),
    health: Math.max(0, health - remainder),
  };
}

// ─── initCombat ──────────────────────────────────────────────────────────────

export function initCombat(
  deck: CardInstance[],
  playerHealth: number,
  playerMaxHealth: number,
  _relics: RelicDefinition[],
  enemy: EnemyDefinition,
  faction: string = MVP_FACTION,
  ascensionMods?: { enemyHpMul?: number; enemyDamageMul?: number; bossStrength?: number; drawPerTurn?: number },
): CombatState {
  const shuffled = shuffleDeck([...deck]);
  const hpMul    = ascensionMods?.enemyHpMul ?? 1;
  const dmgMul   = ascensionMods?.enemyDamageMul ?? 1;
  const drawPer  = ascensionMods?.drawPerTurn ?? 5;
  const bossStr  = ascensionMods?.bossStrength ?? 0;
  const enemyMaxHp = Math.round(enemy.maxHealth * hpMul);

  // A6 / A10: scale enemy attack and every per-intent attack/special value.
  const scaledEnemy: EnemyDefinition = {
    ...enemy,
    maxHealth: enemyMaxHp,
    attack: Math.round(enemy.attack * dmgMul),
    intents: enemy.intents.map((it) =>
      (it.type === 'attack' || it.type === 'special') && it.value !== undefined
        ? { ...it, value: Math.round(it.value * dmgMul) }
        : it,
    ),
  };

  // A4 / A10: bosses spawn with Strength.
  const bossStartingEffects: StatusEffect[] = (enemy.isBoss && bossStr > 0)
    ? [{ type: 'strength', stacks: bossStr }]
    : [];

  const state: CombatState = {
    phase: 'draw',
    turn: 1,
    playerHealth,
    playerMaxHealth,
    playerEnergy: 3,
    playerMaxEnergy: 3,
    playerShield: 0,
    playerHeat: 0,
    playerFaction: faction,
    playerStatusEffects: [],
    playerBoard: [],
    hand: [],
    drawPile: shuffled,
    discardPile: [],
    enemy: {
      ...scaledEnemy,
      currentHealth: enemyMaxHp,
      currentShield: 0,
      statusEffects: bossStartingEffects,
      intentIndex: 0,
      minionsInPlay: [],
    },
    enemyBoard: [],
    lastAction: '',
    combatLog: ['Combat begins!'],
    playerRifts: [],
    playerPowers: [],
    exhaustPile: [],
    skipNextEnemyTurn: false,
    pendingTurnStartBlock: 0,
    drawPerTurn: drawPer,
  };
  return drawCards(state, drawPer);
}

function shuffleDeck(cards: CardInstance[]): CardInstance[] {
  const arr = [...cards];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── drawCards ───────────────────────────────────────────────────────────────

export function drawCards(state: CombatState, count: number): CombatState {
  let s = { ...state };
  let drawn = 0;
  while (drawn < count) {
    if (s.drawPile.length === 0) {
      if (s.discardPile.length === 0) break;
      s = { ...s, drawPile: shuffleDeck(s.discardPile), discardPile: [] };
    }
    const [card, ...rest] = s.drawPile;
    s = { ...s, drawPile: rest, hand: [...s.hand, ensureFluxState(card)] };
    drawn++;
  }
  return { ...s, phase: 'player_turn' };
}

// ─── playCard ────────────────────────────────────────────────────────────────

/**
 * Cogsmiths Augment helper. Applies an augment card's effect to a target
 * card in hand. Returns the updated state with the target card buffed and
 * the augment removed from the hand (exhausted). Returns the input state
 * unchanged if either card isn't found.
 */
export function applyAugment(
  state: CombatState,
  augmentInstanceId: string,
  targetInstanceId: string,
): CombatState {
  const augment = state.hand.find((c) => c.instanceId === augmentInstanceId);
  if (!augment || augment.type !== 'Augment') return state;
  const target = state.hand.find((c) => c.instanceId === targetInstanceId);
  if (!target || target.instanceId === augmentInstanceId) return state;
  const augStats = getCardStats(augment);
  if (state.playerEnergy < augStats.cost) return state;

  const augText = augStats.text.toLowerCase();
  // Patch the ACTIVE text via `setActiveCardText` (Phase 4 chokepoint write
  // helper). All text mutations route through this - direct cardText writes
  // would silently no-op on upgraded cards (cf. Phase 3 applyAugment bug).
  // The augments-array mutation is stat-state, not text/cost-state, so it
  // doesn't need the chokepoint.
  let activeText = getCardText(target);
  let buffed: CardInstance = {
    ...target,
    augments: [...(target.augments ?? []), augment.name],
  };

  // +N damage  ->  bump every "Deal X damage" / "Deal X to Y damage"
  const dmgBonus = augText.match(/\+(\d+) damage/);
  if (dmgBonus) {
    const bonus = parseInt(dmgBonus[1]);
    activeText = activeText.replace(
      /deal (\d+)( damage)/gi,
      (_, n, rest) => `Deal ${parseInt(n) + bonus}${rest}`,
    ).replace(
      /deal (\d+) to (\d+)( damage)/gi,
      (_, a, b, rest) => `Deal ${parseInt(a) + bonus} to ${parseInt(b) + bonus}${rest}`,
    );
  }
  // +N Block
  const blockBonus = augText.match(/\+(\d+) block/);
  if (blockBonus) {
    const bonus = parseInt(blockBonus[1]);
    activeText = activeText.replace(
      /gain (\d+)( block)/gi,
      (_, n, rest) => `Gain ${parseInt(n) + bonus}${rest}`,
    );
  }
  // -N cost (Gyro)
  const lessCostMatch = augText.match(/costs? (\d+) less/);
  if (lessCostMatch) {
    const reduction = parseInt(lessCostMatch[1]);
    buffed = setActiveCardCost(buffed, Math.max(0, getCardCost(buffed) - reduction));
  }
  // 0 cost (Exotic Core) - matches "costs 0" anywhere (relaxed in Phase 3
  // to support "card costs 0 and deals +N damage" rewrite).
  if (/costs? 0\b/.test(augText)) {
    buffed = setActiveCardCost(buffed, 0);
  }
  // Apply Weak (Jolt) - captures stack count from "+N Weak". Falls back to
  // 1 if a legacy "applies weak" form is encountered.
  const weakBonus = augText.match(/\+(\d+)\s*weak/) ?? augText.match(/applies\s*\+?(\d+)?\s*weak/);
  if (weakBonus && !/weak/i.test(activeText)) {
    const stacks = weakBonus[1] ? parseInt(weakBonus[1]) : 1;
    activeText = activeText.trim() + ` Apply Weak ${stacks}.`;
  }
  // Draw cards (Core) - captures count from "+N draw" / "draws N cards" / "draws a card".
  const drawBonus =
    augText.match(/draws?\s*\+(\d+)/)
    ?? augText.match(/draws?\s+(\d+)\s*cards?/)
    ?? (augText.match(/draws?\s+a\s+card/) ? ['', '1'] as RegExpMatchArray : null);
  if (drawBonus && !/draw/i.test(activeText)) {
    const count = parseInt(drawBonus[1]);
    activeText = activeText.trim() + ` Draw ${count}.`;
  }
  // Inverter (AoE) - fallback: bump damage by +5
  if (/all enemies|all allies/.test(augText) && !dmgBonus && !blockBonus) {
    activeText = activeText.replace(
      /deal (\d+)( damage)/gi,
      (_, n, rest) => `Deal ${parseInt(n) + 5}${rest}`,
    );
  }

  // Single chokepoint write at the end - both cardText and upgradeText (if
  // upgraded) get the patched value. Future readers via getCardText see
  // the patched text regardless of upgrade state.
  buffed = setActiveCardText(buffed, activeText);

  // Spend energy, replace target in hand, exhaust augment.
  return {
    ...state,
    playerEnergy: state.playerEnergy - augStats.cost,
    hand: state.hand
      .filter((c) => c.instanceId !== augmentInstanceId)
      .map((c) => (c.instanceId === targetInstanceId ? buffed : c)),
    combatLog: [...state.combatLog, `${augment.name} attached to ${target.name}`].slice(-8),
    lastAction: `${augment.name} -> ${target.name}`,
  };
}

/**
 * Detect a "Choose one: A OR B" card. Returns the two option strings if found,
 * null otherwise. Used by the UI to present a choice modal.
 */
export function getCardChoice(card: CardInstance): { optionA: string; optionB: string } | null {
  const text = getCardText(card);
  const m = text.match(/choose(?:\s+one)?\s*:\s*(.+?)\s+or\s+(.+?)\.?$/i);
  if (!m) return null;
  return { optionA: m[1].trim(), optionB: m[2].trim() };
}

export function playCard(
  state: CombatState,
  cardInstanceId: string,
  targetId?: string,
  textOverride?: string,
): CombatState {
  const card = state.hand.find((c) => c.instanceId === cardInstanceId);
  if (!card) return state;
  const sigilPending = state.forgemasterSigilPending === true;
  const effectiveCard = sigilPending ? applyForgemasterSigilToCard(card) : card;
  const effectiveTextOverride = sigilPending && textOverride
    ? applyForgemasterSigilToText(textOverride)
    : textOverride;
  const stats = getCardStats(effectiveCard);
  if (state.playerEnergy < stats.cost) return state;

  let s: CombatState = {
    ...state,
    playerEnergy: state.playerEnergy - stats.cost,
    hand: state.hand.filter((c) => c.instanceId !== cardInstanceId),
    forgemasterSigilPending: sigilPending ? false : state.forgemasterSigilPending,
  };

  s = log(s, `${card.name} played`);
  if (sigilPending) {
    s = log(s, `Forgemaster's Sigil empowers ${card.name}`);
  }

  // Luminar Channel: Release effect fires on play, scaled by accumulated Lumens.
  // (Cards: Prism Strike "Channel. Deal 6. Release: +2 damage per Lumen", etc.)
  if (isChannelCard(effectiveCard)) {
    const lumens = effectiveCard.lumens ?? 0;
    if (lumens > 0) {
      const text = getCardText(effectiveCard);
      const releaseDmg = text.match(/release:\s*\+?(\d+)\s*damage\s*per lumen/i);
      const releaseBlock = text.match(/release:\s*\+?(\d+)\s*block\s*per lumen/i);
      const releaseWeak = text.match(/release:\s*apply\s*weak\s*\d+\s*per lumen/i);
      const releaseVuln = text.match(/release:\s*\+?\d+\s*vulnerable\s*per lumen/i);

      if (releaseDmg) {
        const perLumen = parseInt(releaseDmg[1]);
        const dmg = calcDamage(perLumen * lumens, s.playerStatusEffects, s.enemy.statusEffects);
        const result = applyShieldedDamage(s.enemy.currentShield, s.enemy.currentHealth, dmg);
        s = { ...s, enemy: { ...s.enemy, currentHealth: result.health, currentShield: result.shield } };
        s = log(s, `Release: +${dmg} dmg from ${lumens} Lumen${lumens === 1 ? '' : 's'}`);
      }
      if (releaseBlock) {
        const perLumen = parseInt(releaseBlock[1]);
        const bonus = perLumen * lumens;
        s = gainBlock(s, bonus);
        s = log(s, `Release: +${bonus} Block from ${lumens} Lumen${lumens === 1 ? '' : 's'}`);
      }
      if (releaseWeak) {
        s = { ...s, enemy: { ...s.enemy, statusEffects: addEffect(s.enemy.statusEffects, 'weak', lumens, 2) } };
        s = log(s, `Release: +${lumens} Weak from Lumens`);
      }
      if (releaseVuln) {
        s = { ...s, enemy: { ...s.enemy, statusEffects: addEffect(s.enemy.statusEffects, 'vulnerable', lumens, 2) } };
        s = log(s, `Release: +${lumens} Vulnerable from Lumens`);
      }
    }
  }

  if (card.type === 'Minion') {
    const minion: CardInstance = {
      ...card,
      instanceId: card.instanceId,
      currentHealth: stats.health ?? 1,
      hasAttacked: !card.keywords.includes('SWIFT'),
      statusEffects: [],
    };
    s = { ...s, playerBoard: [...s.playerBoard, minion] };

    // DEPLOY trigger
    if (card.keywords.includes('DEPLOY')) {
      s = applySpellEffect(s, effectiveCard, targetId);
      s = log(s, `DEPLOY - ${card.name} activates`);
    }
  } else if (card.type === 'Structure') {
    const structure: CardInstance = {
      ...card,
      instanceId: card.instanceId,
      currentHealth: stats.health ?? 4,
      hasAttacked: true,
      statusEffects: [],
    };
    s = { ...s, playerBoard: [...s.playerBoard, structure] };
  } else if (card.type === 'Power') {
    // Powers persist for the rest of combat and trigger on phase events.
    // On play we ONLY run the segments tagged "at combat start" / non-conditional.
    s = log(s, `${card.name} comes online`);
    const playSegments = powerSegmentsForTrigger(effectiveCard, 'play');
    for (const seg of playSegments) {
      s = applySpellEffect(s, effectiveCard, targetId, seg);
    }
    s = { ...s, playerPowers: [...s.playerPowers, card] };
  } else {
    // Spell / Attack / Skill / Augment
    const canUseStructuredEffects = hasStructuredEffects(effectiveCard) && (card.augments?.length ?? 0) === 0;
    s = canUseStructuredEffects
      ? applyStructuredCardEffects(s, effectiveCard, effectiveTextOverride)
      : applySpellEffect(s, effectiveCard, targetId, effectiveTextOverride);
    // Exhaust if the card text says so OR the card is an Augment (augment
    // cards always exhaust on play per their text). Exhausted cards go to
    // the exhaustPile and don't return on reshuffle. Everything else goes
    // to the discardPile and reshuffles into the draw pile when it empties.
    const isExhaust = card.type === 'Augment'
      || /\bexhaust\.?\b/i.test(stats.text);
    if (isExhaust) {
      s = { ...s, exhaustPile: [...s.exhaustPile, card] };
      s = log(s, `${card.name} exhausted`);
    } else {
      s = { ...s, discardPile: [...s.discardPile, card] };
    }
  }

  s = { ...s, discardPile: card.type !== 'Spell' ? s.discardPile : [...s.discardPile] };

  // Track stats
  s.combatLog = [...s.combatLog].slice(-8);
  return checkCombatEnd(s);
}

function applySpellEffect(
  state: CombatState,
  card: CardInstance,
  _targetId?: string,
  textOverride?: string,
): CombatState {
  let s = { ...state };
  // Order of precedence: explicit choice override -> active Flux body -> card text.
  const rawText = textOverride
    ?? (isFluxCard(card) && card.fluxState ? activeFluxText(card) : getCardText(card));
  const text = rawText.toLowerCase();

  // Random-range damage (e.g. Anomaly: "Deal 4 to 12 damage")
  const rangeDmgMatch = text.match(/deal (\d+) to (\d+) damage/);
  if (rangeDmgMatch) {
    const lo = parseInt(rangeDmgMatch[1]);
    const hi = parseInt(rangeDmgMatch[2]);
    const roll = lo + Math.floor(Math.random() * (hi - lo + 1));
    const dmg = calcDamage(roll, s.playerStatusEffects, s.enemy.statusEffects);
    const result = applyShieldedDamage(s.enemy.currentShield, s.enemy.currentHealth, dmg);
    s = { ...s, enemy: { ...s.enemy, currentHealth: result.health, currentShield: result.shield } };
    s = log(s, `${card.name} rolls ${roll} -> ${dmg} damage`);
  }

  // ── Cogsmiths augment-scaled damage ───────────────────────────────────
  // "Deal N damage + M damage per Augment on this card."   - Socket Wrench, Colossus Strike
  // "Deal N damage + M damage per Augment on any card in your deck." - Modular Strike
  const augOnThis    = text.match(/deal (\d+) damage \+ (\d+) damage per augment on this card/);
  const augInDeck    = !augOnThis
    ? text.match(/deal (\d+) damage \+ (\d+) damage per augment on any card in your deck/)
    : null;

  let augBonus: { base: number; perAug: number; count: number } | null = null;
  if (augOnThis) {
    augBonus = {
      base: parseInt(augOnThis[1]),
      perAug: parseInt(augOnThis[2]),
      count: card.augments?.length ?? 0,
    };
  } else if (augInDeck) {
    // Sum augments across every card the engine can see right now: deck-equivalent
    // is the union of hand + drawPile + discardPile + exhaustPile + playerBoard.
    let total = 0;
    for (const c of [...s.hand, ...s.drawPile, ...s.discardPile, ...s.exhaustPile, ...s.playerBoard]) {
      total += c.augments?.length ?? 0;
    }
    augBonus = {
      base: parseInt(augInDeck[1]),
      perAug: parseInt(augInDeck[2]),
      count: total,
    };
  }
  if (augBonus) {
    const raw = augBonus.base + augBonus.perAug * augBonus.count;
    const dmg = calcDamage(raw, s.playerStatusEffects, s.enemy.statusEffects);
    const result = applyShieldedDamage(s.enemy.currentShield, s.enemy.currentHealth, dmg);
    s = { ...s, enemy: { ...s.enemy, currentHealth: result.health, currentShield: result.shield } };
    s = log(s, `${card.name} deals ${dmg} (${augBonus.count} augment${augBonus.count === 1 ? '' : 's'} counted)`);
  }

  // Multi-hit: "deal N damage X times" / "deal N damage twice" / "deal N damage 3 times"
  const multiHitMatch = !rangeDmgMatch && !augBonus
    ? text.match(/deal (\d+) damage (\d+|twice|thrice) times?/)
        ?? text.match(/deal (\d+) damage (twice|thrice)/)
    : null;
  if (multiHitMatch) {
    const per = parseInt(multiHitMatch[1]);
    const raw = multiHitMatch[2];
    const hits = parseCount(raw) ?? 1;
    let totalDealt = 0;
    for (let i = 0; i < hits; i++) {
      const dmg = calcDamage(per, s.playerStatusEffects, s.enemy.statusEffects);
      const result = applyShieldedDamage(s.enemy.currentShield, s.enemy.currentHealth, dmg);
      s = { ...s, enemy: { ...s.enemy, currentHealth: result.health, currentShield: result.shield } };
      totalDealt += dmg;
      if (s.enemy.currentHealth <= 0) break;
    }
    s = log(s, `${card.name} hits ${hits}x for ${totalDealt} total`);
    if (card.keywords.includes('DRAIN')) {
      const heal = Math.floor(totalDealt / 2);
      s = { ...s, playerHealth: Math.min(s.playerMaxHealth, s.playerHealth + heal) };
      s = log(s, `DRAIN heals ${heal} HP`);
    }
  }

  // ── Heat-scaled damage: "deal damage equal to (your)(current) heat (x N)" ──
  // Pyroclast: P-023 Meltdown ("Heat x 3"), P-039 Magma Tide ("equal to Heat").
  // Does NOT consume Heat - purely scaling.
  const heatScaleMatch = text.match(
    /deal damage equal to (?:your\s+)?(?:current\s+)?heat(?:\s*[x*]\s*(\d+))?/,
  );
  if (heatScaleMatch) {
    const mult = heatScaleMatch[1] ? parseInt(heatScaleMatch[1]) : 1;
    const raw = s.playerHeat * mult;
    const dmg = calcDamage(raw, s.playerStatusEffects, s.enemy.statusEffects);
    const result = applyShieldedDamage(s.enemy.currentShield, s.enemy.currentHealth, dmg);
    s = { ...s, enemy: { ...s.enemy, currentHealth: result.health, currentShield: result.shield } };
    s = log(s, `${card.name} deals ${dmg} (Heat ${s.playerHeat}${mult > 1 ? `x${mult}` : ''})`);
  }

  // Single-hit damage. Skip if a range, multi-hit, augment-scaled, or heat-scaled pattern already fired.
  const dmgMatch = !rangeDmgMatch && !multiHitMatch && !augBonus && !heatScaleMatch
    ? text.match(/deal (\d+) damage/) : null;
  if (dmgMatch) {
    const dmg = calcDamage(parseInt(dmgMatch[1]), s.playerStatusEffects, s.enemy.statusEffects);
    const result = applyShieldedDamage(s.enemy.currentShield, s.enemy.currentHealth, dmg);
    s = { ...s, enemy: { ...s.enemy, currentHealth: result.health, currentShield: result.shield } };
    s = log(s, `${card.name} deals ${dmg} to ${s.enemy.name}`);
    if (card.keywords.includes('DRAIN')) {
      const heal = Math.floor(dmg / 2);
      s = { ...s, playerHealth: Math.min(s.playerMaxHealth, s.playerHealth + heal) };
      s = log(s, `DRAIN heals ${heal} HP`);
    }
  }

  // ── Heat-scaled block: "Gain N Block per Heat (up to M Heat counted)" ──
  // Pyroclast P-016 Glowing Resolve. Does NOT consume Heat.
  const blockPerHeatMatch = text.match(
    /gain (\d+) block per heat(?:\s*\(up to (\d+) heat(?:\s+counted)?\))?/,
  );
  if (blockPerHeatMatch) {
    const perHeat = parseInt(blockPerHeatMatch[1]);
    const cap = blockPerHeatMatch[2] ? parseInt(blockPerHeatMatch[2]) : Infinity;
    const heatCounted = Math.min(s.playerHeat, cap);
    const block = perHeat * heatCounted;
    if (block > 0) {
      s = gainBlock(s, block);
      s = log(s, `${card.name} gains ${block} Block (${heatCounted} Heat x ${perHeat})`);
    }
  }

  // Shield / block. Skip if heat-per-block already fired (its text contains "Gain N Block").
  const shieldMatch = !blockPerHeatMatch
    ? text.match(/gain (\d+) (?:shield|block)/)
    : null;
  if (shieldMatch) {
    s = gainBlock(s, parseInt(shieldMatch[1]));
    s = log(s, `Gained ${shieldMatch[1]} Shield`);
  }

  // Draw cards
  const drawMatch = text.match(/draw (\d+)/);
  if (drawMatch) {
    s = drawCards(s, parseInt(drawMatch[1]));
  }

  // Heal
  const healMatch = text.match(/heal (\d+)/);
  if (healMatch) {
    const healed = parseInt(healMatch[1]);
    s = { ...s, playerHealth: Math.min(s.playerMaxHealth, s.playerHealth + healed) };
    s = log(s, `Healed ${healed} HP`);
  }

  // Self damage. Patterns:
  //   "X% chance to take N (self) damage"  - Paradox Strike etc.
  //   "take N (self) damage"               - Cauterize, Rally, Collapsing Star, Overdrive
  //   "lose N HP"                           - Glass Cannon
  const chanceSelfDmg = text.match(/(\d+)% chance to take (\d+) (?:self )?damage/);
  if (chanceSelfDmg) {
    const chance = parseInt(chanceSelfDmg[1]);
    const dmg = parseInt(chanceSelfDmg[2]);
    if (Math.random() * 100 < chance) {
      s = { ...s, playerHealth: Math.max(0, s.playerHealth - dmg) };
      s = log(s, `${card.name} backfires for ${dmg}`);
    } else {
      s = log(s, `${card.name} backfire avoided`);
    }
  } else {
    const flatSelfDmg = text.match(/take (\d+) (?:self )?damage/);
    if (flatSelfDmg) {
      const dmg = parseInt(flatSelfDmg[1]);
      s = { ...s, playerHealth: Math.max(0, s.playerHealth - dmg) };
      s = log(s, `${card.name} self-damage: ${dmg}`);
    }
  }
  const loseHP = text.match(/lose (\d+) hp/);
  if (loseHP) {
    const dmg = parseInt(loseHP[1]);
    s = { ...s, playerHealth: Math.max(0, s.playerHealth - dmg) };
    s = log(s, `${card.name} costs ${dmg} HP`);
  }

  // ── Luminar Lumen generators ──────────────────────────────────────────────
  // Patterns:
  //   "Gain N Lumen on a Channel card in hand"
  //   "Gain N Lumens on the leftmost Channel card in hand"
  //   "Gain N Lumen on each Channel card in hand"
  //   "Gain N Lumens on every Channel card in hand"
  //   "Gain N Lumens distributed freely across Channel cards in hand"
  const lumenEach = text.match(/gain (\d+) lumens? on (?:each|every) channel card/);
  const lumenLeftmost = !lumenEach ? text.match(/gain (\d+) lumens? on (?:a|the leftmost) channel card/) : null;
  const lumenDistributed = !lumenEach && !lumenLeftmost ? text.match(/gain (\d+) lumens? distributed/) : null;

  const grantLumens = (n: number, mode: 'each' | 'first' | 'distributed'): void => {
    const channels = s.hand.filter(isChannelCard);
    if (channels.length === 0) return;
    if (mode === 'each') {
      s = {
        ...s,
        hand: s.hand.map((c) => isChannelCard(c) ? { ...c, lumens: (c.lumens ?? 0) + n } : c),
      };
      s = log(s, `+${n} Lumen on ${channels.length} Channel card${channels.length === 1 ? '' : 's'}`);
    } else if (mode === 'first') {
      const idx = s.hand.findIndex(isChannelCard);
      const target = s.hand[idx];
      s = {
        ...s,
        hand: s.hand.map((c, i) => i === idx ? { ...c, lumens: (c.lumens ?? 0) + n } : c),
      };
      s = log(s, `+${n} Lumen on ${target.name}`);
    } else {
      // distributed: spread evenly, remainder on the leftmost
      const per = Math.floor(n / channels.length);
      const remainder = n % channels.length;
      let firstAssigned = false;
      s = {
        ...s,
        hand: s.hand.map((c) => {
          if (!isChannelCard(c)) return c;
          const extra = !firstAssigned ? remainder : 0;
          firstAssigned = true;
          return { ...c, lumens: (c.lumens ?? 0) + per + extra };
        }),
      };
      s = log(s, `Distributed ${n} Lumens across ${channels.length} Channel card${channels.length === 1 ? '' : 's'}`);
    }
  };

  if (lumenEach) grantLumens(parseInt(lumenEach[1]), 'each');
  else if (lumenLeftmost) grantLumens(parseInt(lumenLeftmost[1]), 'first');
  else if (lumenDistributed) grantLumens(parseInt(lumenDistributed[1]), 'distributed');

  // ── Cogsmiths summons (Deploy Drone / Sentry / Titan / Warmind / etc.) ──
  // Two patterns in the existing card text:
  //   "Summon a Drone (5 HP, deals 3 damage at turn end, lasts 3 turns)."
  //   "Summon a Titan (25 HP, takes 2 actions per turn dealing 10 damage each)."
  const summonTurnEnd = rawText.match(
    /summon a ([\w\s]+?) \((\d+) hp, deals (\d+) damage at turn end(?:, lasts (\d+) turns?)?\)/i,
  );
  const summonActions = !summonTurnEnd
    ? rawText.match(
        /summon a ([\w\s]+?) \((\d+) hp, takes (\d+) actions? per turn dealing (\d+) damage each\)/i,
      )
    : null;

  if (summonTurnEnd || summonActions) {
    const m = (summonTurnEnd ?? summonActions)!;
    const name      = m[1].trim();
    const hp        = parseInt(m[2]);
    const dmg       = summonTurnEnd ? parseInt(summonTurnEnd[3]) : parseInt(summonActions![4]);
    const actions   = summonActions ? parseInt(summonActions[3]) : 1;
    const turns     = summonTurnEnd && summonTurnEnd[4] ? parseInt(summonTurnEnd[4]) : -1; // -1 = permanent

    const summon: CardInstance = {
      id: `summon-${card.id}-${Date.now()}`,
      instanceId: `summon-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      faction: 'Cogsmiths',
      type: 'Minion',
      cost: 0,
      attack: dmg,
      health: hp,
      currentHealth: hp,
      keywords: [],
      cardText: `Summon. Auto-attacks for ${dmg} at turn end${actions > 1 ? ` (x${actions})` : ''}.`,
      rarity: 'Common',
      complexityTier: 1,
      upgraded: false,
      statusEffects: [],
      hasAttacked: true, // doesn't act the turn it's summoned
      summonAutoDamage: dmg,
      summonActionsPerTurn: actions,
      summonTurnsLeft: turns,
    };

    s = { ...s, playerBoard: [...s.playerBoard, summon] };
    const turnsTxt = turns < 0 ? 'permanent' : `${turns} turn${turns === 1 ? '' : 's'}`;
    s = log(s, `Summoned ${name} - ${hp} HP, ${dmg}${actions > 1 ? `x${actions}` : ''} dmg/turn, ${turnsTxt}`);
  }

  // ── Rifts (Warp Riders) ──────────────────────────────────────────────────
  // Patterns:
  //   "open a cost rift for N turns"
  //   "open a genesis rift for N turns" (also matches: "Genesis Rift for 1 turn")
  //   "open N random rifts" / "open a random rift for M turns"
  //   "open 3 random rifts"
  const namedRift = text.match(/open a (cost|genesis|energy|chaos) rift(?: for (\d+) turns?)?/);
  if (namedRift) {
    const type = namedRift[1] as Rift['type'];
    const turns = namedRift[2] ? parseInt(namedRift[2]) : (type === 'genesis' ? 1 : 2);
    s = { ...s, playerRifts: [...s.playerRifts, { type, turnsRemaining: turns }] };
    s = log(s, `Opened a ${type[0].toUpperCase() + type.slice(1)} Rift for ${turns} turn${turns === 1 ? '' : 's'}`);
  } else {
    const randomRift = text.match(/open (\d+|a) random rifts?(?: for (\d+) turns?)?/);
    if (randomRift) {
      const count = randomRift[1] === 'a' ? 1 : parseInt(randomRift[1]);
      const turns = randomRift[2] ? parseInt(randomRift[2]) : 2;
      const types: Rift['type'][] = ['cost', 'energy', 'chaos'];
      const newRifts: Rift[] = [];
      for (let i = 0; i < count; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        newRifts.push({ type, turnsRemaining: turns });
      }
      s = { ...s, playerRifts: [...s.playerRifts, ...newRifts] };
      const summary = newRifts.map((r) => r.type[0].toUpperCase() + r.type.slice(1)).join(', ');
      s = log(s, `Opened ${count} random Rift${count === 1 ? '' : 's'}: ${summary}`);
    }
  }

  // Energy. Accept "gain N energy", "gain N extra energy", "gain N more energy".
  const energyMatch = text.match(/gain (\d+)(?:\s+(?:extra|more|additional))? energy/);
  if (energyMatch) {
    const gained = parseInt(energyMatch[1]);
    s = { ...s, playerEnergy: Math.min(s.playerMaxEnergy + 3, s.playerEnergy + gained) };
    s = log(s, `+${gained} Energy`);
  }

  // Status: burn / Ignite (Pyroclast term, same status). Match all spellings:
  //   "apply 2 burn", "apply ignite 2", "apply 2 ignite"
  // Self-targeted variant ("...to yourself") routes to playerStatusEffects, not enemy.
  // Pre-existing bug: Overclock's "Apply Ignite 2 to yourself" used to mis-target the enemy.
  const selfBurnMatch = text.match(
    /apply (?:(\d+) (?:burn|ignite)|ignite (\d+))\s+to\s+(?:yourself|you)/,
  );
  if (selfBurnMatch) {
    const stacks = parseInt(selfBurnMatch[1] ?? selfBurnMatch[2]);
    s = { ...s, playerStatusEffects: addEffect(s.playerStatusEffects, 'burn', stacks) };
    s = log(s, `${card.name}: ${stacks} Burn applied to you`);
  } else {
    const burnMatch = text.match(/apply (?:(\d+) (?:burn|ignite)|ignite (\d+))/);
    if (burnMatch) {
      const stacks = parseInt(burnMatch[1] ?? burnMatch[2]);
      s = { ...s, enemy: { ...s.enemy, statusEffects: addEffect(s.enemy.statusEffects, 'burn', stacks) } };
      s = log(s, `Applied ${stacks} Burn`);
    }
  }
  const poisonMatch = text.match(/apply (\d+) poison/);
  if (poisonMatch) {
    s = { ...s, enemy: { ...s.enemy, statusEffects: addEffect(s.enemy.statusEffects, 'poison', parseInt(poisonMatch[1])) } };
    s = log(s, `Applied ${poisonMatch[1]} Poison`);
  }
  // Vulnerable. Accept stacks: "apply vulnerable 3", "apply 3 vulnerable", or no number (default 2).
  const vulnMatch = text.match(/apply vulnerable (\d+)|apply (\d+) vulnerable|apply vulnerable/);
  if (vulnMatch) {
    const stacks = parseInt(vulnMatch[1] ?? vulnMatch[2] ?? '2');
    s = { ...s, enemy: { ...s.enemy, statusEffects: addEffect(s.enemy.statusEffects, 'vulnerable', stacks, 2) } };
    s = log(s, `Applied Vulnerable ${stacks}`);
  }
  // Weak. Same shape as Vulnerable.
  const weakMatch = text.match(/apply weak (\d+)|apply (\d+) weak|apply weak/);
  if (weakMatch) {
    const stacks = parseInt(weakMatch[1] ?? weakMatch[2] ?? '2');
    s = { ...s, enemy: { ...s.enemy, statusEffects: addEffect(s.enemy.statusEffects, 'weak', stacks, 2) } };
    s = log(s, `Applied Weak ${stacks}`);
  }

  // Strength
  const strMatch = text.match(/gain (\d+) strength/);
  if (strMatch) {
    s = { ...s, playerStatusEffects: addEffect(s.playerStatusEffects, 'strength', parseInt(strMatch[1])) };
    s = log(s, `Gained ${strMatch[1]} Strength`);
  }

  // Gain Heat. Match three phrasings:
  //   "Gain N Heat"        - Kindle, Ember Tap, Hot Wind, Spirit of Fire, etc.
  //   "Generate N Heat"    - Spark (new starter)
  //   "...and N Heat"      - Scale Guard upgrade ("Gain 7 Block and 1 Heat"),
  //                          Heat Shimmer ("Gain 4 Block and 1 Heat"), etc.
  const heatGainMatch = text.match(/(?:gain|generate) (\d+) heat|and (\d+) (?:more |extra )?heat/);
  if (heatGainMatch) {
    const amount = parseInt(heatGainMatch[1] ?? heatGainMatch[2]);
    const heat = addHeat(s.playerHeat, amount);
    s = { ...s, playerHeat: heat.next };
    s = log(
      s,
      heat.wasted > 0
        ? `Gained ${heat.gained} Heat (${heat.wasted} wasted at cap, total: ${s.playerHeat})`
        : `Gained ${heat.gained} Heat (total: ${s.playerHeat})`,
    );
  }

  // Heat-scaled damage: "deal N damage + M per heat spent (up to X heat)"
  const heatSpendMatch = text.match(/deal (\d+) damage \+ (\d+) per heat spent \(up to (\d+) heat\)/);
  if (heatSpendMatch) {
    const base = parseInt(heatSpendMatch[1]);
    const perHeat = parseInt(heatSpendMatch[2]);
    const maxHeat = parseInt(heatSpendMatch[3]);
    const heatSpent = Math.min(s.playerHeat, maxHeat);
    const dmg = calcDamage(base + perHeat * heatSpent, s.playerStatusEffects, s.enemy.statusEffects);
    const result = applyShieldedDamage(s.enemy.currentShield, s.enemy.currentHealth, dmg);
    s = { ...s, playerHeat: s.playerHeat - heatSpent, enemy: { ...s.enemy, currentHealth: result.health, currentShield: result.shield } };
    s = log(s, `${card.name} deals ${dmg} (spent ${heatSpent} Heat)`);
  }

  // Vent all heat: "deal N damage. vent all heat"
  const consumeMatch = text.match(/(?:vent|consume) all heat/);
  if (consumeMatch && !heatSpendMatch) {
    const heatBonus = s.playerHeat;
    // If there's already a dmgMatch damage applied above, add heat as bonus
    if (heatBonus > 0) {
      const bonusDmg = calcDamage(heatBonus, s.playerStatusEffects, s.enemy.statusEffects);
      const result = applyShieldedDamage(s.enemy.currentShield, s.enemy.currentHealth, bonusDmg);
      s = { ...s, playerHeat: 0, enemy: { ...s.enemy, currentHealth: result.health, currentShield: result.shield } };
      s = log(s, `Vented ${heatBonus} Heat for ${bonusDmg} bonus damage`);
    } else {
      s = { ...s, playerHeat: 0 };
    }
  }

  // Conditional: "if heat >= N, ..."
  const heatCondMatch = text.match(/if heat >=? (\d+)/);
  if (heatCondMatch && s.playerHeat >= parseInt(heatCondMatch[1])) {
    // Apply burn as conditional bonus (cards like "If Heat >= 3, apply Ignite 2" - treat Ignite as Burn)
    const condBurnMatch = text.match(/if heat >=? \d+,\s*apply (?:ignite|burn) (\d+)/);
    if (condBurnMatch) {
      const stacks = parseInt(condBurnMatch[1]);
      s = { ...s, enemy: { ...s.enemy, statusEffects: addEffect(s.enemy.statusEffects, 'burn', stacks) } };
      s = log(s, `Heat condition met - applied ${stacks} Burn`);
    }
    // Conditional bonus damage: "If Heat >= N, deal M more damage." (Pyroclast P-036 Sun's Fury)
    const condDmgMatch = text.match(/if heat >=? \d+,\s*deal (\d+) more damage/);
    if (condDmgMatch) {
      const bonus = calcDamage(parseInt(condDmgMatch[1]), s.playerStatusEffects, s.enemy.statusEffects);
      const result = applyShieldedDamage(s.enemy.currentShield, s.enemy.currentHealth, bonus);
      s = { ...s, enemy: { ...s.enemy, currentHealth: result.health, currentShield: result.shield } };
      s = log(s, `Heat condition met - +${bonus} bonus damage`);
    }
  }

  // IMMOLATE: deal damage to all enemies on death - handled in death processing
  // LAST_WORDS: handled in death processing
  // BARRIER: handled in damage application

  return s;
}

// ─── attackWithMinion ────────────────────────────────────────────────────────

export function attackWithMinion(state: CombatState, attackerId: string, targetId: string): CombatState {
  let s = { ...state };
  const attacker = s.playerBoard.find((m) => m.instanceId === attackerId);
  if (!attacker || attacker.hasAttacked) return s;

  // Check GUARDIAN on enemy board - must target guardian first
  const guardians = s.enemyBoard.filter((m) => m.keywords.includes('GUARDIAN') && (m.currentHealth ?? 0) > 0);
  if (guardians.length > 0 && !guardians.find((g) => g.instanceId === targetId) && targetId !== 'enemy-direct-not-allowed') {
    return log(s, 'Must attack the GUARDIAN first!');
  }

  const atk = calcDamage(getCardStats(attacker).attack ?? 0, attacker.statusEffects, []);
  s = log(s, `${attacker.name} attacks for ${atk}`);

  if (targetId === 'enemy') {
    // Attack enemy hero
    const dmg = calcDamage(atk, attacker.statusEffects, s.enemy.statusEffects);
    const result = applyShieldedDamage(s.enemy.currentShield, s.enemy.currentHealth, dmg);
    s = { ...s, enemy: { ...s.enemy, currentHealth: result.health, currentShield: result.shield } };

    // DRAIN
    if (attacker.keywords.includes('DRAIN')) {
      const heal = Math.floor(dmg / 2);
      s = { ...s, playerHealth: Math.min(s.playerMaxHealth, s.playerHealth + heal) };
      s = log(s, `DRAIN heals ${heal}`);
    }
  } else {
    // Attack enemy minion
    const target = s.enemyBoard.find((m) => m.instanceId === targetId);
    if (!target) return s;

    const dmg = calcDamage(atk, attacker.statusEffects, target.statusEffects);
    const counterDmg = calcDamage(target.attack ?? 0, target.statusEffects, attacker.statusEffects);

    // Apply damage to enemy minion
    const targetResult = applyShieldedDamage(0, target.currentHealth ?? target.health ?? 1, dmg);
    // Apply counter damage to attacker
    const attackerResult = applyShieldedDamage(0, attacker.currentHealth ?? attacker.health ?? 1, counterDmg);

    s = {
      ...s,
      enemyBoard: s.enemyBoard.map((m) =>
        m.instanceId === targetId ? { ...m, currentHealth: targetResult.health, currentShield: targetResult.shield } : m
      ),
      playerBoard: s.playerBoard.map((m) =>
        m.instanceId === attackerId ? { ...m, currentHealth: attackerResult.health } : m
      ),
    };

    s = processDeaths(s);
  }

  // Mark as attacked (BLITZ can attack again)
  const canAttackAgain = attacker.keywords.includes('BLITZ') && !attacker.hasAttacked;
  s = {
    ...s,
    playerBoard: s.playerBoard.map((m) =>
      m.instanceId === attackerId ? { ...m, hasAttacked: !canAttackAgain } : m
    ),
  };

  return checkCombatEnd(s);
}

// ─── Death processing ────────────────────────────────────────────────────────

function processDeaths(state: CombatState): CombatState {
  let s = { ...state };

  // Player minion deaths
  const deadPlayerMinions = s.playerBoard.filter((m) => (m.currentHealth ?? 0) <= 0);
  for (const dead of deadPlayerMinions) {
    s = log(s, `${dead.name} dies`);
    const deadStats = getCardStats(dead);
    if (dead.keywords.includes('LAST_WORDS')) {
      s = log(s, `LAST_WORDS triggers: ${deadStats.text}`);
      s = applySpellEffect(s, dead);
    }
    if (dead.keywords.includes('IMMOLATE')) {
      const dmg = deadStats.attack ?? 3;
      const result = applyShieldedDamage(s.enemy.currentShield, s.enemy.currentHealth, dmg);
      s = { ...s, enemy: { ...s.enemy, currentHealth: result.health, currentShield: result.shield } };
      s = log(s, `IMMOLATE deals ${dmg} to enemy on death`);
    }
    s = { ...s, discardPile: [...s.discardPile, dead] };
  }
  s = { ...s, playerBoard: s.playerBoard.filter((m) => (m.currentHealth ?? 0) > 0) };

  // Enemy minion deaths
  const deadEnemyMinions = s.enemyBoard.filter((m) => (m.currentHealth ?? 0) <= 0);
  for (const dead of deadEnemyMinions) {
    s = log(s, `Enemy ${dead.name} dies`);
  }
  s = { ...s, enemyBoard: s.enemyBoard.filter((m) => (m.currentHealth ?? 0) > 0) };

  return s;
}

// ─── endPlayerTurn ───────────────────────────────────────────────────────────

export function endPlayerTurn(state: CombatState, relics: RelicDefinition[]): CombatState {
  let s: CombatState = { ...state, phase: 'enemy_turn' as CombatPhase };
  void relics; // relic effects applied by relicEffects.ts

  // NOTE: Hand is intentionally NOT discarded here. It stays visible during
  // the enemy turn so the player can plan; it's discarded right before the
  // new draw at the start of the next player turn (see executeEnemyTurn).

  // Tick player status effects
  const burnDmg = getStack(s.playerStatusEffects, 'burn');
  if (burnDmg > 0) {
    s = { ...s, playerHealth: Math.max(0, s.playerHealth - burnDmg) };
    s = { ...s, playerStatusEffects: s.playerStatusEffects.map((e) => e.type === 'burn' ? { ...e, stacks: e.stacks - 1 } : e).filter((e) => e.stacks > 0) };
    s = log(s, `Burn deals ${burnDmg} damage to you`);
  }
  const poisonDmg = getStack(s.playerStatusEffects, 'poison');
  if (poisonDmg > 0) {
    s = { ...s, playerHealth: Math.max(0, s.playerHealth - poisonDmg) };
    s = { ...s, playerStatusEffects: addEffect(removeEffect(s.playerStatusEffects, 'poison'), 'poison', poisonDmg + 1) };
    s = log(s, `Poison deals ${poisonDmg} damage`);
  }

  // Active Powers fire their "at end of turn" segments.
  for (const power of s.playerPowers) {
    const segs = powerSegmentsForTrigger(power, 'turn-end');
    for (const seg of segs) {
      s = applySpellEffect(s, power, undefined, seg);
    }
  }

  // Cogsmiths summons auto-attack the enemy at end of player turn.
  for (const m of s.playerBoard) {
    if (m.summonAutoDamage === undefined) continue;
    const actions = m.summonActionsPerTurn ?? 1;
    for (let i = 0; i < actions; i++) {
      const dmg = calcDamage(m.summonAutoDamage, m.statusEffects, s.enemy.statusEffects);
      const result = applyShieldedDamage(s.enemy.currentShield, s.enemy.currentHealth, dmg);
      s = { ...s, enemy: { ...s.enemy, currentHealth: result.health, currentShield: result.shield } };
      s = log(s, `${m.name} hits ${s.enemy.name} for ${dmg}`);
      if (s.enemy.currentHealth <= 0) break;
    }
  }

  // Tick summon durations. -1 = permanent. Remove expired.
  const livingBoard = s.playerBoard
    .map((m) => {
      if (m.summonTurnsLeft === undefined || m.summonTurnsLeft < 0) return m;
      const next = m.summonTurnsLeft - 1;
      return { ...m, summonTurnsLeft: next };
    })
    .filter((m) => {
      if (m.summonTurnsLeft === undefined || m.summonTurnsLeft < 0) return true;
      if (m.summonTurnsLeft <= 0) {
        s = log(s, `${m.name} expires`);
        return false;
      }
      return true;
    });
  s = { ...s, playerBoard: livingBoard };

  // Reset minions and energy. Shield is cleared at the START of the player's next turn
  // (inside executeEnemyTurn, before drawing), so it can still absorb the enemy's attack.
  // Also shift Flux state on every Flux card still in the player's draw pile / discard
  // so the next turn's draws feel "shifted" (cards in hand are discarded above).
  const rotateFlux = <T extends CardInstance>(c: T): T =>
    isFluxCard(c) && c.fluxState ? { ...c, fluxState: shiftFlux(c.fluxState) } : c;
  s = {
    ...s,
    playerBoard: s.playerBoard.map((m) => ({ ...m, hasAttacked: false })),
    playerEnergy: s.playerMaxEnergy,
    drawPile: s.drawPile.map(rotateFlux),
    discardPile: s.discardPile.map(rotateFlux),
  };

  return checkCombatEnd(s);
}

// ─── Enemy turn ──────────────────────────────────────────────────────────────

export function executeEnemyTurn(state: CombatState): CombatState {
  let s: CombatState = { ...state };

  // Chronoshift Philter: short-circuit. Enemy doesn't act this turn; their
  // intent stays the same so the player still sees what's coming next.
  if (s.skipNextEnemyTurn) {
    s = log(s, `Time freezes - ${s.enemy.name} loses a turn`);
    s = { ...s, skipNextEnemyTurn: false, phase: 'player_turn' };
    s = { ...s, playerShield: 0, discardPile: [...s.discardPile, ...s.hand], hand: [] };
    s = drawCards(s, s.drawPerTurn ?? 5);
    s = applyRiftStartOfTurn(s);
    if ((s.pendingTurnStartBlock ?? 0) > 0) {
      const queued = s.pendingTurnStartBlock!;
      s = gainBlock(s, queued);
      s = log(s, `Aegis residue grants ${queued} Block`);
      s = { ...s, pendingTurnStartBlock: 0 };
    }
    return s;
  }

  const { enemy } = s;
  const intent = enemy.intents[enemy.intentIndex % enemy.intents.length];

  s = log(s, `${enemy.name}: ${intent.description}`);

  switch (intent.type) {
    case 'attack': {
      const value = intent.value ?? enemy.attack;
      const repeated = parseRepeatedEnemyAttack(intent.description, value);
      let totalDamage = 0;
      for (let i = 0; i < repeated.hits; i++) {
        const dmg = calcDamage(repeated.damage, enemy.statusEffects, s.playerStatusEffects);
        const result = applyShieldedDamage(s.playerShield, s.playerHealth, dmg);
        s = { ...s, playerHealth: result.health, playerShield: result.shield };
        totalDamage += dmg;
        if (s.playerHealth <= 0) break;
      }
      s = repeated.hits > 1
        ? log(s, `${enemy.name} hits ${repeated.hits}x for ${totalDamage} total`)
        : log(s, `${enemy.name} attacks for ${totalDamage}`);
      break;
    }
    case 'defend': {
      const shield = intent.value ?? 8;
      s = { ...s, enemy: { ...s.enemy, currentShield: (s.enemy.currentShield ?? 0) + shield } };
      s = log(s, `${enemy.name} gains ${shield} Shield`);
      break;
    }
    case 'buff': {
      s = { ...s, enemy: { ...s.enemy, statusEffects: addEffect(s.enemy.statusEffects, 'strength', intent.value ?? 2) } };
      s = log(s, `${enemy.name} gains Strength`);
      break;
    }
    case 'debuff': {
      s = { ...s, playerStatusEffects: addEffect(s.playerStatusEffects, 'weak', intent.value ?? 2, 2) };
      s = log(s, `${enemy.name} applies Weak`);
      break;
    }
    case 'summon': {
      s = log(s, `${enemy.name} summons a minion`);
      break;
    }
    case 'special': {
      s = log(s, `${enemy.name} uses a special ability`);
      // Apply 5 damage as a generic special
      if (intent.value) {
        const dmg = intent.value;
        const result = applyShieldedDamage(s.playerShield, s.playerHealth, dmg);
        s = { ...s, playerHealth: result.health, playerShield: result.shield };
      }
      break;
    }
  }

  // Tick enemy status effects
  const enemyBurnDmg = getStack(s.enemy.statusEffects, 'burn');
  if (enemyBurnDmg > 0) {
    s = { ...s, enemy: { ...s.enemy, currentHealth: Math.max(0, s.enemy.currentHealth - enemyBurnDmg) } };
    s = { ...s, enemy: { ...s.enemy, statusEffects: s.enemy.statusEffects.map((e) => e.type === 'burn' ? { ...e, stacks: e.stacks - 1 } : e).filter((e) => e.stacks > 0) } };
    s = log(s, `Burn deals ${enemyBurnDmg} to ${enemy.name}`);
  }
  const enemyPoisonDmg = getStack(s.enemy.statusEffects, 'poison');
  if (enemyPoisonDmg > 0) {
    s = { ...s, enemy: { ...s.enemy, currentHealth: Math.max(0, s.enemy.currentHealth - enemyPoisonDmg) } };
    s = log(s, `Poison deals ${enemyPoisonDmg} to ${enemy.name}`);
  }

  // Advance intent
  s = {
    ...s,
    enemy: {
      ...s.enemy,
      intentIndex: (s.enemy.intentIndex + 1) % s.enemy.intents.length,
      statusEffects: tickEffects(s.enemy.statusEffects),
    },
    turn: s.turn + 1,
  };

  s = checkCombatEnd(s);
  if (s.phase === 'enemy_turn') {
    // Start of new player turn: clear shield, discard the held hand, then draw 5.
    s = {
      ...s,
      phase: 'player_turn',
      playerShield: 0,
      discardPile: [...s.discardPile, ...s.hand],
      hand: [],
    };
    s = drawCards(s, s.drawPerTurn ?? 5);
    s = applyRiftStartOfTurn(s);

    // Aegis Mixture residue: queued block for the start of next turn.
    if ((s.pendingTurnStartBlock ?? 0) > 0) {
      const queued = s.pendingTurnStartBlock!;
      s = gainBlock(s, queued);
      s = log(s, `Aegis residue grants ${queued} Block`);
      s = { ...s, pendingTurnStartBlock: 0 };
    }

    // Active Powers fire their "at start of turn" segments.
    for (const power of s.playerPowers) {
      const segs = powerSegmentsForTrigger(power, 'turn-start');
      for (const seg of segs) {
        s = applySpellEffect(s, power, undefined, seg);
      }
    }
  }

  return s;
}

/**
 * Apply rift effects at the start of the player's turn, then tick down
 * each rift's remaining duration. Expired rifts are removed.
 */
function applyRiftStartOfTurn(state: CombatState): CombatState {
  if (state.playerRifts.length === 0) return state;
  let s = state;

  for (const rift of s.playerRifts) {
    switch (rift.type) {
      case 'energy':
        s = { ...s, playerEnergy: s.playerEnergy + 1 };
        s = log(s, `Energy Rift grants +1 Energy`);
        break;
      case 'genesis':
        // 1-turn burst: +2 energy this turn (proxy for "all cards cost -1")
        s = { ...s, playerEnergy: s.playerEnergy + 2 };
        s = log(s, `Genesis Rift grants +2 Energy`);
        break;
      case 'cost': {
        // Discount one random card in hand by 1 (min 0) for this turn only.
        if (s.hand.length > 0) {
          const idx = Math.floor(Math.random() * s.hand.length);
          const target = s.hand[idx];
          const effectiveCost = getCardCost(target);
          const newCost = Math.max(0, effectiveCost - 1);
          if (newCost !== effectiveCost) {
            const updated = setActiveCardCost(target, newCost);
            s = { ...s, hand: s.hand.map((c, i) => (i === idx ? updated : c)) };
            s = log(s, `Cost Rift: ${target.name} costs ${newCost} this turn`);
          }
        }
        break;
      }
      case 'chaos': {
        // Random chaos damage on the enemy
        const dmg = 3;
        const result = applyShieldedDamage(s.enemy.currentShield, s.enemy.currentHealth, dmg);
        s = { ...s, enemy: { ...s.enemy, currentHealth: result.health, currentShield: result.shield } };
        s = log(s, `Chaos Rift deals ${dmg} to ${s.enemy.name}`);
        break;
      }
    }
  }

  // Tick down. Drop expired.
  const ticked = s.playerRifts
    .map((r) => ({ ...r, turnsRemaining: r.turnsRemaining - 1 }))
    .filter((r) => r.turnsRemaining > 0);
  const expired = s.playerRifts.length - ticked.length;
  if (expired > 0) {
    s = log(s, `${expired} Rift${expired === 1 ? '' : 's'} expired`);
  }
  s = { ...s, playerRifts: ticked };

  return s;
}

// ─── applyDamage ─────────────────────────────────────────────────────────────

export function applyDamage(state: CombatState, targetId: string, amount: number, source: string): CombatState {
  let s = { ...state };
  s = log(s, `${source} deals ${amount} damage to ${targetId}`);

  if (targetId === 'player') {
    const result = applyShieldedDamage(s.playerShield, s.playerHealth, amount);
    s = { ...s, playerHealth: result.health, playerShield: result.shield };
  } else if (targetId === 'enemy') {
    const result = applyShieldedDamage(s.enemy.currentShield, s.enemy.currentHealth, amount);
    s = { ...s, enemy: { ...s.enemy, currentHealth: result.health, currentShield: result.shield } };
  } else {
    const playerMinion = s.playerBoard.find((m) => m.instanceId === targetId);
    if (playerMinion) {
      s = {
        ...s,
        playerBoard: s.playerBoard.map((m) =>
          m.instanceId === targetId ? { ...m, currentHealth: Math.max(0, (m.currentHealth ?? 0) - amount) } : m
        ),
      };
      s = processDeaths(s);
    }
    const enemyMinion = s.enemyBoard.find((m) => m.instanceId === targetId);
    if (enemyMinion) {
      s = {
        ...s,
        enemyBoard: s.enemyBoard.map((m) =>
          m.instanceId === targetId ? { ...m, currentHealth: Math.max(0, (m.currentHealth ?? 0) - amount) } : m
        ),
      };
      s = processDeaths(s);
    }
  }
  return checkCombatEnd(s);
}

// ─── checkCombatEnd ──────────────────────────────────────────────────────────

import { logEvent } from './telemetry';

export function checkCombatEnd(state: CombatState): CombatState {
  // Only emit a telemetry event on the transition into a terminal phase,
  // not on subsequent calls in the same terminal state.
  if (state.playerHealth <= 0 && state.phase !== 'combat_end_loss') {
    logEvent('combat_end', {
      victory: false,
      faction: state.playerFaction,
      enemyId: state.enemy.id,
      enemyName: state.enemy.name,
      enemyHpRemaining: state.enemy.currentHealth,
      turn: state.turn,
    });
    return log({ ...state, phase: 'combat_end_loss' }, 'You have been defeated!');
  }
  if (state.enemy.currentHealth <= 0 && state.phase !== 'combat_end_win') {
    logEvent('combat_end', {
      victory: true,
      faction: state.playerFaction,
      enemyId: state.enemy.id,
      enemyName: state.enemy.name,
      playerHpRemaining: state.playerHealth,
      turn: state.turn,
    });
    return log({ ...state, phase: 'combat_end_win' }, `${state.enemy.name} defeated!`);
  }
  return state;
}

// Export helpers for tests / relics
// addEffect is exported inline at its declaration; export the rest here.
export { removeEffect, getStack as getStatusStack, uid as generateId, clamp };
