/**
 * STARFORGE TCG - Procedural Card Art
 *
 * Generates SVG-based card illustrations using race-themed colors,
 * geometric patterns, and card-type visual motifs. Each race has a
 * unique palette and pattern, giving cards distinct visual identity
 * without requiring external image assets.
 */

import React, { useMemo } from 'react';
import { Race } from '../../types/Race';

// Race color palettes
const RACE_PALETTES: Record<string, { primary: string; secondary: string; accent: string; bg: string }> = {
  [Race.COGSMITHS]:        { primary: '#ff8800', secondary: '#cc6600', accent: '#ffcc00', bg: '#2a1800' },
  [Race.LUMINAR]:          { primary: '#ffdd44', secondary: '#ffaa00', accent: '#ffffff', bg: '#2a2200' },
  [Race.PYROCLAST]:        { primary: '#ff4400', secondary: '#cc2200', accent: '#ff8800', bg: '#2a0800' },
  [Race.VOIDBORN]:         { primary: '#8844ff', secondary: '#6622cc', accent: '#bb88ff', bg: '#140028' },
  [Race.BIOTITANS]:        { primary: '#44cc44', secondary: '#228822', accent: '#88ff88', bg: '#0a2a0a' },
  [Race.CRYSTALLINE]:      { primary: '#44ccff', secondary: '#2288cc', accent: '#88eeff', bg: '#0a1a2a' },
  [Race.PHANTOM_CORSAIRS]: { primary: '#8888aa', secondary: '#666688', accent: '#bbbbdd', bg: '#1a1a28' },
  [Race.HIVEMIND]:         { primary: '#aacc00', secondary: '#889900', accent: '#ccff44', bg: '#1a2a00' },
  [Race.ASTROMANCERS]:     { primary: '#4466ff', secondary: '#2244cc', accent: '#88aaff', bg: '#0a0a2a' },
  [Race.CHRONOBOUND]:      { primary: '#cc8844', secondary: '#aa6622', accent: '#ffcc88', bg: '#2a1a0a' },
};

const NEUTRAL_PALETTE = { primary: '#888899', secondary: '#666677', accent: '#aaaacc', bg: '#1a1a22' };

// Seeded pseudo-random for deterministic art from card ID
function hashStr(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function seededRandom(seed: number, index: number): number {
  const x = Math.sin(seed + index * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

interface CardArtProps {
  cardId: string;
  race?: Race;
  cardType: 'MINION' | 'SPELL' | 'STRUCTURE';
  cost: number;
  width?: number;
  height?: number;
  isForged?: boolean;
}

export const CardArt: React.FC<CardArtProps> = ({
  cardId,
  race,
  cardType,
  cost,
  width = 80,
  height = 50,
  isForged = false,
}) => {
  const art = useMemo(() => {
    const palette = race ? (RACE_PALETTES[race] || NEUTRAL_PALETTE) : NEUTRAL_PALETTE;
    const seed = hashStr(cardId);
    const r = (i: number) => seededRandom(seed, i);

    return { palette, seed, r };
  }, [cardId, race]);

  const { palette, r } = art;

  // Pattern selection based on race
  const patternType = race ? getRacePattern(race) : 'geometric';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ borderRadius: '4px', display: 'block' }}
    >
      {/* Background gradient */}
      <defs>
        <linearGradient id={`bg_${cardId}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette.bg} />
          <stop offset="100%" stopColor={palette.secondary + '44'} />
        </linearGradient>
        <radialGradient id={`glow_${cardId}`} cx="0.5" cy="0.5" r="0.6">
          <stop offset="0%" stopColor={palette.primary + '66'} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        {isForged && (
          <linearGradient id={`forge_${cardId}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffcc00" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#ff8800" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#ffcc00" stopOpacity="0.3" />
          </linearGradient>
        )}
      </defs>

      <rect width={width} height={height} fill={`url(#bg_${cardId})`} />
      <rect width={width} height={height} fill={`url(#glow_${cardId})`} />

      {/* Race-specific pattern */}
      {patternType === 'gears' && renderGears(width, height, palette, r)}
      {patternType === 'rays' && renderRays(width, height, palette, r)}
      {patternType === 'flames' && renderFlames(width, height, palette, r)}
      {patternType === 'tendrils' && renderTendrils(width, height, palette, r)}
      {patternType === 'organic' && renderOrganic(width, height, palette, r)}
      {patternType === 'crystals' && renderCrystals(width, height, palette, r)}
      {patternType === 'spectral' && renderSpectral(width, height, palette, r)}
      {patternType === 'hexagons' && renderHexagons(width, height, palette, r)}
      {patternType === 'stars' && renderStars(width, height, palette, r)}
      {patternType === 'clockwork' && renderClockwork(width, height, palette, r)}
      {patternType === 'geometric' && renderGeometric(width, height, palette, r)}

      {/* Card type icon */}
      {cardType === 'SPELL' && (
        <circle cx={width / 2} cy={height / 2} r={8} fill="none" stroke={palette.accent} strokeWidth="1.5" opacity="0.8" />
      )}
      {cardType === 'STRUCTURE' && (
        <rect x={width / 2 - 7} y={height / 2 - 7} width={14} height={14} fill="none" stroke={palette.accent} strokeWidth="1.5" opacity="0.8" rx="2" />
      )}

      {/* Cost-based intensity (higher cost = more complex) */}
      {cost >= 6 && (
        <circle cx={width / 2} cy={height / 2} r={15} fill="none" stroke={palette.accent + '44'} strokeWidth="1" />
      )}

      {/* Forged overlay */}
      {isForged && (
        <rect width={width} height={height} fill={`url(#forge_${cardId})`} />
      )}
    </svg>
  );
};

function getRacePattern(race: Race): string {
  const map: Record<string, string> = {
    [Race.COGSMITHS]: 'gears',
    [Race.LUMINAR]: 'rays',
    [Race.PYROCLAST]: 'flames',
    [Race.VOIDBORN]: 'tendrils',
    [Race.BIOTITANS]: 'organic',
    [Race.CRYSTALLINE]: 'crystals',
    [Race.PHANTOM_CORSAIRS]: 'spectral',
    [Race.HIVEMIND]: 'hexagons',
    [Race.ASTROMANCERS]: 'stars',
    [Race.CHRONOBOUND]: 'clockwork',
  };
  return map[race] || 'geometric';
}

type Palette = { primary: string; secondary: string; accent: string; bg: string };
type RFn = (i: number) => number;

function renderGears(w: number, h: number, p: Palette, r: RFn) {
  const elements: React.ReactNode[] = [];
  for (let i = 0; i < 3; i++) {
    const cx = r(i * 3) * w;
    const cy = r(i * 3 + 1) * h;
    const radius = 6 + r(i * 3 + 2) * 8;
    elements.push(
      <circle key={`g${i}`} cx={cx} cy={cy} r={radius} fill="none" stroke={p.primary} strokeWidth="1.5" opacity="0.6" />,
      <circle key={`gi${i}`} cx={cx} cy={cy} r={radius * 0.4} fill={p.accent + '33'} />,
    );
    // Gear teeth
    for (let t = 0; t < 6; t++) {
      const angle = (t / 6) * Math.PI * 2;
      elements.push(
        <line key={`gt${i}_${t}`}
          x1={cx + Math.cos(angle) * radius * 0.7}
          y1={cy + Math.sin(angle) * radius * 0.7}
          x2={cx + Math.cos(angle) * radius * 1.2}
          y2={cy + Math.sin(angle) * radius * 1.2}
          stroke={p.primary} strokeWidth="2" opacity="0.4"
        />
      );
    }
  }
  return <>{elements}</>;
}

function renderRays(w: number, h: number, p: Palette, r: RFn) {
  const elements: React.ReactNode[] = [];
  const cx = w / 2;
  const cy = h / 2;
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2 + r(i) * 0.3;
    const len = 20 + r(i + 10) * 15;
    elements.push(
      <line key={`r${i}`}
        x1={cx} y1={cy}
        x2={cx + Math.cos(angle) * len}
        y2={cy + Math.sin(angle) * len}
        stroke={p.primary} strokeWidth={1 + r(i + 20)} opacity="0.5"
      />
    );
  }
  elements.push(<circle key="center" cx={cx} cy={cy} r={4} fill={p.accent} opacity="0.7" />);
  return <>{elements}</>;
}

function renderFlames(w: number, h: number, p: Palette, r: RFn) {
  const elements: React.ReactNode[] = [];
  for (let i = 0; i < 5; i++) {
    const x = r(i * 4) * w;
    const baseY = h;
    const tipY = h * 0.2 + r(i * 4 + 1) * h * 0.4;
    const spread = 4 + r(i * 4 + 2) * 8;
    elements.push(
      <path key={`f${i}`}
        d={`M ${x} ${baseY} Q ${x - spread} ${(baseY + tipY) / 2} ${x} ${tipY} Q ${x + spread} ${(baseY + tipY) / 2} ${x} ${baseY}`}
        fill={i % 2 === 0 ? p.primary + '55' : p.accent + '33'}
        stroke="none"
      />
    );
  }
  return <>{elements}</>;
}

function renderTendrils(w: number, h: number, p: Palette, r: RFn) {
  const elements: React.ReactNode[] = [];
  for (let i = 0; i < 4; i++) {
    const sx = r(i * 5) * w;
    const sy = r(i * 5 + 1) * h;
    const cx1 = r(i * 5 + 2) * w;
    const cy1 = r(i * 5 + 3) * h;
    const ex = r(i * 5 + 4) * w;
    const ey = r(i * 5 + 5) * h;
    elements.push(
      <path key={`t${i}`}
        d={`M ${sx} ${sy} Q ${cx1} ${cy1} ${ex} ${ey}`}
        fill="none" stroke={p.primary} strokeWidth="2" opacity="0.5"
      />
    );
  }
  elements.push(
    <circle key="eye" cx={w / 2} cy={h / 2} r={5} fill={p.accent + '55'} stroke={p.accent} strokeWidth="1" opacity="0.7" />
  );
  return <>{elements}</>;
}

function renderOrganic(w: number, h: number, p: Palette, r: RFn) {
  const elements: React.ReactNode[] = [];
  for (let i = 0; i < 6; i++) {
    const cx = r(i * 3) * w;
    const cy = r(i * 3 + 1) * h;
    const rx = 4 + r(i * 3 + 2) * 10;
    const ry = 4 + r(i * 3 + 3) * 8;
    elements.push(
      <ellipse key={`o${i}`} cx={cx} cy={cy} rx={rx} ry={ry}
        fill={i % 2 === 0 ? p.primary + '33' : p.secondary + '44'}
        stroke={p.primary + '55'} strokeWidth="0.5"
      />
    );
  }
  return <>{elements}</>;
}

function renderCrystals(w: number, h: number, p: Palette, r: RFn) {
  const elements: React.ReactNode[] = [];
  for (let i = 0; i < 4; i++) {
    const cx = r(i * 4) * w;
    const cy = r(i * 4 + 1) * h;
    const size = 6 + r(i * 4 + 2) * 10;
    const points = [
      `${cx},${cy - size}`,
      `${cx + size * 0.5},${cy}`,
      `${cx},${cy + size * 0.3}`,
      `${cx - size * 0.5},${cy}`,
    ].join(' ');
    elements.push(
      <polygon key={`c${i}`} points={points}
        fill={p.primary + '44'} stroke={p.accent} strokeWidth="1" opacity="0.7"
      />
    );
  }
  return <>{elements}</>;
}

function renderSpectral(w: number, h: number, p: Palette, r: RFn) {
  const elements: React.ReactNode[] = [];
  for (let i = 0; i < 5; i++) {
    const cx = r(i * 3) * w;
    const cy = r(i * 3 + 1) * h;
    const radius = 3 + r(i * 3 + 2) * 12;
    elements.push(
      <circle key={`s${i}`} cx={cx} cy={cy} r={radius}
        fill={p.primary + '22'} stroke={p.primary + '55'} strokeWidth="0.5" strokeDasharray="2,2"
      />
    );
  }
  // Skull-like shape
  elements.push(
    <circle key="skull" cx={w / 2} cy={h / 2} r={6} fill="none" stroke={p.accent + '44'} strokeWidth="1" />,
    <circle key="eye1" cx={w / 2 - 2} cy={h / 2 - 1} r={1.5} fill={p.accent + '66'} />,
    <circle key="eye2" cx={w / 2 + 2} cy={h / 2 - 1} r={1.5} fill={p.accent + '66'} />,
  );
  return <>{elements}</>;
}

function renderHexagons(w: number, h: number, p: Palette, r: RFn) {
  const elements: React.ReactNode[] = [];
  const hexSize = 8;
  for (let i = 0; i < 5; i++) {
    const cx = r(i * 2) * w;
    const cy = r(i * 2 + 1) * h;
    const points = Array.from({ length: 6 }, (_, j) => {
      const angle = (j / 6) * Math.PI * 2 - Math.PI / 6;
      return `${cx + Math.cos(angle) * hexSize},${cy + Math.sin(angle) * hexSize}`;
    }).join(' ');
    elements.push(
      <polygon key={`h${i}`} points={points}
        fill={p.primary + '33'} stroke={p.primary} strokeWidth="1" opacity="0.6"
      />
    );
  }
  return <>{elements}</>;
}

function renderStars(w: number, h: number, p: Palette, r: RFn) {
  const elements: React.ReactNode[] = [];
  for (let i = 0; i < 8; i++) {
    const cx = r(i * 3) * w;
    const cy = r(i * 3 + 1) * h;
    const size = 1 + r(i * 3 + 2) * 3;
    elements.push(
      <circle key={`st${i}`} cx={cx} cy={cy} r={size} fill={p.accent} opacity={0.3 + r(i) * 0.5} />
    );
  }
  // Constellation lines
  for (let i = 0; i < 3; i++) {
    elements.push(
      <line key={`cl${i}`}
        x1={r(i * 6 + 30) * w} y1={r(i * 6 + 31) * h}
        x2={r(i * 6 + 32) * w} y2={r(i * 6 + 33) * h}
        stroke={p.primary + '44'} strokeWidth="0.5"
      />
    );
  }
  return <>{elements}</>;
}

function renderClockwork(w: number, h: number, p: Palette, r: RFn) {
  const elements: React.ReactNode[] = [];
  const cx = w / 2;
  const cy = h / 2;
  // Clock face
  elements.push(
    <circle key="face" cx={cx} cy={cy} r={15} fill="none" stroke={p.primary} strokeWidth="1" opacity="0.5" />
  );
  // Hour marks
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const inner = 12;
    const outer = 14;
    elements.push(
      <line key={`hm${i}`}
        x1={cx + Math.cos(angle) * inner} y1={cy + Math.sin(angle) * inner}
        x2={cx + Math.cos(angle) * outer} y2={cy + Math.sin(angle) * outer}
        stroke={p.accent} strokeWidth="1" opacity="0.4"
      />
    );
  }
  // Hands
  const handAngle1 = r(0) * Math.PI * 2;
  const handAngle2 = r(1) * Math.PI * 2;
  elements.push(
    <line key="h1" x1={cx} y1={cy} x2={cx + Math.cos(handAngle1) * 10} y2={cy + Math.sin(handAngle1) * 10}
      stroke={p.accent} strokeWidth="1.5" opacity="0.7" />,
    <line key="h2" x1={cx} y1={cy} x2={cx + Math.cos(handAngle2) * 7} y2={cy + Math.sin(handAngle2) * 7}
      stroke={p.primary} strokeWidth="2" opacity="0.6" />,
  );
  return <>{elements}</>;
}

function renderGeometric(w: number, h: number, p: Palette, r: RFn) {
  const elements: React.ReactNode[] = [];
  for (let i = 0; i < 4; i++) {
    const cx = r(i * 4) * w;
    const cy = r(i * 4 + 1) * h;
    const size = 5 + r(i * 4 + 2) * 10;
    if (r(i * 4 + 3) > 0.5) {
      elements.push(
        <rect key={`g${i}`} x={cx - size / 2} y={cy - size / 2} width={size} height={size}
          fill={p.primary + '33'} stroke={p.primary + '55'} strokeWidth="0.5"
          transform={`rotate(${r(i + 20) * 45}, ${cx}, ${cy})`}
        />
      );
    } else {
      elements.push(
        <circle key={`g${i}`} cx={cx} cy={cy} r={size / 2}
          fill={p.primary + '33'} stroke={p.primary + '55'} strokeWidth="0.5"
        />
      );
    }
  }
  return <>{elements}</>;
}
