/**
 * STARFORGE TCG - Professional Attack Animation
 *
 * Multi-phase combat animation with:
 * - Attacker wind-up glow and lunge
 * - Energy projectile with particle trail
 * - Impact burst with expanding shockwave rings
 * - Floating damage numbers with bounce
 * - Screen flash on impact
 * - Defender shake on hit
 */

import React, { useEffect, useState, useRef, useMemo } from 'react';

export interface AttackAnimationData {
  id: string;
  attackerId: string;
  defenderId: string;
  damage: number;
  counterDamage: number;
  isPlayerAttack: boolean;
}

interface AttackAnimationProps {
  animation: AttackAnimationData | null;
  onComplete: () => void;
}

const ANIMATION_DURATION = 700;

// Generate trail particle positions along the path
function generateTrailParticles(count: number): { offset: number; spread: number; size: number; opacity: number }[] {
  return Array.from({ length: count }, (_, i) => ({
    offset: (i / count) * 0.85,
    spread: (Math.sin(i * 2.7) * 0.5 + 0.5) * 8 - 4,
    size: 1.5 + Math.sin(i * 1.3) * 1,
    opacity: 0.3 + (i / count) * 0.4,
  }));
}

export const AttackAnimation: React.FC<AttackAnimationProps> = ({ animation, onComplete }) => {
  const [phase, setPhase] = useState<'idle' | 'windup' | 'slash' | 'impact'>('idle');
  const [positions, setPositions] = useState<{
    attackerX: number; attackerY: number;
    defenderX: number; defenderY: number;
  } | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const trailParticles = useMemo(() => generateTrailParticles(8), []);

  useEffect(() => {
    if (!animation) {
      setPhase('idle');
      setPositions(null);
      return;
    }

    const attackerEl = document.querySelector(`[data-card-id="${animation.attackerId}"]`) as HTMLElement | null;
    const defenderEl = document.querySelector(`[data-card-id="${animation.defenderId}"]`) as HTMLElement | null;

    if (!attackerEl || !defenderEl) {
      onComplete();
      return;
    }

    const attackerRect = attackerEl.getBoundingClientRect();
    const defenderRect = defenderEl.getBoundingClientRect();

    setPositions({
      attackerX: attackerRect.left + attackerRect.width / 2,
      attackerY: attackerRect.top + attackerRect.height / 2,
      defenderX: defenderRect.left + defenderRect.width / 2,
      defenderY: defenderRect.top + defenderRect.height / 2,
    });

    // Phase 1: Wind-up (brief glow on attacker)
    setPhase('windup');

    timeoutRef.current = setTimeout(() => {
      // Phase 2: Slash projectile
      setPhase('slash');

      timeoutRef.current = setTimeout(() => {
        // Phase 3: Impact
        setPhase('impact');

        // Add shake to defender element
        defenderEl.style.animation = 'shake 0.3s ease-out';
        setTimeout(() => { defenderEl.style.animation = ''; }, 300);

        timeoutRef.current = setTimeout(() => {
          setPhase('idle');
          setPositions(null);
          onComplete();
        }, ANIMATION_DURATION * 0.45);
      }, ANIMATION_DURATION * 0.4);
    }, ANIMATION_DURATION * 0.12);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [animation, onComplete]);

  if (!animation || !positions || phase === 'idle') return null;

  const dx = positions.defenderX - positions.attackerX;
  const dy = positions.defenderY - positions.attackerY;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const distance = Math.sqrt(dx * dx + dy * dy);

  return (
    <div style={styles.overlay}>
      <style>{`
        @keyframes sf-windup-glow {
          0% { box-shadow: 0 0 0 transparent; }
          100% { box-shadow: 0 0 20px #ff8800, 0 0 40px #ff6600, 0 0 60px rgba(255, 100, 0, 0.3); }
        }
        @keyframes sf-projectile-travel {
          0% {
            transform: translate(${positions.attackerX}px, ${positions.attackerY}px) rotate(${angle}deg) scale(0.3);
            opacity: 0;
          }
          10% {
            opacity: 1;
            transform: translate(${positions.attackerX}px, ${positions.attackerY}px) rotate(${angle}deg) scale(1);
          }
          85% {
            transform: translate(${positions.defenderX}px, ${positions.defenderY}px) rotate(${angle}deg) scale(1.1);
            opacity: 1;
          }
          100% {
            transform: translate(${positions.defenderX}px, ${positions.defenderY}px) rotate(${angle}deg) scale(0.5);
            opacity: 0;
          }
        }
        @keyframes sf-trail-particle {
          0% { opacity: 0.6; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(${-dx * 0.05}px, ${-dy * 0.05}px) scale(0); }
        }
        @keyframes sf-impact-ring {
          0% { transform: translate(-50%, -50%) scale(0.2); opacity: 0.8; border-width: 3px; }
          60% { opacity: 0.4; }
          100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; border-width: 0.5px; }
        }
        @keyframes sf-impact-flash {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.9; }
          100% { transform: translate(-50%, -50%) scale(3); opacity: 0; }
        }
        @keyframes sf-impact-spark {
          0% { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(var(--spark-dx), var(--spark-dy)) scale(0); }
        }
        @keyframes sf-damage-pop {
          0% { transform: translate(-50%, 0) scale(0.5); opacity: 0; }
          20% { transform: translate(-50%, -10px) scale(1.3); opacity: 1; }
          40% { transform: translate(-50%, -25px) scale(1); }
          100% { transform: translate(-50%, -45px) scale(0.9); opacity: 0; }
        }
        @keyframes sf-screen-flash {
          0% { opacity: 0.15; }
          100% { opacity: 0; }
        }
        @keyframes sf-attacker-lunge {
          0% { transform: translate(0, 0); }
          30% { transform: translate(${dx * 0.06}px, ${dy * 0.06}px); }
          100% { transform: translate(0, 0); }
        }
      `}</style>

      {/* Screen flash on impact */}
      {phase === 'impact' && (
        <div style={{
          ...styles.screenFlash,
          animation: `sf-screen-flash ${ANIMATION_DURATION * 0.2}ms ease-out forwards`,
        }} />
      )}

      {/* Energy projectile */}
      {phase === 'slash' && (
        <>
          {/* Main projectile */}
          <div
            style={{
              ...styles.projectile,
              animation: `sf-projectile-travel ${ANIMATION_DURATION * 0.4}ms ease-in forwards`,
            }}
          >
            {/* Inner energy core */}
            <div style={styles.projectileCore} />
            {/* Outer glow */}
            <div style={styles.projectileGlow} />
          </div>

          {/* Trail particles along path */}
          {trailParticles.map((p, i) => {
            const px = positions.attackerX + dx * p.offset;
            const py = positions.attackerY + dy * p.offset + p.spread;
            return (
              <div key={`trail${i}`} style={{
                position: 'fixed',
                left: px,
                top: py,
                width: `${p.size * 2}px`,
                height: `${p.size * 2}px`,
                borderRadius: '50%',
                background: i % 2 === 0
                  ? 'radial-gradient(circle, #ffaa44 0%, #ff6600 50%, transparent 100%)'
                  : 'radial-gradient(circle, #ffcc88 0%, #ff8844 50%, transparent 100%)',
                opacity: 0,
                animation: `sf-trail-particle ${ANIMATION_DURATION * 0.3}ms ease-out ${i * 25}ms forwards`,
                pointerEvents: 'none',
                zIndex: 901,
              }} />
            );
          })}
        </>
      )}

      {/* Impact effects on defender */}
      {phase === 'impact' && (
        <>
          {/* Central flash */}
          <div style={{
            position: 'fixed',
            left: positions.defenderX,
            top: positions.defenderY,
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,220,100,0.9) 0%, rgba(255,120,0,0.6) 30%, transparent 70%)',
            animation: `sf-impact-flash ${ANIMATION_DURATION * 0.3}ms ease-out forwards`,
            pointerEvents: 'none',
            zIndex: 902,
          }} />

          {/* Shockwave ring 1 */}
          <div style={{
            ...styles.impactRing,
            left: positions.defenderX,
            top: positions.defenderY,
            borderColor: '#ff8800',
            animation: `sf-impact-ring ${ANIMATION_DURATION * 0.4}ms ease-out forwards`,
          }} />

          {/* Shockwave ring 2 (delayed) */}
          <div style={{
            ...styles.impactRing,
            left: positions.defenderX,
            top: positions.defenderY,
            borderColor: '#ff6600',
            animation: `sf-impact-ring ${ANIMATION_DURATION * 0.4}ms ease-out 60ms forwards`,
            opacity: 0,
          }} />

          {/* Impact sparks */}
          {Array.from({ length: 6 }, (_, i) => {
            const sparkAngle = (i / 6) * Math.PI * 2 + Math.sin(i * 1.7) * 0.5;
            const sparkDist = 25 + Math.sin(i * 2.3) * 15;
            return (
              <div key={`spark${i}`} style={{
                position: 'fixed',
                left: positions.defenderX,
                top: positions.defenderY,
                width: '3px',
                height: '3px',
                borderRadius: '50%',
                background: i % 3 === 0 ? '#ffdd88' : i % 3 === 1 ? '#ff8844' : '#ffaa44',
                animation: `sf-impact-spark ${ANIMATION_DURATION * 0.35}ms ease-out ${i * 20}ms forwards`,
                pointerEvents: 'none',
                zIndex: 903,
                '--spark-dx': `${Math.cos(sparkAngle) * sparkDist}px`,
                '--spark-dy': `${Math.sin(sparkAngle) * sparkDist}px`,
              } as React.CSSProperties} />
            );
          })}

          {/* Damage number (defender) */}
          {animation.damage > 0 && (
            <div style={{
              ...styles.damageNumber,
              left: positions.defenderX,
              top: positions.defenderY - 15,
              animation: `sf-damage-pop ${ANIMATION_DURATION * 0.55}ms ease-out forwards`,
            }}>
              -{animation.damage}
            </div>
          )}

          {/* Counter-damage number (attacker) */}
          {animation.counterDamage > 0 && (
            <div style={{
              ...styles.damageNumber,
              left: positions.attackerX,
              top: positions.attackerY - 15,
              animation: `sf-damage-pop ${ANIMATION_DURATION * 0.55}ms ease-out 100ms forwards`,
              opacity: 0,
            }}>
              -{animation.counterDamage}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 900,
  },
  screenFlash: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'radial-gradient(circle at 50% 50%, rgba(255, 150, 50, 0.2) 0%, rgba(255, 100, 0, 0.05) 50%, transparent 80%)',
    pointerEvents: 'none',
    zIndex: 899,
  },
  projectile: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '24px',
    height: '24px',
    marginLeft: '-12px',
    marginTop: '-12px',
    pointerEvents: 'none',
    zIndex: 901,
    willChange: 'transform, opacity',
  },
  projectileCore: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, #ffffff 0%, #ffcc44 40%, #ff8800 100%)',
    boxShadow: '0 0 6px #ffcc44, 0 0 12px #ff8800',
  },
  projectileGlow: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,170,50,0.5) 0%, rgba(255,100,0,0.2) 40%, transparent 70%)',
  },
  impactRing: {
    position: 'fixed',
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    border: '2px solid #ff8800',
    background: 'transparent',
    pointerEvents: 'none',
    zIndex: 902,
  },
  damageNumber: {
    position: 'fixed',
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#ff4444',
    textShadow: '0 0 8px #ff0000, 0 0 16px #cc0000, 2px 2px 0 #000, -1px -1px 0 #000',
    pointerEvents: 'none',
    zIndex: 905,
    fontFamily: "'Segoe UI', sans-serif",
    letterSpacing: '-1px',
  },
};
