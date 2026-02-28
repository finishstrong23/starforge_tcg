/**
 * STARFORGE TCG - In-Game Emote System
 *
 * Hearthstone-style emotes for player communication:
 * - Emote button near player hero
 * - 6 emotes in a radial popup
 * - Speech bubble display with auto-dismiss
 * - Sound effect per emote
 */

import React, { useState, useCallback, useEffect } from 'react';
import { SoundManager } from '../../audio';

export interface Emote {
  id: string;
  label: string;
  icon: string;
  message: string;
}

export const EMOTES: Emote[] = [
  { id: 'greetings', label: 'Greetings', icon: '\u{1F44B}', message: 'Greetings!' },
  { id: 'well_played', label: 'Well Played', icon: '\u{1F44F}', message: 'Well played.' },
  { id: 'thanks', label: 'Thanks', icon: '\u{1F64F}', message: 'Thank you.' },
  { id: 'wow', label: 'Wow', icon: '\u{1F632}', message: 'Wow!' },
  { id: 'oops', label: 'Oops', icon: '\u{1F605}', message: 'Oops.' },
  { id: 'threaten', label: 'Threaten', icon: '\u{1F525}', message: 'Your end is near.' },
];

// ─── Emote Bubble (displays above hero) ──────────────────────────

interface EmoteBubbleProps {
  message: string;
  isOpponent?: boolean;
  onDone: () => void;
}

export const EmoteBubble: React.FC<EmoteBubbleProps> = ({ message, isOpponent = false, onDone }) => {
  useEffect(() => {
    const timer = setTimeout(onDone, 3000);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div style={{
      position: 'absolute',
      [isOpponent ? 'bottom' : 'top']: '-50px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: isOpponent
        ? 'linear-gradient(135deg, #331111 0%, #220808 100%)'
        : 'linear-gradient(135deg, #112233 0%, #0a1a2a 100%)',
      border: `2px solid ${isOpponent ? '#ff444488' : '#44aaff88'}`,
      borderRadius: '16px',
      padding: '8px 16px',
      color: '#ffffff',
      fontSize: '14px',
      fontWeight: 'bold',
      whiteSpace: 'nowrap',
      zIndex: 600,
      animation: 'emote-pop 0.3s ease-out',
      pointerEvents: 'none',
      boxShadow: `0 4px 16px ${isOpponent ? 'rgba(255,68,68,0.3)' : 'rgba(68,170,255,0.3)'}`,
    }}>
      {message}
      {/* Speech bubble tail */}
      <div style={{
        position: 'absolute',
        [isOpponent ? 'top' : 'bottom']: '-8px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 0,
        height: 0,
        borderLeft: '8px solid transparent',
        borderRight: '8px solid transparent',
        [isOpponent ? 'borderBottom' : 'borderTop']: `8px solid ${isOpponent ? '#ff444488' : '#44aaff88'}`,
      }} />
    </div>
  );
};

// ─── Emote Button + Wheel ──────────────────────────────────

interface EmoteWheelProps {
  onEmote: (emote: Emote) => void;
}

export const EmoteWheel: React.FC<EmoteWheelProps> = ({ onEmote }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = useCallback((emote: Emote) => {
    onEmote(emote);
    setIsOpen(false);
    SoundManager.play('emote' as any);
  }, [onEmote]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = () => setIsOpen(false);
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside, { once: true });
    }, 50);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div style={wheelStyles.container}>
      {/* Emote trigger button */}
      <button
        style={wheelStyles.triggerBtn}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        title="Emotes"
      >
        {'\u{1F4AC}'}
      </button>

      {/* Emote selection panel */}
      {isOpen && (
        <div style={wheelStyles.panel} onClick={e => e.stopPropagation()}>
          {EMOTES.map((emote) => (
            <button
              key={emote.id}
              style={wheelStyles.emoteBtn}
              onClick={() => handleSelect(emote)}
              title={emote.message}
            >
              <span style={wheelStyles.emoteIcon}>{emote.icon}</span>
              <span style={wheelStyles.emoteLabel}>{emote.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const wheelStyles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    zIndex: 500,
  },
  triggerBtn: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #1a2a3a 0%, #0a1520 100%)',
    border: '2px solid #334466',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '22px',
    cursor: 'pointer',
    transition: 'border-color 0.2s, transform 0.2s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
  },
  panel: {
    position: 'absolute',
    bottom: '52px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'linear-gradient(135deg, #12122e 0%, #0a0a1e 100%)',
    border: '2px solid #334466',
    borderRadius: '12px',
    padding: '8px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '4px',
    minWidth: '200px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
    animation: 'emote-pop 0.2s ease-out',
  },
  emoteBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#cccccc',
    transition: 'background 0.15s, border-color 0.15s',
  },
  emoteIcon: {
    fontSize: '18px',
  },
  emoteLabel: {
    fontSize: '12px',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  },
};
