/**
 * STARFORGE TCG - Hero Intro Overlay
 *
 * Pre-match cinematic intro showing both heroes with opening quotes,
 * similar to Hearthstone's hero entrance. Displays a dramatic VS screen
 * with staggered animations before the match begins.
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { HeroDefinition } from '../../types/Player';
import type { Race } from '../../types/Race';

/** Race-themed accent colors for the intro panels */
const RACE_COLORS: Record<string, { primary: string; glow: string }> = {
  COGSMITHS:        { primary: '#ff8800', glow: '#ff9922' },
  LUMINAR:          { primary: '#ffdd44', glow: '#ffee66' },
  PYROCLAST:        { primary: '#ff4400', glow: '#ff5522' },
  VOIDBORN:         { primary: '#8844ff', glow: '#9955ff' },
  BIOTITANS:        { primary: '#44cc44', glow: '#55dd55' },
  CRYSTALLINE:      { primary: '#44ccff', glow: '#55ddff' },
  PHANTOM_CORSAIRS: { primary: '#8888bb', glow: '#9999cc' },
  HIVEMIND:         { primary: '#aacc00', glow: '#bbdd22' },
  ASTROMANCERS:     { primary: '#4466ff', glow: '#5577ff' },
  CHRONOBOUND:      { primary: '#cc8844', glow: '#dd9955' },
};

function getRaceColor(race: Race | string) {
  return RACE_COLORS[race] || { primary: '#888888', glow: '#aaaaaa' };
}

interface HeroIntroProps {
  playerHero: HeroDefinition;
  opponentHero: HeroDefinition;
  onComplete: () => void;
}

/**
 * Animated intro phases:
 * 0 - fade in backdrop
 * 1 - player hero slides in from left
 * 2 - opponent hero slides in from right
 * 3 - VS flash appears
 * 4 - quotes appear
 * 5 - hold for reading
 * 6 - fade out
 */
type IntroPhase = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const HeroIntro: React.FC<HeroIntroProps> = ({
  playerHero,
  opponentHero,
  onComplete,
}) => {
  const [phase, setPhase] = useState<IntroPhase>(0);
  const [exiting, setExiting] = useState(false);

  const playerColor = getRaceColor(playerHero.race);
  const opponentColor = getRaceColor(opponentHero.race);

  // Phase timing — fast sequence, auto-completes after ~4s
  // Capture onComplete in a ref so timers always call the latest version
  const onCompleteRef = React.useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const finish = () => onCompleteRef.current();

    timers.push(setTimeout(() => setPhase(1), 200));   // player slides in
    timers.push(setTimeout(() => setPhase(2), 600));   // opponent slides in
    timers.push(setTimeout(() => setPhase(3), 1000));  // VS flash
    timers.push(setTimeout(() => setPhase(4), 1400));  // quotes appear
    timers.push(setTimeout(() => setPhase(5), 1800));  // hold
    timers.push(setTimeout(() => {
      setExiting(true);
      setPhase(6);
    }, 3500));
    timers.push(setTimeout(finish, 4200)); // fully done

    // Safety fallback: force complete after 6 seconds no matter what
    timers.push(setTimeout(finish, 6000));

    return () => timers.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Skip on click — immediate, no conditions
  const handleSkip = useCallback(() => {
    setExiting(true);
    setPhase(6);
    onCompleteRef.current();
  }, []);

  return (
    <div style={{
      ...introStyles.overlay,
      opacity: phase === 0 ? 0 : exiting ? 0 : 1,
      transition: 'opacity 0.4s ease',
    }} onClick={handleSkip}>
      {/* Dramatic background with diagonal split */}
      <div style={introStyles.bgSplit}>
        <div style={{
          ...introStyles.bgHalf,
          background: `linear-gradient(135deg, ${playerColor.primary}15 0%, transparent 60%)`,
        }} />
        <div style={{
          ...introStyles.bgHalf,
          background: `linear-gradient(315deg, ${opponentColor.primary}15 0%, transparent 60%)`,
        }} />
      </div>

      {/* Center line / energy beam */}
      <div style={{
        ...introStyles.centerBeam,
        opacity: phase >= 3 ? 1 : 0,
        boxShadow: phase >= 3 ? '0 0 40px rgba(255, 255, 255, 0.3)' : 'none',
      }} />

      {/* Player Hero (left side) */}
      <div style={{
        ...introStyles.heroPanel,
        ...introStyles.playerPanel,
        transform: phase >= 1 ? 'translateX(0)' : 'translateX(-100%)',
        opacity: phase >= 1 ? 1 : 0,
      }}>
        <div style={{
          ...introStyles.heroPortraitFrame,
          borderColor: playerColor.primary,
          boxShadow: `0 0 30px ${playerColor.glow}40, inset 0 0 20px ${playerColor.glow}20`,
        }}>
          <div style={introStyles.heroIcon}>
            {/* Helmeted warrior silhouette */}
            <svg width="100" height="100" viewBox="0 0 100 100">
              <defs>
                <radialGradient id="intro_pl_bg" cx="0.5" cy="0.4" r="0.6">
                  <stop offset="0%" stopColor="#102040" />
                  <stop offset="100%" stopColor="#060818" />
                </radialGradient>
                <linearGradient id="intro_helm" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={playerColor.primary} stopOpacity="0.8" />
                  <stop offset="100%" stopColor={playerColor.primary} stopOpacity="0.3" />
                </linearGradient>
              </defs>
              <rect width="100" height="100" fill="url(#intro_pl_bg)" rx="8" />
              <path d="M 20 55 Q 18 25 50 12 Q 82 25 80 55 L 72 80 L 28 80 Z"
                fill="url(#intro_helm)" stroke={playerColor.primary} strokeWidth="1.5" opacity="0.85" />
              <rect x="25" y="40" width="50" height="10" rx="3" fill="#0a1020" opacity="0.8" />
              <ellipse cx="38" cy="45" rx="5" ry="3" fill={playerColor.primary} opacity="0.8" />
              <ellipse cx="62" cy="45" rx="5" ry="3" fill={playerColor.primary} opacity="0.8" />
              <path d="M 50 12 Q 51 35 50 55" fill="none" stroke={playerColor.primary} strokeWidth="1.5" opacity="0.4" />
            </svg>
          </div>
        </div>
        <div style={{
          ...introStyles.heroName,
          color: playerColor.primary,
          textShadow: `0 0 20px ${playerColor.glow}60`,
        }}>
          {playerHero.name}
        </div>
        <div style={{
          ...introStyles.heroQuote,
          opacity: phase >= 4 ? 1 : 0,
          transform: phase >= 4 ? 'translateY(0)' : 'translateY(10px)',
        }}>
          "{playerHero.introQuote}"
        </div>
      </div>

      {/* VS Badge */}
      <div style={{
        ...introStyles.vsBadge,
        opacity: phase >= 3 ? 1 : 0,
        transform: phase >= 3 ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(2.5)',
      }}>
        <span style={introStyles.vsText}>VS</span>
      </div>

      {/* Opponent Hero (right side) */}
      <div style={{
        ...introStyles.heroPanel,
        ...introStyles.opponentPanel,
        transform: phase >= 2 ? 'translateX(0)' : 'translateX(100%)',
        opacity: phase >= 2 ? 1 : 0,
      }}>
        <div style={{
          ...introStyles.heroPortraitFrame,
          borderColor: opponentColor.primary,
          boxShadow: `0 0 30px ${opponentColor.glow}40, inset 0 0 20px ${opponentColor.glow}20`,
        }}>
          <div style={introStyles.heroIcon}>
            {/* Dark lord silhouette */}
            <svg width="100" height="100" viewBox="0 0 100 100">
              <defs>
                <radialGradient id="intro_opp_bg" cx="0.5" cy="0.4" r="0.6">
                  <stop offset="0%" stopColor="#2a1030" />
                  <stop offset="100%" stopColor="#0a0512" />
                </radialGradient>
              </defs>
              <rect width="100" height="100" fill="url(#intro_opp_bg)" rx="8" />
              <path d="M 15 55 Q 15 20 50 8 Q 85 20 85 55 L 72 85 L 28 85 Z"
                fill="#1a0825" stroke={opponentColor.primary} strokeWidth="1.5" opacity="0.8" />
              <ellipse cx="38" cy="43" rx="8" ry="4" fill={opponentColor.primary} opacity="0.9" />
              <ellipse cx="62" cy="43" rx="8" ry="4" fill={opponentColor.primary} opacity="0.9" />
              <path d="M 25 35 Q 10 8 30 15" fill="none" stroke={opponentColor.primary} strokeWidth="2" opacity="0.6" />
              <path d="M 75 35 Q 90 8 70 15" fill="none" stroke={opponentColor.primary} strokeWidth="2" opacity="0.6" />
            </svg>
          </div>
        </div>
        <div style={{
          ...introStyles.heroName,
          color: opponentColor.primary,
          textShadow: `0 0 20px ${opponentColor.glow}60`,
        }}>
          {opponentHero.name}
        </div>
        <div style={{
          ...introStyles.heroQuote,
          opacity: phase >= 4 ? 1 : 0,
          transform: phase >= 4 ? 'translateY(0)' : 'translateY(10px)',
        }}>
          "{opponentHero.introQuote}"
        </div>
      </div>

      {/* Skip hint */}
      <div style={{
        ...introStyles.skipHint,
        opacity: phase >= 2 ? 0.5 : 0,
      }}>
        Click to skip
      </div>
    </div>
  );
};

const introStyles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0, 0, 0, 0.92)',
    cursor: 'pointer',
    overflow: 'hidden',
  },
  bgSplit: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
  },
  bgHalf: {
    flex: 1,
    transition: 'background 1s ease',
  },
  centerBeam: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '50%',
    width: '2px',
    background: 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.4) 30%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.4) 70%, transparent 100%)',
    transform: 'translateX(-50%)',
    transition: 'opacity 0.5s ease',
  },
  heroPanel: {
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    transition: 'transform 0.6s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease',
    width: '40%',
    maxWidth: '350px',
  },
  playerPanel: {
    left: '5%',
  },
  opponentPanel: {
    right: '5%',
  },
  heroPortraitFrame: {
    width: '110px',
    height: '110px',
    borderRadius: '50%',
    border: '3px solid',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    background: 'rgba(0, 0, 0, 0.5)',
  },
  heroIcon: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroName: {
    fontSize: '22px',
    fontWeight: 'bold',
    letterSpacing: '1px',
    textAlign: 'center' as const,
  },
  heroQuote: {
    fontSize: '14px',
    fontStyle: 'italic',
    color: '#ccccdd',
    textAlign: 'center' as const,
    maxWidth: '280px',
    lineHeight: '1.5',
    transition: 'opacity 0.6s ease, transform 0.6s ease',
  },
  vsBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,200,0,0.15) 0%, transparent 70%)',
    border: '2px solid rgba(255, 200, 0, 0.4)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    zIndex: 10,
    boxShadow: '0 0 40px rgba(255, 200, 0, 0.2), 0 0 80px rgba(255, 200, 0, 0.1)',
  },
  vsText: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#ffc800',
    textShadow: '0 0 20px rgba(255, 200, 0, 0.6), 0 2px 4px rgba(0, 0, 0, 0.8)',
    letterSpacing: '4px',
  },
  skipHint: {
    position: 'absolute',
    bottom: '30px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '13px',
    color: '#666',
    transition: 'opacity 0.5s ease',
  },
};
