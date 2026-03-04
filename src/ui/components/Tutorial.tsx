/**
 * STARFORGE TCG - Interactive Tutorial
 *
 * A guided introduction to the game mechanics. Plays a simplified game
 * with step-by-step overlay tips that teach:
 * 1. Mana crystals and playing cards
 * 2. Attacking with minions
 * 3. Keywords (Guardian, Barrier, etc.)
 * 4. Spells and targeting
 * 5. Hero powers
 * 6. Winning the game
 *
 * The tutorial uses a non-interactive step system — the player reads
 * tips and clicks "Next" to proceed, then plays normally with hints.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { SpaceBackground } from './SpaceBackground';
import { KeywordGlossary } from './KeywordGlossary';

interface TutorialStep {
  title: string;
  text: string;
  highlight?: 'hand' | 'board' | 'hero' | 'mana' | 'endturn' | 'none';
  tip?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Welcome to Starforge TCG!',
    text: 'You are a commander leading one of 10 galactic races in card combat. Let\'s learn the basics!',
    highlight: 'none',
    tip: 'This tutorial takes about 3 minutes. You can skip at any time.',
  },
  {
    title: 'Mana Crystals',
    text: 'Each turn you gain a mana crystal (up to 10). Cards cost mana to play — shown by the blue number in the top-left of each card. You start with 1 crystal on turn 1, 2 on turn 2, and so on.',
    highlight: 'mana',
    tip: 'Plan ahead! Save cheap cards for early turns and expensive ones for later.',
  },
  {
    title: 'Playing Cards',
    text: 'Click a card in your hand that has a green glow to play it. Minions go onto the battlefield. Spells take effect immediately. You can play as many cards as your mana allows each turn.',
    highlight: 'hand',
    tip: 'Cards with a green glow are playable. Grey means you can\'t afford them yet.',
  },
  {
    title: 'Attacking',
    text: 'Minions you play can\'t attack the turn they arrive (they need a turn to "wake up"), unless they have SWIFT or BLITZ. When ready, click your minion (orange glow), then click an enemy to attack.',
    highlight: 'board',
    tip: 'Orange glow = ready to attack. No glow = sleeping or already attacked.',
  },
  {
    title: 'Combat',
    text: 'When minions fight, they deal their Attack to each other simultaneously. If a minion\'s Health reaches 0, it\'s destroyed. You can also attack the enemy Hero directly!',
    highlight: 'board',
    tip: 'Trade efficiently! A 3/2 can kill a 2/3, but both die if they fight.',
  },
  {
    title: 'Keywords',
    text: 'Cards can have special abilities:\n• GUARDIAN — enemies must attack this first\n• BARRIER — blocks the first hit\n• SWIFT — can attack immediately\n• DRAIN — heals your hero for damage dealt\n• LETHAL — destroys any minion it damages\n• DEPLOY — triggers an effect when played\n\nHover over cards to see keyword details!',
    highlight: 'none',
    tip: 'StarForge has 21 keywords! Open the Glossary anytime for a full reference.',
  },
  {
    title: 'Advanced Keywords',
    text: 'StarForge has 11 original keywords not found in other card games:\n• PHASE — immune to spells and hero powers\n• IMMOLATE — deals AoE damage on death\n• SALVAGE — draws a card on death\n• ADAPT — choose 1 of 3 random bonuses\n• RESONATE — triggers when you cast spells\n• SWARM — grows with your board presence',
    highlight: 'none',
    tip: 'Each race specializes in certain keywords. Experiment to find combos!',
  },
  {
    title: 'Hero Power',
    text: 'Your hero has a unique ability that costs 2 mana. Click your hero portrait to use it. Each race has a different hero power — experiment to find your favorite!',
    highlight: 'hero',
    tip: 'Use your hero power every turn if you have spare mana!',
  },
  {
    title: 'Ending Your Turn',
    text: 'When you\'re done playing cards and attacking, click "End Turn". Your opponent will then take their turn. You have 75 seconds per turn in ranked mode.',
    highlight: 'endturn',
    tip: 'Don\'t rush! Think about your plays before ending your turn.',
  },
  {
    title: 'Starforge Ascension',
    text: 'Legendary minions on your board can be STARFORGED when their condition is met. This doubles their stats, grants BARRIER, a bonus keyword, and BLITZ — but costs ALL your current mana and your next turn\'s mana too. Use it wisely for a game-winning play!',
    highlight: 'none',
    tip: 'Starforging is the ultimate power play. Time it for maximum impact!',
  },
  {
    title: 'The 10 Galactic Races',
    text: 'Each race plays differently:\n• Pyroclast — aggressive burn damage\n• Verdani — healing and growth\n• Mechara — token swarms\n• Voidborn — control and disruption\n• Celestari — spells and combos\n• Nethari — stealth and assassins\n• Draconid — big dragons\n• Hivemind — death triggers and bombs\n• Crystari — shields and defense\n• Aetherian — tempo and adaptation',
    highlight: 'none',
    tip: 'Try all 10 races to find your playstyle!',
  },
  {
    title: 'Ready for Battle!',
    text: 'You know the basics! Start with a practice game against an Easy AI, then try Ranked when you\'re ready.\n\nRemember:\n• Complete daily quests for gold rewards\n• Open card packs to build your collection\n• Craft specific cards with Stardust\n• Climb the ranked ladder to Legend!',
    highlight: 'hero',
    tip: 'Your first 3 days give extra free cards. Play daily to maximize rewards!',
  },
];

interface TutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const Tutorial: React.FC<TutorialProps> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const [showGlossary, setShowGlossary] = useState(false);

  const currentStep = TUTORIAL_STEPS[step];
  const isLast = step === TUTORIAL_STEPS.length - 1;

  const nextStep = useCallback(() => {
    if (isLast) {
      onComplete();
      return;
    }
    setFadeIn(false);
    setTimeout(() => {
      setStep(s => s + 1);
      setFadeIn(true);
    }, 200);
  }, [isLast, onComplete]);

  const prevStep = useCallback(() => {
    if (step > 0) {
      setFadeIn(false);
      setTimeout(() => {
        setStep(s => s - 1);
        setFadeIn(true);
      }, 200);
    }
  }, [step]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') nextStep();
      if (e.key === 'ArrowLeft') prevStep();
      if (e.key === 'Escape') onSkip();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nextStep, prevStep, onSkip]);

  // Highlight area indicator
  const highlightStyle = getHighlightStyle(currentStep.highlight);

  if (showGlossary) {
    return <KeywordGlossary onClose={() => setShowGlossary(false)} />;
  }

  return (
    <div style={styles.container}>
      <SpaceBackground />
      {/* Background */}
      <div style={styles.backdrop} />

      {/* Highlight zone */}
      {currentStep.highlight !== 'none' && (
        <div style={highlightStyle} />
      )}

      {/* Tutorial Card */}
      <div
        style={{
          ...styles.card,
          opacity: fadeIn ? 1 : 0,
          transform: fadeIn ? 'translateY(0)' : 'translateY(10px)',
        }}
      >
        {/* Progress */}
        <div style={styles.progress}>
          {TUTORIAL_STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                ...styles.progressDot,
                background: i === step ? '#00ff88' : i < step ? '#00aa55' : '#333355',
              }}
            />
          ))}
        </div>

        <div style={styles.stepLabel}>
          Step {step + 1} of {TUTORIAL_STEPS.length}
        </div>

        <h2 style={styles.title}>{currentStep.title}</h2>

        <div style={styles.text}>
          {currentStep.text.split('\n').map((line, i) => (
            <p key={i} style={{ margin: '4px 0' }}>{line}</p>
          ))}
        </div>

        {/* Pro tip */}
        {currentStep.tip && (
          <div style={styles.tipBox}>
            <span style={styles.tipLabel}>Tip:</span> {currentStep.tip}
          </div>
        )}

        {/* Navigation */}
        <div style={styles.buttons}>
          <div style={styles.leftButtons}>
            <button style={styles.skipButton} onClick={onSkip}>
              Skip Tutorial
            </button>
            <button style={styles.glossaryButton} onClick={() => setShowGlossary(true)}>
              Glossary
            </button>
          </div>
          <div style={styles.navButtons}>
            {step > 0 && (
              <button style={styles.prevButton} onClick={prevStep}>
                Back
              </button>
            )}
            <button style={styles.nextButton} onClick={nextStep}>
              {isLast ? 'Start Playing!' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function getHighlightStyle(highlight?: string): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    border: '3px solid #00ff88',
    borderRadius: '12px',
    boxShadow: '0 0 20px rgba(0, 255, 136, 0.3), inset 0 0 20px rgba(0, 255, 136, 0.1)',
    zIndex: 998,
    pointerEvents: 'none',
    animation: 'pulse 2s ease-in-out infinite',
  };

  switch (highlight) {
    case 'hand':
      return { ...base, bottom: '5%', left: '15%', right: '15%', height: '18%' };
    case 'board':
      return { ...base, top: '30%', left: '10%', right: '30%', height: '35%' };
    case 'hero':
      return { ...base, top: '35%', left: '5%', width: '15%', height: '25%' };
    case 'mana':
      return { ...base, bottom: '25%', left: '5%', width: '12%', height: '8%' };
    case 'endturn':
      return { ...base, top: '42%', right: '5%', width: '10%', height: '10%' };
    default:
      return { display: 'none' };
  }
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000,
    background: '#040410',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.85)',
  },
  card: {
    position: 'relative',
    zIndex: 10001,
    maxWidth: '550px',
    width: '90%',
    background: 'linear-gradient(135deg, #1a1a3a 0%, #0a0a2a 50%, #1a1a2e 100%)',
    border: '2px solid #333366',
    borderRadius: '20px',
    padding: '30px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 255, 136, 0.1)',
    transition: 'opacity 0.2s ease, transform 0.2s ease',
  },
  progress: {
    display: 'flex',
    gap: '6px',
    justifyContent: 'center',
    marginBottom: '12px',
  },
  progressDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    transition: 'background 0.3s ease',
  },
  stepLabel: {
    textAlign: 'center',
    fontSize: '12px',
    color: '#666688',
    letterSpacing: '2px',
    marginBottom: '8px',
  },
  title: {
    textAlign: 'center',
    fontSize: '26px',
    fontWeight: 'bold',
    color: '#00ff88',
    margin: '0 0 16px 0',
    letterSpacing: '1px',
    textShadow: '0 0 15px rgba(0, 255, 136, 0.3)',
  },
  text: {
    fontSize: '15px',
    color: '#ccccdd',
    lineHeight: '1.7',
    textAlign: 'center',
    marginBottom: '24px',
    minHeight: '80px',
  },
  tipBox: {
    background: '#0a0a2a',
    border: '1px solid #333355',
    borderLeft: '3px solid #ffaa00',
    borderRadius: '6px',
    padding: '8px 14px',
    marginBottom: '16px',
    fontSize: '13px',
    color: '#aabb99',
    lineHeight: '1.5',
  },
  tipLabel: {
    color: '#ffaa00',
    fontWeight: 'bold',
  },
  buttons: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftButtons: {
    display: 'flex',
    gap: '8px',
  },
  skipButton: {
    background: 'transparent',
    border: '1px solid #444',
    borderRadius: '8px',
    padding: '8px 16px',
    color: '#666',
    fontSize: '13px',
    cursor: 'pointer',
  },
  glossaryButton: {
    background: 'transparent',
    border: '1px solid #333366',
    borderRadius: '8px',
    padding: '8px 16px',
    color: '#4488ff',
    fontSize: '13px',
    cursor: 'pointer',
  },
  navButtons: {
    display: 'flex',
    gap: '10px',
  },
  prevButton: {
    background: '#333355',
    border: '1px solid #555577',
    borderRadius: '10px',
    padding: '10px 24px',
    color: '#aaaacc',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  nextButton: {
    background: 'linear-gradient(135deg, #00cc66 0%, #00aa55 100%)',
    border: 'none',
    borderRadius: '10px',
    padding: '10px 30px',
    color: '#ffffff',
    fontSize: '15px',
    fontWeight: 'bold',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0, 204, 102, 0.3)',
  },
};
