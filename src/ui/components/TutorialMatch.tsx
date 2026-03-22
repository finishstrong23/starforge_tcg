/**
 * STARFORGE TCG - Tutorial Match
 *
 * An interactive guided game where the player follows step-by-step
 * instructions to play and win. Uses a real GameEngine with a weak AI
 * and overlay prompts that tell the player what to do each step.
 *
 * The tutorial is turn-based with hints appearing before each action.
 * The player must follow the instructions to proceed.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameBoard } from './GameBoard';
import { GameProvider, useGame } from '../context/GameContext';
import { Race } from '../../types/Race';
import { AIDifficulty } from '../../ai/AIPlayer';

// ── Tutorial Steps ─────────────────────────────────────────────────────────

interface TutorialPrompt {
  id: string;
  title: string;
  text: string;
  condition: 'start' | 'turn' | 'has_playable' | 'has_attacker' | 'can_hero_power' | 'end_turn' | 'game_over' | 'auto';
  turnNumber?: number;
  action?: 'play_card' | 'attack' | 'hero_power' | 'end_turn';
}

const TUTORIAL_PROMPTS: TutorialPrompt[] = [
  {
    id: 'welcome',
    title: 'Tutorial Match — Let\'s Play!',
    text: 'This is a real game against a weak AI. I\'ll guide you through each turn. You\'re playing as the Pyroclast faction — aggressive fire damage!\n\nLet\'s start. Look at your hand at the bottom — cards with a GREEN glow can be played.',
    condition: 'start',
  },
  {
    id: 'turn1_play',
    title: 'Turn 1 — Play a Card',
    text: 'You have 1 mana crystal. Look for a 1-cost card in your hand (green glow). Click it to select, then click the board to play it. Minions go onto the battlefield!',
    condition: 'turn',
    turnNumber: 1,
    action: 'play_card',
  },
  {
    id: 'turn1_end',
    title: 'End Your Turn',
    text: 'Good! You\'ve played a card. If you have no more mana or cards to play, click the "End Turn" button on the right side. This passes to your opponent.',
    condition: 'end_turn',
  },
  {
    id: 'turn2_play',
    title: 'Turn 2 — Spend Your Mana',
    text: 'You now have 2 mana crystals! Play cards that cost up to 2 mana total. Try to spend all your mana each turn — "curving out" is key to winning!',
    condition: 'turn',
    turnNumber: 2,
    action: 'play_card',
  },
  {
    id: 'turn2_attack',
    title: 'Attack!',
    text: 'Your minion from last turn can now attack (orange glow). Click it to select, then click an enemy minion or the enemy Hero to deal damage. Remember: minions can\'t attack the turn they arrive unless they have SWIFT or BLITZ!',
    condition: 'has_attacker',
    action: 'attack',
  },
  {
    id: 'turn3_play',
    title: 'Turn 3 — Build Your Board',
    text: 'You have 3 mana now! Play your strongest cards. Look for minions with keywords like LAST WORDS (effect when destroyed) or DEPLOY (effect when played). These give extra value!',
    condition: 'turn',
    turnNumber: 3,
    action: 'play_card',
  },
  {
    id: 'turn3_hero',
    title: 'Use Your Hero Power',
    text: 'Your Hero Power costs 2 mana. As Pyroclast, "Fireblast" deals 2 damage to a target. Click your Hero portrait to activate it, then click an enemy to target. Use it every turn if you have spare mana!',
    condition: 'can_hero_power',
    action: 'hero_power',
  },
  {
    id: 'mid_game',
    title: 'Mid Game — Control the Board',
    text: 'You\'re doing great! Keep playing cards, attacking, and using your hero power each turn. Trade your minions into enemy minions when favorable, or go face to push damage.\n\nTip: Use efficient trades — kill a big threat with a small minion!',
    condition: 'turn',
    turnNumber: 5,
  },
  {
    id: 'late_game',
    title: 'Push for the Win!',
    text: 'The enemy Hero\'s health is getting low. Start sending your minions to attack the enemy Hero directly ("going face"). If you can deal enough damage this turn to finish them off, that\'s called "lethal" — always check for it!',
    condition: 'turn',
    turnNumber: 7,
  },
  {
    id: 'victory',
    title: 'Victory!',
    text: 'Congratulations! You\'ve won your first match! You now know the basics:\n\n• Play cards efficiently using all your mana\n• Attack with minions each turn\n• Use your Hero Power for extra value\n• Trade smartly or go face for lethal\n\nYou\'re ready for Quick Play!',
    condition: 'game_over',
  },
];

// ── Tutorial Overlay ──────────────────────────────────────────────────────

interface TutorialOverlayProps {
  prompt: TutorialPrompt;
  onDismiss: () => void;
}

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ prompt, onDismiss }) => {
  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      paddingTop: '8%',
      pointerEvents: 'none',
    }}>
      <div style={{
        maxWidth: '480px',
        width: '90%',
        background: 'linear-gradient(135deg, #1a1a3a 0%, #0a0a2a 50%, #1a1a2e 100%)',
        border: '2px solid #00ff88',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 255, 136, 0.2)',
        pointerEvents: 'auto',
      }}>
        <h3 style={{
          margin: '0 0 12px 0',
          fontSize: '20px',
          color: '#00ff88',
          textShadow: '0 0 10px rgba(0, 255, 136, 0.3)',
        }}>
          {prompt.title}
        </h3>
        <div style={{
          fontSize: '14px',
          color: '#ccccdd',
          lineHeight: '1.6',
          marginBottom: '16px',
        }}>
          {prompt.text.split('\n').map((line, i) => (
            <p key={i} style={{ margin: '4px 0' }}>{line}</p>
          ))}
        </div>
        <button
          onClick={onDismiss}
          style={{
            background: 'linear-gradient(135deg, #00cc66 0%, #00aa55 100%)',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 28px',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(0, 204, 102, 0.3)',
          }}
        >
          {prompt.condition === 'game_over' ? 'Return to Menu' : 'Got it!'}
        </button>
      </div>
    </div>
  );
};

// ── Tutorial Match Inner (inside GameProvider) ────────────────────────────

interface TutorialMatchInnerProps {
  onComplete: () => void;
  onSkip: () => void;
}

const TutorialMatchInner: React.FC<TutorialMatchInnerProps> = ({ onComplete, onSkip }) => {
  const game = useGame();
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [showPrompt, setShowPrompt] = useState(true);
  const [shownPrompts, setShownPrompts] = useState<Set<string>>(new Set());
  const lastTurnRef = useRef(0);

  const currentPrompt = TUTORIAL_PROMPTS[currentPromptIndex] || null;
  const isGameOver = game.isGameOver;
  const turnNumber = game.turnNumber;
  const isPlayerTurn = game.isPlayerTurn;

  // Advance to next applicable prompt based on game state
  useEffect(() => {
    if (!currentPrompt || showPrompt) return;

    // Check if we should show next prompt
    for (let i = currentPromptIndex + 1; i < TUTORIAL_PROMPTS.length; i++) {
      const prompt = TUTORIAL_PROMPTS[i];
      if (shownPrompts.has(prompt.id)) continue;

      let shouldShow = false;

      if (prompt.condition === 'game_over' && isGameOver) {
        shouldShow = true;
      } else if (prompt.condition === 'turn' && prompt.turnNumber && isPlayerTurn) {
        shouldShow = turnNumber >= prompt.turnNumber && lastTurnRef.current < turnNumber;
      } else if (prompt.condition === 'has_attacker' && isPlayerTurn) {
        // Show when there's an attacker available and it's a new turn cycle
        const hasAttacker = game.playerBoard.some(m => game.canAttack(m));
        shouldShow = hasAttacker && !shownPrompts.has(prompt.id);
      } else if (prompt.condition === 'can_hero_power' && isPlayerTurn) {
        const canHP = game.playerState && !game.playerState.hero.heroPowerUsedThisTurn &&
                      game.playerState.crystals.current >= 2;
        shouldShow = !!canHP && !shownPrompts.has(prompt.id);
      } else if (prompt.condition === 'end_turn' && isPlayerTurn) {
        shouldShow = !shownPrompts.has(prompt.id);
      }

      if (shouldShow) {
        lastTurnRef.current = turnNumber;
        setCurrentPromptIndex(i);
        setShowPrompt(true);
        setShownPrompts(prev => new Set(prev).add(prompt.id));
        break;
      }
    }
  }, [currentPrompt, currentPromptIndex, showPrompt, isGameOver, turnNumber, isPlayerTurn, game, shownPrompts]);

  // Show welcome prompt on mount
  useEffect(() => {
    if (currentPromptIndex === 0 && !shownPrompts.has('welcome')) {
      setShowPrompt(true);
      setShownPrompts(new Set(['welcome']));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDismissPrompt = useCallback(() => {
    if (currentPrompt?.condition === 'game_over') {
      onComplete();
      return;
    }
    setShowPrompt(false);
  }, [currentPrompt, onComplete]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <GameBoard onBackToMenu={onSkip} />
      {showPrompt && currentPrompt && (
        <TutorialOverlay prompt={currentPrompt} onDismiss={handleDismissPrompt} />
      )}
    </div>
  );
};

// ── Tutorial Match (outer wrapper with GameProvider) ──────────────────────

interface TutorialMatchProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const TutorialMatch: React.FC<TutorialMatchProps> = ({ onComplete, onSkip }) => {
  return (
    <GameProvider
      playerRace={Race.PYROCLAST}
      aiDifficulty={AIDifficulty.EASY}
    >
      <TutorialMatchInner onComplete={onComplete} onSkip={onSkip} />
    </GameProvider>
  );
};
