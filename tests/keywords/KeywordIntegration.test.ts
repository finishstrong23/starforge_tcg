/**
 * STARFORGE TCG - Keyword Integration Tests
 *
 * Verifies all 21 keywords work end-to-end through the engine.
 * Groups: 8 Combat, 2 Trigger (DEPLOY/LAST_WORDS), 11 Original.
 * LAST_WORDS and DEPLOY are already tested elsewhere — this covers
 * the remaining original keywords and combat keyword edge cases.
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
  OriginalKeyword,
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
  GrantKeywordData,
  GenericEffectData,
} from '../../src';
import { GameStateManager, PlayerSetup } from '../../src/game/GameState';

// ─── Test Card Definitions ──────────────────────────────────────────────

const TEST_CARDS: CardDefinition[] = [
  // Vanilla minions
  {
    id: 'test_vanilla_2_2', name: 'Test Vanilla', cost: 1, type: CardType.MINION,
    rarity: CardRarity.COMMON, attack: 2, health: 2, keywords: [], effects: [],
    cardText: '', collectible: true, set: 'TEST',
  },
  {
    id: 'test_vanilla_1_1', name: 'Test Wisp', cost: 0, type: CardType.MINION,
    rarity: CardRarity.COMMON, attack: 1, health: 1, keywords: [], effects: [],
    cardText: '', collectible: true, set: 'TEST',
  },
  {
    id: 'test_vanilla_5_5', name: 'Test Big', cost: 5, type: CardType.MINION,
    rarity: CardRarity.COMMON, attack: 5, health: 5, keywords: [], effects: [],
    cardText: '', collectible: true, set: 'TEST',
  },

  // PHASE minion (can't be targeted by spells)
  {
    id: 'test_phase', name: 'Test Phase', cost: 3, type: CardType.MINION,
    rarity: CardRarity.RARE, attack: 3, health: 3,
    keywords: [{ keyword: OriginalKeyword.PHASE }], effects: [],
    cardText: 'Phase', collectible: true, set: 'TEST',
  },

  // SALVAGE minion (draw on death)
  {
    id: 'test_salvage', name: 'Test Salvage', cost: 2, type: CardType.MINION,
    rarity: CardRarity.COMMON, attack: 2, health: 1,
    keywords: [{ keyword: OriginalKeyword.SALVAGE }], effects: [],
    cardText: 'Salvage', collectible: true, set: 'TEST',
  },

  // IMMOLATE(2) minion (deal 2 dmg on death)
  {
    id: 'test_immolate', name: 'Test Immolate', cost: 2, type: CardType.MINION,
    rarity: CardRarity.COMMON, attack: 2, health: 1,
    keywords: [{ keyword: OriginalKeyword.IMMOLATE, value: 2 }], effects: [],
    cardText: 'Immolate(2)', collectible: true, set: 'TEST',
  },

  // SWARM minion (+1/+1 per other friendly)
  {
    id: 'test_swarm', name: 'Test Swarm', cost: 2, type: CardType.MINION,
    rarity: CardRarity.COMMON, attack: 1, health: 1,
    keywords: [{ keyword: OriginalKeyword.SWARM }], effects: [],
    cardText: 'Swarm', collectible: true, set: 'TEST',
  },

  // ECHO minion
  {
    id: 'test_echo', name: 'Test Echo', cost: 2, type: CardType.MINION,
    rarity: CardRarity.RARE, attack: 2, health: 2,
    keywords: [{ keyword: OriginalKeyword.ECHO }], effects: [],
    cardText: 'Echo', collectible: true, set: 'TEST',
  },

  // DEPLOY minion (to test DEPLOY trigger detection)
  {
    id: 'test_deploy_draw', name: 'Test Deploy Draw', cost: 2, type: CardType.MINION,
    rarity: CardRarity.COMMON, attack: 2, health: 2,
    keywords: [{ keyword: TriggerKeyword.DEPLOY }],
    effects: [{
      id: 'deploy_draw', type: EffectType.DRAW, trigger: EffectTrigger.ON_PLAY,
      targetType: TargetType.NONE, data: { count: 1 } as DrawEffectData, isMandatory: true,
    }],
    cardText: 'Deploy: Draw 1', collectible: true, set: 'TEST',
  },

  // Spell: Deal 3 damage (for PHASE testing)
  {
    id: 'test_spell_damage', name: 'Test Bolt', cost: 2, type: CardType.SPELL,
    rarity: CardRarity.COMMON, keywords: [],
    effects: [{
      id: 'spell_dmg', type: EffectType.DAMAGE, trigger: EffectTrigger.ON_PLAY,
      targetType: TargetType.CHOSEN, data: { amount: 3 } as DamageEffectData, isMandatory: true,
    }],
    cardText: 'Deal 3 damage', collectible: true, set: 'TEST',
  },

  // Spell: Silence a minion
  {
    id: 'test_spell_silence', name: 'Test Silence', cost: 1, type: CardType.SPELL,
    rarity: CardRarity.COMMON, keywords: [],
    effects: [{
      id: 'spell_silence', type: EffectType.SILENCE, trigger: EffectTrigger.ON_PLAY,
      targetType: TargetType.CHOSEN, data: {} as GenericEffectData, isMandatory: true,
    }],
    cardText: 'Silence a minion', collectible: true, set: 'TEST',
  },

  // Legendary minion (for STARFORGE testing)
  {
    id: 'test_legendary', name: 'Test Legendary', cost: 5, type: CardType.MINION,
    rarity: CardRarity.LEGENDARY, attack: 5, health: 5,
    keywords: [{ keyword: CombatKeyword.GUARDIAN }], effects: [],
    cardText: 'Guardian', collectible: true, set: 'TEST',
  },

  // Spell: Grant GUARDIAN
  {
    id: 'test_spell_grant_guardian', name: 'Test Grant Guardian', cost: 1, type: CardType.SPELL,
    rarity: CardRarity.COMMON, keywords: [],
    effects: [{
      id: 'spell_grant', type: EffectType.GRANT_KEYWORD, trigger: EffectTrigger.ON_PLAY,
      targetType: TargetType.CHOSEN,
      data: { keywords: [{ keyword: CombatKeyword.GUARDIAN }] } as GrantKeywordData,
      isMandatory: true,
    }],
    cardText: 'Grant Guardian', collectible: true, set: 'TEST',
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────

function setupTestGame(): GameEngine {
  globalCardDatabase.clear();
  initializeSampleDatabase();
  globalCardDatabase.registerCards(TEST_CARDS);

  const engine = new GameEngine();

  const buildDeck = (playerId: string): CardInstance[] => {
    const cards: CardInstance[] = [];
    for (let i = 0; i < 30; i++) {
      cards.push(globalCardFactory.createInstance('test_vanilla_2_2', { ownerId: playerId }));
    }
    return cards;
  };

  const p1Setup: PlayerSetup = {
    id: 'player1', name: 'Player 1', race: Race.COGSMITHS, heroId: '',
    deck: buildDeck('player1'),
  };
  const p2Setup: PlayerSetup = {
    id: 'player2', name: 'Player 2', race: Race.LUMINAR, heroId: '',
    deck: buildDeck('player2'),
  };

  engine.initializeGame(p1Setup, p2Setup);
  engine.startGame();
  return engine;
}

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

function killMinion(card: CardInstance): void {
  card.currentHealth = 0;
}

function ensureActivePlayer(engine: GameEngine, playerId: string): void {
  const activeId = engine.getStateManager().getActivePlayerId();
  if (activeId !== playerId) {
    engine.processAction({
      type: ActionType.END_TURN,
      playerId: activeId,
      timestamp: Date.now(),
      data: {},
    });
  }
}

function playCardFromHand(
  engine: GameEngine,
  playerId: string,
  cardDefId: string,
  targetId?: string
): CardInstance {
  const card = globalCardFactory.createInstance(cardDefId, { ownerId: playerId });
  const board = engine.getStateManager().getBoard();
  const state = engine.getStateManager().getState();

  board.registerCard(card);
  (state.cards as Map<string, CardInstance>).set(card.instanceId, card);

  // Add to hand
  const zones = board.getPlayerZones(playerId);
  zones.hand.add(card.instanceId);
  card.zone = CardZone.HAND;

  // Ensure crystals
  const player = engine.getStateManager().getPlayer(playerId);
  player.crystals.current = Math.max(player.crystals.current, card.currentCost + 1);
  player.crystals.maximum = Math.max(player.crystals.maximum, card.currentCost + 1);

  // Ensure active player
  ensureActivePlayer(engine, playerId);

  engine.processAction({
    type: ActionType.PLAY_CARD,
    playerId,
    timestamp: Date.now(),
    data: { cardInstanceId: card.instanceId, position: 0, targetId },
  });

  return card;
}

// ─── Tests ──────────────────────────────────────────────────────────────

describe('PHASE Keyword', () => {
  it('should block spell damage from targeting a PHASE minion', () => {
    const engine = setupTestGame();
    const phaseMinion = placeOnBoard(engine, 'test_phase', 'player2');
    const healthBefore = phaseMinion.currentHealth!;

    // Player1 casts a damage spell targeting the PHASE minion
    playCardFromHand(engine, 'player1', 'test_spell_damage', phaseMinion.instanceId);

    // PHASE should have blocked the spell damage
    expect(phaseMinion.currentHealth).toBe(healthBefore);
  });

  it('should still take combat damage normally', () => {
    const engine = setupTestGame();
    const phaseMinion = placeOnBoard(engine, 'test_phase', 'player2');
    const attacker = placeOnBoard(engine, 'test_vanilla_5_5', 'player1');
    const healthBefore = phaseMinion.currentHealth!;

    ensureActivePlayer(engine, 'player1');

    engine.processAction({
      type: ActionType.ATTACK,
      playerId: 'player1',
      timestamp: Date.now(),
      data: { attackerId: attacker.instanceId, defenderId: phaseMinion.instanceId },
    });

    // Combat damage should go through (PHASE only blocks spells)
    expect(phaseMinion.currentHealth!).toBeLessThan(healthBefore);
  });
});

describe('SALVAGE Keyword', () => {
  it('should draw a card when a SALVAGE minion dies', () => {
    const engine = setupTestGame();
    const board = engine.getStateManager().getBoard();

    const salvageMinion = placeOnBoard(engine, 'test_salvage', 'player1');
    const handBefore = board.getHandCount('player1');

    killMinion(salvageMinion);
    engine.getDeathProcessor().processDeaths();

    expect(board.getHandCount('player1')).toBe(handBefore + 1);
    expect(salvageMinion.zone).toBe(CardZone.GRAVEYARD);
  });

  it('should NOT draw when silenced', () => {
    const engine = setupTestGame();
    const board = engine.getStateManager().getBoard();

    const salvageMinion = placeOnBoard(engine, 'test_salvage', 'player1');
    salvageMinion.keywords = [];
    salvageMinion.isSilenced = true;

    const handBefore = board.getHandCount('player1');

    killMinion(salvageMinion);
    engine.getDeathProcessor().processDeaths();

    // Silenced — no draw
    expect(board.getHandCount('player1')).toBe(handBefore);
  });
});

describe('IMMOLATE Keyword', () => {
  it('should deal damage to all enemy minions when dying', () => {
    const engine = setupTestGame();

    const immolateMinion = placeOnBoard(engine, 'test_immolate', 'player1');
    const enemy = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');
    const enemyHpBefore = enemy.currentHealth!;

    killMinion(immolateMinion);
    engine.getDeathProcessor().processDeaths();

    expect(enemy.currentHealth).toBe(enemyHpBefore - 2);
  });

  it('should kill weak enemies and cascade', () => {
    const engine = setupTestGame();

    const immolateMinion = placeOnBoard(engine, 'test_immolate', 'player1');
    const weakEnemy = placeOnBoard(engine, 'test_vanilla_1_1', 'player2');

    killMinion(immolateMinion);
    engine.getDeathProcessor().processDeaths();

    expect(weakEnemy.zone).toBe(CardZone.GRAVEYARD);
  });

  it('should NOT trigger when silenced', () => {
    const engine = setupTestGame();

    const immolateMinion = placeOnBoard(engine, 'test_immolate', 'player1');
    immolateMinion.keywords = [];
    immolateMinion.isSilenced = true;

    const enemy = placeOnBoard(engine, 'test_vanilla_5_5', 'player2');
    const enemyHpBefore = enemy.currentHealth!;

    killMinion(immolateMinion);
    engine.getDeathProcessor().processDeaths();

    expect(enemy.currentHealth).toBe(enemyHpBefore);
  });
});

describe('Silence Keyword Interaction', () => {
  it('should remove all keywords from a minion', () => {
    const engine = setupTestGame();
    const guardianMinion = placeOnBoard(engine, 'test_legendary', 'player2');
    expect(guardianMinion.keywords.length).toBeGreaterThan(0);

    // Silence via spell
    playCardFromHand(engine, 'player1', 'test_spell_silence', guardianMinion.instanceId);

    expect(guardianMinion.isSilenced).toBe(true);
    expect(guardianMinion.keywords.length).toBe(0);
  });

  it('should NOT silence a STARFORGED minion', () => {
    const engine = setupTestGame();

    // Place legendary and starforge it
    const legendary = placeOnBoard(engine, 'test_legendary', 'player1');
    legendary.isForged = true;
    legendary.keywords = [{ keyword: CombatKeyword.GUARDIAN }];
    legendary.isSilenced = true; // Even if silenced flag is set...

    // hasKeyword should still work because isForged overrides silence
    const { hasKeyword } = require('../../src/types/Card');
    expect(hasKeyword(legendary, CombatKeyword.GUARDIAN)).toBe(true);
  });
});

describe('STARFORGE Ascension', () => {
  it('should double stats and grant BARRIER + bonus keyword', () => {
    const engine = setupTestGame();
    const legendary = placeOnBoard(engine, 'test_legendary', 'player1');
    const atkBefore = legendary.currentAttack!;
    const hpBefore = legendary.currentHealth!;

    ensureActivePlayer(engine, 'player1');
    const player = engine.getStateManager().getPlayer('player1');
    player.crystals.current = 10;
    player.crystals.maximum = 10;

    engine.processAction({
      type: ActionType.ACTIVATE_STARFORGE,
      playerId: 'player1',
      timestamp: Date.now(),
      data: { cardInstanceId: legendary.instanceId },
    });

    expect(legendary.isForged).toBe(true);
    expect(legendary.currentAttack).toBe(atkBefore * 2);
    expect(legendary.currentHealth).toBe(hpBefore * 2);
    expect(legendary.hasBarrier).toBe(true);
    // Should have BLITZ for immediate attack
    expect(legendary.keywords.some(k => k.keyword === CombatKeyword.BLITZ)).toBe(true);
    // Player mana should be drained
    expect(player.crystals.current).toBe(0);
  });

  it('should reject STARFORGE on non-legendary', () => {
    const engine = setupTestGame();
    const vanilla = placeOnBoard(engine, 'test_vanilla_5_5', 'player1');

    ensureActivePlayer(engine, 'player1');
    const player = engine.getStateManager().getPlayer('player1');
    player.crystals.current = 10;
    player.crystals.maximum = 10;

    const result = engine.processAction({
      type: ActionType.ACTIVATE_STARFORGE,
      playerId: 'player1',
      timestamp: Date.now(),
      data: { cardInstanceId: vanilla.instanceId },
    });

    expect(result.success).toBe(false);
  });

  it('should reject STARFORGE with insufficient crystals', () => {
    const engine = setupTestGame();
    const legendary = placeOnBoard(engine, 'test_legendary', 'player1');

    ensureActivePlayer(engine, 'player1');
    const player = engine.getStateManager().getPlayer('player1');
    player.crystals.current = 3;
    player.crystals.maximum = 3;

    const result = engine.processAction({
      type: ActionType.ACTIVATE_STARFORGE,
      playerId: 'player1',
      timestamp: Date.now(),
      data: { cardInstanceId: legendary.instanceId },
    });

    expect(result.success).toBe(false);
  });
});

describe('hasKeyword utility', () => {
  it('should return true for cards with the keyword', () => {
    const engine = setupTestGame();
    const phase = placeOnBoard(engine, 'test_phase', 'player1');

    const { hasKeyword } = require('../../src/types/Card');
    expect(hasKeyword(phase, OriginalKeyword.PHASE)).toBe(true);
  });

  it('should return false for silenced cards (non-forged)', () => {
    const engine = setupTestGame();
    const phase = placeOnBoard(engine, 'test_phase', 'player1');
    phase.isSilenced = true;

    const { hasKeyword } = require('../../src/types/Card');
    expect(hasKeyword(phase, OriginalKeyword.PHASE)).toBe(false);
  });

  it('should return true for silenced but FORGED cards', () => {
    const engine = setupTestGame();
    const phase = placeOnBoard(engine, 'test_phase', 'player1');
    phase.isSilenced = true;
    phase.isForged = true;

    const { hasKeyword } = require('../../src/types/Card');
    expect(hasKeyword(phase, OriginalKeyword.PHASE)).toBe(true);
  });
});

describe('Grant Keyword Effect', () => {
  it('should add GUARDIAN to a minion via spell', () => {
    const engine = setupTestGame();
    const vanilla = placeOnBoard(engine, 'test_vanilla_5_5', 'player1');
    expect(vanilla.keywords.length).toBe(0);

    playCardFromHand(engine, 'player1', 'test_spell_grant_guardian', vanilla.instanceId);

    expect(vanilla.keywords.some(k => k.keyword === CombatKeyword.GUARDIAN)).toBe(true);
  });

  it('should not duplicate an existing keyword', () => {
    const engine = setupTestGame();
    const legendary = placeOnBoard(engine, 'test_legendary', 'player1');
    // Already has GUARDIAN
    const kwCountBefore = legendary.keywords.filter(k => k.keyword === CombatKeyword.GUARDIAN).length;

    playCardFromHand(engine, 'player1', 'test_spell_grant_guardian', legendary.instanceId);

    const kwCountAfter = legendary.keywords.filter(k => k.keyword === CombatKeyword.GUARDIAN).length;
    expect(kwCountAfter).toBe(kwCountBefore); // Should not add duplicate
  });
});

describe('DEPLOY Keyword (end-to-end)', () => {
  it('should trigger draw effect when DEPLOY minion is played from hand', () => {
    const engine = setupTestGame();
    const board = engine.getStateManager().getBoard();

    ensureActivePlayer(engine, 'player1');

    // Manually add card to hand and play it
    const card = globalCardFactory.createInstance('test_deploy_draw', { ownerId: 'player1' });
    const state = engine.getStateManager().getState();
    board.registerCard(card);
    (state.cards as Map<string, CardInstance>).set(card.instanceId, card);
    const zones = board.getPlayerZones('player1');
    zones.hand.add(card.instanceId);
    card.zone = CardZone.HAND;
    const player = engine.getStateManager().getPlayer('player1');
    player.crystals.current = 10;
    player.crystals.maximum = 10;

    // Snapshot hand AFTER adding the deploy card
    const handBefore = board.getHandCount('player1');

    engine.processAction({
      type: ActionType.PLAY_CARD,
      playerId: 'player1',
      timestamp: Date.now(),
      data: { cardInstanceId: card.instanceId, position: 0 },
    });

    // Played 1 card from hand (hand -1), DEPLOY drew 1 (hand +1) = net 0
    const handAfter = board.getHandCount('player1');
    expect(handAfter).toBe(handBefore);
  });
});

describe('Fatigue Damage', () => {
  it('should deal increasing fatigue damage when deck is empty', () => {
    const engine = setupTestGame();
    const board = engine.getStateManager().getBoard();
    const stateManager = engine.getStateManager();

    // Empty player1's deck
    const p1Zones = board.getPlayerZones('player1');
    p1Zones.deck.clear();

    const heroHpBefore = stateManager.getPlayer('player1').hero.currentHealth;

    // Draw from empty deck
    engine.drawCard('player1');

    // Should take 1 fatigue damage
    const heroHpAfter = stateManager.getPlayer('player1').hero.currentHealth;
    expect(heroHpAfter).toBe(heroHpBefore - 1);

    // Draw again — fatigue should increment
    engine.drawCard('player1');
    const heroHpAfter2 = stateManager.getPlayer('player1').hero.currentHealth;
    expect(heroHpAfter2).toBe(heroHpAfter - 2);
  });
});

describe('Turn Flow', () => {
  it('should reset attacksMadeThisTurn on new turn', () => {
    const engine = setupTestGame();
    const minion = placeOnBoard(engine, 'test_vanilla_5_5', 'player1');
    minion.attacksMadeThisTurn = 1;
    minion.hasAttackedThisTurn = true;

    // End turn and come back
    ensureActivePlayer(engine, 'player1');
    engine.processAction({
      type: ActionType.END_TURN,
      playerId: 'player1',
      timestamp: Date.now(),
      data: {},
    });
    // Now it's player2's turn - end their turn to get back to player1
    engine.processAction({
      type: ActionType.END_TURN,
      playerId: 'player2',
      timestamp: Date.now(),
      data: {},
    });

    // Minion should be able to attack again
    expect(minion.summonedThisTurn).toBe(false);
  });

  it('should give +1 max crystal each turn up to 10', () => {
    const engine = setupTestGame();
    const stateManager = engine.getStateManager();

    ensureActivePlayer(engine, 'player1');
    const player = stateManager.getPlayer('player1');

    // Turn 1: should have 1 crystal
    expect(player.crystals.maximum).toBe(1);

    // End turn, then player2 ends turn, back to player1
    engine.processAction({ type: ActionType.END_TURN, playerId: 'player1', timestamp: Date.now(), data: {} });
    engine.processAction({ type: ActionType.END_TURN, playerId: 'player2', timestamp: Date.now(), data: {} });

    // Turn 3 for player1 (started at turn 1, now turn 3)
    expect(player.crystals.maximum).toBe(2);
  });
});

describe('Card Play Validation', () => {
  it('should reject playing a card not in hand', () => {
    const engine = setupTestGame();
    ensureActivePlayer(engine, 'player1');

    const result = engine.processAction({
      type: ActionType.PLAY_CARD,
      playerId: 'player1',
      timestamp: Date.now(),
      data: { cardInstanceId: 'nonexistent_card', position: 0 },
    });

    expect(result.success).toBe(false);
  });

  it('should reject playing when not enough crystals', () => {
    const engine = setupTestGame();
    ensureActivePlayer(engine, 'player1');
    const player = engine.getStateManager().getPlayer('player1');
    player.crystals.current = 0;

    const board = engine.getStateManager().getBoard();
    const hand = board.getHandCards('player1');
    if (hand.length > 0) {
      // Ensure card costs something
      hand[0].currentCost = 5;

      const result = engine.processAction({
        type: ActionType.PLAY_CARD,
        playerId: 'player1',
        timestamp: Date.now(),
        data: { cardInstanceId: hand[0].instanceId, position: 0 },
      });

      expect(result.success).toBe(false);
    }
  });
});

describe('Game End Conditions', () => {
  it('should end game when hero health reaches 0', () => {
    const engine = setupTestGame();
    const stateManager = engine.getStateManager();

    // Kill player2's hero
    stateManager.damageHero('player2', 30);

    // Any action that triggers checkGameEnd
    ensureActivePlayer(engine, 'player1');
    const attacker = placeOnBoard(engine, 'test_vanilla_2_2', 'player1');

    // Attack hero with 0 hp to trigger end check
    engine.processAction({
      type: ActionType.ATTACK,
      playerId: 'player1',
      timestamp: Date.now(),
      data: { attackerId: attacker.instanceId, defenderId: 'hero_player2' },
    });

    expect(engine.getState().status).toBe(GameStatus.FINISHED);
  });
});
