/**
 * STARFORGE TCG - Mulligan Phase Overlay
 *
 * Shown at game start, lets player choose which cards to keep/replace.
 * - Click cards to toggle (keep/replace)
 * - Replaced cards are shuffled back and redrawn
 * - Timer for auto-confirm
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { CardInstance } from '../../types/Card';
import { CardArt } from './CardArt';
import { globalCardDatabase } from '../../cards/CardDatabase';
import { hapticTap, hapticImpact } from '../capacitor';
import type { Race } from '../../types/Race';

interface MulliganOverlayProps {
  cards: CardInstance[];
  onConfirm: (keepIndices: number[]) => void;
  timeLimit?: number; // seconds, default 30
}

export const MulliganOverlay: React.FC<MulliganOverlayProps> = ({
  cards,
  onConfirm,
  timeLimit = 30,
}) => {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [confirmed, setConfirmed] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (confirmed) return;
    if (timeLeft <= 0) {
      handleConfirm();
      return;
    }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, confirmed]);

  const toggleCard = useCallback((index: number) => {
    if (confirmed) return;
    hapticTap();
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, [confirmed]);

  const handleConfirm = useCallback(() => {
    if (confirmed) return;
    hapticImpact();
    setConfirmed(true);
    // Indices NOT in selected set are kept
    const keepIndices: number[] = [];
    for (let i = 0; i < cards.length; i++) {
      if (!selected.has(i)) keepIndices.push(i);
    }
    onConfirm(keepIndices);
  }, [cards, selected, confirmed, onConfirm]);

  const replaceCount = selected.size;

  return (
    <div style={styles.overlay}>
      <style>{`
        @keyframes mulligan-card-enter {
          0% { transform: translateY(30px) scale(0.8); opacity: 0; }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes mulligan-replace-pulse {
          0%, 100% { box-shadow: 0 0 8px rgba(255,68,68,0.4); }
          50% { box-shadow: 0 0 16px rgba(255,68,68,0.7); }
        }
      `}</style>

      <div style={styles.content}>
        <h2 className="mulligan-title" style={styles.title}>Choose Your Starting Hand</h2>
        <p style={styles.subtitle}>
          Tap cards to replace them. Keep the rest.
        </p>

        {/* Timer */}
        <div style={{
          ...styles.timer,
          color: timeLeft <= 10 ? '#ff4444' : timeLeft <= 20 ? '#ffcc00' : '#00ccff',
        }}>
          {timeLeft}s
        </div>

        {/* Cards */}
        <div style={styles.cardRow}>
          {cards.map((card, i) => {
            const isReplacing = selected.has(i);
            const definition = globalCardDatabase.getCard(card.definitionId);
            return (
              <div
                key={card.instanceId}
                className="mulligan-card"
                style={{
                  ...styles.mulliganCard,
                  animation: `mulligan-card-enter 0.4s ease-out ${i * 0.1}s both`,
                  border: isReplacing
                    ? '3px solid #ff4444'
                    : '3px solid #00cc66',
                  ...(isReplacing ? {
                    animation: `mulligan-card-enter 0.4s ease-out ${i * 0.1}s both, mulligan-replace-pulse 1s ease-in-out infinite`,
                  } : {}),
                }}
                onClick={() => toggleCard(i)}
              >
                {/* Card art */}
                <div style={styles.artArea}>
                  <CardArt
                    cardId={card.definitionId}
                    race={(definition as any)?.race as Race | undefined}
                    cardType={(definition?.type || 'MINION') as 'MINION' | 'SPELL' | 'STRUCTURE'}
                    cost={card.currentCost}
                    width={100} height={65}
                  />
                </div>

                {/* Cost badge */}
                <div style={styles.costBadge}>{card.currentCost}</div>

                {/* Card name */}
                <div style={styles.cardName}>{definition?.name || '???'}</div>

                {/* Stats */}
                {card.currentAttack !== undefined && (
                  <div style={styles.statRow}>
                    <span style={styles.atkStat}>{card.currentAttack}</span>
                    <span style={styles.statSep}>/</span>
                    <span style={styles.hpStat}>{card.currentHealth}</span>
                  </div>
                )}

                {/* Replace label */}
                <div style={{
                  ...styles.statusLabel,
                  background: isReplacing
                    ? 'linear-gradient(135deg, #cc2222, #aa1111)'
                    : 'linear-gradient(135deg, #008844, #006633)',
                  borderColor: isReplacing ? '#ff4444' : '#00cc66',
                }}>
                  {isReplacing ? 'REPLACE' : 'KEEP'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Confirm button */}
        <div style={styles.actions}>
          <span style={styles.replaceInfo}>
            {replaceCount === 0
              ? 'Keeping all cards'
              : `Replacing ${replaceCount} card${replaceCount > 1 ? 's' : ''}`}
          </span>
          <button
            style={styles.confirmBtn}
            onClick={handleConfirm}
            disabled={confirmed}
          >
            {confirmed ? 'Drawing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.9)', zIndex: 800, display: 'flex',
    justifyContent: 'center', alignItems: 'center',
    backdropFilter: 'blur(8px)',
  },
  content: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '16px', padding: '30px',
  },
  title: {
    fontSize: '28px', fontWeight: 'bold', color: '#ffffff',
    margin: 0, letterSpacing: '2px',
    textShadow: '0 0 15px rgba(0,204,255,0.3)',
  },
  subtitle: {
    fontSize: '14px', color: '#888899', margin: 0,
  },
  timer: {
    fontSize: '24px', fontWeight: 'bold',
    textShadow: '0 0 10px currentColor',
  },
  cardRow: {
    display: 'flex', gap: '16px', flexWrap: 'wrap',
    justifyContent: 'center',
  },
  mulliganCard: {
    width: '120px', borderRadius: '12px',
    background: 'linear-gradient(135deg, #1a1a3a 0%, #0a0a20 100%)',
    padding: '10px', display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: '6px', cursor: 'pointer',
    position: 'relative', transition: 'border-color 0.2s',
  },
  artArea: {
    borderRadius: '6px', overflow: 'hidden',
  },
  costBadge: {
    position: 'absolute', top: '4px', left: '4px',
    width: '24px', height: '24px', borderRadius: '50%',
    background: 'linear-gradient(135deg, #0066cc, #0044aa)',
    border: '2px solid #88ccff', display: 'flex',
    justifyContent: 'center', alignItems: 'center',
    fontSize: '13px', fontWeight: 'bold', color: '#fff',
  },
  cardName: {
    fontSize: '11px', fontWeight: 'bold', color: '#ffffff',
    textAlign: 'center', lineHeight: '1.2',
  },
  statRow: {
    display: 'flex', alignItems: 'center', gap: '4px',
  },
  atkStat: { fontSize: '14px', fontWeight: 'bold', color: '#ffcc00' },
  statSep: { fontSize: '12px', color: '#555' },
  hpStat: { fontSize: '14px', fontWeight: 'bold', color: '#ff4444' },
  statusLabel: {
    fontSize: '10px', fontWeight: 'bold', color: '#ffffff',
    padding: '3px 10px', borderRadius: '6px', border: '1px solid',
    letterSpacing: '1px',
  },
  actions: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '10px', marginTop: '8px',
  },
  replaceInfo: { fontSize: '14px', color: '#aaaacc' },
  confirmBtn: {
    background: 'linear-gradient(135deg, #00cc66 0%, #00aa44 100%)',
    border: '2px solid #00ff88', borderRadius: '12px',
    padding: '14px 40px', fontSize: '18px', fontWeight: 'bold',
    color: '#ffffff', cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(0,204,102,0.4)',
    letterSpacing: '1px',
  },
};
