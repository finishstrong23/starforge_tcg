/**
 * First-run tutorial overlay.
 *
 * Three single-sentence tooltips that appear on the first turn of the first
 * three combats of a player's first run. After any of them is dismissed
 * with "Got it" — or after the player has seen three combats — the global
 * dismissal flag is set in localStorage and the tutorial never shows again.
 *
 * Lightweight by design. New players need a hint, not a guided tour.
 */

import React, { useState } from 'react';

const DISMISSED_KEY = 'sf:tutorial:dismissed:v1';

const STEPS: Array<{ title: string; body: string; emoji: string }> = [
  {
    emoji: '⚡',
    title: 'Cards & Energy',
    body: 'Click a card to play it. You have 3 Energy per turn that refills at the start of every turn. End your turn when you\'re ready.',
  },
  {
    emoji: '💎',
    title: 'Relics',
    body: 'Hover any relic in the left column to read what it does. Relics are passive effects that stack with each other for the rest of the run.',
  },
  {
    emoji: '🗺',
    title: 'Map paths',
    body: 'Pick your route on the map. Elites (💀) hit harder but always drop a potion. Bosses (👑) end each act with a guaranteed Boss Relic.',
  },
];

export function isTutorialDismissed(): boolean {
  if (typeof localStorage === 'undefined') return true;
  try { return localStorage.getItem(DISMISSED_KEY) === '1'; } catch { return true; }
}

function setDismissed(): void {
  if (typeof localStorage === 'undefined') return;
  try { localStorage.setItem(DISMISSED_KEY, '1'); } catch { /* swallow */ }
}

export interface TutorialOverlayProps {
  /** 0-indexed step (0 = combat #1, 1 = combat #2, 2 = combat #3). */
  step: 0 | 1 | 2;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ step }) => {
  const [open, setOpen] = useState(true);

  if (!open) return null;
  const s = STEPS[step];

  const handleDismiss = (permanent: boolean) => {
    setOpen(false);
    if (permanent) setDismissed();
  };

  return (
    <div
      role="dialog"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 25,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 360,
          padding: '20px 22px',
          background: 'linear-gradient(180deg, #10101e 0%, #08081a 100%)',
          border: '1px solid #c89b3c',
          borderRadius: 10,
          boxShadow: '0 0 28px rgba(200,155,60,0.35), 0 8px 28px rgba(0,0,0,0.7)',
          color: '#eee',
        }}
      >
        <div
          style={{
            fontSize: 9,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: '#c89b3c',
            opacity: 0.7,
            marginBottom: 4,
          }}
        >
          Tutorial · {step + 1} of 3
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 28 }}>{s.emoji}</span>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{s.title}</span>
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: '#ddd', marginBottom: 14 }}>
          {s.body}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => handleDismiss(true)}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              border: '1px solid #444',
              color: '#888',
              borderRadius: 4,
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Don't show again
          </button>
          <button
            type="button"
            onClick={() => handleDismiss(false)}
            style={{
              padding: '6px 14px',
              background: 'linear-gradient(180deg, #ffd24a, #c89b3c)',
              color: '#0a0a12',
              border: '1px solid #ffe18a',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: '0 0 12px rgba(255,210,74,0.4)',
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
