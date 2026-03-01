/**
 * STARFORGE TCG - EffectResolver Tests
 *
 * Tests the EffectResolver class which executes card effects (spells, DEPLOY triggers).
 * The EffectResolver is accessed indirectly through the GameEngine: we create cards with
 * specific effects in their definitions and play them via processAction(PLAY_CARD).
 */

import {
  GameEngine,
  initializeSampleDatabase,
  globalCardDatabase,
  globalCardFactory,
  Race,
  GamePhase,
  GameStatus,
  ActionType,
  CardZone,
  CardType,
  CardRarity,
  TriggerKeyword,
  CombatKeyword,
  EffectType,
  EffectTrigger,
  TargetType,
} from '../../src';
import type {
  CardDefinition,
  CardInstance,
  DamageEffectData,
  DrawEffectData,
  SummonEffectData,
  BuffEffectData,
  HealEffectData,
  GenericEffectData,
} from '../../src';
import { GameStateManager, PlayerSetup } from '../../src/game/GameState';

// ─── Test Card Definitions ──────────────────────────────────────────────

const TEST_CARDS: CardDefinition[] = [
  // Vanilla minion (no keywords)
  {
    id: 'test_vanilla_2_2',
    name: 'Test Vanilla',
    cost: 1,
    type: CardType.MINION,
    rarity: CardRarity.COMMON,
    attack: 2,
    health: 2,
    keywords: [],
    effects: [],
    cardText: '',
    collectible: true,
    set: 'TEST',
  },
  // Vanilla with 1 health (easy to kill)
  {
    id: 'test_vanilla_1_1',
    name: 'Test Wisp',
    cost: 0,
    type: CardType.MINION,
    rarity: CardRarity.COMMON,
    attack: 1,
    health: 1,
    keywords: [],
    effects: [],
    cardText: '',
    collectible: true,
    set: 'TEST',
  },
  // Big vanilla (won't die easily)
  {
    id: 'test_vanilla_5_5',
    name: 'Test Big',
    cost: 5,
    type: CardType.MINION,
    rarity: CardRarity.COMMON,
    attack: 5,
    health: 5,
    keywords: [],
    effects: [],
    cardText: '',
    collectible: true,
    set: 'TEST',
  },
  // DEPLOY: Deal 2 damage to all enemy minions
  {
    id: 'test_deploy_aoe',
    name: 'Test Deploy AoE',
    cost: 3,
    type: CardType.MINION,
    rarity: CardRarity.RARE,
    attack: 2,
    health: 2,
    keywords: [{ keyword: TriggerKeyword.DEPLOY }],
    effects: [{
      id: 'deploy_aoe',
      type: EffectType.DAMAGE,
      trigger: EffectTrigger.ON_PLAY,
      targetType: TargetType.ALL_ENEMY_MINIONS,
      data: { amount: 2 } as DamageEffectData,
      isMandatory: true,
    }],
    cardText: 'Deploy: Deal 2 to all enemies',
    collectible: true,
    set: 'TEST',
  },
  // DEPLOY: Draw 2 cards
  {
    id: 'test_deploy_draw',
    name: 'Test Deploy Draw',
    cost: 3,
    type: CardType.MINION,
    rarity: CardRarity.RARE,
    attack: 2,
    health: 2,
    keywords: [{ keyword: TriggerKeyword.DEPLOY }],
    effects: [{
      id: 'deploy_draw',
      type: EffectType.DRAW,
      trigger: EffectTrigger.ON_PLAY,
      targetType: TargetType.NONE,
      data: { count: 2 } as DrawEffectData,
      isMandatory: true,
    }],
    cardText: 'Deploy: Draw 2 cards',
    collectible: true,
    set: 'TEST',
  },
  // DEPLOY: Buff all friendly minions +1/+1
  {
    id: 'test_deploy_buff',
    name: 'Test Deploy Buff',
    cost: 4,
    type: CardType.MINION,
    rarity: CardRarity.RARE,
    attack: 2,
    health: 2,
    keywords: [{ keyword: TriggerKeyword.DEPLOY }],
    effects: [{
      id: 'deploy_buff',
      type: EffectType.BUFF,
      trigger: EffectTrigger.ON_PLAY,
      targetType: TargetType.ALL_FRIENDLY_MINIONS,
      data: { attack: 1, health: 1 } as BuffEffectData,
      isMandatory: true,
    }],
    cardText: 'Deploy: Buff friendlies +1/+1',
    collectible: true,
    set: 'TEST',
  },
  // DEPLOY: Heal hero for 5
  {
    id: 'test_deploy_heal',
    name: 'Test Deploy Heal',
    cost: 3,
    type: CardType.MINION,
    rarity: CardRarity.RARE,
    attack: 2,
    health: 2,
    keywords: [{ keyword: TriggerKeyword.DEPLOY }],
    effects: [{
      id: 'deploy_heal',
      type: EffectType.HEAL,
      trigger: EffectTrigger.ON_PLAY,
      targetType: TargetType.FRIENDLY_HERO,
      data: { amount: 5 } as HealEffectData,
      isMandatory: true,
    }],
    cardText: 'Deploy: Heal hero 5',
    collectible: true,
    set: 'TEST',
  },
  // DEPLOY: Summon 2 tokens
  {
    id: 'test_deploy_summon',
    name: 'Test Deploy Summon',
    cost: 4,
    type: CardType.MINION,
    rarity: CardRarity.RARE,
    attack: 2,
    health: 2,
    keywords: [{ keyword: TriggerKeyword.DEPLOY }],
    effects: [{
      id: 'deploy_summon',
      type: EffectType.SUMMON,
      trigger: EffectTrigger.ON_PLAY,
      targetType: TargetType.NONE,
      data: { cardId: 'test_vanilla_1_1', count: 2 } as SummonEffectData,
      isMandatory: true,
    }],
    cardText: 'Deploy: Summon 2 tokens',
    collectible: true,
    set: 'TEST',
  },
  // Spell: Deal 3 damage to a chosen target
  {
    id: 'test_spell_damage',
    name: 'Test Bolt',
    cost: 2,
    type: CardType.SPELL,
    rarity: CardRarity.COMMON,
    keywords: [],
    effects: [{
      id: 'spell_dmg',
      type: EffectType.DAMAGE,
      trigger: EffectTrigger.ON_PLAY,
      targetType: TargetType.CHOSEN,
      data: { amount: 3 } as DamageEffectData,
      isMandatory: true,
    }],
    cardText: 'Deal 3 damage',
    collectible: true,
    set: 'TEST',
  },
  // Spell: Silence a minion
  {
    id: 'test_spell_silence',
    name: 'Test Silence',
    cost: 1,
    type: CardType.SPELL,
    rarity: CardRarity.COMMON,
    keywords: [],
    effects: [{
      id: 'spell_silence',
      type: EffectType.SILENCE,
      trigger: EffectTrigger.ON_PLAY,
      targetType: TargetType.CHOSEN,
      data: {} as GenericEffectData,
      isMandatory: true,
    }],
    cardText: 'Silence a minion',
    collectible: true,
    set: 'TEST',
  },
  // Spell: Destroy a minion
  {
    id: 'test_spell_destroy',
    name: 'Test Destroy',
    cost: 5,
    type: CardType.SPELL,
    rarity: CardRarity.RARE,
    keywords: [],
    effects: [{
      id: 'spell_destroy',
      type: EffectType.DESTROY,
      trigger: EffectTrigger.ON_PLAY,
      targetType: TargetType.CHOSEN,
      data: {} as GenericEffectData,
      isMandatory: true,
    }],
    cardText: 'Destroy a minion',
    collectible: true,
    set: 'TEST',
  },
  // Spell: Return a minion to hand
  {
    id: 'test_spell_bounce',
    name: 'Test Bounce',
    cost: 2,
    type: CardType.SPELL,
    rarity: CardRarity.COMMON,
    keywords: [],
    effects: [{
      id: 'spell_bounce',
      type: EffectType.RETURN_TO_HAND,
      trigger: EffectTrigger.ON_PLAY,
      targetType: TargetType.CHOSEN,
      data: {} as GenericEffectData,
      isMandatory: true,
    }],
    cardText: 'Return a minion to hand',
    collectible: true,
    set: 'TEST',
  },
  // Spell: Gain 1 crystal
  {
    id: 'test_spell_crystal',
    name: 'Test Crystal',
    cost: 0,
    type: CardType.SPELL,
    rarity: CardRarity.COMMON,
    keywords: [],
    effects: [{
      id: 'spell_crystal',
      type: EffectType.GAIN_CRYSTALS,
      trigger: EffectTrigger.ON_PLAY,
      targetType: TargetType.NONE,
      data: { amount: 1 } as any,
      isMandatory: true,
    }],
    cardText: 'Gain 1 crystal',
    collectible: true,
    set: 'TEST',
  },
  // Spell: Grant GUARDIAN keyword to a minion
  {
    id: 'test_spell_grant_kw',
    name: 'Test Grant',
    cost: 1,
    type: CardType.SPELL,
    rarity: CardRarity.COMMON,
    keywords: [],
    effects: [{
      id: 'spell_grant',
      type: EffectType.GRANT_KEYWORD,
      trigger: EffectTrigger.ON_PLAY,
      targetType: TargetType.CHOSEN,
      data: { keywords: [{ keyword: CombatKeyword.GUARDIAN }] } as any,
      isMandatory: true,
    }],
    cardText: 'Grant Guardian',
    collectible: true,
    set: 'TEST',
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Set up a minimal game engine with test cards registered.
 * Returns a started game with both players in MAIN phase.
 */
function setupTestGame(): GameEngine {
  globalCardDatabase.clear();
  initializeSampleDatabase();
  globalCardDatabase.registerCards(TEST_CARDS);

  const engine = new GameEngine();

  // Build minimal 30-card decks from vanilla test cards
  const buildDeck = (playerId: string): CardInstance[] => {
    const cards: CardInstance[] = [];
    for (let i = 0; i < 30; i++) {
      cards.push(globalCardFactory.createInstance('test_vanilla_2_2', { ownerId: playerId }));
    }
    return cards;
  };

  const p1Setup: PlayerSetup = {
    id: 'player1',
    name: 'Player 1',
    race: Race.COGSMITHS,
    heroId: '',
    deck: buildDeck('player1'),
  };

  const p2Setup: PlayerSetup = {
    id: 'player2',
    name: 'Player 2',
    race: Race.LUMINAR,
    heroId: '',
    deck: buildDeck('player2'),
  };

  engine.initializeGame(p1Setup, p2Setup);
  engine.startGame();

  return engine;
}

/**
 * Place a card on a player's board directly (bypassing hand/play flow).
 */
function placeOnBoard(engine: GameEngine, definitionId: string, ownerId: string): CardInstance {
  const card = globalCardFactory.createInstance(definitionId, { ownerId });
  const board = engine.getStateManager().getBoard();
  const state = engine.getStateManager().getState();

  board.registerCard(card);
  (state.cards as Map<string, CardInstance>).set(card.instanceId, card);
  board.moveCardDirectToBoard(ownerId, card.instanceId);
  card.summonedThisTurn = false;

  return card;
}

/**
 * Play a card from hand by creating a card instance, placing it in the player's hand,
 * ensuring the player has enough crystals, and issuing a PLAY_CARD action.
 */
function playCardFromHand(engine: GameEngine, playerId: string, cardDefId: string, targetId?: string): CardInstance {
  const card = globalCardFactory.createInstance(cardDefId, { ownerId: playerId });
  const board = engine.getStateManager().getBoard();
  const state = engine.getStateManager().getState();

  board.registerCard(card);
  (state.cards as Map<string, CardInstance>).set(card.instanceId, card);

  // Add to hand zone
  const zones = board.getPlayerZones(playerId);
  zones.hand.add(card.instanceId);
  card.zone = CardZone.HAND;

  // Ensure player has enough crystals
  const player = engine.getStateManager().getPlayer(playerId);
  player.crystals.current = Math.max(player.crystals.current, card.currentCost + 1);
  player.crystals.maximum = Math.max(player.crystals.maximum, card.currentCost + 1);

  // Ensure it is this player's turn
  const activeId = engine.getStateManager().getActivePlayerId();
  if (activeId !== playerId) {
    engine.processAction({
      type: ActionType.END_TURN,
      playerId: activeId,
      timestamp: Date.now(),
      data: {},
    });
  }

  // Process the play
  engine.processAction({
    type: ActionType.PLAY_CARD,
    playerId,
    timestamp: Date.now(),
    data: {
      cardInstanceId: card.instanceId,
      position: 0,
      targetId,
    },
  });

  return card;
}

// ─── Tests ──────────────────────────────────────────────────────────────

describe('EffectResolver', () => {

  // ─── DEPLOY Effects (Minion Play Triggers) ────────────────────────────

  describe('DEPLOY Effects', () => {
    it('should deal 2 damage to all enemy minions via Deploy AoE', () => {
      const engine = setupTestGame();
      const board = engine.getStateManager().getBoard();

      // Place enemy minions on the opponent's board
      const enemy1 = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');
      const enemy2 = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');

      const e1HealthBefore = enemy1.currentHealth!;
      const e2HealthBefore = enemy2.currentHealth!;

      // Play Deploy AoE minion from player1's hand
      playCardFromHand(engine, 'player1', 'test_deploy_aoe');

      // Both enemy minions should have taken 2 damage
      expect(enemy1.currentHealth).toBe(e1HealthBefore - 2);
      expect(enemy2.currentHealth).toBe(e2HealthBefore - 2);
    });

    it('should draw 2 cards via Deploy Draw', () => {
      const engine = setupTestGame();
      const board = engine.getStateManager().getBoard();
      const stateManager = engine.getStateManager();

      // Ensure it is player1's turn before measuring hand size,
      // so that any turn-start draw has already happened.
      const activeId = stateManager.getActivePlayerId();
      if (activeId !== 'player1') {
        engine.processAction({
          type: ActionType.END_TURN,
          playerId: activeId,
          timestamp: Date.now(),
          data: {},
        });
      }

      // Now create the card and put it in hand manually (same as playCardFromHand
      // but split so we can measure hand AFTER the card is added but BEFORE play).
      const card = globalCardFactory.createInstance('test_deploy_draw', { ownerId: 'player1' });
      const state = stateManager.getState();
      board.registerCard(card);
      (state.cards as Map<string, CardInstance>).set(card.instanceId, card);
      const zones = board.getPlayerZones('player1');
      zones.hand.add(card.instanceId);
      card.zone = CardZone.HAND;

      const player = stateManager.getPlayer('player1');
      player.crystals.current = Math.max(player.crystals.current, card.currentCost + 1);
      player.crystals.maximum = Math.max(player.crystals.maximum, card.currentCost + 1);

      // Measure hand size AFTER card is in hand but BEFORE playing it
      const handBefore = board.getHandCount('player1');

      engine.processAction({
        type: ActionType.PLAY_CARD,
        playerId: 'player1',
        timestamp: Date.now(),
        data: { cardInstanceId: card.instanceId, position: 0 },
      });

      // Hand count: -1 (played the card) + 2 (drew 2 from deploy) = net +1
      const handAfter = board.getHandCount('player1');
      expect(handAfter).toBe(handBefore - 1 + 2);
    });

    it('should buff all friendly minions +1/+1 via Deploy Buff', () => {
      const engine = setupTestGame();

      // Place friendly minions on player1's board first
      const friendly1 = placeOnBoard(engine, 'test_vanilla_2_2', 'player1');
      const friendly2 = placeOnBoard(engine, 'test_vanilla_5_5', 'player1');

      const f1AtkBefore = friendly1.currentAttack!;
      const f1HpBefore = friendly1.currentHealth!;
      const f2AtkBefore = friendly2.currentAttack!;
      const f2HpBefore = friendly2.currentHealth!;

      // Play Deploy Buff minion
      playCardFromHand(engine, 'player1', 'test_deploy_buff');

      // Both friendly minions should have gained +1/+1
      expect(friendly1.currentAttack).toBe(f1AtkBefore + 1);
      expect(friendly1.currentHealth).toBe(f1HpBefore + 1);
      expect(friendly2.currentAttack).toBe(f2AtkBefore + 1);
      expect(friendly2.currentHealth).toBe(f2HpBefore + 1);
    });

    it('should heal hero for 5 via Deploy Heal', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Damage hero first so healing has room to work
      stateManager.damageHero('player1', 10);
      const healthBefore = stateManager.getPlayer('player1').hero.currentHealth;

      // Play Deploy Heal minion
      playCardFromHand(engine, 'player1', 'test_deploy_heal');

      const healthAfter = stateManager.getPlayer('player1').hero.currentHealth;
      expect(healthAfter).toBe(healthBefore + 5);
    });

    it('should summon 2 tokens via Deploy Summon', () => {
      const engine = setupTestGame();
      const board = engine.getStateManager().getBoard();

      const boardCountBefore = board.getBoardCount('player1');

      // Play Deploy Summon minion
      playCardFromHand(engine, 'player1', 'test_deploy_summon');

      // Board should have: original count + 1 (deployed minion) + 2 (tokens)
      const boardCountAfter = board.getBoardCount('player1');
      expect(boardCountAfter).toBe(boardCountBefore + 1 + 2);
    });
  });

  // ─── Spell Effects ────────────────────────────────────────────────────

  describe('Spell Effects', () => {
    it('should deal 3 damage to a chosen minion target', () => {
      const engine = setupTestGame();

      // Place an enemy minion to target
      const enemy = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');
      const healthBefore = enemy.currentHealth!;

      // Play damage spell targeting the enemy minion
      playCardFromHand(engine, 'player1', 'test_spell_damage', enemy.instanceId);

      expect(enemy.currentHealth).toBe(healthBefore - 3);
    });

    it('should deal 3 damage to the enemy hero', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      const heroHealthBefore = stateManager.getPlayer('player2').hero.currentHealth;

      // Play damage spell targeting the enemy hero
      playCardFromHand(engine, 'player1', 'test_spell_damage', 'hero_player2');

      const heroHealthAfter = stateManager.getPlayer('player2').hero.currentHealth;
      expect(heroHealthAfter).toBe(heroHealthBefore - 3);
    });

    it('should remove all keywords from a silenced minion', () => {
      const engine = setupTestGame();

      // Place a minion with a keyword
      const target = placeOnBoard(engine, 'test_vanilla_2_2', 'player2');
      target.keywords.push({ keyword: CombatKeyword.GUARDIAN });
      target.keywords.push({ keyword: CombatKeyword.DRAIN });

      expect(target.keywords.length).toBe(2);

      // Play silence spell targeting the minion
      playCardFromHand(engine, 'player1', 'test_spell_silence', target.instanceId);

      expect(target.keywords.length).toBe(0);
    });

    it('should set isSilenced = true on a silenced minion', () => {
      const engine = setupTestGame();

      const target = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');
      expect(target.isSilenced).toBe(false);

      // Play silence spell
      playCardFromHand(engine, 'player1', 'test_spell_silence', target.instanceId);

      expect(target.isSilenced).toBe(true);
    });

    it('should destroy a minion (health to 0, moved to graveyard)', () => {
      const engine = setupTestGame();

      const target = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');
      expect(target.zone).toBe(CardZone.BOARD);
      expect(target.currentHealth).toBe(5);

      // Play destroy spell
      playCardFromHand(engine, 'player1', 'test_spell_destroy', target.instanceId);

      // The destroy effect sets health to 0, then death processing moves to graveyard
      expect(target.currentHealth).toBe(0);
      expect(target.zone).toBe(CardZone.GRAVEYARD);
    });

    it('should return a minion to its owner hand (bounce)', () => {
      const engine = setupTestGame();
      const board = engine.getStateManager().getBoard();

      const target = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');
      expect(target.zone).toBe(CardZone.BOARD);

      const handBefore = board.getHandCount('player2');

      // Play bounce spell
      playCardFromHand(engine, 'player1', 'test_spell_bounce', target.instanceId);

      expect(target.zone).toBe(CardZone.HAND);
      expect(board.getHandCount('player2')).toBe(handBefore + 1);
    });

    it('should reset card stats to base values when bounced', () => {
      const engine = setupTestGame();

      const target = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');
      // Modify its stats
      target.currentAttack = 10;
      target.currentHealth = 1;
      target.currentCost = 99;

      // Play bounce spell
      playCardFromHand(engine, 'player1', 'test_spell_bounce', target.instanceId);

      // Stats should be reset to base definition values
      expect(target.currentAttack).toBe(5);
      expect(target.currentHealth).toBe(5);
      expect(target.currentCost).toBe(5);
    });

    it('should increase player crystal max and current via Gain Crystals', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Ensure it is player1's turn
      const activeId = stateManager.getActivePlayerId();
      if (activeId !== 'player1') {
        engine.processAction({
          type: ActionType.END_TURN,
          playerId: activeId,
          timestamp: Date.now(),
          data: {},
        });
      }

      const player = stateManager.getPlayer('player1');
      const maxBefore = player.crystals.maximum;
      const currentBefore = player.crystals.current;

      // Play gain crystal spell (cost 0)
      playCardFromHand(engine, 'player1', 'test_spell_crystal');

      // Maximum and current should each increase by 1 (capped at 10)
      expect(player.crystals.maximum).toBe(Math.min(maxBefore + 1, 10));
      expect(player.crystals.current).toBe(Math.min(currentBefore + 1, 10));
    });

    it('should add GUARDIAN keyword to a minion via Grant Keyword', () => {
      const engine = setupTestGame();

      const target = placeOnBoard(engine, 'test_vanilla_2_2', 'player1');
      expect(target.keywords.length).toBe(0);

      // Play grant keyword spell
      playCardFromHand(engine, 'player1', 'test_spell_grant_kw', target.instanceId);

      // The minion should now have GUARDIAN
      const hasGuardian = target.keywords.some(kw => kw.keyword === CombatKeyword.GUARDIAN);
      expect(hasGuardian).toBe(true);
    });
  });

  // ─── Effect Targeting ─────────────────────────────────────────────────

  describe('Effect Targeting', () => {
    it('ALL_ENEMY_MINIONS targets all enemy board minions', () => {
      const engine = setupTestGame();

      // Place 3 enemy minions
      const e1 = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');
      const e2 = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');
      const e3 = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');

      // Play Deploy AoE (targets ALL_ENEMY_MINIONS with 2 damage)
      playCardFromHand(engine, 'player1', 'test_deploy_aoe');

      // All 3 enemy minions should have taken 2 damage
      expect(e1.currentHealth).toBe(3);
      expect(e2.currentHealth).toBe(3);
      expect(e3.currentHealth).toBe(3);
    });

    it('ALL_FRIENDLY_MINIONS targets all friendly board minions', () => {
      const engine = setupTestGame();

      // Place 2 friendly minions
      const f1 = placeOnBoard(engine, 'test_vanilla_2_2', 'player1');
      const f2 = placeOnBoard(engine, 'test_vanilla_2_2', 'player1');

      // Play Deploy Buff (targets ALL_FRIENDLY_MINIONS with +1/+1)
      const buffMinion = playCardFromHand(engine, 'player1', 'test_deploy_buff');

      // Both pre-existing friendlies should have gotten +1/+1
      expect(f1.currentAttack).toBe(3);
      expect(f1.currentHealth).toBe(3);
      expect(f2.currentAttack).toBe(3);
      expect(f2.currentHealth).toBe(3);
    });

    it('CHOSEN targets the specified targetId', () => {
      const engine = setupTestGame();

      const target = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');
      const notTarget = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');

      // Play damage spell targeting only 'target'
      playCardFromHand(engine, 'player1', 'test_spell_damage', target.instanceId);

      // Only the specified target should be damaged
      expect(target.currentHealth).toBe(2); // 5 - 3
      expect(notTarget.currentHealth).toBe(5); // unchanged
    });

    it('FRIENDLY_HERO targets the player own hero', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Damage player1's hero
      stateManager.damageHero('player1', 10);
      const p1HealthBefore = stateManager.getPlayer('player1').hero.currentHealth;
      const p2HealthBefore = stateManager.getPlayer('player2').hero.currentHealth;

      // Play Deploy Heal (targets FRIENDLY_HERO)
      playCardFromHand(engine, 'player1', 'test_deploy_heal');

      // Player1's hero should heal, player2's should not change
      expect(stateManager.getPlayer('player1').hero.currentHealth).toBe(p1HealthBefore + 5);
      expect(stateManager.getPlayer('player2').hero.currentHealth).toBe(p2HealthBefore);
    });
  });

  // ─── Edge Cases ───────────────────────────────────────────────────────

  describe('Edge Cases', () => {
    it('should not crash when playing a spell with no valid CHOSEN target', () => {
      const engine = setupTestGame();

      // Play damage spell without specifying a targetId (no valid target)
      expect(() => {
        playCardFromHand(engine, 'player1', 'test_spell_damage', undefined);
      }).not.toThrow();
    });

    it('should not crash when playing Deploy AoE on empty enemy board', () => {
      const engine = setupTestGame();
      const board = engine.getStateManager().getBoard();

      // Ensure no enemy minions are on board
      expect(board.getBoardCount('player2')).toBe(0);

      // Playing deploy AoE should work fine even with no targets
      expect(() => {
        playCardFromHand(engine, 'player1', 'test_deploy_aoe');
      }).not.toThrow();
    });

    it('should not crash on cascading effects (Deploy AoE killing enemy minions)', () => {
      const engine = setupTestGame();

      // Place weak enemy minions that will die from AoE
      const weak1 = placeOnBoard(engine, 'test_vanilla_1_1', 'player2');
      const weak2 = placeOnBoard(engine, 'test_vanilla_1_1', 'player2');

      // Playing deploy AoE (2 damage) should kill both 1-health minions
      expect(() => {
        playCardFromHand(engine, 'player1', 'test_deploy_aoe');
      }).not.toThrow();

      // Both should be dead and in graveyard
      expect(weak1.zone).toBe(CardZone.GRAVEYARD);
      expect(weak2.zone).toBe(CardZone.GRAVEYARD);
    });

    it('should handle bounce on a minion that has been buffed', () => {
      const engine = setupTestGame();

      // Place minion and buff it manually
      const target = placeOnBoard(engine, 'test_vanilla_2_2', 'player2');
      target.currentAttack = 8;
      target.currentHealth = 8;
      target.maxHealth = 8;
      target.keywords.push({ keyword: CombatKeyword.GUARDIAN });
      target.isSilenced = false;

      // Bounce it
      playCardFromHand(engine, 'player1', 'test_spell_bounce', target.instanceId);

      // Should be back in hand with base stats
      expect(target.zone).toBe(CardZone.HAND);
      expect(target.currentAttack).toBe(2);
      expect(target.currentHealth).toBe(2);
      expect(target.maxHealth).toBe(2);
      // Keywords should be reset to definition's keywords (vanilla = empty)
      expect(target.keywords.length).toBe(0);
    });

    it('should not grant duplicate keywords via Grant Keyword', () => {
      const engine = setupTestGame();

      // Place minion that already has GUARDIAN
      const target = placeOnBoard(engine, 'test_vanilla_2_2', 'player1');
      target.keywords.push({ keyword: CombatKeyword.GUARDIAN });

      expect(target.keywords.length).toBe(1);

      // Play grant keyword spell (grants GUARDIAN again)
      playCardFromHand(engine, 'player1', 'test_spell_grant_kw', target.instanceId);

      // Should still have only 1 GUARDIAN (no duplicates)
      const guardianCount = target.keywords.filter(kw => kw.keyword === CombatKeyword.GUARDIAN).length;
      expect(guardianCount).toBe(1);
    });

    it('should move spell to graveyard after resolving', () => {
      const engine = setupTestGame();

      const target = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');

      // Play a spell
      const spell = playCardFromHand(engine, 'player1', 'test_spell_damage', target.instanceId);

      // Spell should be in graveyard
      expect(spell.zone).toBe(CardZone.GRAVEYARD);
    });

    it('should place Deploy minion on board even if effect resolves first', () => {
      const engine = setupTestGame();
      const board = engine.getStateManager().getBoard();

      // Play Deploy AoE minion
      const deployMinion = playCardFromHand(engine, 'player1', 'test_deploy_aoe');

      // The minion itself should be on the board
      expect(deployMinion.zone).toBe(CardZone.BOARD);

      // It should be among the board cards
      const boardCards = board.getBoardCards('player1');
      const found = boardCards.find(c => c.instanceId === deployMinion.instanceId);
      expect(found).toBeDefined();
    });

    it('should handle destroy on a minion that is already dead gracefully', () => {
      const engine = setupTestGame();

      // Place a 1-health minion
      const target = placeOnBoard(engine, 'test_vanilla_1_1', 'player2');

      // Manually set health to 0 (already dead)
      target.currentHealth = 0;

      // Trying to destroy it should not crash
      expect(() => {
        playCardFromHand(engine, 'player1', 'test_spell_destroy', target.instanceId);
      }).not.toThrow();
    });

    it('Deploy Buff should also buff the deployed minion itself (it is a friendly)', () => {
      const engine = setupTestGame();

      // Play Deploy Buff minion with no other friendlies on board
      const buffMinion = playCardFromHand(engine, 'player1', 'test_deploy_buff');

      // The deployed minion is on the board when its effect fires,
      // so ALL_FRIENDLY_MINIONS includes itself (base: 2/2, buff: +1/+1 = 3/3)
      expect(buffMinion.currentAttack).toBe(3);
      expect(buffMinion.currentHealth).toBe(3);
    });

    it('should not heal hero above max health', () => {
      const engine = setupTestGame();
      const stateManager = engine.getStateManager();

      // Hero at full health - healing should not increase beyond max
      const player = stateManager.getPlayer('player1');
      const maxHealth = player.hero.maxHealth;
      const healthBefore = player.hero.currentHealth;
      expect(healthBefore).toBe(maxHealth); // Should be at full health

      // Play Deploy Heal
      playCardFromHand(engine, 'player1', 'test_deploy_heal');

      // Should still be at max
      expect(player.hero.currentHealth).toBeLessThanOrEqual(maxHealth);
    });
  });
});
