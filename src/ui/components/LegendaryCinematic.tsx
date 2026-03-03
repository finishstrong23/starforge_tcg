/**
 * STARFORGE TCG - Legendary Card Entrance Cinematics (8.1.2)
 *
 * Each Legendary card gets a unique 2-3 second cinematic entrance:
 * - Camera zooms to the card
 * - Golden light erupts
 * - Card slams onto the board
 * - Faction-themed visual effects
 * - Skip by holding
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Race, RaceData } from '../../types/Race';

/**
 * Faction-specific cinematic themes
 */
const FACTION_THEMES: Record<Race, {
  primaryColor: string;
  secondaryColor: string;
  particleEmoji: string;
  entranceStyle: 'eruption' | 'rift' | 'descend' | 'grow' | 'swirl' | 'phase' | 'swarm' | 'cosmic' | 'temporal' | 'shatter';
  bgGlow: string;
}> = {
  [Race.PYROCLAST]: {
    primaryColor: '#ff4500',
    secondaryColor: '#ff8c00',
    particleEmoji: '\uD83D\uDD25',
    entranceStyle: 'eruption',
    bgGlow: 'radial-gradient(circle, rgba(255,69,0,0.4), transparent 70%)',
  },
  [Race.VOIDBORN]: {
    primaryColor: '#7b2fbe',
    secondaryColor: '#4a0080',
    particleEmoji: '\uD83D\uDF06',
    entranceStyle: 'rift',
    bgGlow: 'radial-gradient(circle, rgba(123,47,190,0.4), transparent 70%)',
  },
  [Race.LUMINAR]: {
    primaryColor: '#ffd700',
    secondaryColor: '#fff8dc',
    particleEmoji: '\u2728',
    entranceStyle: 'descend',
    bgGlow: 'radial-gradient(circle, rgba(255,215,0,0.4), transparent 70%)',
  },
  [Race.BIOTITANS]: {
    primaryColor: '#22c55e',
    secondaryColor: '#86efac',
    particleEmoji: '\uD83C\uDF3F',
    entranceStyle: 'grow',
    bgGlow: 'radial-gradient(circle, rgba(34,197,94,0.4), transparent 70%)',
  },
  [Race.CRYSTALLINE]: {
    primaryColor: '#818cf8',
    secondaryColor: '#c4b5fd',
    particleEmoji: '\uD83D\uDC8E',
    entranceStyle: 'swirl',
    bgGlow: 'radial-gradient(circle, rgba(129,140,248,0.4), transparent 70%)',
  },
  [Race.COGSMITHS]: {
    primaryColor: '#f59e0b',
    secondaryColor: '#d97706',
    particleEmoji: '\u2699',
    entranceStyle: 'shatter',
    bgGlow: 'radial-gradient(circle, rgba(245,158,11,0.4), transparent 70%)',
  },
  [Race.PHANTOM_CORSAIRS]: {
    primaryColor: '#06b6d4',
    secondaryColor: '#22d3ee',
    particleEmoji: '\uD83D\uDC7B',
    entranceStyle: 'phase',
    bgGlow: 'radial-gradient(circle, rgba(6,182,212,0.4), transparent 70%)',
  },
  [Race.HIVEMIND]: {
    primaryColor: '#84cc16',
    secondaryColor: '#a3e635',
    particleEmoji: '\uD83D\uDC1B',
    entranceStyle: 'swarm',
    bgGlow: 'radial-gradient(circle, rgba(132,204,22,0.4), transparent 70%)',
  },
  [Race.ASTROMANCERS]: {
    primaryColor: '#a78bfa',
    secondaryColor: '#e0e7ff',
    particleEmoji: '\u2B50',
    entranceStyle: 'cosmic',
    bgGlow: 'radial-gradient(circle, rgba(167,139,250,0.4), transparent 70%)',
  },
  [Race.CHRONOBOUND]: {
    primaryColor: '#22d3ee',
    secondaryColor: '#67e8f9',
    particleEmoji: '\u231B',
    entranceStyle: 'temporal',
    bgGlow: 'radial-gradient(circle, rgba(34,211,238,0.4), transparent 70%)',
  },
  [Race.NEUTRAL]: {
    primaryColor: '#ffd700',
    secondaryColor: '#fff',
    particleEmoji: '\u2B50',
    entranceStyle: 'descend',
    bgGlow: 'radial-gradient(circle, rgba(255,215,0,0.4), transparent 70%)',
  },
};

interface LegendaryCinematicProps {
  cardName: string;
  cardRace: Race;
  attack?: number;
  health?: number;
  cost: number;
  onComplete: () => void;
  /** Allow skipping by holding */
  skippable?: boolean;
}

export const LegendaryCinematic: React.FC<LegendaryCinematicProps> = ({
  cardName,
  cardRace,
  attack,
  health,
  cost,
  onComplete,
  skippable = true,
}) => {
  const [phase, setPhase] = useState<'zoom' | 'burst' | 'slam' | 'done'>('zoom');
  const [holding, setHolding] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const theme = FACTION_THEMES[cardRace] || FACTION_THEMES[Race.NEUTRAL];

  // Phase progression: zoom (0.8s) → burst (0.8s) → slam (0.8s) → done
  useEffect(() => {
    injectCinematicStyles();

    const t1 = setTimeout(() => setPhase('burst'), 800);
    const t2 = setTimeout(() => setPhase('slam'), 1600);
    const t3 = setTimeout(() => {
      setPhase('done');
      onComplete();
    }, 2400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  // Hold to skip
  const handlePointerDown = useCallback(() => {
    if (!skippable) return;
    setHolding(true);
    holdTimerRef.current = setTimeout(() => {
      setPhase('done');
      onComplete();
    }, 500);
  }, [skippable, onComplete]);

  const handlePointerUp = useCallback(() => {
    setHolding(false);
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
  }, []);

  if (phase === 'done') return null;

  // Generate particles
  const particles = Array.from({ length: 20 }, (_, i) => {
    const angle = (i / 20) * 360;
    const dist = 80 + Math.random() * 120;
    const x = Math.cos((angle * Math.PI) / 180) * dist;
    const y = Math.sin((angle * Math.PI) / 180) * dist;
    const delay = Math.random() * 0.3;
    const size = 12 + Math.random() * 16;
    return { x, y, delay, size, angle };
  });

  return (
    <div
      style={{
        ...s.overlay,
        opacity: 1,
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* Background glow */}
      <div style={{
        ...s.bgGlow,
        background: theme.bgGlow,
        transform: phase === 'burst' || phase === 'slam' ? 'scale(2)' : 'scale(0.5)',
        opacity: phase === 'zoom' ? 0.3 : phase === 'burst' ? 1 : 0.5,
      }} />

      {/* Radial light rays */}
      {phase !== 'zoom' && (
        <div className="legendary-rays" style={{
          ...s.rays,
          borderColor: theme.primaryColor,
        }} />
      )}

      {/* Particles */}
      {phase === 'burst' && particles.map((p, i) => (
        <div
          key={i}
          className="legendary-particle"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            fontSize: p.size,
            transform: `translate(${p.x}px, ${p.y}px)`,
            animationDelay: `${p.delay}s`,
            opacity: 0.8,
          }}
        >
          {theme.particleEmoji}
        </div>
      ))}

      {/* Card entrance */}
      <div
        className={
          phase === 'zoom' ? 'legendary-card-zoom' :
          phase === 'burst' ? 'legendary-card-burst' :
          'legendary-card-slam'
        }
        style={{
          ...s.cardFrame,
          borderColor: theme.primaryColor,
          boxShadow: `0 0 40px ${theme.primaryColor}, 0 0 80px ${theme.secondaryColor}`,
        }}
      >
        {/* Cost gem */}
        <div style={s.costGem}>{cost}</div>

        {/* Card name banner */}
        <div style={s.cardNameBg}>
          <div style={{ ...s.cardName, color: theme.primaryColor }}>{cardName}</div>
          <div style={{ color: '#ffd700', fontSize: 10, letterSpacing: 2 }}>LEGENDARY</div>
        </div>

        {/* Faction badge */}
        <div style={{ ...s.factionBadge, color: theme.primaryColor }}>
          {RaceData[cardRace].name}
        </div>

        {/* Stats */}
        {attack !== undefined && health !== undefined && (
          <div style={s.statsRow}>
            <div style={s.attackGem}>{attack}</div>
            <div style={s.healthGem}>{health}</div>
          </div>
        )}
      </div>

      {/* Hold to skip indicator */}
      {skippable && (
        <div style={{
          ...s.skipHint,
          opacity: holding ? 1 : 0.5,
        }}>
          {holding ? 'Skipping...' : 'Hold to skip'}
        </div>
      )}
    </div>
  );
};

/**
 * Hook to trigger legendary cinematics
 */
export function useLegendaryCinematic() {
  const [pending, setPending] = useState<{
    cardName: string;
    cardRace: Race;
    attack?: number;
    health?: number;
    cost: number;
  } | null>(null);

  const trigger = useCallback((card: {
    name: string;
    race: Race;
    attack?: number;
    health?: number;
    cost: number;
  }) => {
    setPending({
      cardName: card.name,
      cardRace: card.race,
      attack: card.attack,
      health: card.health,
      cost: card.cost,
    });
  }, []);

  const dismiss = useCallback(() => {
    setPending(null);
  }, []);

  return { pending, trigger, dismiss };
}

// ─── CSS Injection ──────────────────────────────────────────────────────────

let stylesInjected = false;
function injectCinematicStyles() {
  if (stylesInjected) return;
  stylesInjected = true;

  const css = `
    @keyframes legendaryZoom {
      from { transform: scale(3) rotate(-5deg); opacity: 0; }
      to { transform: scale(1) rotate(0deg); opacity: 1; }
    }
    @keyframes legendaryBurst {
      0% { transform: scale(1); }
      30% { transform: scale(1.15); }
      60% { transform: scale(0.95); }
      100% { transform: scale(1.05); }
    }
    @keyframes legendarySlam {
      0% { transform: scale(1.05) translateY(0); }
      40% { transform: scale(0.9) translateY(20px); }
      70% { transform: scale(1.02) translateY(-5px); }
      100% { transform: scale(1) translateY(0); }
    }
    @keyframes legendaryRays {
      from { transform: rotate(0deg); opacity: 0.6; }
      to { transform: rotate(180deg); opacity: 0; }
    }
    @keyframes legendaryParticle {
      0% { transform: translate(0,0) scale(1); opacity: 1; }
      100% { transform: translate(var(--px, 0), var(--py, 0)) scale(0); opacity: 0; }
    }
    .legendary-card-zoom {
      animation: legendaryZoom 0.8s cubic-bezier(0.2, 0.8, 0.3, 1) forwards;
    }
    .legendary-card-burst {
      animation: legendaryBurst 0.8s ease-out forwards;
    }
    .legendary-card-slam {
      animation: legendarySlam 0.8s cubic-bezier(0.2, 0.8, 0.3, 1) forwards;
    }
    .legendary-rays {
      animation: legendaryRays 2s linear infinite;
    }
    .legendary-particle {
      animation: legendaryParticle 0.8s ease-out forwards;
    }
  `;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    transition: 'opacity 0.3s',
    overflow: 'hidden',
  },
  bgGlow: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    transition: 'transform 0.8s ease-out, opacity 0.5s',
  },
  rays: {
    position: 'absolute',
    width: 400,
    height: 400,
    borderRadius: '50%',
    border: '2px dashed',
    opacity: 0.3,
  },
  cardFrame: {
    position: 'relative',
    width: 200,
    height: 280,
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    borderRadius: 16,
    border: '3px solid',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 10,
  },
  costGem: {
    position: 'absolute',
    top: -14,
    left: -14,
    width: 36,
    height: 36,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #60a5fa',
    zIndex: 11,
  },
  cardNameBg: {
    textAlign: 'center',
    padding: '8px 16px',
  },
  cardName: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  factionBadge: {
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  statsRow: {
    display: 'flex',
    gap: 40,
    position: 'absolute',
    bottom: -12,
  },
  attackGem: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #fbbf24',
  },
  healthGem: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid #f87171',
  },
  skipHint: {
    position: 'absolute',
    bottom: 30,
    color: '#888',
    fontSize: 12,
    letterSpacing: 1,
    transition: 'opacity 0.2s',
  },
};
