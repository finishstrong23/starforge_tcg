import React from 'react';
import type { CombatState } from '../types';
import { getFactionResourceSummary, type FactionResourceTone } from '../engine/factionResources';

const TONE_COLOR: Record<FactionResourceTone, string> = {
  neutral: '#b7c4d8',
  good: '#7dffb2',
  warning: '#ffd36a',
  danger: '#ff6b5f',
};

interface FactionResourcePanelProps {
  cs: CombatState;
}

export const FactionResourcePanel: React.FC<FactionResourcePanelProps> = ({ cs }) => {
  const summary = getFactionResourceSummary(cs);
  const meterPercent = summary.meter
    ? Math.max(0, Math.min(100, (summary.meter.value / summary.meter.max) * 100))
    : 0;
  const thresholdPercent = summary.meter?.threshold
    ? Math.max(0, Math.min(100, (summary.meter.threshold / summary.meter.max) * 100))
    : null;

  return (
    <section
      aria-label={`${summary.faction} resources`}
      title={`${summary.faction}: ${summary.title}`}
      style={{
        position: 'absolute',
        top: 88,
        right: 18,
        zIndex: 4,
        width: 214,
        padding: '10px 11px',
        background: 'rgba(7, 8, 20, 0.82)',
        border: `1px solid ${summary.accent}77`,
        borderRadius: 6,
        boxShadow: `0 0 20px ${summary.accent}22`,
        color: '#f4f7ff',
        pointerEvents: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
        <div
          style={{
            fontSize: 9,
            fontWeight: 900,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: summary.accent,
          }}
        >
          {summary.title}
        </div>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#dce7ff' }}>{summary.faction}</div>
      </div>

      {summary.meter && (
        <div style={{ marginTop: 8 }} title={`${summary.meter.label}: ${summary.meter.value}/${summary.meter.max}`}>
          <div
            style={{
              position: 'relative',
              height: 7,
              borderRadius: 4,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${meterPercent}%`,
                background: `linear-gradient(90deg, ${summary.accent}cc, ${summary.accent})`,
                boxShadow: `0 0 12px ${summary.accent}77`,
              }}
            />
            {thresholdPercent !== null && (
              <div
                style={{
                  position: 'absolute',
                  top: -2,
                  bottom: -2,
                  left: `${thresholdPercent}%`,
                  width: 1,
                  background: '#ffffffaa',
                }}
              />
            )}
          </div>
        </div>
      )}

      <div style={{ marginTop: 9, display: 'grid', gap: 6 }}>
        {summary.rows.map((row) => {
          const tone = row.tone ?? 'neutral';
          return (
            <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: 8, alignItems: 'baseline' }}>
              <div style={{ fontSize: 9, color: '#8190aa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {row.label}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 900, color: TONE_COLOR[tone], lineHeight: 1.1 }}>
                  {row.value}
                </div>
                {row.detail && (
                  <div
                    style={{
                      marginTop: 1,
                      fontSize: 9,
                      color: '#a7b2c8',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={row.detail}
                  >
                    {row.detail}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
