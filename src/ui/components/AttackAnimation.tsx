/**
 * STARFORGE TCG - Attack Animation
 *
 * Shows a visual slash/projectile animation from attacker to defender.
 * Uses CSS keyframe animations injected via a <style> tag.
 *
 * The animation:
 * 1. Highlights the attacker with a lunge
 * 2. Sends a projectile/slash from attacker to defender
 * 3. Shows an impact burst on the defender
 */

import React, { useEffect, useState, useRef } from 'react';

export interface AttackAnimationData {
  /** Unique ID for this animation */
  id: string;
  /** Instance ID of the attacking card (or hero ID) */
  attackerId: string;
  /** Instance ID of the defending card (or hero ID) */
  defenderId: string;
  /** Damage dealt by attacker */
  damage: number;
  /** Counter-damage dealt to attacker (0 for hero targets) */
  counterDamage: number;
  /** Whether attacker is the player */
  isPlayerAttack: boolean;
}

interface AttackAnimationProps {
  animation: AttackAnimationData | null;
  onComplete: () => void;
}

// Total animation duration in ms
const ANIMATION_DURATION = 600;

export const AttackAnimation: React.FC<AttackAnimationProps> = ({ animation, onComplete }) => {
  const [phase, setPhase] = useState<'idle' | 'slash' | 'impact'>('idle');
  const [positions, setPositions] = useState<{
    attackerX: number; attackerY: number;
    defenderX: number; defenderY: number;
  } | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!animation) {
      setPhase('idle');
      setPositions(null);
      return;
    }

    // Find DOM elements for attacker and defender
    const attackerEl = document.querySelector(`[data-card-id="${animation.attackerId}"]`) as HTMLElement | null;
    const defenderEl = document.querySelector(`[data-card-id="${animation.defenderId}"]`) as HTMLElement | null;

    if (!attackerEl || !defenderEl) {
      // Elements not found — skip animation
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

    // Phase 1: Slash projectile
    setPhase('slash');

    // Phase 2: Impact after projectile reaches target
    timeoutRef.current = setTimeout(() => {
      setPhase('impact');

      // Complete after impact
      timeoutRef.current = setTimeout(() => {
        setPhase('idle');
        setPositions(null);
        onComplete();
      }, ANIMATION_DURATION * 0.4);
    }, ANIMATION_DURATION * 0.5);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [animation, onComplete]);

  if (!animation || !positions || phase === 'idle') return null;

  const dx = positions.defenderX - positions.attackerX;
  const dy = positions.defenderY - positions.attackerY;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return (
    <div style={styles.overlay}>
      {/* Inject keyframe animations */}
      <style>{`
        @keyframes sf-slash-travel {
          0% {
            transform: translate(${positions.attackerX}px, ${positions.attackerY}px) rotate(${angle}deg) scale(0.5);
            opacity: 1;
          }
          80% {
            transform: translate(${positions.defenderX}px, ${positions.defenderY}px) rotate(${angle}deg) scale(1.2);
            opacity: 1;
          }
          100% {
            transform: translate(${positions.defenderX}px, ${positions.defenderY}px) rotate(${angle}deg) scale(0.8);
            opacity: 0;
          }
        }
        @keyframes sf-impact-burst {
          0% { transform: translate(-50%, -50%) scale(0.3); opacity: 1; }
          50% { transform: translate(-50%, -50%) scale(1.5); opacity: 0.8; }
          100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
        }
        @keyframes sf-damage-float {
          0% { transform: translate(-50%, 0) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -40px) scale(1.3); opacity: 0; }
        }
        @keyframes sf-attacker-lunge {
          0% { transform: translate(0, 0); }
          40% { transform: translate(${dx * 0.08}px, ${dy * 0.08}px); }
          100% { transform: translate(0, 0); }
        }
      `}</style>

      {/* Slash projectile */}
      {phase === 'slash' && (
        <div
          style={{
            ...styles.slashProjectile,
            animation: `sf-slash-travel ${ANIMATION_DURATION * 0.5}ms ease-out forwards`,
          }}
        >
          {'\u2694\uFE0F'}
        </div>
      )}

      {/* Impact burst on defender */}
      {phase === 'impact' && (
        <>
          <div
            style={{
              ...styles.impactBurst,
              left: positions.defenderX,
              top: positions.defenderY,
              animation: `sf-impact-burst ${ANIMATION_DURATION * 0.4}ms ease-out forwards`,
            }}
          />

          {/* Damage number floating up from defender */}
          {animation.damage > 0 && (
            <div
              style={{
                ...styles.damageNumber,
                left: positions.defenderX,
                top: positions.defenderY - 20,
                animation: `sf-damage-float ${ANIMATION_DURATION * 0.5}ms ease-out forwards`,
              }}
            >
              -{animation.damage}
            </div>
          )}

          {/* Counter-damage number floating up from attacker */}
          {animation.counterDamage > 0 && (
            <div
              style={{
                ...styles.damageNumber,
                left: positions.attackerX,
                top: positions.attackerY - 20,
                animation: `sf-damage-float ${ANIMATION_DURATION * 0.5}ms ease-out forwards`,
              }}
            >
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
  slashProjectile: {
    position: 'fixed',
    top: 0,
    left: 0,
    fontSize: '28px',
    filter: 'drop-shadow(0 0 8px #ff6600) drop-shadow(0 0 16px #ff4400)',
    pointerEvents: 'none',
    zIndex: 901,
    willChange: 'transform, opacity',
  },
  impactBurst: {
    position: 'fixed',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255,102,0,0.9) 0%, rgba(255,60,0,0.5) 40%, transparent 70%)',
    boxShadow: '0 0 20px rgba(255,80,0,0.6), 0 0 40px rgba(255,60,0,0.3)',
    pointerEvents: 'none',
    zIndex: 901,
  },
  damageNumber: {
    position: 'fixed',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#ff4444',
    textShadow: '0 0 6px #ff0000, 0 0 12px #cc0000, 2px 2px 0 #000',
    pointerEvents: 'none',
    zIndex: 902,
    fontFamily: 'monospace',
  },
};
