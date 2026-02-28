/**
 * STARFORGE TCG - Visual Effects Overlay
 *
 * Renders floating damage/heal numbers, spell effects, death particles,
 * and Starforge transformation visuals on top of the game board.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

export interface VFXEvent {
  id: number;
  type: 'damage' | 'heal' | 'death' | 'spell' | 'starforge' | 'buff' | 'keyword';
  /** Target element ID to position near (instanceId or hero_xxx) */
  targetId: string;
  /** Value to display (damage amount, heal amount, etc.) */
  value?: number;
  /** Optional label text */
  label?: string;
  /** Timestamp for auto-cleanup */
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
      0% { opacity: 1; transform: translateY(0) scale(1); }
      70% { opacity: 1; transform: translateY(-40px) scale(1.2); }
      100% { opacity: 0; transform: translateY(-60px) scale(0.8); }
    }
    @keyframes vfx-death-burst {
      0% { opacity: 1; transform: scale(1); }
      30% { opacity: 1; transform: scale(1.5); }
      100% { opacity: 0; transform: scale(2.5); }
    }
    @keyframes vfx-starforge-glow {
      0% { opacity: 0; transform: scale(0.5) rotate(0deg); box-shadow: 0 0 10px #ffcc00; }
      50% { opacity: 1; transform: scale(1.3) rotate(180deg); box-shadow: 0 0 40px #ffcc00, 0 0 80px #ff8800; }
      100% { opacity: 0; transform: scale(2) rotate(360deg); box-shadow: 0 0 10px #ffcc00; }
    }
    @keyframes vfx-spell-ring {
      0% { opacity: 0.8; transform: scale(0.3); border-width: 4px; }
      100% { opacity: 0; transform: scale(2); border-width: 1px; }
    }
    @keyframes vfx-particle {
      0% { opacity: 1; transform: translate(0, 0) scale(1); }
      100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(0); }
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

  const color = event.type === 'damage' ? '#ff4444'
    : event.type === 'heal' ? '#00ff88'
    : event.type === 'buff' ? '#ffcc00'
    : '#ffffff';

  const prefix = event.type === 'damage' ? '-' : event.type === 'heal' ? '+' : '';

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        animation: 'vfx-float-up 1s ease-out forwards',
        fontSize: '28px',
        fontWeight: 'bold',
        color,
        textShadow: `0 0 10px ${color}, 0 0 20px ${color}`,
        zIndex: 2000,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
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
    const timer = setTimeout(onDone, 800);
    return () => clearTimeout(timer);
  }, [onDone]);

  // Generate random particles
  const particles = useRef(
    Array.from({ length: 8 }, (_, i) => ({
      dx: `${(Math.random() - 0.5) * 80}px`,
      dy: `${(Math.random() - 0.5) * 80}px`,
      delay: Math.random() * 0.1,
      color: ['#ff4444', '#ff6644', '#ff8844', '#ffaa44', '#cc3333'][i % 5],
    }))
  ).current;

  return (
    <>
      {/* Central burst */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '30px',
          height: '30px',
          transform: 'translate(-50%, -50%)',
          animation: 'vfx-death-burst 0.8s ease-out forwards',
          background: 'radial-gradient(circle, #ff6644 0%, transparent 70%)',
          borderRadius: '50%',
          zIndex: 2000,
          pointerEvents: 'none',
        }}
      />
      {/* Particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: p.color,
            animation: `vfx-particle 0.7s ease-out ${p.delay}s forwards`,
            zIndex: 2001,
            pointerEvents: 'none',
            '--dx': p.dx,
            '--dy': p.dy,
          } as React.CSSProperties}
        />
      ))}
    </>
  );
};

const SpellRing: React.FC<{
  onDone: () => void;
}> = ({ onDone }) => {
  useEffect(() => {
    const timer = setTimeout(onDone, 600);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '40px',
        height: '40px',
        transform: 'translate(-50%, -50%)',
        border: '3px solid #bb44ff',
        borderRadius: '50%',
        animation: 'vfx-spell-ring 0.6s ease-out forwards',
        zIndex: 2000,
        pointerEvents: 'none',
        boxShadow: '0 0 15px #bb44ff',
      }}
    />
  );
};

const StarforgeGlow: React.FC<{
  onDone: () => void;
}> = ({ onDone }) => {
  useEffect(() => {
    const timer = setTimeout(onDone, 1200);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '60px',
          height: '60px',
          transform: 'translate(-50%, -50%)',
          animation: 'vfx-starforge-glow 1.2s ease-out forwards',
          background: 'radial-gradient(circle, rgba(255,204,0,0.6) 0%, rgba(255,136,0,0.3) 40%, transparent 70%)',
          borderRadius: '50%',
          zIndex: 2000,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          animation: 'vfx-float-up 1.2s ease-out 0.3s forwards',
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#ffdd44',
          textShadow: '0 0 10px #ffaa00, 0 0 20px #ff6600',
          zIndex: 2001,
          pointerEvents: 'none',
          letterSpacing: '3px',
          whiteSpace: 'nowrap',
          opacity: 0,
        }}
      >
        STARFORGED
      </div>
    </>
  );
};

export const VFXOverlay: React.FC<VFXOverlayProps> = ({ events, onEventDone }) => {
  useEffect(() => {
    injectStyles();
  }, []);

  // Group events by targetId — the parent component positions via data attributes
  return (
    <>
      {events.map(event => (
        <VFXAnchor key={event.id} event={event} onDone={() => onEventDone(event.id)} />
      ))}
    </>
  );
};

const VFXAnchor: React.FC<{ event: VFXEvent; onDone: () => void }> = ({ event, onDone }) => {
  // Find the target element on the DOM to position near it
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    // Look for elements with data-card-id or data-hero-id matching targetId
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
      // Fallback to center screen
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
      {event.type === 'buff' && <FloatingNumber event={event} onDone={onDone} />}
      {event.type === 'keyword' && <FloatingNumber event={event} onDone={onDone} />}
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
