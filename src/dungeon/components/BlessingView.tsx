/**
 * Act-start blessing screen. Mirrors STS's "Neow's Bounty" / boss-blessing
 * step: 3 random blessings, pick one, route into the act's map.
 *
 * Shown:
 *   - Once at run start (post-draft, pre-Act-1-map).
 *   - Once at the start of every subsequent act (after the prior boss is
 *     defeated; the player has also been healed to full HP at this point).
 */

import React, { useState } from 'react';
import type { Blessing } from '../data/blessings';
import { BLESSING_POOL } from '../data/blessings';
import { useDungeonRun } from '../context/DungeonRunContext';
import { getDungeonSceneArt } from '../assets/basicTokenArt';
import { getBlessingArt } from '../assets/artRegistry';
import { TokenArt } from './TokenArt';

export const BlessingView: React.FC = () => {
  const { runState, applyBlessing } = useDungeonRun();
  const [picked, setPicked] = useState<Blessing | null>(null);

  if (!runState) return null;

  // Options are rolled by the run reducer when the blessing phase is entered
  // (seeded from run seed + act) and persisted on RunState — a page refresh
  // restores the same three offers instead of rerolling. The reducer also
  // rejects APPLY_BLESSING for ids that weren't offered.
  const options: Blessing[] = (runState.blessingOptionIds ?? [])
    .map((id) => BLESSING_POOL.find((b) => b.id === id))
    .filter((b): b is Blessing => Boolean(b));

  const act = runState.currentAct;
  const isOpener = act === 1;

  const title = isOpener
    ? 'A Path Begins'
    : `Act ${act} - A Moment to Breathe`;
  const subtitle = isOpener
    ? 'Choose a blessing to carry through the run.'
    : `You are healed. Choose a blessing for the next leg.`;

  const handlePick = (b: Blessing) => {
    if (picked) return;
    setPicked(b);
    // Tiny delay so the highlight animation can play before we route away.
    window.setTimeout(() => applyBlessing(b.id), 380);
  };

  const s: Record<string, React.CSSProperties> = {
    root: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100%',
      gap: 22,
      padding: '2.5rem 1rem',
      backgroundColor: '#060610',
      backgroundImage: [
        'linear-gradient(180deg, rgba(7,7,18,0.62), rgba(7,7,18,0.90))',
        `url("${getDungeonSceneArt('blessing')}")`,
      ].join(', '),
      backgroundSize: 'cover, cover',
      backgroundPosition: 'center, center',
      backgroundRepeat: 'no-repeat',
      color: '#f0f0f8',
    },
    actBadge: {
      fontSize: 9,
      letterSpacing: '0.3em',
      textTransform: 'uppercase',
      color: '#88aacc',
      opacity: 0.7,
    },
    title: {
      fontSize: '1.6rem',
      fontWeight: 700,
      letterSpacing: '0.12em',
      textAlign: 'center',
      margin: 0,
    },
    subtitle: {
      fontSize: '0.85rem',
      opacity: 0.6,
      textAlign: 'center',
      margin: 0,
    },
    row: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 16,
      justifyContent: 'center',
      maxWidth: 760,
      marginTop: 12,
    },
  };

  return (
    <div style={s.root}>
      <div style={s.actBadge}>
        Act {act} {isOpener ? '- Beginning' : '- Crossroads'}
      </div>
      <h1 style={s.title}>{title}</h1>
      <p style={s.subtitle}>{subtitle}</p>

      <div style={s.row}>
        {options.map((b) => {
          const isPicked = picked?.id === b.id;
          const isDimmed = picked !== null && !isPicked;
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => handlePick(b)}
              disabled={picked !== null}
              aria-label={`${b.name}: ${b.effect}`}
              style={{
                width: 220,
                padding: '18px 16px',
                background: `linear-gradient(180deg, ${b.color}1f 0%, ${b.color}08 100%)`,
                border: `1px solid ${isPicked ? '#fff' : b.color + '88'}`,
                borderRadius: 10,
                cursor: picked ? 'default' : 'pointer',
                color: '#eee',
                textAlign: 'left',
                opacity: isDimmed ? 0.35 : 1,
                transition: 'opacity 320ms, transform 240ms, box-shadow 240ms',
                transform: isPicked ? 'translateY(-6px) scale(1.03)' : undefined,
                boxShadow: isPicked
                  ? `0 0 32px ${b.color}, 0 0 60px ${b.color}66`
                  : `0 0 14px ${b.color}33`,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ width: 58, height: 58, marginBottom: 2 }}>
                <TokenArt
                  src={getBlessingArt(b.id)}
                  fallback={b.fallback}
                  alt=""
                  style={{ width: 58, height: 58 }}
                  fallbackStyle={{ fontSize: 16, lineHeight: 1 }}
                />
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: b.color,
                  letterSpacing: '0.04em',
                }}
              >
                {b.name}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: '#ddd',
                  lineHeight: 1.45,
                  minHeight: 32,
                }}
              >
                {b.effect}
              </div>
              <div
                style={{
                  fontSize: 10,
                  fontStyle: 'italic',
                  color: '#888',
                  lineHeight: 1.35,
                }}
              >
                "{b.flavor}"
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
