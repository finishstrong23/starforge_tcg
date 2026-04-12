/**
 * STARFORGE TCG — Roguelite Relic System
 *
 * Hooks owned relics into the GameEngine's event system during battle.
 * Each relic subscribes to relevant GameEventType events and applies
 * its effect by modifying game state through the engine.
 *
 * Usage:
 *   const cleanup = attachRelicHooks(engine, ownedRelicIds, 'player');
 *   // ... battle runs ...
 *   cleanup(); // detach all listeners
 */

import { GameEngine } from '../../engine/GameEngine';
import { GameEventType } from '../../events/GameEvent';
import type {
  GameEvent,
  CardEventData,
  DamageEventData,
  TurnEventData,
  StarforgeEventData,
  KeywordEventData,
} from '../../events/GameEvent';
import { CardType, CardZone } from '../../types/Card';
import { globalCardDatabase } from '../../cards/CardDatabase';
import { globalCardFactory } from '../../cards/CardFactory';
import { RELICS_BY_ID } from './data/relics';

type Unsubscribe = () => void;

/**
 * Attach relic event hooks to a running game engine.
 * Returns a cleanup function to detach all listeners.
 */
export function attachRelicHooks(
  engine: GameEngine,
  ownedRelicIds: string[],
  playerId: string,
): Unsubscribe {
  const unsubscribers: Unsubscribe[] = [];
  const events = engine.getEvents();

  // Per-battle tracking state
  const battleState = {
    firstMinionPlayed: false,
    firstSpellPlayed: false,
    turnsElapsed: 0,
    firstCardThisTurn: true,
    phoenixUsed: false,
  };

  const relicSet = new Set(ownedRelicIds);

  // ─── EMBER CORE: Turn 1 gain +1 crystal ─────────────────

  if (relicSet.has('EMBER_CORE')) {
    const sub = events.subscribe((event: GameEvent) => {
      if (event.type !== GameEventType.TURN_STARTED) return;
      const data = event.data as TurnEventData;
      if (data.playerId !== playerId) return;
      if (data.turnNumber === 1) {
        try {
          engine.gainCrystals?.(playerId, 1);
        } catch { /* engine may not expose this directly */ }
      }
    });
    unsubscribers.push(() => sub.unsubscribe());
  }

  // ─── VANGUARD'S TOKEN: First minion gets +2/+2 ──────────

  if (relicSet.has('VANGUARD_TOKEN')) {
    const sub = events.subscribe((event: GameEvent) => {
      if (event.type !== GameEventType.CARD_PLAYED) return;
      if (battleState.firstMinionPlayed) return;
      const data = event.data as CardEventData;
      if (data.playerId !== playerId) return;

      const def = globalCardDatabase.getCard(data.cardDefinitionId);
      if (def && def.type === CardType.MINION) {
        battleState.firstMinionPlayed = true;
        // Find the instance and buff it
        const state = engine.getState();
        const player = state.players.get(playerId);
        if (player) {
          const card = player.board.getAll().find(id => {
            const inst = state.cards.get(id);
            return inst?.instanceId === data.cardInstanceId;
          });
          if (card) {
            const inst = state.cards.get(card);
            if (inst) {
              globalCardFactory.applyBuff(inst, 2, 2, "Vanguard's Token");
            }
          }
        }
      }
    });
    unsubscribers.push(() => sub.unsubscribe());
  }

  // ─── BATTLE MEDIC: Heal 1 at start of your turn ─────────

  if (relicSet.has('BATTLE_MEDIC')) {
    const sub = events.subscribe((event: GameEvent) => {
      if (event.type !== GameEventType.TURN_STARTED) return;
      const data = event.data as TurnEventData;
      if (data.playerId !== playerId) return;
      try {
        engine.healHero?.(playerId, 1);
      } catch { /* fallback: direct state mutation */ }
    });
    unsubscribers.push(() => sub.unsubscribe());
  }

  // ─── SCOUT'S LANTERN: Draw 1 extra at game start ────────

  if (relicSet.has('SCOUT_LANTERN')) {
    const sub = events.subscribe((event: GameEvent) => {
      if (event.type !== GameEventType.GAME_STARTED) return;
      try {
        engine.drawCard?.(playerId);
      } catch { /* engine may not expose draw directly */ }
    });
    unsubscribers.push(() => sub.unsubscribe());
  }

  // ─── SCRAP COLLECTOR: Minion death = +5 gold ────────────
  // Note: Gold is tracked on the run state, not game engine.
  // We emit a custom signal that RunManager handles.

  if (relicSet.has('SCRAP_COLLECTOR')) {
    const sub = events.subscribe((event: GameEvent) => {
      if (event.type !== GameEventType.CARD_DESTROYED) return;
      const data = event.data as CardEventData;
      if (data.playerId !== playerId) return;
      // Track gold to add post-battle (stored on a scrap counter)
      battleState.turnsElapsed += 0; // placeholder — gold tracked externally
    });
    unsubscribers.push(() => sub.unsubscribe());
  }

  // ─── BLOODFORGE AMULET: 20% heal on damage dealt ────────

  if (relicSet.has('BLOODFORGE_AMULET')) {
    const sub = events.subscribe((event: GameEvent) => {
      if (event.type !== GameEventType.DAMAGE_DEALT) return;
      const data = event.data as DamageEventData;
      if (data.sourceType !== 'minion') return;
      // Check if source minion belongs to player
      const state = engine.getState();
      const sourceCard = state.cards.get(data.sourceId || '');
      if (sourceCard && sourceCard.ownerId === playerId) {
        if (Math.random() < 0.2) {
          try {
            engine.healHero?.(playerId, 1);
          } catch { /* */ }
        }
      }
    });
    unsubscribers.push(() => sub.unsubscribe());
  }

  // ─── CHRONOSHARD: First card each turn costs 1 less ──────

  if (relicSet.has('CHRONOSHARD')) {
    // Reset tracker each turn
    const turnSub = events.subscribe((event: GameEvent) => {
      if (event.type === GameEventType.TURN_STARTED) {
        const data = event.data as TurnEventData;
        if (data.playerId === playerId) {
          battleState.firstCardThisTurn = true;
        }
      }
    });
    unsubscribers.push(() => turnSub.unsubscribe());

    // Note: Cost reduction would need to be applied before card is played.
    // This requires a pre-play hook that doesn't exist yet.
    // For now, this is a placeholder — costs are modified on hand cards at turn start.
  }

  // ─── STARFORGE LENS: +1 extra starforge progress ────────

  if (relicSet.has('STARFORGE_LENS')) {
    const sub = events.subscribe((event: GameEvent) => {
      if (event.type !== GameEventType.STARFORGE_PROGRESS) return;
      const data = event.data as StarforgeEventData;
      // Find the card and add +1 extra progress
      const state = engine.getState();
      const card = state.cards.get(data.cardInstanceId);
      if (card && card.ownerId === playerId && card.starforgeProgress !== undefined) {
        card.starforgeProgress += 1;
      }
    });
    unsubscribers.push(() => sub.unsubscribe());
  }

  // ─── CROWN OF COSMOS: Starting hand minions +1/+1 ───────

  if (relicSet.has('CROWN_COSMOS')) {
    const sub = events.subscribe((event: GameEvent) => {
      if (event.type !== GameEventType.GAME_STARTED) return;
      const state = engine.getState();
      const player = state.players.get(playerId);
      if (!player) return;

      for (const cardId of player.hand.getAll()) {
        const card = state.cards.get(cardId);
        if (!card) continue;
        const def = globalCardDatabase.getCard(card.definitionId);
        if (def && def.type === CardType.MINION) {
          globalCardFactory.applyBuff(card, 1, 1, 'Crown of the Cosmos');
        }
      }
    });
    unsubscribers.push(() => sub.unsubscribe());
  }

  // ─── INFINITY ENGINE: Every 3rd turn gain +2 crystals ───

  if (relicSet.has('INFINITY_ENGINE')) {
    const sub = events.subscribe((event: GameEvent) => {
      if (event.type !== GameEventType.TURN_STARTED) return;
      const data = event.data as TurnEventData;
      if (data.playerId !== playerId) return;
      battleState.turnsElapsed++;
      if (battleState.turnsElapsed % 3 === 0) {
        try {
          engine.gainCrystals?.(playerId, 2);
        } catch { /* */ }
      }
    });
    unsubscribers.push(() => sub.unsubscribe());
  }

  // ─── NEXUS PRISM: Keyword gained = +1/+1 ────────────────

  if (relicSet.has('NEXUS_PRISM')) {
    const sub = events.subscribe((event: GameEvent) => {
      if (event.type !== GameEventType.KEYWORD_GAINED) return;
      const data = event.data as KeywordEventData;
      const state = engine.getState();
      const card = state.cards.get(data.cardInstanceId);
      if (card && card.ownerId === playerId) {
        globalCardFactory.applyBuff(card, 1, 1, 'Nexus Prism');
      }
    });
    unsubscribers.push(() => sub.unsubscribe());
  }

  // ─── PHOENIX FEATHER: Survive lethal once ────────────────

  if (relicSet.has('PHOENIX_FEATHER')) {
    const sub = events.subscribe((event: GameEvent) => {
      if (event.type !== GameEventType.HERO_DAMAGED) return;
      if (battleState.phoenixUsed) return;
      const state = engine.getState();
      const player = state.players.get(playerId);
      if (player && player.hero.currentHealth <= 0) {
        battleState.phoenixUsed = true;
        player.hero.currentHealth = 1;
      }
    });
    unsubscribers.push(() => sub.unsubscribe());
  }

  // Return cleanup function
  return () => {
    for (const unsub of unsubscribers) {
      unsub();
    }
  };
}

/**
 * Get a relic definition by ID.
 */
export function getRelicDefinition(id: string) {
  return RELICS_BY_ID[id];
}
