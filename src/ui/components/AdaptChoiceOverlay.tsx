/**
 * STARFORGE TCG - Adapt Choice Overlay
 *
 * When a card with ADAPT is played, this overlay presents all 4 keyword
 * options for the player to choose from: Blitz, Swift, Barrier, Double Strike.
 */

import React from 'react';
import { AdaptOption } from '../../types/Keywords';

interface AdaptChoiceOverlayProps {
  options: AdaptOption[];
  onChoose: (option: AdaptOption) => void;
}

const ADAPT_OPTION_INFO: Record<AdaptOption, { name: string; icon: string; description: string; color: string }> = {
  [AdaptOption.BLITZ]: {
    name: 'Blitz',
    icon: '💨',
    description: 'Can attack anything immediately',
    color: '#ff4444',
  },
  [AdaptOption.SWIFT]: {
    name: 'Swift',
    icon: '⚡',
    description: 'Can attack minions immediately',
    color: '#ffcc00',
  },
  [AdaptOption.BARRIER]: {
    name: 'Barrier',
    icon: '✨',
    description: 'Blocks the first hit completely',
    color: '#44ccff',
  },
  [AdaptOption.DOUBLE_STRIKE]: {
    name: 'Double Strike',
    icon: '⚔️',
    description: 'Can attack twice per turn',
    color: '#ff8800',
  },
};

export const AdaptChoiceOverlay: React.FC<AdaptChoiceOverlayProps> = ({ options, onChoose }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      zIndex: 9999,
    }}>
      <div style={{
        color: '#00ffcc',
        fontSize: '24px',
        fontWeight: 'bold',
        marginBottom: '24px',
        textShadow: '0 0 10px rgba(0, 255, 204, 0.5)',
        letterSpacing: '2px',
      }}>
        ADAPT — Choose a Keyword
      </div>
      <div style={{
        display: 'flex',
        gap: '16px',
        flexWrap: 'wrap',
        justifyContent: 'center',
        maxWidth: '600px',
      }}>
        {options.map((option) => {
          const info = ADAPT_OPTION_INFO[option];
          return (
            <button
              key={option}
              onClick={() => onChoose(option)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '16px 20px',
                minWidth: '120px',
                backgroundColor: 'rgba(20, 20, 40, 0.95)',
                border: `2px solid ${info.color}`,
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: `0 0 12px ${info.color}44`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.08)';
                e.currentTarget.style.boxShadow = `0 0 24px ${info.color}88`;
                e.currentTarget.style.borderColor = '#fff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = `0 0 12px ${info.color}44`;
                e.currentTarget.style.borderColor = info.color;
              }}
            >
              <span style={{ fontSize: '32px', marginBottom: '8px' }}>{info.icon}</span>
              <span style={{
                color: info.color,
                fontSize: '16px',
                fontWeight: 'bold',
                marginBottom: '4px',
              }}>
                {info.name}
              </span>
              <span style={{
                color: '#aaa',
                fontSize: '11px',
                textAlign: 'center',
                lineHeight: '1.3',
              }}>
                {info.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
