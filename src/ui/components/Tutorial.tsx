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
    text: 'You are a galactic commander leading one of 4 alien factions in strategic card combat. Reduce your opponent\'s Hero to 0 health to win. Let\'s learn how!',
    highlight: 'none',
    tip: 'This tutorial takes about 3 minutes. You can skip at any time.',
  },
  {
    title: 'Mana Crystals',
    text: 'You gain 1 mana crystal each turn (up to 10 max). Cards cost mana to play — the blue number in the top-left corner. You start with 1 crystal on turn 1, 2 on turn 2, and so on. Unspent mana is lost at the end of your turn.',
    highlight: 'mana',
    tip: 'Spending all your mana each turn is called "curving out" — it\'s the key to winning!',
  },
  {
    title: 'Playing Cards',
    text: 'Click a card in your hand with a green glow to play it. There are 3 card types:\n• Minions — go onto the battlefield and can attack\n• Spells — take effect instantly and are consumed\n• Structures — stay on the board with passive effects\n\nYou can play as many cards as your mana allows each turn.',
    highlight: 'hand',
    tip: 'Green glow = playable. No glow = not enough mana. Drag cards to play them too!',
  },
  {
    title: 'Attacking',
    text: 'Minions can\'t attack the turn they arrive ("summoning sickness") unless they have SWIFT or BLITZ. When a minion is ready, it gets an orange glow. Click it to select, then click an enemy minion or the enemy Hero to attack.',
    highlight: 'board',
    tip: 'Orange glow = ready to attack. Click your minion first, then click the target.',
  },
  {
    title: 'Combat',
    text: 'When two minions fight, they deal their Attack (bottom-left number) to each other simultaneously. If a minion\'s Health (bottom-right) drops to 0, it\'s destroyed.\n\nDamaged health turns red so you can track it. You can attack the enemy Hero directly to win!',
    highlight: 'board',
    tip: 'Trade efficiently! Use a 4/1 to kill a big threat, or go face for lethal damage.',
  },
  {
    title: 'Core Keywords',
    text: 'Minions can have powerful keyword abilities:\n• GUARDIAN — enemies must attack this first\n• BARRIER — blocks the first hit completely\n• SWIFT — can attack enemy minions immediately\n• BLITZ — can attack anything immediately\n• DRAIN — damage dealt heals your Hero\n• BANE — instantly destroys any minion it damages\n• DOUBLE STRIKE — attacks twice per turn',
    highlight: 'none',
    tip: 'Hover over any card to see what its keywords do! Tooltips explain everything.',
  },
  {
    title: 'Trigger & Unique Keywords',
    text: 'Cards also have trigger abilities and Starforge-original keywords:\n• DEPLOY — effect happens when played from hand\n• LAST WORDS — effect triggers when destroyed\n• ADAPT — gain a random basic keyword: Blitz, Swift, Barrier, or Double Strike (BioTitans specialty)\n• PHASE — can\'t be targeted by spells or Hero Powers\n• RESONATE — triggers each time you cast a spell\n• SALVAGE — draws a card when destroyed',
    highlight: 'none',
    tip: 'Hover over any card to see all its keyword descriptions in the tooltip!',
  },
  {
    title: 'Hero Power',
    text: 'Your Hero has a unique ability that costs 2 mana. Click your Hero portrait to use it once per turn. Each race has a different Hero Power that synergizes with their playstyle.',
    highlight: 'hero',
    tip: 'Use your Hero Power every turn if you have 2 spare mana — the value adds up!',
  },
  {
    title: 'Ending Your Turn',
    text: 'When you\'re done playing cards and attacking, click "End Turn" to pass to your opponent. The turn timer counts down — if it runs out, your turn ends automatically.',
    highlight: 'endturn',
    tip: 'Don\'t rush! Think about the best order to play cards and attack.',
  },
  {
    title: 'Starforge Ascension',
    text: 'Legendary minions on your board can be STARFORGED — the ultimate power move! This doubles their Attack and Health, grants BARRIER, a bonus keyword, and BLITZ for an immediate attack.\n\nThe cost? ALL your current mana AND your next turn\'s mana is locked. Time it for a game-ending swing!',
    highlight: 'none',
    tip: 'Look for the STARFORGE button under your legendary minions when conditions are met.',
  },
  {
    title: 'The 4 Galactic Factions',
    text: 'Each faction has a unique playstyle and Hero Power:\n• Pyroclast — aggressive burn damage, Last Words suicide minions\n• Cogsmiths — Mech synergy, Salvage card advantage\n• Luminar — healing, Guardian walls, Illuminate combos\n• Phantom Corsairs — Cloak stealth, Phase evasion, card theft',
    highlight: 'none',
    tip: 'Try all 4 factions to find your playstyle! Each one feels completely different.',
  },
  {
    title: 'Ready for Battle!',
    text: 'You know the basics! Here\'s a quick cheat sheet:\n• Green glow = playable card\n• Orange glow = minion ready to attack\n• Red glow = valid attack target\n• Hover any card = see keyword tooltips\n• STARFORGE button = legendary power-up\n\nStart with a practice game against an Easy AI, then climb the ladder!',
    highlight: 'none',
    tip: 'Complete daily quests for gold, open packs to grow your collection, and craft cards with Stardust!',
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
