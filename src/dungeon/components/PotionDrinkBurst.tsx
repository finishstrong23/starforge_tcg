import React, { useEffect, useState } from 'react';
import type { PotionCategory } from '../types';
import { getPotionEffectArt } from '../assets/artRegistry';
import { TokenArt } from './TokenArt';

/**
 * Per-category visual signature for the drink-burst overlay. Each potion
 * triggers a category-coloured radial burst centred on the screen, with
 * a Basic Token sigil that matches the kind of effect.
 */
const CATEGORY_VISUALS: Record<PotionCategory, { color: string; fallback: string; label: string }> = {
  Defense:  { color: '#3b8fff', fallback: 'DF', label: 'Aegis'    },
  Tempo:    { color: '#4adfff', fallback: 'TP', label: 'Surge'    },
  Damage:   { color: '#ff5a2e', fallback: 'DM', label: 'Strike'   },
  Buff:     { color: '#ffd24a', fallback: 'BF', label: 'Empower'  },
  Debuff:   { color: '#a855f7', fallback: 'HX', label: 'Hex'      },
  Utility:  { color: '#88ccff', fallback: 'UT', label: 'Utility'  },
  Recovery: { color: '#22cc66', fallback: 'MD', label: 'Mend'     },
  Extreme:  { color: '#ff7acc', fallback: 'WP', label: 'Warp'     },
};

export interface PotionDrinkBurstProps {
  /** Re-keyed each drink so the animation restarts. */
  burstKey: number;
  category: PotionCategory;
  potionId: string;
  potionName: string;
}

const BURST_MS = 800;

export const PotionDrinkBurst: React.FC<PotionDrinkBurstProps> = ({
  burstKey,
  category,
  potionId,
  potionName,
}) => {
  // Track the most recent burstKey we've started — re-mount via React `key`
  // would also work but using state lets us auto-clear after the duration.
  const [activeKey, setActiveKey] = useState(0);

  useEffect(() => {
    if (burstKey === 0) return;
    setActiveKey(burstKey);
    const t = window.setTimeout(() => setActiveKey(0), BURST_MS + 50);
    return () => window.clearTimeout(t);
  }, [burstKey]);

  if (activeKey === 0) return null;

  // Phoenix Vial gets a stronger, hotter overlay — it's the iconic potion.
  const isPhoenix = potionId === 'phoenix_vial';
  const visual = CATEGORY_VISUALS[category];
  const color = isPhoenix ? '#ff8800' : visual.color;
  const sigilSrc = getPotionEffectArt(isPhoenix ? 'Phoenix' : category);
  const sigilFallback = isPhoenix ? 'PX' : visual.fallback;
  const label = isPhoenix ? 'Phoenix Rebirth' : `${visual.label} - ${potionName}`;

  return (
    <>
      <style>{`
        @keyframes dungeonBurstRing {
          0%   { transform: translate(-50%, -50%) scale(0.4); opacity: 0; }
          25%  { opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(${isPhoenix ? 4.5 : 3.5}); opacity: 0; }
        }
        @keyframes dungeonBurstFlash {
          0%   { opacity: 0; }
          15%  { opacity: ${isPhoenix ? 0.85 : 0.55}; }
          100% { opacity: 0; }
        }
        @keyframes dungeonBurstSigil {
          0%   { transform: translate(-50%, -50%) scale(0.4); opacity: 0; }
          25%  { transform: translate(-50%, -50%) scale(1.4); opacity: 1; }
          70%  { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(2);   opacity: 0; }
        }
        @keyframes dungeonBurstLabel {
          0%   { opacity: 0; transform: translate(-50%, 30px); }
          20%  { opacity: 1; transform: translate(-50%, 0); }
          80%  { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -10px); }
        }
        @keyframes dungeonPhoenixSpark {
          0%   { transform: translate(0, 0) scale(0); opacity: 0; }
          25%  { opacity: 1; }
          100% { transform: translate(var(--sx, 0px), var(--sy, 0px)) scale(1); opacity: 0; }
        }
      `}</style>

      {/* Full-screen flash */}
      <div
        key={`flash-${activeKey}`}
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 50%, ${color}55 0%, ${color}22 30%, transparent 60%)`,
          pointerEvents: 'none',
          zIndex: 50,
          animation: `dungeonBurstFlash ${BURST_MS}ms ease-out forwards`,
        }}
      />

      {/* Expanding ring */}
      <div
        key={`ring-${activeKey}`}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 200,
          height: 200,
          marginTop: -100,
          marginLeft: -100,
          borderRadius: '50%',
          border: `4px solid ${color}`,
          boxShadow: `0 0 40px ${color}, inset 0 0 30px ${color}88`,
          pointerEvents: 'none',
          zIndex: 51,
          animation: `dungeonBurstRing ${BURST_MS}ms cubic-bezier(0.22,1,0.36,1) forwards`,
          transformOrigin: 'center',
        }}
      />

      {/* Central sigil token */}
      <div
        key={`sigil-${activeKey}`}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 112,
          height: 112,
          pointerEvents: 'none',
          zIndex: 52,
          filter: `drop-shadow(0 0 18px ${color}) drop-shadow(0 0 34px ${color}aa)`,
          animation: `dungeonBurstSigil ${BURST_MS}ms cubic-bezier(0.22,1,0.36,1) forwards`,
        }}
      >
        <TokenArt
          src={sigilSrc}
          fallback={sigilFallback}
          alt=""
          style={{ width: '100%', height: '100%' }}
          fallbackStyle={{
            width: '100%',
            height: '100%',
            borderRadius: 24,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: color,
            color: '#080814',
            fontSize: 26,
            fontWeight: 900,
          }}
        />
      </div>

      {/* Label below */}
      <div
        key={`label-${activeKey}`}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          marginTop: 70,
          fontSize: 14,
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          fontWeight: 700,
          color: '#fff',
          textShadow: `0 0 12px ${color}, 0 2px 6px rgba(0,0,0,0.8)`,
          pointerEvents: 'none',
          zIndex: 52,
          animation: `dungeonBurstLabel ${BURST_MS}ms ease-out forwards`,
        }}
      >
        {label}
      </div>

      {/* Phoenix Vial — extra spark trails */}
      {isPhoenix && (
        <>
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const dist = 220 + Math.random() * 80;
            const sx = Math.cos(angle) * dist;
            const sy = Math.sin(angle) * dist;
            return (
              <div
                key={`spark-${activeKey}-${i}`}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, #ffe18a 0%, #ff8800 60%, transparent 100%)`,
                  boxShadow: `0 0 12px #ff8800`,
                  pointerEvents: 'none',
                  zIndex: 51,
                  ['--sx' as string]: `${sx}px`,
                  ['--sy' as string]: `${sy}px`,
                  animation: `dungeonPhoenixSpark ${BURST_MS}ms cubic-bezier(0.22,1,0.36,1) forwards`,
                  animationDelay: `${i * 12}ms`,
                } as React.CSSProperties}
              />
            );
          })}
        </>
      )}
    </>
  );
};
