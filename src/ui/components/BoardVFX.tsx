/**
 * STARFORGE TCG - Board Destruction VFX & Screen Shake (8.1.1 + 8.1.4)
 *
 * Visual effects that affect the entire game board:
 * - Board crack lines on heavy attacks (10+ damage)
 * - Supernova flash on STARFORGE transformations
 * - Board shatter on lethal kill
 * - Screen shake with intensity scaling
 * - Hit-stop freeze frames on lethal blows
 * - Slow-motion on game-winning lethal
 * - Screen pulse on AoE effects
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Board-level VFX event types
 */
export type BoardVFXType =
  | 'screen_shake'      // Shake the board
  | 'board_crack'       // Fracture lines on the board
  | 'supernova'         // STARFORGE transformation flash
  | 'board_shatter'     // Lethal kill — board explodes outward
  | 'hit_stop'          // Freeze frame on lethal blow
  | 'slow_motion'       // Slow-mo on game-winning lethal
  | 'aoe_pulse'         // Screen pulse for board-wide effects
  | 'impact_flash';     // Brief white flash on heavy hits

export interface BoardVFXEvent {
  id: number;
  type: BoardVFXType;
  intensity: number; // 0-1 scale
  duration: number;  // ms
  createdAt: number;
}

interface BoardVFXOverlayProps {
  events: BoardVFXEvent[];
  onEventDone: (id: number) => void;
}

// Inject CSS once
let boardVFXInjected = false;
function injectBoardVFXStyles() {
  if (boardVFXInjected) return;
  boardVFXInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes board-crack-appear {
      0% { opacity: 0; transform: scaleX(0); }
      10% { opacity: 0.8; transform: scaleX(1); }
      80% { opacity: 0.6; }
      100% { opacity: 0; }
    }

    @keyframes supernova-flash {
      0% { opacity: 0; transform: scale(0.1); }
      10% { opacity: 1; transform: scale(0.5); }
      30% { opacity: 0.9; transform: scale(1.5); }
      100% { opacity: 0; transform: scale(3); }
    }

    @keyframes supernova-ring {
      0% { opacity: 0.8; transform: scale(0.2); border-width: 4px; }
      100% { opacity: 0; transform: scale(4); border-width: 1px; }
    }

    @keyframes board-shatter-piece {
      0% { opacity: 1; transform: translate(0, 0) rotate(0deg) scale(1); }
      30% { opacity: 1; }
      100% { opacity: 0; transform: translate(var(--sh-dx), var(--sh-dy)) rotate(var(--sh-rot)) scale(0.3); }
    }

    @keyframes aoe-pulse {
      0% { opacity: 0; transform: scale(0.3); }
      20% { opacity: 0.4; transform: scale(1); }
      100% { opacity: 0; transform: scale(2.5); }
    }

    @keyframes impact-flash {
      0% { opacity: 0; }
      10% { opacity: 0.8; }
      100% { opacity: 0; }
    }

    @keyframes slow-mo-border {
      0% { opacity: 0; }
      20% { opacity: 1; }
      80% { opacity: 1; }
      100% { opacity: 0; }
    }

    .board-shake-light {
      animation: board-shake-light 0.15s ease-out;
    }
    .board-shake-medium {
      animation: board-shake-medium 0.2s ease-out;
    }
    .board-shake-heavy {
      animation: board-shake-heavy 0.3s ease-out;
    }
    .board-shake-extreme {
      animation: board-shake-extreme 0.4s ease-out;
    }

    @keyframes board-shake-light {
      0%, 100% { transform: translate(0, 0); }
      25% { transform: translate(-2px, 1px); }
      50% { transform: translate(2px, -1px); }
      75% { transform: translate(-1px, 2px); }
    }

    @keyframes board-shake-medium {
      0%, 100% { transform: translate(0, 0); }
      10% { transform: translate(-4px, 2px); }
      30% { transform: translate(3px, -3px); }
      50% { transform: translate(-3px, 1px); }
      70% { transform: translate(2px, -2px); }
      90% { transform: translate(-1px, 1px); }
    }

    @keyframes board-shake-heavy {
      0%, 100% { transform: translate(0, 0); }
      10% { transform: translate(-6px, 3px); }
      20% { transform: translate(5px, -4px); }
      30% { transform: translate(-4px, 5px); }
      40% { transform: translate(6px, -2px); }
      50% { transform: translate(-3px, 4px); }
      60% { transform: translate(4px, -3px); }
      70% { transform: translate(-2px, 2px); }
      80% { transform: translate(3px, -1px); }
      90% { transform: translate(-1px, 1px); }
    }

    @keyframes board-shake-extreme {
      0%, 100% { transform: translate(0, 0); }
      5% { transform: translate(-10px, 5px) rotate(-0.5deg); }
      15% { transform: translate(8px, -6px) rotate(0.3deg); }
      25% { transform: translate(-7px, 8px) rotate(-0.3deg); }
      35% { transform: translate(9px, -3px) rotate(0.2deg); }
      45% { transform: translate(-5px, 6px) rotate(-0.2deg); }
      55% { transform: translate(6px, -5px) rotate(0.1deg); }
      65% { transform: translate(-4px, 3px); }
      75% { transform: translate(3px, -2px); }
      85% { transform: translate(-2px, 1px); }
      95% { transform: translate(1px, -1px); }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Board crack effect - fracture lines appear on heavy attacks
 */
const BoardCrack: React.FC<{ intensity: number; onDone: () => void }> = ({ intensity, onDone }) => {
  useEffect(() => {
    const timer = setTimeout(onDone, 1500);
    return () => clearTimeout(timer);
  }, [onDone]);

  const numCracks = Math.floor(intensity * 5) + 2;
  const cracks = useRef(
    Array.from({ length: numCracks }, (_, i) => ({
      x: 30 + Math.random() * 40,
      y: 35 + Math.random() * 30,
      angle: Math.random() * 360,
      length: 60 + Math.random() * 80 * intensity,
      width: 1 + Math.random() * 2 * intensity,
      delay: i * 0.05,
    }))
  ).current;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none',
    }}>
      {cracks.map((crack, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: `${crack.y}%`,
          left: `${crack.x}%`,
          width: `${crack.length}px`,
          height: `${crack.width}px`,
          background: `linear-gradient(90deg,
            rgba(255,140,0,${0.6 * intensity}) 0%,
            rgba(255,80,0,${0.4 * intensity}) 40%,
            rgba(100,100,100,${0.3 * intensity}) 100%)`,
          transform: `rotate(${crack.angle}deg)`,
          transformOrigin: 'left center',
          animation: `board-crack-appear 1.5s ease-out ${crack.delay}s forwards`,
          opacity: 0,
          borderRadius: 1,
          boxShadow: `0 0 ${4 * intensity}px rgba(255,100,0,${0.3 * intensity})`,
        }} />
      ))}
    </div>
  );
};

/**
 * Supernova flash for STARFORGE transformations
 */
const SupernovaFlash: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  useEffect(() => {
    const timer = setTimeout(onDone, 1500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none' }}>
      {/* Central flash */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: 100, height: 100,
        marginTop: -50, marginLeft: -50,
        background: 'radial-gradient(circle, #fff 0%, #ffd700 20%, rgba(255,140,0,0.6) 40%, transparent 70%)',
        borderRadius: '50%',
        animation: 'supernova-flash 1.5s ease-out forwards',
      }} />
      {/* Expanding ring */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: 80, height: 80,
        marginTop: -40, marginLeft: -40,
        border: '3px solid #ffd700',
        borderRadius: '50%',
        animation: 'supernova-ring 1.2s ease-out 0.1s forwards',
        opacity: 0,
      }} />
      {/* Second ring */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: 60, height: 60,
        marginTop: -30, marginLeft: -30,
        border: '2px solid #ff8c00',
        borderRadius: '50%',
        animation: 'supernova-ring 1.4s ease-out 0.2s forwards',
        opacity: 0,
      }} />
      {/* Full-screen flash overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(circle at center, rgba(255,215,0,0.3) 0%, transparent 70%)',
        animation: 'impact-flash 0.6s ease-out forwards',
      }} />
    </div>
  );
};

/**
 * Board shatter effect for lethal kills
 */
const BoardShatter: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  useEffect(() => {
    const timer = setTimeout(onDone, 1200);
    return () => clearTimeout(timer);
  }, [onDone]);

  const pieces = useRef(
    Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * Math.PI * 2;
      const dist = 80 + Math.random() * 120;
      return {
        dx: `${Math.cos(angle) * dist}px`,
        dy: `${Math.sin(angle) * dist}px`,
        rot: `${(Math.random() - 0.5) * 720}deg`,
        x: 40 + Math.random() * 20,
        y: 35 + Math.random() * 30,
        size: 8 + Math.random() * 16,
        delay: Math.random() * 0.1,
      };
    })
  ).current;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9998, pointerEvents: 'none' }}>
      {pieces.map((piece, i) => (
        <div key={i} style={{
          position: 'absolute',
          top: `${piece.y}%`,
          left: `${piece.x}%`,
          width: piece.size,
          height: piece.size,
          background: `rgba(${100 + Math.random() * 80}, ${60 + Math.random() * 40}, ${20 + Math.random() * 30}, 0.8)`,
          borderRadius: 2,
          animation: `board-shatter-piece 1.2s ease-out ${piece.delay}s forwards`,
          '--sh-dx': piece.dx,
          '--sh-dy': piece.dy,
          '--sh-rot': piece.rot,
        } as any} />
      ))}
      {/* Flash overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(255,255,255,0.4)',
        animation: 'impact-flash 0.3s ease-out forwards',
      }} />
    </div>
  );
};

/**
 * AoE pulse effect
 */
const AoEPulse: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  useEffect(() => {
    const timer = setTimeout(onDone, 800);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9997, pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: 200, height: 200,
        marginTop: -100, marginLeft: -100,
        border: '3px solid rgba(255,100,100,0.6)',
        borderRadius: '50%',
        animation: 'aoe-pulse 0.8s ease-out forwards',
      }} />
    </div>
  );
};

/**
 * Impact flash (brief white flash on heavy hits)
 */
const ImpactFlash: React.FC<{ intensity: number; onDone: () => void }> = ({ intensity, onDone }) => {
  useEffect(() => {
    const timer = setTimeout(onDone, 200);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none',
      background: `rgba(255,255,255,${0.3 * intensity})`,
      animation: 'impact-flash 0.2s ease-out forwards',
    }} />
  );
};

/**
 * Slow-motion border effect for game-winning lethal
 */
const SlowMotionBorder: React.FC<{ duration: number; onDone: () => void }> = ({ duration, onDone }) => {
  useEffect(() => {
    const timer = setTimeout(onDone, duration);
    return () => clearTimeout(timer);
  }, [duration, onDone]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9996, pointerEvents: 'none',
      border: '4px solid rgba(255,215,0,0.6)',
      borderRadius: 0,
      animation: `slow-mo-border ${duration}ms ease-in-out forwards`,
      boxShadow: 'inset 0 0 60px rgba(255,215,0,0.2)',
    }} />
  );
};

/**
 * Main Board VFX Overlay component
 */
export const BoardVFXOverlay: React.FC<BoardVFXOverlayProps> = ({ events, onEventDone }) => {
  useEffect(() => {
    injectBoardVFXStyles();
  }, []);

  return (
    <>
      {events.map(event => {
        const done = () => onEventDone(event.id);
        switch (event.type) {
          case 'board_crack':
            return <BoardCrack key={event.id} intensity={event.intensity} onDone={done} />;
          case 'supernova':
            return <SupernovaFlash key={event.id} onDone={done} />;
          case 'board_shatter':
            return <BoardShatter key={event.id} onDone={done} />;
          case 'aoe_pulse':
            return <AoEPulse key={event.id} onDone={done} />;
          case 'impact_flash':
            return <ImpactFlash key={event.id} intensity={event.intensity} onDone={done} />;
          case 'slow_motion':
            return <SlowMotionBorder key={event.id} duration={event.duration} onDone={done} />;
          case 'screen_shake':
          case 'hit_stop':
            // These are handled by the parent container via CSS class
            return null;
          default:
            return null;
        }
      })}
    </>
  );
};

/**
 * Hook for board-level VFX
 */
export function useBoardVFX() {
  const [events, setEvents] = useState<BoardVFXEvent[]>([]);
  const [shakeClass, setShakeClass] = useState('');
  const idRef = useRef(0);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const emit = useCallback((type: BoardVFXType, intensity: number = 0.5, duration: number = 300) => {
    const event: BoardVFXEvent = {
      id: idRef.current++,
      type,
      intensity: Math.min(1, Math.max(0, intensity)),
      duration,
      createdAt: Date.now(),
    };
    setEvents(prev => [...prev, event]);

    // Handle screen shake via CSS class
    if (type === 'screen_shake') {
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);

      const cls = intensity > 0.8 ? 'board-shake-extreme'
        : intensity > 0.5 ? 'board-shake-heavy'
        : intensity > 0.25 ? 'board-shake-medium'
        : 'board-shake-light';

      setShakeClass(cls);
      shakeTimerRef.current = setTimeout(() => setShakeClass(''), duration);
    }
  }, []);

  const dismiss = useCallback((id: number) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  /**
   * Convenience methods for common VFX combinations
   */
  const heavyHit = useCallback((damage: number) => {
    if (damage >= 15) {
      emit('screen_shake', 1, 400);
      emit('board_crack', 1, 1500);
      emit('impact_flash', 0.8, 200);
    } else if (damage >= 10) {
      emit('screen_shake', 0.7, 300);
      emit('board_crack', 0.6, 1500);
      emit('impact_flash', 0.5, 200);
    } else if (damage >= 6) {
      emit('screen_shake', 0.4, 200);
      emit('impact_flash', 0.3, 150);
    } else if (damage >= 3) {
      emit('screen_shake', 0.2, 150);
    }
  }, [emit]);

  const lethalKill = useCallback(() => {
    emit('board_shatter', 1, 1200);
    emit('screen_shake', 1, 400);
    emit('slow_motion', 1, 800);
  }, [emit]);

  const starforgeVFX = useCallback(() => {
    emit('supernova', 1, 1500);
    emit('screen_shake', 0.8, 300);
  }, [emit]);

  const aoeBlast = useCallback(() => {
    emit('aoe_pulse', 0.6, 800);
    emit('screen_shake', 0.5, 200);
  }, [emit]);

  return {
    events,
    shakeClass,
    emit,
    dismiss,
    heavyHit,
    lethalKill,
    starforgeVFX,
    aoeBlast,
  };
}
