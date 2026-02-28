/**
 * STARFORGE TCG - Professional Visual Effects Overlay
 *
 * Renders rich visual effects:
 * - Floating damage/heal numbers with glow and scaling
 * - Death burst with multi-layer particle explosion
 * - Spell cast rings with arcane symbols
 * - Starforge transformation with cosmic energy
 * - Buff shimmer with rising sparkles
 * - Keyword activation flash
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

export interface VFXEvent {
  id: number;
  type: 'damage' | 'heal' | 'death' | 'spell' | 'starforge' | 'buff' | 'keyword';
  targetId: string;
  value?: number;
  label?: string;
  createdAt: number;
}

interface VFXOverlayProps {
  events: VFXEvent[];
  onEventDone: (id: number) => void;
}

// Inject CSS keyframes once
let stylesInjected = false;
function injectStyles() {
  if (stylesInjected) return;
  stylesInjected = true;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes vfx-float-up {
      0% { opacity: 0; transform: translateY(5px) scale(0.5); }
      15% { opacity: 1; transform: translateY(0) scale(1.2); }
      30% { transform: translateY(-10px) scale(1); }
      100% { opacity: 0; transform: translateY(-50px) scale(0.8); }
    }
    @keyframes vfx-heal-float {
      0% { opacity: 0; transform: translateY(5px) scale(0.5); }
      15% { opacity: 1; transform: translateY(0) scale(1.3); }
      30% { transform: translateY(-8px) scale(1); }
      100% { opacity: 0; transform: translateY(-45px) scale(0.85); }
    }
    @keyframes vfx-death-core {
      0% { opacity: 1; transform: scale(0.5); }
      20% { opacity: 1; transform: scale(1.8); }
      100% { opacity: 0; transform: scale(3); }
    }
    @keyframes vfx-death-ring {
      0% { opacity: 0.7; transform: scale(0.3); border-width: 3px; }
      100% { opacity: 0; transform: scale(3); border-width: 0.5px; }
    }
    @keyframes vfx-death-particle {
      0% { opacity: 1; transform: translate(0, 0) scale(1); }
      70% { opacity: 0.5; }
      100% { opacity: 0; transform: translate(var(--vfx-dx), var(--vfx-dy)) scale(0); }
    }
    @keyframes vfx-death-smoke {
      0% { opacity: 0.4; transform: translate(0, 0) scale(1); }
      100% { opacity: 0; transform: translate(var(--vfx-dx), calc(var(--vfx-dy) - 20px)) scale(2); }
    }
    @keyframes vfx-spell-ring-outer {
      0% { opacity: 0.8; transform: scale(0.2) rotate(0deg); }
      50% { opacity: 0.6; }
      100% { opacity: 0; transform: scale(2.5) rotate(90deg); }
    }
    @keyframes vfx-spell-ring-inner {
      0% { opacity: 0.6; transform: scale(0.4) rotate(0deg); }
      100% { opacity: 0; transform: scale(2) rotate(-60deg); }
    }
    @keyframes vfx-spell-sparkle {
      0% { opacity: 0; transform: translate(0, 0) scale(0); }
      30% { opacity: 1; transform: translate(var(--vfx-dx), var(--vfx-dy)) scale(1); }
      100% { opacity: 0; transform: translate(calc(var(--vfx-dx) * 1.5), calc(var(--vfx-dy) * 1.5)) scale(0); }
    }
    @keyframes vfx-starforge-pulse {
      0% { opacity: 0; transform: scale(0.3) rotate(0deg); }
      30% { opacity: 1; transform: scale(1.5) rotate(120deg); }
      60% { opacity: 0.8; transform: scale(1.2) rotate(240deg); }
      100% { opacity: 0; transform: scale(2.5) rotate(360deg); }
    }
    @keyframes vfx-starforge-beam {
      0% { opacity: 0; height: 0; }
      30% { opacity: 0.8; height: 100px; }
      100% { opacity: 0; height: 150px; }
    }
    @keyframes vfx-starforge-text {
      0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); letter-spacing: 8px; }
      20% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); letter-spacing: 4px; }
      40% { transform: translate(-50%, -50%) scale(1); letter-spacing: 3px; }
      100% { opacity: 0; transform: translate(-50%, -70%) scale(0.9); letter-spacing: 6px; }
    }
    @keyframes vfx-buff-shimmer {
      0% { opacity: 0; transform: translateY(0) scale(0.5); }
      20% { opacity: 1; transform: translateY(-5px) scale(1); }
      100% { opacity: 0; transform: translateY(-35px) scale(0.6); }
    }
    @keyframes vfx-keyword-flash {
      0% { opacity: 0; transform: translate(-50%, -50%) scale(0.7); }
      20% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
      40% { transform: translate(-50%, -50%) scale(1); }
      100% { opacity: 0; transform: translate(-50%, -60%) scale(0.9); }
    }
  `;
  document.head.appendChild(style);
}

const FloatingNumber: React.FC<{
  event: VFXEvent;
  onDone: () => void;
}> = ({ event, onDone }) => {
  useEffect(() => {
    const timer = setTimeout(onDone, 1000);
    return () => clearTimeout(timer);
  }, [onDone]);

  const isDamage = event.type === 'damage';
  const isHeal = event.type === 'heal';
  const isBuff = event.type === 'buff';
  const color = isDamage ? '#ff4444' : isHeal ? '#00ff88' : isBuff ? '#ffcc00' : '#ffffff';
  const prefix = isDamage ? '-' : isHeal ? '+' : '';
  const animName = isHeal ? 'vfx-heal-float' : 'vfx-float-up';

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        animation: `${animName} 1s ease-out forwards`,
        fontSize: '32px',
        fontWeight: 'bold',
        color,
        textShadow: `0 0 8px ${color}, 0 0 16px ${color}, 2px 2px 0 rgba(0,0,0,0.8), -1px -1px 0 rgba(0,0,0,0.8)`,
        zIndex: 2000,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        fontFamily: "'Segoe UI', sans-serif",
        letterSpacing: '-1px',
      }}
    >
      {event.label || `${prefix}${event.value}`}
    </div>
  );
};

const DeathBurst: React.FC<{
  onDone: () => void;
}> = ({ onDone }) => {
  useEffect(() => {
    const timer = setTimeout(onDone, 1000);
    return () => clearTimeout(timer);
  }, [onDone]);

  const particles = useRef(
    Array.from({ length: 12 }, (_, i) => ({
      dx: `${(Math.cos(i * Math.PI * 2 / 12 + Math.sin(i * 1.7) * 0.3)) * (40 + Math.sin(i * 2.1) * 20)}px`,
      dy: `${(Math.sin(i * Math.PI * 2 / 12 + Math.sin(i * 1.7) * 0.3)) * (40 + Math.cos(i * 1.3) * 20)}px`,
      delay: (i % 3) * 0.03,
      size: 3 + (i % 4),
      color: ['#ff4444', '#ff6644', '#ff8844', '#ffaa44', '#ff3322', '#cc2222'][i % 6],
    }))
  ).current;

  const smokeParticles = useRef(
    Array.from({ length: 5 }, (_, i) => ({
      dx: `${(Math.cos(i * 1.8) * 15)}px`,
      dy: `${(Math.sin(i * 1.8) * 10)}px`,
      delay: 0.05 + i * 0.04,
      size: 10 + i * 4,
    }))
  ).current;

  return (
    <>
      {/* Central burst core */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: '30px', height: '30px',
        transform: 'translate(-50%, -50%)',
        animation: 'vfx-death-core 0.8s ease-out forwards',
        background: 'radial-gradient(circle, #ffffff 0%, #ff8844 20%, #ff4422 40%, transparent 70%)',
        borderRadius: '50%',
        zIndex: 2000,
        pointerEvents: 'none',
      }} />

      {/* Expanding ring */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: '40px', height: '40px',
        transform: 'translate(-50%, -50%)',
        animation: 'vfx-death-ring 0.7s ease-out 0.05s forwards',
        border: '2px solid #ff6644',
        borderRadius: '50%',
        zIndex: 2000,
        pointerEvents: 'none',
        opacity: 0,
      }} />

      {/* Sparks */}
      {particles.map((p, i) => (
        <div key={`spark${i}`} style={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: `${p.size}px`, height: `${p.size}px`,
          borderRadius: '50%',
          background: p.color,
          boxShadow: `0 0 ${p.size}px ${p.color}`,
          animation: `vfx-death-particle 0.6s ease-out ${p.delay}s forwards`,
          zIndex: 2001,
          pointerEvents: 'none',
          '--vfx-dx': p.dx,
          '--vfx-dy': p.dy,
        } as React.CSSProperties} />
      ))}

      {/* Smoke puffs */}
      {smokeParticles.map((p, i) => (
        <div key={`smoke${i}`} style={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: `${p.size}px`, height: `${p.size}px`,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(100,80,60,0.3) 0%, transparent 70%)',
          animation: `vfx-death-smoke 0.9s ease-out ${p.delay}s forwards`,
          zIndex: 1999,
          pointerEvents: 'none',
          '--vfx-dx': p.dx,
          '--vfx-dy': p.dy,
        } as React.CSSProperties} />
      ))}
    </>
  );
};

const SpellRing: React.FC<{
  onDone: () => void;
}> = ({ onDone }) => {
  useEffect(() => {
    const timer = setTimeout(onDone, 800);
    return () => clearTimeout(timer);
  }, [onDone]);

  const sparkles = useRef(
    Array.from({ length: 8 }, (_, i) => {
      const angle = (i / 8) * Math.PI * 2;
      const dist = 20 + Math.sin(i * 2.1) * 10;
      return {
        dx: `${Math.cos(angle) * dist}px`,
        dy: `${Math.sin(angle) * dist}px`,
        delay: i * 0.04,
      };
    })
  ).current;

  return (
    <>
      {/* Outer ring */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: '50px', height: '50px',
        transform: 'translate(-50%, -50%)',
        border: '2px solid #bb44ff',
        borderRadius: '50%',
        animation: 'vfx-spell-ring-outer 0.7s ease-out forwards',
        zIndex: 2000,
        pointerEvents: 'none',
        boxShadow: '0 0 15px #bb44ff, inset 0 0 10px rgba(187, 68, 255, 0.3)',
      }} />

      {/* Inner ring (counter-rotating) */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: '30px', height: '30px',
        transform: 'translate(-50%, -50%)',
        border: '1.5px solid #dd88ff',
        borderRadius: '50%',
        animation: 'vfx-spell-ring-inner 0.6s ease-out 0.05s forwards',
        zIndex: 2000,
        pointerEvents: 'none',
        opacity: 0,
      }} />

      {/* Arcane sparkles */}
      {sparkles.map((s, i) => (
        <div key={`sp${i}`} style={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: '4px', height: '4px',
          background: i % 2 === 0 ? '#dd88ff' : '#bb44ff',
          borderRadius: '50%',
          boxShadow: `0 0 4px ${i % 2 === 0 ? '#dd88ff' : '#bb44ff'}`,
          animation: `vfx-spell-sparkle 0.5s ease-out ${s.delay}s forwards`,
          zIndex: 2001,
          pointerEvents: 'none',
          '--vfx-dx': s.dx,
          '--vfx-dy': s.dy,
          opacity: 0,
        } as React.CSSProperties} />
      ))}

      {/* Center flash */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: '12px', height: '12px',
        transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(circle, #ffffff 0%, #bb44ff 40%, transparent 70%)',
        borderRadius: '50%',
        animation: 'vfx-death-core 0.4s ease-out forwards',
        zIndex: 2002,
        pointerEvents: 'none',
      }} />
    </>
  );
};

const StarforgeGlow: React.FC<{
  onDone: () => void;
}> = ({ onDone }) => {
  useEffect(() => {
    const timer = setTimeout(onDone, 1500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <>
      {/* Cosmic energy pulse */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: '70px', height: '70px',
        transform: 'translate(-50%, -50%)',
        animation: 'vfx-starforge-pulse 1.4s ease-out forwards',
        background: 'radial-gradient(circle, rgba(255,204,0,0.7) 0%, rgba(255,136,0,0.4) 30%, rgba(170,0,255,0.2) 60%, transparent 80%)',
        borderRadius: '50%',
        zIndex: 2000,
        pointerEvents: 'none',
      }} />

      {/* Second pulse ring */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: '50px', height: '50px',
        transform: 'translate(-50%, -50%)',
        animation: 'vfx-starforge-pulse 1.2s ease-out 0.15s forwards',
        border: '2px solid #ffcc00',
        borderRadius: '50%',
        zIndex: 2000,
        pointerEvents: 'none',
        opacity: 0,
      }} />

      {/* Light beam going upward */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: '6px',
        height: '0px',
        transform: 'translate(-50%, -100%)',
        background: 'linear-gradient(180deg, transparent 0%, rgba(255,204,0,0.6) 30%, rgba(255,170,0,0.8) 100%)',
        animation: 'vfx-starforge-beam 1.3s ease-out forwards',
        zIndex: 1999,
        pointerEvents: 'none',
        borderRadius: '3px',
        boxShadow: '0 0 10px rgba(255,204,0,0.4)',
      }} />

      {/* Cosmic sparkles */}
      {Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * Math.PI * 2;
        const dist = 25 + Math.sin(i * 3.1) * 12;
        return (
          <div key={`sf${i}`} style={{
            position: 'absolute',
            top: '50%', left: '50%',
            width: '3px', height: '3px',
            borderRadius: '50%',
            background: i % 3 === 0 ? '#ffdd66' : i % 3 === 1 ? '#cc88ff' : '#ffaa44',
            boxShadow: `0 0 4px ${i % 3 === 0 ? '#ffdd66' : i % 3 === 1 ? '#cc88ff' : '#ffaa44'}`,
            animation: `vfx-spell-sparkle 0.8s ease-out ${0.1 + i * 0.06}s forwards`,
            zIndex: 2001,
            pointerEvents: 'none',
            '--vfx-dx': `${Math.cos(angle) * dist}px`,
            '--vfx-dy': `${Math.sin(angle) * dist}px`,
            opacity: 0,
          } as React.CSSProperties} />
        );
      })}

      {/* STARFORGED text */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        animation: 'vfx-starforge-text 1.4s ease-out 0.2s forwards',
        fontSize: '14px',
        fontWeight: 'bold',
        color: '#ffdd44',
        textShadow: '0 0 10px #ffaa00, 0 0 20px #ff6600, 0 0 30px rgba(170,0,255,0.5)',
        zIndex: 2002,
        pointerEvents: 'none',
        letterSpacing: '3px',
        whiteSpace: 'nowrap',
        opacity: 0,
      }}>
        STARFORGED
      </div>
    </>
  );
};

const BuffShimmer: React.FC<{
  event: VFXEvent;
  onDone: () => void;
}> = ({ event, onDone }) => {
  useEffect(() => {
    const timer = setTimeout(onDone, 900);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <>
      {/* Rising sparkles */}
      {Array.from({ length: 5 }, (_, i) => (
        <div key={`buff${i}`} style={{
          position: 'absolute',
          top: '60%',
          left: `${30 + i * 10}%`,
          width: '3px', height: '3px',
          borderRadius: '50%',
          background: '#ffcc00',
          boxShadow: '0 0 4px #ffcc00',
          animation: `vfx-buff-shimmer 0.8s ease-out ${i * 0.08}s forwards`,
          zIndex: 2000,
          pointerEvents: 'none',
          opacity: 0,
        }} />
      ))}
      {/* Buff label */}
      {event.label && (
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          animation: 'vfx-float-up 0.9s ease-out forwards',
          fontSize: '16px',
          fontWeight: 'bold',
          color: '#ffcc00',
          textShadow: '0 0 8px #ffaa00, 2px 2px 0 rgba(0,0,0,0.8)',
          zIndex: 2001,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          {event.label}
        </div>
      )}
    </>
  );
};

const KeywordFlash: React.FC<{
  event: VFXEvent;
  onDone: () => void;
}> = ({ event, onDone }) => {
  useEffect(() => {
    const timer = setTimeout(onDone, 800);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div style={{
      position: 'absolute',
      top: '50%', left: '50%',
      animation: 'vfx-keyword-flash 0.8s ease-out forwards',
      fontSize: '13px',
      fontWeight: 'bold',
      color: '#88ddff',
      textShadow: '0 0 8px #4488ff, 1px 1px 0 rgba(0,0,0,0.8)',
      zIndex: 2001,
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      background: 'rgba(0,0,0,0.4)',
      padding: '3px 8px',
      borderRadius: '4px',
      border: '1px solid rgba(136,221,255,0.3)',
    }}>
      {event.label || 'KEYWORD'}
    </div>
  );
};

export const VFXOverlay: React.FC<VFXOverlayProps> = ({ events, onEventDone }) => {
  useEffect(() => {
    injectStyles();
  }, []);

  return (
    <>
      {events.map(event => (
        <VFXAnchor key={event.id} event={event} onDone={() => onEventDone(event.id)} />
      ))}
    </>
  );
};

const VFXAnchor: React.FC<{ event: VFXEvent; onDone: () => void }> = ({ event, onDone }) => {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const el = document.querySelector(
      `[data-card-id="${event.targetId}"], [data-hero-id="${event.targetId}"]`
    );
    if (el) {
      const rect = el.getBoundingClientRect();
      setPos({
        top: rect.top + rect.height / 2,
        left: rect.left + rect.width / 2,
      });
    } else {
      setPos({
        top: window.innerHeight / 2,
        left: window.innerWidth / 2,
      });
    }
  }, [event.targetId]);

  if (!pos) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: 0,
        height: 0,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      {event.type === 'damage' && <FloatingNumber event={event} onDone={onDone} />}
      {event.type === 'heal' && <FloatingNumber event={event} onDone={onDone} />}
      {event.type === 'buff' && <BuffShimmer event={event} onDone={onDone} />}
      {event.type === 'keyword' && <KeywordFlash event={event} onDone={onDone} />}
      {event.type === 'death' && <DeathBurst onDone={onDone} />}
      {event.type === 'spell' && <SpellRing onDone={onDone} />}
      {event.type === 'starforge' && <StarforgeGlow onDone={onDone} />}
    </div>
  );
};

// ── VFX Hook for easy integration ──────────────────────────────────

export function useVFX() {
  const [events, setEvents] = useState<VFXEvent[]>([]);
  const idRef = useRef(0);

  const emit = useCallback((
    type: VFXEvent['type'],
    targetId: string,
    value?: number,
    label?: string,
  ) => {
    const event: VFXEvent = {
      id: idRef.current++,
      type,
      targetId,
      value,
      label,
      createdAt: Date.now(),
    };
    setEvents(prev => [...prev, event]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  }, []);

  return { events, emit, dismiss };
}
