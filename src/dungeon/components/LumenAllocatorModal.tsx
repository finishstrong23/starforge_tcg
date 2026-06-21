import React, { useState } from 'react';
import type { CardInstance } from '../types';
import { CardComponent } from './CardComponent';

export interface LumenAllocatorModalProps {
  /** Channel cards currently in the player's hand. */
  channelCards: CardInstance[];
  /** Total Lumens available to distribute. */
  total: number;
  /** Cancel - drink is aborted, slot stays filled. */
  onCancel: () => void;
  /** Confirm - distribute the lumens and drink the potion. */
  onConfirm: (allocation: Record<string, number>) => void;
}

/**
 * Modal that lets the player distribute N Lumens across Channel cards in
 * hand. Currently only used by Lumen Infusion (3 Lumens) but parameterised
 * by `total` so future Channel-distributing potions can reuse it.
 */
export const LumenAllocatorModal: React.FC<LumenAllocatorModalProps> = ({
  channelCards,
  total,
  onCancel,
  onConfirm,
}) => {
  const [allocation, setAllocation] = useState<Record<string, number>>({});
  const placed = Object.values(allocation).reduce((a, b) => a + b, 0);
  const remaining = total - placed;

  const add = (id: string) => {
    if (remaining <= 0) return;
    setAllocation((prev) => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  };
  const sub = (id: string) => {
    setAllocation((prev) => {
      const cur = prev[id] ?? 0;
      if (cur <= 0) return prev;
      const next = { ...prev };
      if (cur === 1) delete next[id];
      else next[id] = cur - 1;
      return next;
    });
  };
  const reset = () => setAllocation({});

  return (
    <div
      role="dialog"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0,0,0,0.78)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        padding: 24,
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: '#ffe87a',
          opacity: 0.8,
        }}
      >
        Lumen Infusion
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#eee', textAlign: 'center', maxWidth: 480 }}>
        Distribute {total} Lumens across your Channel cards.
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 900,
          color: remaining === 0 ? '#22cc66' : '#ffe87a',
          textShadow: remaining === 0 ? '0 0 12px #22cc6688' : '0 0 12px #ffe87a88',
        }}
      >
        LUM {remaining} / {total}
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 14,
          justifyContent: 'center',
          maxWidth: 720,
        }}
      >
        {channelCards.map((card) => {
          const placedHere = allocation[card.instanceId] ?? 0;
          // Simulate the post-allocation lumen count on the card so the
          // CardComponent badge updates live as the player picks.
          const previewCard: CardInstance = {
            ...card,
            lumens: (card.lumens ?? 0) + placedHere,
          };
          return (
            <div key={card.instanceId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <CardComponent card={previewCard} />
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => sub(card.instanceId)}
                  disabled={placedHere === 0}
                  style={pillBtnStyle(placedHere > 0, '#ff6688')}
                >
                  -
                </button>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#ffe87a', minWidth: 24, textAlign: 'center' }}>
                  +{placedHere}
                </div>
                <button
                  type="button"
                  onClick={() => add(card.instanceId)}
                  disabled={remaining === 0}
                  style={pillBtnStyle(remaining > 0, '#22cc66')}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: '8px 18px',
            background: 'transparent',
            border: '1px solid #444',
            color: '#aaa',
            borderRadius: 4,
            fontSize: 10,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '8px 18px',
            background: 'transparent',
            border: '1px solid #444',
            color: '#888',
            borderRadius: 4,
            fontSize: 10,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => onConfirm(allocation)}
          disabled={remaining !== 0}
          style={{
            padding: '8px 22px',
            background: remaining === 0 ? 'linear-gradient(180deg, #ffd24a, #c89b3c)' : 'transparent',
            border: remaining === 0 ? '1px solid #ffe18a' : '1px solid #2a2a3a',
            color: remaining === 0 ? '#0a0a12' : '#555',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            cursor: remaining === 0 ? 'pointer' : 'default',
            boxShadow: remaining === 0 ? '0 0 12px rgba(255,210,74,0.4)' : 'none',
          }}
        >
          Drink
        </button>
      </div>
    </div>
  );
};

function pillBtnStyle(enabled: boolean, accent: string): React.CSSProperties {
  return {
    width: 28,
    height: 22,
    borderRadius: 4,
    border: `1px solid ${enabled ? accent : '#2a2a3a'}`,
    background: enabled ? `${accent}22` : 'transparent',
    color: enabled ? accent : '#444',
    cursor: enabled ? 'pointer' : 'default',
    fontSize: 14,
    fontWeight: 800,
    lineHeight: 1,
    padding: 0,
  };
}
