/**
 * STARFORGE TCG - AI Player
 *
 * Smart AI opponent with strategic decision-making.
 * Evaluates board state, plans mana usage, targets spells intelligently,
 * and understands all 10 keywords (8 Combat + DEPLOY + LAST_WORDS).
 */

import { GameEngine } from '../engine/GameEngine';
import { GameStateManager } from '../game/GameState';
import { GameBoard } from '../game/Board';
import { ActionType, GamePhase } from '../types/Game';
import type {
  GameAction,
  PlayCardData,
  AttackData,
  HeroPowerData,
} from '../types/Game';
import { CardZone, CardType, hasKeyword, getEffectiveAttack } from '../types/Card';
import type { CardInstance } from '../types/Card';
import { canAffordCard, hasBoardSpace } from '../types/Player';
import type { PlayerState } from '../types/Player';
import { CombatKeyword, TriggerKeyword } from '../types/Keywords';
import type { Keyword } from '../types/Keywords';
import { globalCardDatabase } from '../cards/CardDatabase';
import { getHeroById } from '../heroes/HeroDefinitions';

// ─── Difficulty ────────────────────────────────────────────────────────────

export enum AIDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

// ─── Deck Archetype ───────────────────────────────────────────────────────
// Detected from deck composition so the AI adapts strategy to its cards.

export enum DeckArchetype {
  AGGRO = 'AGGRO',       // Low curve, BLITZ/SWIFT heavy → race to kill
  MIDRANGE = 'MIDRANGE', // Balanced → trade when behind, push when ahead
  CONTROL = 'CONTROL',   // High curve, GUARDIAN/BARRIER/DRAIN → survive to late game
}

// ─── Internal types ────────────────────────────────────────────────────────

interface CardEvaluation {
  card: CardInstance;
  score: number;
}

interface AttackEvaluation {
  attacker: CardInstance;
  target: CardInstance | 'hero';
  score: number;
}

interface TurnPlan {
  cardsToPlay: CardInstance[];
  totalCost: number;
  totalScore: number;
}

// ─── AI Player ─────────────────────────────────────────────────────────────

export class AIPlayer {
  private playerId: string;
  private difficulty: AIDifficulty;
  private thinkingDelay: number;
  private deckArchetype: DeckArchetype | null = null;

  constructor(
    playerId: string,
    difficulty: AIDifficulty = AIDifficulty.MEDIUM,
    thinkingDelay: number = 500
  ) {
    this.playerId = playerId;
    this.difficulty = difficulty;
    this.thinkingDelay = thinkingDelay;
  }

  getPlayerId(): string { return this.playerId; }
  getDifficulty(): AIDifficulty { return this.difficulty; }
  setThinkingDelay(delay: number): void { this.thinkingDelay = delay; }

  // ─── Archetype detection ─────────────────────────────────────────────
  // Analyzes ALL cards the player owns to determine deck strategy.
  // Cached after first detection for the lifetime of this game.

  private getArchetype(board: GameBoard): DeckArchetype {
    if (this.deckArchetype !== null) return this.deckArchetype;

    const deckCards = board.getCardsInZone(this.playerId, CardZone.DECK);
    const handCards = board.getHandCards(this.playerId);
    const boardCards = board.getBoardCards(this.playerId);
    const allCards = [...deckCards, ...handCards, ...boardCards];

    let blitzCount = 0, swiftCount = 0, guardianCount = 0;
    let barrierCount = 0, drainCount = 0, lethalCount = 0, dsCount = 0;
    let totalCost = 0, minionCount = 0;

    for (const card of allCards) {
      if (card.currentAttack !== undefined) {
        minionCount++;
        totalCost += card.currentCost;
      }
      if (hasKeyword(card, CombatKeyword.BLITZ as Keyword)) blitzCount++;
      if (hasKeyword(card, CombatKeyword.SWIFT as Keyword)) swiftCount++;
      if (hasKeyword(card, CombatKeyword.GUARDIAN as Keyword)) guardianCount++;
      if (hasKeyword(card, CombatKeyword.BARRIER as Keyword)) barrierCount++;
      if (hasKeyword(card, CombatKeyword.DRAIN as Keyword)) drainCount++;
      if (hasKeyword(card, CombatKeyword.LETHAL as Keyword)) lethalCount++;
      if (hasKeyword(card, CombatKeyword.DOUBLE_STRIKE as Keyword)) dsCount++;
    }

    const avgCost = minionCount > 0 ? totalCost / minionCount : 4;
    // Composite score: positive = aggro, negative = control
    // BLITZ/SWIFT/DOUBLE_STRIKE push aggro; GUARDIAN/BARRIER/DRAIN/LETHAL push control
    // DOUBLE_STRIKE is offensive burst; LETHAL is efficient removal (control tool)
    // Lower mana curve pushes toward aggro, higher toward control
    const aggroSignals = blitzCount * 3 + swiftCount + dsCount;
    const controlSignals = guardianCount * 2 + barrierCount * 2 + drainCount + lethalCount;
    const curveSignal = (4.0 - avgCost) * 3; // Low curve → positive, high curve → negative
    const compositeScore = aggroSignals - controlSignals + curveSignal;

    if (compositeScore >= 4) {
      this.deckArchetype = DeckArchetype.AGGRO;
    } else if (compositeScore <= -4) {
      this.deckArchetype = DeckArchetype.CONTROL;
    } else {
      this.deckArchetype = DeckArchetype.MIDRANGE;
    }

    return this.deckArchetype;
  }

  // ─── Turn execution ────────────────────────────────────────────────────

  async executeTurn(engine: GameEngine): Promise<void> {
    const stateManager = engine.getStateManager();
    const board = stateManager.getBoard();
    let actionsTaken = 0;
    const maxActions = 20;

    while (actionsTaken < maxActions) {
      const state = stateManager.getState();
      if (state.activePlayerId !== this.playerId || state.phase !== GamePhase.MAIN) break;

      const action = this.decideAction(stateManager, board);
      if (!action) break;

      const result = engine.processAction(action);
      if (!result.success) break;
      actionsTaken++;

      if (this.thinkingDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, this.thinkingDelay));
      }
    }

    engine.processAction({
      type: ActionType.END_TURN,
      playerId: this.playerId,
      timestamp: Date.now(),
      data: {},
    });
  }

  /** Synchronous turn execution for battle simulator (zero overhead). */
  executeTurnSync(engine: GameEngine): void {
    const stateManager = engine.getStateManager();
    const board = stateManager.getBoard();
    let actionsTaken = 0;
    const maxActions = 20;

    while (actionsTaken < maxActions) {
      const state = stateManager.getState();
      if (state.activePlayerId !== this.playerId || state.phase !== GamePhase.MAIN) break;

      const action = this.decideAction(stateManager, board);
      if (!action) break;

      const result = engine.processAction(action);
      if (!result.success) break;
      actionsTaken++;
    }

    engine.processAction({
      type: ActionType.END_TURN,
      playerId: this.playerId,
      timestamp: Date.now(),
      data: {},
    });
  }

  // ─── Action decision ───────────────────────────────────────────────────

  private decideAction(stateManager: GameStateManager, board: GameBoard): GameAction | null {
    const player = stateManager.getPlayer(this.playerId);
    const opponentId = stateManager.getOpponentId(this.playerId);
    const opponent = stateManager.getPlayer(opponentId);

    switch (this.difficulty) {
      case AIDifficulty.EASY:   return this.decideEasy(board, player, opponent, opponentId);
      case AIDifficulty.MEDIUM: return this.decideMedium(board, player, opponent, opponentId);
      case AIDifficulty.HARD:   return this.decideHard(board, player, opponent, opponentId);
      default:                  return this.decideHard(board, player, opponent, opponentId);
    }
  }

  // ─── EASY AI ───────────────────────────────────────────────────────────

  private decideEasy(board: GameBoard, player: PlayerState, opponent: PlayerState, opponentId: string): GameAction | null {
    const playable = this.getPlayableCards(board, player);
    if (playable.length > 0 && Math.random() > 0.3) {
      return this.createPlayCardAction(playable[Math.floor(Math.random() * playable.length)], board, player, opponentId);
    }

    const attackers = this.getAvailableAttackers(board, player);
    if (attackers.length > 0 && Math.random() > 0.2) {
      const atk = attackers[Math.floor(Math.random() * attackers.length)];
      const targets = this.getValidTargets(board, opponentId, atk);
      if (targets.length > 0) {
        return this.createAttackAction(atk, targets[Math.floor(Math.random() * targets.length)], opponentId);
      }
    }

    if (!player.hero.heroPowerUsedThisTurn && canAffordCard(player, 2) && Math.random() > 0.5) {
      return this.createHeroPowerAction(board, player, opponentId);
    }
    return null;
  }

  // ─── MEDIUM AI ─────────────────────────────────────────────────────────

  private decideMedium(board: GameBoard, player: PlayerState, opponent: PlayerState, opponentId: string): GameAction | null {
    // 1. Play cards — try to spend all mana, prefer higher value
    const playable = this.getPlayableCards(board, player);
    if (playable.length > 0) {
      const evals = playable.map(c => this.scoreCard(c, board, player, opponent, opponentId));
      evals.sort((a, b) => b.score - a.score);
      if (evals[0].score > 0) return this.createPlayCardAction(evals[0].card, board, player, opponentId);
    }

    // 2. Make trades
    const trade = this.findBestTrade(board, player, opponentId);
    if (trade) return trade;

    // 3. Go face with remaining attackers
    const face = this.findFaceAttack(board, player, opponentId);
    if (face) return face;

    // 4. Hero power
    if (!player.hero.heroPowerUsedThisTurn && canAffordCard(player, 2)) {
      return this.createHeroPowerAction(board, player, opponentId);
    }
    return null;
  }

  // ─── HARD AI ───────────────────────────────────────────────────────────
  // Archetype-aware: aggro races face, control controls board, midrange adapts.

  private decideHard(board: GameBoard, player: PlayerState, opponent: PlayerState, opponentId: string): GameAction | null {
    const myBoard = board.getBoardCards(this.playerId);
    const oppBoard = board.getBoardCards(opponentId);
    const boardAdv = this.boardAdvantage(myBoard, oppBoard);
    const archetype = this.getArchetype(board);

    // ── Step 1: Check lethal (always — every deck should win when it can) ──
    const lethal = this.checkLethal(board, player, opponent, opponentId);
    if (lethal) return lethal;

    // ── Step 2: Play cards (mana-efficient plan) ─────────────────────────
    const playable = this.getPlayableCards(board, player);
    if (playable.length > 0) {
      const plan = this.planManaSpend(playable, player.crystals.current, board, player, opponent, opponentId);
      if (plan.cardsToPlay.length > 0) {
        return this.createPlayCardAction(plan.cardsToPlay[0], board, player, opponentId);
      }
    }

    // ── Step 3: Make trades (archetype determines trade threshold) ────────
    // Control: accept even trades (score >= 0) to maintain board control
    // Midrange: accept decent trades (score > 0)
    // Aggro: take favorable trades (score >= 1) — still trades into threats, not blindly face
    const tradeThreshold = archetype === DeckArchetype.CONTROL ? 0
                         : archetype === DeckArchetype.AGGRO ? 1 : 0;
    const trade = this.findBestTrade(board, player, opponentId, tradeThreshold);
    if (trade) return trade;

    // ── Step 4: Push face damage (archetype-specific conditions) ─────────
    // Aggro: go face when board is favorable or opponent is low
    // Midrange: go face when clearly ahead or opponent getting low
    // Control: only go face when dominating board or opponent is near lethal
    const oppHpPct = opponent.hero.currentHealth / opponent.hero.maxHealth;
    let shouldGoFace = false;

    if (archetype === DeckArchetype.AGGRO) {
      // R14 fix: removed "myBoard >= 3" (too aggressive, ignores enemy board).
      // A human aggro player still considers board state before going face.
      shouldGoFace = boardAdv >= 0 || oppHpPct <= 0.5;
    } else if (archetype === DeckArchetype.MIDRANGE) {
      shouldGoFace = boardAdv >= 2 || oppHpPct <= 0.4;
    } else {
      // CONTROL: only push face when board is clearly won or opponent is low
      shouldGoFace = (boardAdv >= 4 && oppBoard.length === 0) || oppHpPct <= 0.33;
    }

    if (shouldGoFace) {
      const face = this.findFaceAttack(board, player, opponentId);
      if (face) return face;
    }

    // ── Step 5: Hero power ───────────────────────────────────────────────
    if (!player.hero.heroPowerUsedThisTurn && canAffordCard(player, 2)) {
      return this.createHeroPowerAction(board, player, opponentId);
    }

    // ── Step 6: Send remaining attackers face (all archetypes) ───────────
    // Even control should push damage when there's nothing better to do
    const face = this.findFaceAttack(board, player, opponentId);
    if (face) return face;

    return null;
  }

  // ─── Mana planning ─────────────────────────────────────────────────────
  // Try to spend as much mana as possible with the best combination of cards.

  private planManaSpend(
    playable: CardInstance[], mana: number,
    board: GameBoard, player: PlayerState, opponent: PlayerState, opponentId: string
  ): TurnPlan {
    // Score all playable cards
    const scored = playable.map(c => ({
      card: c,
      score: this.scoreCard(c, board, player, opponent, opponentId).score,
    }));

    // Greedy approach: pick highest score card that fits remaining mana
    // Then repeat for the rest (simulates mana curve planning)
    const bestPlans: TurnPlan[] = [];

    // Try starting with each card to explore different mana usage paths
    for (let i = 0; i < Math.min(scored.length, 6); i++) {
      const plan: TurnPlan = { cardsToPlay: [], totalCost: 0, totalScore: 0 };
      let remainingMana = mana;
      const used = new Set<string>();

      // Start with card i
      const first = scored[i];
      if (first.card.currentCost <= remainingMana && first.score > 0) {
        plan.cardsToPlay.push(first.card);
        plan.totalCost += first.card.currentCost;
        plan.totalScore += first.score;
        remainingMana -= first.card.currentCost;
        used.add(first.card.instanceId);
      }

      // Fill remaining mana greedily by score
      const rest = scored.filter(s => !used.has(s.card.instanceId) && s.score > 0);
      rest.sort((a, b) => b.score - a.score);
      for (const s of rest) {
        if (s.card.currentCost <= remainingMana && !used.has(s.card.instanceId)) {
          // Check board space for minions
          const minionCount = plan.cardsToPlay.filter(c => c.currentAttack !== undefined).length;
          if (s.card.currentAttack !== undefined && board.getBoardCount(this.playerId) + minionCount >= 7) continue;

          plan.cardsToPlay.push(s.card);
          plan.totalCost += s.card.currentCost;
          plan.totalScore += s.score;
          remainingMana -= s.card.currentCost;
          used.add(s.card.instanceId);
        }
      }

      bestPlans.push(plan);
    }

    // Also try pure greedy (sort by score, pick greedily)
    {
      const plan: TurnPlan = { cardsToPlay: [], totalCost: 0, totalScore: 0 };
      let remainingMana = mana;
      const sorted = [...scored].sort((a, b) => b.score - a.score);
      for (const s of sorted) {
        if (s.card.currentCost <= remainingMana && s.score > 0) {
          const minionCount = plan.cardsToPlay.filter(c => c.currentAttack !== undefined).length;
          if (s.card.currentAttack !== undefined && board.getBoardCount(this.playerId) + minionCount >= 7) continue;
          plan.cardsToPlay.push(s.card);
          plan.totalCost += s.card.currentCost;
          plan.totalScore += s.score;
          remainingMana -= s.card.currentCost;
        }
      }
      bestPlans.push(plan);
    }

    // Also try greedy by mana efficiency (score / cost)
    {
      const plan: TurnPlan = { cardsToPlay: [], totalCost: 0, totalScore: 0 };
      let remainingMana = mana;
      const sorted = [...scored].sort((a, b) => {
        const effA = a.score / Math.max(1, a.card.currentCost);
        const effB = b.score / Math.max(1, b.card.currentCost);
        return effB - effA;
      });
      for (const s of sorted) {
        if (s.card.currentCost <= remainingMana && s.score > 0) {
          const minionCount = plan.cardsToPlay.filter(c => c.currentAttack !== undefined).length;
          if (s.card.currentAttack !== undefined && board.getBoardCount(this.playerId) + minionCount >= 7) continue;
          plan.cardsToPlay.push(s.card);
          plan.totalCost += s.card.currentCost;
          plan.totalScore += s.score;
          remainingMana -= s.card.currentCost;
        }
      }
      bestPlans.push(plan);
    }

    // Pick best plan: highest total score, tiebreak by more mana spent
    bestPlans.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return b.totalCost - a.totalCost;
    });

    return bestPlans[0] || { cardsToPlay: [], totalCost: 0, totalScore: 0 };
  }

  // ─── Card scoring ──────────────────────────────────────────────────────
  // Comprehensive card evaluation that understands all 21 keywords.

  private scoreCard(
    card: CardInstance,
    board: GameBoard,
    player: PlayerState,
    opponent: PlayerState,
    opponentId: string
  ): CardEvaluation {
    let score = 0;
    const def = globalCardDatabase.getCard(card.definitionId);
    const cardText = (def?.cardText || '').toLowerCase();
    const isMinion = card.currentAttack !== undefined;
    const isSpell = !isMinion && card.currentHealth === undefined;
    const myBoardCount = board.getBoardCount(this.playerId);
    const oppBoard = board.getBoardCards(opponentId);
    const oppBoardCount = oppBoard.length;

    // ── Base value: stats relative to cost ────────────────────────────
    if (isMinion) {
      const atk = card.currentAttack || 0;
      const hp = card.currentHealth || 0;
      const statTotal = atk + hp;
      const expected = card.currentCost * 2 + 1;
      score += statTotal;
      if (statTotal >= expected) score += 2; // overstatted
      if (statTotal < expected - 2) score -= 1; // understatted

      // Don't flood board
      if (myBoardCount >= 6) score -= 4;
      if (myBoardCount >= 5) score -= 2;
    }

    // ── Spell value: estimate from card text ──────────────────────────
    if (isSpell) {
      score += 3; // Base spell value

      // Damage spells — more valuable when opponent has minions
      const dmgMatch = cardText.match(/deal (\d+) damage/);
      if (dmgMatch) {
        const dmg = parseInt(dmgMatch[1]);
        score += dmg;
        // Extra value if it can kill something on opponent's board
        if (oppBoard.some(m => (m.currentHealth || 0) <= dmg)) score += 3;
      }

      // AoE damage
      if (cardText.includes('all enem') || cardText.includes('all minion')) {
        score += oppBoardCount * 2;
      }

      // Draw spells
      const drawMatch = cardText.match(/draw (\d+)/);
      if (drawMatch) {
        score += parseInt(drawMatch[1]) * 2;
      }

      // Healing
      const healMatch = cardText.match(/restore (\d+)/);
      if (healMatch) {
        const heal = parseInt(healMatch[1]);
        const missing = player.hero.maxHealth - player.hero.currentHealth;
        score += Math.min(heal, missing); // Only value healing we need
      }

      // Buff spells
      if (cardText.includes('+') && (cardText.includes('attack') || cardText.includes('/+'))) {
        score += myBoardCount > 0 ? 4 : 1;
      }

      // Destroy/removal
      if (cardText.includes('destroy') && (cardText.includes('minion') || cardText.includes('enemy'))) {
        score += oppBoardCount > 0 ? 6 : 1;
      }

      // Freeze
      if (cardText.includes('freeze')) {
        score += oppBoardCount > 0 ? 3 : 0;
      }

      // Summon
      if (cardText.includes('summon')) {
        score += 3;
      }
    }

    // ── Structure value ──────────────────────────────────────────────
    if (def?.type === CardType.STRUCTURE) {
      score += 4; // Ongoing value
      if (cardText.includes('start of turn') || cardText.includes('end of turn')) score += 2;
    }

    // ── Keyword scoring (8 Core Combat Keywords) ───────────────────
    // Values tuned to match ACTUAL game mechanics (not card text promises)

    if (hasKeyword(card, CombatKeyword.GUARDIAN as Keyword)) {
      // GUARDIAN = TAUNT: Forces ALL enemy attacks into this minion.
      // The strongest keyword — protects hero AND other minions.
      const hp = card.currentHealth || 0;
      score += 5;
      if (hp >= 5) score += 3;                      // High-HP GUARDIAN is a wall
      if (oppBoardCount > myBoardCount) score += 3;  // Even better when behind
      if (player.hero.currentHealth <= 15) score += 3; // Critical when low HP
    }
    if (hasKeyword(card, CombatKeyword.BARRIER as Keyword)) {
      // BARRIER: Absorbs the ENTIRE first hit (all damage, not just 1).
      // Amazing on high-HP minions (survives 2 big hits) and with GUARDIAN.
      score += 4;
      if (isMinion && (card.currentHealth || 0) >= 4) score += 2; // Tanky + barrier = very hard to kill
      if (hasKeyword(card, CombatKeyword.GUARDIAN as Keyword)) score += 3; // GUARDIAN+BARRIER combo
    }
    // ── Archetype-aware keyword scoring ─────────────────────────────
    const archetype = this.getArchetype(board);
    const isAggro = archetype === DeckArchetype.AGGRO;
    const isControl = archetype === DeckArchetype.CONTROL;
    const oppHpPct = opponent.hero.currentHealth / opponent.hero.maxHealth;

    if (hasKeyword(card, CombatKeyword.SWIFT as Keyword)) {
      // SWIFT: Attack MINIONS only on summon turn. Great for board control.
      score += 2; // Base: decent for any deck
      if (oppBoardCount > 0) {
        score += 2; // Board clear potential
        if (oppBoard.some(m => (m.currentHealth || 0) <= (card.currentAttack || 0))) score += 2;
      }
      if (isControl) score += 2; // Control loves immediate board interaction
    }
    if (hasKeyword(card, CombatKeyword.BLITZ as Keyword)) {
      // BLITZ: Attack ANYTHING immediately — minions AND face.
      score += 3; // Base: good but not dominant (down from +5)
      if (isAggro) score += 3; // Aggro loves BLITZ
      if (isControl) score += 1; // Control still appreciates removal
      if (oppHpPct <= 0.33) score += 3; // Close to lethal — any deck values this
      if (oppBoardCount > 0) score += 1;
    }
    if (hasKeyword(card, CombatKeyword.CLOAK as Keyword)) {
      // CLOAK: Stealth — can't be attacked. Guarantees one attack.
      score += 2;
      if ((card.currentAttack || 0) >= 4) score += 2;
      if (hasKeyword(card, CombatKeyword.LETHAL as Keyword)) score += 2;
    }
    if (hasKeyword(card, CombatKeyword.DOUBLE_STRIKE as Keyword)) {
      // DOUBLE_STRIKE: 2 attacks per turn. Great for both board and face.
      const atkVal = card.currentAttack || 0;
      score += atkVal + 2; // Slightly lower base (from +3)
      if (oppBoardCount >= 2) score += 2; // Board control: kill two things
      if (isControl && oppBoardCount > 0) score += 2; // Control values double-trading
      if (hasKeyword(card, CombatKeyword.LETHAL as Keyword)) score += 4;
    }
    if (hasKeyword(card, CombatKeyword.DRAIN as Keyword)) {
      // DRAIN: Heals hero by damage dealt. Sustain keyword.
      const missingHp = player.hero.maxHealth - player.hero.currentHealth;
      score += 3; // Base: always decent (up from +2)
      if (missingHp > 10) score += 3;
      if (isControl) score += 2; // Control game plan IS sustain
      score += Math.floor((card.currentAttack || 0) * 0.5);
    }
    if (hasKeyword(card, CombatKeyword.LETHAL as Keyword)) {
      // LETHAL: Kills ANY minion regardless of health. Premium removal.
      score += 4;
      if (oppBoardCount > 0) score += 3;
      if (oppBoard.some(m => (m.currentHealth || 0) >= 5)) score += 3;
      if (isControl) score += 2; // Control needs efficient removal
    }

    // ── DEPLOY & LAST_WORDS: Score based on effect impact ───────────
    if (isMinion && hasKeyword(card, TriggerKeyword.DEPLOY as Keyword)) {
      score += 3;
      if (cardText.includes('deal') && cardText.includes('damage')) score += 2;
      if (cardText.includes('destroy')) score += 3;
      if (cardText.includes('draw')) score += 2;
      if (cardText.includes('all')) score += 2;
    }
    if (isMinion && hasKeyword(card, TriggerKeyword.LAST_WORDS as Keyword)) {
      score += 2;
      if (cardText.includes('deal') && cardText.includes('damage')) score += 1;
      if (cardText.includes('summon')) score += 2;
    }

    // ── Board context bonuses (archetype-aware) ──────────────────────

    // Prefer spending all mana efficiently
    if (card.currentCost === player.crystals.current) score += 1;

    // Low health? Prioritize defense (all archetypes, but especially control)
    const myHpPct = player.hero.currentHealth / player.hero.maxHealth;
    if (myHpPct <= 0.5) {
      if (hasKeyword(card, CombatKeyword.GUARDIAN as Keyword)) score += 4;
      if (hasKeyword(card, CombatKeyword.DRAIN as Keyword)) score += 2;
      if (hasKeyword(card, CombatKeyword.BARRIER as Keyword)) score += 2;
    }
    if (myHpPct <= 0.27) {
      if (isMinion) score += 2;
      if (hasKeyword(card, CombatKeyword.GUARDIAN as Keyword)) score += 3;
    }

    // Opponent low? Push for the kill (archetype-scaled)
    if (oppHpPct <= 0.5 && isAggro) {
      if (hasKeyword(card, CombatKeyword.BLITZ as Keyword)) score += 4;
      if (hasKeyword(card, CombatKeyword.DOUBLE_STRIKE as Keyword)) score += 2;
    }
    if (oppHpPct <= 0.27) {
      // Near-lethal: ALL archetypes should push
      if (hasKeyword(card, CombatKeyword.BLITZ as Keyword)) score += 4;
      if (isMinion && (card.currentAttack || 0) >= 3) score += 2;
    }

    // Empty board? Prioritize immediate impact
    if (myBoardCount === 0 && oppBoardCount > 0) {
      if (hasKeyword(card, CombatKeyword.GUARDIAN as Keyword)) score += 3;
      if (hasKeyword(card, CombatKeyword.SWIFT as Keyword)) score += 2;
      if (hasKeyword(card, CombatKeyword.BLITZ as Keyword)) score += 2;
    }

    // Control archetype: always value board presence and defense
    if (isControl) {
      if (hasKeyword(card, CombatKeyword.GUARDIAN as Keyword)) score += 3; // Always good for control
      if (hasKeyword(card, CombatKeyword.BARRIER as Keyword)) score += 1; // Sticky minions = board control
    }

    return { card, score: Math.max(0, score) };
  }

  // ─── Combat: Lethal check ──────────────────────────────────────────────

  private checkLethal(board: GameBoard, player: PlayerState, opponent: PlayerState, opponentId: string): GameAction | null {
    const attackers = this.getAvailableAttackers(board, player);
    let totalFaceDamage = 0;

    for (const atk of attackers) {
      const targets = this.getValidTargets(board, opponentId, atk);
      if (targets.includes('hero')) {
        const dmg = getEffectiveAttack(atk);
        // DOUBLE_STRIKE = 2 separate attacks per turn, each dealing full damage
        const attackCount = hasKeyword(atk, CombatKeyword.DOUBLE_STRIKE as Keyword) ? 2 : 1;
        // Count remaining attacks available (some may have already attacked)
        const attacksUsed = (atk as any).attacksMadeThisTurn || 0;
        const attacksLeft = Math.max(0, attackCount - attacksUsed);
        totalFaceDamage += dmg * attacksLeft;
      }
    }

    if (totalFaceDamage >= opponent.hero.currentHealth) {
      return this.findFaceAttack(board, player, opponentId);
    }
    return null;
  }

  // ─── Combat: Value trades ──────────────────────────────────────────────

  private findBestTrade(board: GameBoard, player: PlayerState, opponentId: string, minScore: number = 0): GameAction | null {
    const attackers = this.getAvailableAttackers(board, player);
    const enemies = board.getAttackableTargets(this.playerId, opponentId);
    if (attackers.length === 0 || enemies.length === 0) return null;

    let best: AttackEvaluation | null = null;

    for (const atk of attackers) {
      for (const def of enemies) {
        const ev = this.evaluateTrade(atk, def);
        if (!best || ev.score > best.score) best = ev;
      }
    }

    // minScore controls how picky the AI is about trades:
    // Control (0): accepts even trades to maintain board control
    // Midrange (0): accepts decent trades
    // Aggro (2): only takes clearly favorable trades, prefers face
    if (best && best.score >= minScore) {
      return this.createAttackAction(best.attacker, best.target as CardInstance, opponentId);
    }
    return null;
  }

  private evaluateTrade(attacker: CardInstance, target: CardInstance): AttackEvaluation {
    const atkDmg = getEffectiveAttack(attacker);
    const defDmg = getEffectiveAttack(target);
    const atkHP = attacker.currentHealth || 0;
    const defHP = target.currentHealth || 0;

    const hasLethal = hasKeyword(attacker, CombatKeyword.LETHAL as Keyword);
    const hasDS = hasKeyword(attacker, CombatKeyword.DOUBLE_STRIKE as Keyword);
    const killsTarget = hasLethal || atkDmg >= defHP || (target.hasBarrier ? false : atkDmg >= defHP);
    const targetHasBarrier = target.hasBarrier;
    // If target has BARRIER, we need to pop it first (won't kill this hit)
    const effectiveKill = targetHasBarrier ? false : killsTarget;
    const weWillDie = defDmg >= atkHP && !attacker.hasBarrier;

    let score = 0;

    if (effectiveKill && !weWillDie) {
      // Favorable trade — score by how big the thing we killed was
      score = (target.currentAttack || 0) + defHP + 3;

      // Bonus for killing dangerous keywords
      if (hasKeyword(target, CombatKeyword.GUARDIAN as Keyword)) score += 5; // Removes their taunt wall
      if (hasKeyword(target, CombatKeyword.DOUBLE_STRIKE as Keyword)) score += 5;
      if (hasKeyword(target, CombatKeyword.LETHAL as Keyword)) score += 5;
      if (hasKeyword(target, CombatKeyword.DRAIN as Keyword)) score += 3;
      if (hasKeyword(target, CombatKeyword.BLITZ as Keyword)) score += 2;

      // Bonus if our attacker has LETHAL (killed a big thing cheaply)
      if (hasLethal && defHP > atkDmg) score += 4;

      // DOUBLE_STRIKE bonus: we can still attack again this turn!
      if (hasDS) score += 3;
    } else if (targetHasBarrier && atkDmg > 0) {
      // Popping BARRIER is valuable — clears it for future attacks
      score = 2;
      // Use cheap/low-value attackers to pop barrier
      if (atkDmg <= 2) score += 1;
      // LETHAL minions should NOT waste their attack on barrier
      if (hasLethal) score -= 3;
    } else if (effectiveKill && weWillDie) {
      // Even trade — value based on their value vs ours
      const theirValue = (target.currentAttack || 0) + defHP;
      const ourValue = atkDmg + atkHP;
      score = theirValue - ourValue + 1;
      // Prioritize killing GUARDIAN even in even trades
      if (hasKeyword(target, CombatKeyword.GUARDIAN as Keyword)) score += 3;
      if (hasKeyword(target, CombatKeyword.LETHAL as Keyword)) score += 3;
    } else if (!effectiveKill && !weWillDie) {
      // Chip damage — usually not worth it
      if (hasKeyword(target, CombatKeyword.GUARDIAN as Keyword) && (target.currentAttack || 0) >= 3) {
        score = 1; // Chip at a dangerous GUARDIAN to eventually remove it
      } else {
        score = -2;
      }
    } else {
      // We die without killing — bad trade
      score = -10;
    }

    return { attacker, target, score };
  }

  // ─── Combat: Face attacks ──────────────────────────────────────────────

  private findFaceAttack(board: GameBoard, player: PlayerState, opponentId: string): GameAction | null {
    const attackers = this.getAvailableAttackers(board, player);
    for (const atk of attackers) {
      const targets = this.getValidTargets(board, opponentId, atk);
      if (targets.includes('hero')) {
        return this.createAttackAction(atk, 'hero', opponentId);
      }
    }
    return null;
  }

  // ─── Board evaluation ──────────────────────────────────────────────────

  private boardAdvantage(myMinions: CardInstance[], oppMinions: CardInstance[]): number {
    const evaluateBoard = (minions: CardInstance[]): number => {
      let total = 0;
      for (const m of minions) {
        let v = (m.currentAttack || 0) + (m.currentHealth || 0);
        if (hasKeyword(m, CombatKeyword.GUARDIAN as Keyword)) v += 4; // Taunt is huge
        if (hasKeyword(m, CombatKeyword.LETHAL as Keyword)) v += 4;  // Kills anything
        if (hasKeyword(m, CombatKeyword.DOUBLE_STRIKE as Keyword)) v += (m.currentAttack || 0) + 2; // 2 attacks/turn
        if (hasKeyword(m, CombatKeyword.DRAIN as Keyword)) v += 2;
        if (m.hasBarrier) v += 3; // Full hit absorption
        if (m.isCloaked) v += 2;  // Can't be attacked
        total += v;
      }
      return total;
    };
    return evaluateBoard(myMinions) - evaluateBoard(oppMinions);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

  private getPlayableCards(board: GameBoard, player: PlayerState): CardInstance[] {
    return board.getHandCards(this.playerId).filter(card => {
      if (!canAffordCard(player, card.currentCost)) return false;
      const def = globalCardDatabase.getCard(card.definitionId);
      const isMinion = card.currentAttack !== undefined;
      const isStructure = card.currentHealth !== undefined && card.currentAttack === undefined;
      const isSpell = def?.type === CardType.SPELL;
      // Minions need board space
      if (isMinion && !hasBoardSpace(player)) return false;
      // Spells with effects are now playable
      if (isSpell && (!def?.effects || def.effects.length === 0)) return false;
      return true;
    });
  }

  private getAvailableAttackers(board: GameBoard, _player: PlayerState): CardInstance[] {
    return board.getAttackers(this.playerId);
  }

  private getValidTargets(board: GameBoard, opponentId: string, attacker: CardInstance): (CardInstance | 'hero')[] {
    const targets: (CardInstance | 'hero')[] = [];
    targets.push(...board.getAttackableTargets(this.playerId, opponentId));
    const canHitFace = board.canAttackHero(opponentId);
    if (canHitFace && !(attacker.summonedThisTurn && hasKeyword(attacker, CombatKeyword.SWIFT as Keyword))) {
      targets.push('hero');
    }
    return targets;
  }

  private createPlayCardAction(card: CardInstance, board?: GameBoard, player?: PlayerState, opponentId?: string): GameAction {
    let targetId: string | undefined;

    // For spells/deploy with CHOSEN targeting, pick the best target
    if (board && opponentId) {
      targetId = this.chooseEffectTarget(card, board, player, opponentId);
    }

    return {
      type: ActionType.PLAY_CARD,
      playerId: this.playerId,
      timestamp: Date.now(),
      data: { cardInstanceId: card.instanceId, targetId } as PlayCardData,
    };
  }

  /**
   * Choose the best target for a spell/deploy effect with CHOSEN targeting
   */
  private chooseEffectTarget(card: CardInstance, board: GameBoard, player?: PlayerState, opponentId?: string): string | undefined {
    if (!opponentId) return undefined;
    const def = globalCardDatabase.getCard(card.definitionId);
    if (!def?.effects?.length) return undefined;

    // Find the first CHOSEN-targeting effect
    const chosenEffect = def.effects.find(
      (e: any) => e.targetType === 'CHOSEN'
    );
    if (!chosenEffect) return undefined;
    const enemyMinions = board.getBoardCards(opponentId);
    const friendlyMinions = board.getBoardCards(this.playerId);

    switch (chosenEffect.type) {
      case 'DAMAGE': {
        const amount = (chosenEffect.data as any)?.amount || 0;
        // Target highest-value enemy minion we can kill
        const killable = enemyMinions
          .filter(m => (m.currentHealth || 0) <= amount)
          .sort((a, b) => ((b.currentAttack || 0) + (b.currentHealth || 0)) - ((a.currentAttack || 0) + (a.currentHealth || 0)));
        if (killable.length > 0) return killable[0].instanceId;
        // Otherwise target the biggest threat
        if (enemyMinions.length > 0) {
          const sorted = [...enemyMinions].sort((a, b) => (b.currentAttack || 0) - (a.currentAttack || 0));
          return sorted[0].instanceId;
        }
        // Go face if no minions
        return `hero_${opponentId}`;
      }

      case 'HEAL': {
        // Heal hero if damaged
        if (player && player.hero.currentHealth < player.hero.maxHealth - 3) {
          return `hero_${this.playerId}`;
        }
        // Heal most damaged minion
        const damaged = friendlyMinions
          .filter(m => (m.currentHealth || 0) < (m.maxHealth || 0))
          .sort((a, b) => ((a.currentHealth || 0) / (a.maxHealth || 1)) - ((b.currentHealth || 0) / (b.maxHealth || 1)));
        if (damaged.length > 0) return damaged[0].instanceId;
        return `hero_${this.playerId}`;
      }

      case 'BUFF':
      case 'GRANT_KEYWORD': {
        // Buff the biggest friendly minion on board
        if (friendlyMinions.length === 0) return undefined;
        const sorted = [...friendlyMinions].sort(
          (a, b) => ((b.currentAttack || 0) + (b.currentHealth || 0)) - ((a.currentAttack || 0) + (a.currentHealth || 0))
        );
        return sorted[0].instanceId;
      }

      case 'DESTROY': {
        // Destroy the highest-value enemy minion
        if (enemyMinions.length === 0) return undefined;
        const sorted = [...enemyMinions].sort(
          (a, b) => ((b.currentAttack || 0) + (b.currentHealth || 0)) - ((a.currentAttack || 0) + (a.currentHealth || 0))
        );
        return sorted[0].instanceId;
      }

      case 'SILENCE': {
        // Silence the minion with most keywords
        if (enemyMinions.length === 0) return undefined;
        const sorted = [...enemyMinions].sort(
          (a, b) => (b.keywords?.length || 0) - (a.keywords?.length || 0)
        );
        return sorted[0].instanceId;
      }

      default:
        return undefined;
    }
  }

  private createAttackAction(attacker: CardInstance, target: CardInstance | 'hero', opponentId: string): GameAction {
    return {
      type: ActionType.ATTACK,
      playerId: this.playerId,
      timestamp: Date.now(),
      data: {
        attackerId: attacker.instanceId,
        defenderId: target === 'hero' ? `hero_${opponentId}` : target.instanceId,
      } as AttackData,
    };
  }

  private createHeroPowerAction(board?: GameBoard, player?: PlayerState, opponentId?: string): GameAction {
    let targetId: string | undefined;

    // Pick a target for hero powers that require one
    if (board && player && opponentId) {
      const heroDef = getHeroById(player.hero.definitionId);
      if (heroDef && heroDef.heroPower.requiresTarget) {
        targetId = this.chooseHeroPowerTarget(heroDef, board, player, opponentId);
      }
    }

    return {
      type: ActionType.HERO_POWER,
      playerId: this.playerId,
      timestamp: Date.now(),
      data: { targetId } as HeroPowerData,
    };
  }

  /**
   * Choose the best target for a hero power
   */
  private chooseHeroPowerTarget(heroDef: any, board: GameBoard, player: PlayerState, opponentId: string): string | undefined {
    const effects = heroDef.heroPower.effects;
    if (!effects || effects.length === 0) return undefined;

    const mainEffect = effects[0];
    const enemyMinions = board.getBoardCards(opponentId);
    const friendlyMinions = board.getBoardCards(this.playerId);

    switch (mainEffect.type) {
      case 'DAMAGE': {
        // Target highest-value killable enemy, or biggest threat, or go face
        const amount = (mainEffect.data as any)?.amount || 0;
        const killable = enemyMinions
          .filter(m => (m.currentHealth || 0) <= amount)
          .sort((a, b) => ((b.currentAttack || 0) + (b.currentHealth || 0)) - ((a.currentAttack || 0) + (a.currentHealth || 0)));
        if (killable.length > 0) return killable[0].instanceId;
        if (enemyMinions.length > 0) {
          const sorted = [...enemyMinions].sort((a, b) => (b.currentAttack || 0) - (a.currentAttack || 0));
          return sorted[0].instanceId;
        }
        return `hero_${opponentId}`;
      }

      case 'HEAL': {
        // Heal hero if damaged, else heal most damaged friendly minion
        if (player.hero.currentHealth < player.hero.maxHealth - 3) {
          return `hero_${this.playerId}`;
        }
        const damaged = friendlyMinions
          .filter(m => (m.currentHealth || 0) < (m.maxHealth || 0))
          .sort((a, b) => ((a.currentHealth || 0) / (a.maxHealth || 1)) - ((b.currentHealth || 0) / (b.maxHealth || 1)));
        if (damaged.length > 0) return damaged[0].instanceId;
        return `hero_${this.playerId}`;
      }

      case 'BUFF':
      case 'GRANT_KEYWORD': {
        // Buff the biggest friendly minion
        if (friendlyMinions.length === 0) return undefined;
        // If filter requires MECH tribe, filter for it
        const filter = mainEffect.targetFilter;
        let candidates = friendlyMinions;
        if (filter?.tribe) {
          const tribeCandidates = friendlyMinions.filter(m => {
            const mDef = globalCardDatabase.getCard(m.definitionId);
            return mDef && (mDef as any).tribe === filter.tribe;
          });
          if (tribeCandidates.length > 0) candidates = tribeCandidates;
        }
        const sorted = [...candidates].sort(
          (a, b) => ((b.currentAttack || 0) + (b.currentHealth || 0)) - ((a.currentAttack || 0) + (a.currentHealth || 0))
        );
        return sorted[0]?.instanceId;
      }

      case 'RETURN_TO_HAND': {
        // Bounce the most expensive enemy minion
        if (enemyMinions.length === 0) return undefined;
        const sorted = [...enemyMinions].sort((a, b) => b.currentCost - a.currentCost);
        return sorted[0].instanceId;
      }

      default:
        // For any other effect, target the biggest enemy minion
        if (enemyMinions.length > 0) {
          const sorted = [...enemyMinions].sort(
            (a, b) => ((b.currentAttack || 0) + (b.currentHealth || 0)) - ((a.currentAttack || 0) + (a.currentHealth || 0))
          );
          return sorted[0].instanceId;
        }
        return undefined;
    }
  }
}

// ─── Utility ───────────────────────────────────────────────────────────────

/** Extract damage number from card text */
function dmgFromText(text: string): number {
  const m = text.match(/deal (\d+) damage/);
  return m ? parseInt(m[1]) : 0;
}

/** Factory helper */
export function createAIPlayer(playerId: string, difficulty: AIDifficulty = AIDifficulty.MEDIUM): AIPlayer {
  return new AIPlayer(playerId, difficulty);
}
