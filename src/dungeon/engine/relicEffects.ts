import type {
  CardInstance,
  CombatState,
  RelicDefinition,
  RelicTrigger,
  RunState,
  StatusEffectType,
} from '../types';
import { CARD_POOL } from '../data/cards';
import { createCardInstance } from './draft';
import { getCardText } from './cardStats';
import { addHeat } from './heat';

// ─── Context types ────────────────────────────────────────────────────────────

export interface RelicContext {
  cardPlayed?: CardInstance;       // on_card_play
  retainedCount?: number;          // turn_end: cards kept in hand
  combatIndex?: number;            // running total of combats (for every-3rd relics)
  killed?: boolean;                // on_kill: an enemy just died
  /** RNG for random relic effects. Combat call sites pass the persisted
   *  combat stream so effects replay deterministically after a refresh. */
  rng?: () => number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hasRelic(relics: RelicDefinition[], id: string): boolean {
  return relics.some((r) => r.id === id);
}

function addLog(state: CombatState, msg: string): CombatState {
  const combatLog = [...state.combatLog, msg].slice(-8);
  return { ...state, combatLog, lastAction: msg };
}

function pickRandom<T>(arr: T[], rng: () => number = Math.random): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(rng() * arr.length)];
}

const FLUX_STATES: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];

// ─── Combat-state relic effects ───────────────────────────────────────────────

export function applyRelicsToCombat(
  trigger: RelicTrigger,
  relics: RelicDefinition[],
  state: CombatState,
  ctx: RelicContext = {},
): CombatState {
  let s = state;
  const rng = ctx.rng ?? Math.random;

  switch (trigger) {
    // ── combat_start ──────────────────────────────────────────────────────────
    case 'combat_start': {
      // R-S01 Forgeheart Ember: gain 2 Heat.
      if (hasRelic(relics, 'R-S01')) {
        const heat = addHeat(s.playerHeat, 2);
        s = { ...s, playerHeat: heat.next };
        s = addLog(s, heat.wasted > 0 ? 'Forgeheart Ember: Heat capped' : 'Forgeheart Ember: +2 Heat');
      }

      // R-C02 Fueled Boots: +1 Energy on first turn
      if (hasRelic(relics, 'R-C02')) {
        s = { ...s, playerEnergy: s.playerEnergy + 1 };
        s = addLog(s, 'Fueled Boots: +1 Energy');
      }

      // R-C03 Stasis Cube: add 1 random Block/Skill card to hand from pool
      if (hasRelic(relics, 'R-C03')) {
        const blockCards = CARD_POOL.filter(
          (c) => c.type === 'Skill' && c.cardText.toLowerCase().includes('block'),
        );
        const def = pickRandom(blockCards, rng);
        if (def) {
          s = { ...s, hand: [...s.hand, createCardInstance(def)] };
          s = addLog(s, `Stasis Cube: added ${def.name} to hand`);
        }
      }

      // R-C05 Archivist's Orb: draw 1 additional card (move top of drawPile to hand)
      if (hasRelic(relics, 'R-C05') && s.drawPile.length > 0) {
        const [card, ...rest] = s.drawPile;
        s = { ...s, hand: [...s.hand, card], drawPile: rest };
        s = addLog(s, `Archivist's Orb: drew ${card.name}`);
      }

      // R-C08 Sparkthief's Glove: arm the once-per-combat first-Attack bonus.
      // playCard consumes the flag and patches +3 onto the first Attack.
      if (hasRelic(relics, 'R-C08')) {
        s = { ...s, sparkthiefPending: true };
        s = addLog(s, 'Sparkthief\'s Glove: first Attack deals +3');
      }

      // R-S04 Navigator's Bone: force-reroll one Flux card in hand.
      if (hasRelic(relics, 'R-S04')) {
        const fluxInHand = s.hand.filter((c) => /^\s*flux\./i.test(getCardText(c)));
        const target = pickRandom(fluxInHand, rng);
        if (target) {
          const newState = FLUX_STATES[Math.floor(rng() * 3)];
          s = {
            ...s,
            hand: s.hand.map((c) =>
              c.instanceId === target.instanceId ? { ...c, fluxState: newState } : c,
            ),
          };
          s = addLog(s, `Navigator's Bone: ${target.name} rerolled to ${newState}`);
        }
      }

      // R-U01 Forgemaster's Sigil: first card played this combat gains +2 damage/block
      if (hasRelic(relics, 'R-U01')) {
        s = { ...s, forgemasterSigilPending: true };
        s = addLog(s, 'Forgemaster\'s Sigil: first card played gains +2');
      }

      // R-U03 Void Compass: preview enemy intent rotation
      if (hasRelic(relics, 'R-U03')) {
        const intents = s.enemy.intents.slice(0, 3).map((i) => i.description).join(' -> ');
        s = addLog(s, `Void Compass: ${intents}`);
      }

      // R-U04 Overclocked Core: +1 Energy (Max HP permanently reduced at run start)
      if (hasRelic(relics, 'R-U04')) {
        s = { ...s, playerEnergy: s.playerEnergy + 1 };
        s = addLog(s, 'Overclocked Core: +1 Energy');
      }

      // R-U05 Cursebreaker's Medallion: remove one random debuff from hand
      if (hasRelic(relics, 'R-U05')) {
        const debuffs: StatusEffectType[] = ['weak', 'vulnerable', 'poison', 'burn'];
        const cardsWithDebuffs = s.hand.filter((c) =>
          c.statusEffects.some((e) => debuffs.includes(e.type)),
        );
        const target = pickRandom(cardsWithDebuffs, rng);
        if (target) {
          const debuffTypes = target.statusEffects.filter((e) => debuffs.includes(e.type));
          const toRemove = pickRandom(debuffTypes, rng);
          s = {
            ...s,
            hand: s.hand.map((c) =>
              c.instanceId === target.instanceId
                ? { ...c, statusEffects: c.statusEffects.filter((e) => e.type !== toRemove?.type) }
                : c,
            ),
          };
          s = addLog(s, `Cursebreaker's Medallion: removed ${toRemove?.type}`);
        }
      }

      // R-R05 Runekeeper's Tome: every 3rd combat, add a random Rare card
      if (hasRelic(relics, 'R-R05') && (ctx.combatIndex ?? 0) > 0 && (ctx.combatIndex ?? 0) % 3 === 0) {
        const rares = CARD_POOL.filter((c) => c.rarity === 'Rare');
        const def = pickRandom(rares, rng);
        if (def) {
          s = { ...s, hand: [...s.hand, createCardInstance(def)] };
          s = addLog(s, `Runekeeper's Tome: added ${def.name}`);
        }
      }

      // R-B01 The Hierophant's Censer: draw 2 extra; all cards cost +1 for
      // the first turn (enforced by playCard via costPenaltyThisTurn,
      // cleared at the end of turn 1).
      if (hasRelic(relics, 'R-B01')) {
        const drawn: CardInstance[] = [];
        let pile = [...s.drawPile];
        for (let i = 0; i < 2 && pile.length > 0; i++) {
          drawn.push(pile[0]);
          pile = pile.slice(1);
        }
        s = { ...s, hand: [...s.hand, ...drawn], drawPile: pile, costPenaltyThisTurn: 1 };
        s = addLog(s, `Hierophant's Censer: drew ${drawn.length} extra; all cards cost +1 this turn`);
      }

      // R-B03 Heartwake Echo: copy a random relic's combat_start effect
      // (recursive call with a randomly chosen relic, excluding itself and other boss relics)
      if (hasRelic(relics, 'R-B03')) {
        const eligible = relics.filter(
          (r) => r.id !== 'R-B03' && r.trigger === 'combat_start',
        );
        const echo = pickRandom(eligible, rng);
        if (echo) {
          s = applyRelicsToCombat('combat_start', [echo], s, ctx);
          s = addLog(s, `Heartwake Echo: copied ${echo.name}`);
        }
      }

      break;
    }

    // ── turn_start ────────────────────────────────────────────────────────────
    case 'turn_start': {
      // R-R04 The Unmoored Eye: lock one Flux card in hand — it keeps its
      // current state and no longer rotates between turns.
      if (hasRelic(relics, 'R-R04')) {
        const fluxCards = s.hand.filter(
          (c) => /^\s*flux\./i.test(getCardText(c)) && !c.fluxLocked,
        );
        const card = pickRandom(fluxCards, rng);
        if (card) {
          s = {
            ...s,
            hand: s.hand.map((c) =>
              c.instanceId === card.instanceId ? { ...c, fluxLocked: true } : c,
            ),
          };
          s = addLog(s, `Unmoored Eye: ${card.name} locked to state ${card.fluxState ?? 'A'}`);
        }
      }
      break;
    }

    // ── turn_end ──────────────────────────────────────────────────────────────
    case 'turn_end': {
      // R-U02 Starseer's Pendant: gain 1 Block per retained card
      if (hasRelic(relics, 'R-U02') && (ctx.retainedCount ?? 0) > 0) {
        const block = ctx.retainedCount ?? 0;
        s = { ...s, playerShield: s.playerShield + block };
        s = addLog(s, `Starseer's Pendant: +${block} Block from retained cards`);
      }
      break;
    }

    // ── on_card_play ──────────────────────────────────────────────────────────
    case 'on_card_play': {
      // R-C06 Stasis Coil: 10% chance the played card costs 1 less — the
      // cost was already paid, so refund 1 energy.
      if (hasRelic(relics, 'R-C06') && rng() < 0.1) {
        s = { ...s, playerEnergy: s.playerEnergy + 1 };
        s = addLog(s, 'Stasis Coil: refunded 1 Energy');
      }

      // R-A01 Shard of the Choir: take 1 damage whenever any card is played
      if (hasRelic(relics, 'R-A01')) {
        s = { ...s, playerHealth: Math.max(0, s.playerHealth - 1) };
        s = addLog(s, 'Shard of the Choir: took 1 damage');

        // If a Flux card shifted, deal 2 damage to enemy
        if (ctx.cardPlayed && getCardText(ctx.cardPlayed).toLowerCase().includes('flux')) {
          s = {
            ...s,
            enemy: {
              ...s.enemy,
              currentHealth: Math.max(0, s.enemy.currentHealth - 2),
            },
          };
          s = addLog(s, 'Shard of the Choir: Flux shift deals 2 damage');
        }
      }
      break;
    }

    // ── on_kill ───────────────────────────────────────────────────────────────
    case 'on_kill': {
      // R-B02 Spire-Glass Lens: +1 Max HP on kill; cannot heal this combat (logged)
      if (hasRelic(relics, 'R-B02') && ctx.killed) {
        s = {
          ...s,
          playerMaxHealth: s.playerMaxHealth + 1,
          playerHealth: Math.min(s.playerHealth, s.playerMaxHealth + 1),
        };
        s = addLog(s, 'Spire-Glass Lens: +1 Max HP; cannot heal this combat');
      }
      break;
    }

    // ── passive / run_start / on_rest / on_shop ───────────────────────────────
    // These either have no CombatState effect or are enforced elsewhere.
    case 'passive':
    case 'run_start':
    case 'on_heal':
    case 'on_damage_taken':
    case 'on_rest':
    case 'on_shop':
    case 'on_death':
    case 'combat_end':
      break;
  }

  return s;
}

// ─── Run-state relic effects ──────────────────────────────────────────────────

export function applyRelicsToRun(
  trigger: RelicTrigger,
  relics: RelicDefinition[],
  state: RunState,
  _ctx: RelicContext = {},
): RunState {
  let r = state;

  switch (trigger) {
    // ── run_start ─────────────────────────────────────────────────────────────
    case 'run_start': {
      // R-C01 Ironbark Amulet: Max HP +8
      if (hasRelic(relics, 'R-C01')) {
        r = { ...r, maxHealth: r.maxHealth + 8, currentHealth: r.currentHealth + 8 };
      }

      // R-U04 Overclocked Core: lose 5 Max HP permanently
      if (hasRelic(relics, 'R-U04')) {
        const newMax = Math.max(1, r.maxHealth - 5);
        r = { ...r, maxHealth: newMax, currentHealth: Math.min(r.currentHealth, newMax) };
      }

      // R-B03 Heartwake Echo: permanently lose 10% max HP (on acquisition/run start)
      if (hasRelic(relics, 'R-B03')) {
        const newMax = Math.max(1, Math.floor(r.maxHealth * 0.9));
        r = { ...r, maxHealth: newMax, currentHealth: Math.min(r.currentHealth, newMax) };
      }
      break;
    }

    // ── combat_end ────────────────────────────────────────────────────────────
    case 'combat_end': {
      // R-C04 Preserver's Salve: heal 2 HP
      if (hasRelic(relics, 'R-C04')) {
        r = { ...r, currentHealth: Math.min(r.currentHealth + 2, r.maxHealth) };
      }

      // R-C07 Gutterspeak Coin: gain 1 gold
      if (hasRelic(relics, 'R-C07')) {
        r = { ...r, gold: r.gold + 1 };
      }
      break;
    }

    default:
      break;
  }

  return r;
}

// ─── Unified entry point (kept for backwards compatibility) ───────────────────

export function applyRelicTrigger(
  trigger: RelicTrigger,
  relics: RelicDefinition[],
  state: CombatState | RunState,
  context?: RelicContext,
): CombatState | RunState {
  // Discriminate by RunState-only field
  if ('phase' in state && 'combatState' in state) {
    // RunState
    return applyRelicsToRun(trigger, relics, state as RunState, context);
  }
  // CombatState
  return applyRelicsToCombat(trigger, relics, state as CombatState, context);
}
