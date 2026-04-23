import React, { useState } from 'react';
import type { RelicDefinition } from '../types';
import { useDungeonRun } from '../context/DungeonRunContext';

interface RelicTooltipProps {
  relic: RelicDefinition;
  x: number;
}

const RelicTooltip: React.FC<RelicTooltipProps> = ({ relic, x }) => (
  <div
    style={{
      position: 'fixed',
      bottom: 52,
      left: Math.max(8, Math.min(x - 90, typeof window !== 'undefined' ? window.innerWidth - 196 : 200)),
      width: 188,
      background: '#12121e',
      border: '1px solid #3a3a52',
      borderRadius: 6,
      padding: '8px 10px',
      pointerEvents: 'none',
      zIndex: 200,
      boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
      <span style={{ fontSize: 18 }}>{relic.art}</span>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#eee' }}>{relic.name}</div>
        <div style={{ fontSize: 8, opacity: 0.5, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {relic.rarity}
        </div>
      </div>
    </div>
    <div style={{ fontSize: 9, color: '#ccc', lineHeight: 1.45, marginBottom: 4 }}>
      {relic.description}
    </div>
    <div style={{ fontSize: 8, fontStyle: 'italic', color: '#888', lineHeight: 1.35 }}>
      "{relic.flavor}"
    </div>
  </div>
);

export const RelicBar: React.FC = () => {
  const { runState } = useDungeonRun();
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoverX, setHoverX] = useState(0);

  const relics: RelicDefinition[] = runState?.relics ?? [];

  if (relics.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 44,
        background: '#08081488',
        backdropFilter: 'blur(6px)',
        borderTop: '1px solid #1a1a2e',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 10px',
        zIndex: 100,
        overflowX: 'auto',
      }}
    >
      {relics.map((relic) => (
        <div
          key={relic.id}
          style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            background:
              hoveredId === relic.id ? '#1e1e3a' : '#12121e',
            border:
              hoveredId === relic.id ? '1px solid #4a4a6a' : '1px solid #1e1e2e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            cursor: 'default',
            transition: 'border-color 100ms, background 100ms',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            setHoveredId(relic.id);
            setHoverX(e.currentTarget.getBoundingClientRect().left + 16);
          }}
          onMouseLeave={() => setHoveredId(null)}
          title={relic.name}
        >
          {relic.art}
        </div>
      ))}

      {hoveredId && (
        <RelicTooltip
          relic={relics.find((r) => r.id === hoveredId)!}
          x={hoverX}
        />
      )}
    </div>
  );
};
