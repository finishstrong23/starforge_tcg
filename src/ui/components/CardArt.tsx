/**
 * STARFORGE TCG - Card Art with Custom Image Support
 *
 * Loads custom artwork from public/cards/{cardId}.png if available,
 * otherwise falls back to procedural SVG generation.
 *
 * To add custom art: drop a PNG/JPG/WEBP into public/cards/ named
 * after the card's definition ID (e.g. cogsmiths_gear_golem.png).
 *
 * Procedural fallback generates rich, multi-layered SVG card illustrations with:
 * - Deep background gradients with noise textures
 * - Race-specific layered compositions (8-20+ elements)
 * - Atmospheric lighting with multiple glow sources
 * - Dynamic detail scaling based on card cost
 * - Parallax-like depth through opacity layering
 * - Card-type visual motifs (spell circles, structure frames)
 * - Forged overlay with cosmic energy effects
 */

import React, { useMemo, useState, useEffect } from 'react';
import { Race } from '../../types/Race';

// --- Custom image loading system ---

/** Cache of image availability checks to avoid repeated network requests */
const imageCache = new Map<string, string | null>();

/** Supported image extensions, checked in order */
const IMAGE_EXTENSIONS = ['png', 'webp', 'jpg'];

/**
 * Check if a custom card image exists in public/cards/.
 * Returns the URL if found, null otherwise. Results are cached.
 */
function probeCardImage(cardId: string): Promise<string | null> {
  const cached = imageCache.get(cardId);
  if (cached !== undefined) return Promise.resolve(cached);

  // Try each extension in order
  return (async () => {
    for (const ext of IMAGE_EXTENSIONS) {
      const url = `./cards/${cardId}.${ext}`;
      try {
        const resp = await fetch(url, { method: 'HEAD' });
        if (resp.ok) {
          imageCache.set(cardId, url);
          return url;
        }
      } catch {
        // Network error — skip this extension
      }
    }
    imageCache.set(cardId, null);
    return null;
  })();
}

/**
 * Hook that returns the custom image URL for a card, or null if none exists.
 */
function useCardImage(cardId: string): string | null {
  const cached = imageCache.get(cardId);
  const [imageUrl, setImageUrl] = useState<string | null>(cached !== undefined ? cached : null);
  const [checked, setChecked] = useState(cached !== undefined);

  useEffect(() => {
    if (imageCache.has(cardId)) {
      setImageUrl(imageCache.get(cardId)!);
      setChecked(true);
      return;
    }
    let cancelled = false;
    probeCardImage(cardId).then((url) => {
      if (!cancelled) {
        setImageUrl(url);
        setChecked(true);
      }
    });
    return () => { cancelled = true; };
  }, [cardId]);

  return checked ? imageUrl : null;
}

// Rich race color palettes with deeper color ranges
const RACE_PALETTES: Record<string, {
  primary: string; secondary: string; accent: string; bg: string;
  highlight: string; shadow: string; glow: string;
}> = {
  [Race.COGSMITHS]:        { primary: '#ff8800', secondary: '#cc6600', accent: '#ffcc00', bg: '#1a0e00', highlight: '#ffe0a0', shadow: '#331a00', glow: '#ff9922' },
  [Race.LUMINAR]:          { primary: '#ffdd44', secondary: '#ffaa00', accent: '#ffffff', bg: '#1a1600', highlight: '#fffff0', shadow: '#332a00', glow: '#ffee66' },
  [Race.PYROCLAST]:        { primary: '#ff4400', secondary: '#cc2200', accent: '#ff8800', bg: '#1a0500', highlight: '#ffaa66', shadow: '#330800', glow: '#ff5522' },
  [Race.VOIDBORN]:         { primary: '#8844ff', secondary: '#6622cc', accent: '#bb88ff', bg: '#0a0018', highlight: '#ddaaff', shadow: '#220044', glow: '#9955ff' },
  [Race.BIOTITANS]:        { primary: '#44cc44', secondary: '#228822', accent: '#88ff88', bg: '#051a05', highlight: '#aaffaa', shadow: '#0a330a', glow: '#55dd55' },
  [Race.CRYSTALLINE]:      { primary: '#44ccff', secondary: '#2288cc', accent: '#88eeff', bg: '#051220', highlight: '#bbf0ff', shadow: '#0a2240', glow: '#55ddff' },
  [Race.PHANTOM_CORSAIRS]: { primary: '#8888bb', secondary: '#666699', accent: '#ccccee', bg: '#0e0e18', highlight: '#ddddff', shadow: '#222238', glow: '#9999cc' },
  [Race.HIVEMIND]:         { primary: '#aacc00', secondary: '#889900', accent: '#ccff44', bg: '#101800', highlight: '#ddff88', shadow: '#223300', glow: '#bbdd22' },
  [Race.ASTROMANCERS]:     { primary: '#4466ff', secondary: '#2244cc', accent: '#88aaff', bg: '#050818', highlight: '#aaccff', shadow: '#0a1040', glow: '#5577ff' },
  [Race.CHRONOBOUND]:      { primary: '#cc8844', secondary: '#aa6622', accent: '#ffcc88', bg: '#180e05', highlight: '#ffe0bb', shadow: '#331a0a', glow: '#dd9955' },
};

const NEUTRAL_PALETTE = { primary: '#8899aa', secondary: '#667788', accent: '#bbccdd', bg: '#0e1118', highlight: '#ddeeff', shadow: '#1a2230', glow: '#99aacc' };

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

/**
 * CardArt - Main exported component.
 * Checks for a custom image in public/cards/{cardId}.{png,webp,jpg}.
 * If found, renders the image. Otherwise falls back to procedural SVG.
 */
export const CardArt: React.FC<CardArtProps> = (props) => {
  const { cardId, width = 80, height = 50, isForged = false } = props;
  const imageUrl = useCardImage(cardId);

  if (imageUrl) {
    return (
      <div style={{ position: 'relative', width, height, borderRadius: '4px', overflow: 'hidden' }}>
        <img
          src={imageUrl}
          alt={cardId}
          width={width}
          height={height}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '4px',
          }}
        />
        {isForged && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(255,170,0,0.3) 0%, rgba(160,60,255,0.25) 50%, rgba(255,170,0,0.3) 100%)',
            border: '2px solid rgba(255,204,0,0.6)',
            borderRadius: '4px',
            pointerEvents: 'none',
          }} />
        )}
      </div>
    );
  }

  return <ProceduralCardArt {...props} />;
};

/** Procedural SVG fallback when no custom image is available */
const ProceduralCardArt: React.FC<CardArtProps> = ({
  cardId,
  race,
  cardType,
  cost,
  width = 80,
  height = 50,
  isForged = false,
}) => {
  const art = useMemo(() => {
    const pal = race ? (RACE_PALETTES[race] || NEUTRAL_PALETTE) : NEUTRAL_PALETTE;
    const seed = hashStr(cardId);
    const r = (i: number) => seededRandom(seed, i);
    return { pal, seed, r };
  }, [cardId, race]);

  const { pal, r } = art;
  const patternType = race ? getRacePattern(race) : 'geometric';
  // Detail scaling: higher cost cards get more visual complexity
  const detail = Math.min(3, Math.floor(cost / 3) + 1);
  const uid = `ca_${cardId.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ borderRadius: '4px', display: 'block' }}
    >
      <defs>
        {/* Deep background gradient */}
        <linearGradient id={`${uid}_bg`} x1="0" y1="0" x2={r(90) > 0.5 ? '1' : '0.3'} y2="1">
          <stop offset="0%" stopColor={pal.bg} />
          <stop offset="40%" stopColor={pal.shadow} />
          <stop offset="100%" stopColor={pal.bg} />
        </linearGradient>
        {/* Central glow */}
        <radialGradient id={`${uid}_glow`} cx={0.3 + r(91) * 0.4} cy={0.3 + r(92) * 0.4} r="0.65">
          <stop offset="0%" stopColor={pal.glow} stopOpacity="0.4" />
          <stop offset="50%" stopColor={pal.primary} stopOpacity="0.15" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        {/* Atmospheric haze */}
        <radialGradient id={`${uid}_haze`} cx="0.5" cy="1" r="0.8">
          <stop offset="0%" stopColor={pal.primary} stopOpacity="0.2" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        {/* Vignette */}
        <radialGradient id={`${uid}_vig`} cx="0.5" cy="0.5" r="0.7">
          <stop offset="60%" stopColor="transparent" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
        </radialGradient>
        {/* Noise filter for texture */}
        <filter id={`${uid}_noise`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" result="noise" />
          <feColorMatrix type="saturate" values="0" in="noise" result="gray" />
          <feBlend in="SourceGraphic" in2="gray" mode="multiply" result="blended" />
          <feComponentTransfer in="blended">
            <feFuncA type="linear" slope="1" />
          </feComponentTransfer>
        </filter>
        {/* Soft glow filter */}
        <filter id={`${uid}_softglow`}>
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        {isForged && (
          <>
            <linearGradient id={`${uid}_forge`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffcc00" stopOpacity="0.35" />
              <stop offset="30%" stopColor="#ff8800" stopOpacity="0.5" />
              <stop offset="70%" stopColor="#cc44ff" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ffcc00" stopOpacity="0.35" />
            </linearGradient>
            <filter id={`${uid}_forgeglow`}>
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </>
        )}
      </defs>

      {/* Background layers */}
      <rect width={width} height={height} fill={`url(#${uid}_bg)`} />
      <rect width={width} height={height} fill={`url(#${uid}_glow)`} />
      <rect width={width} height={height} fill={`url(#${uid}_haze)`} />

      {/* Subtle noise texture overlay */}
      <rect width={width} height={height} fill={pal.shadow} opacity="0.15" filter={`url(#${uid}_noise)`} />

      {/* Race-specific layered art */}
      {patternType === 'gears' && renderGears(width, height, pal, r, detail, uid)}
      {patternType === 'rays' && renderRays(width, height, pal, r, detail, uid)}
      {patternType === 'flames' && renderFlames(width, height, pal, r, detail, uid)}
      {patternType === 'tendrils' && renderTendrils(width, height, pal, r, detail, uid)}
      {patternType === 'organic' && renderOrganic(width, height, pal, r, detail, uid)}
      {patternType === 'crystals' && renderCrystals(width, height, pal, r, detail, uid)}
      {patternType === 'spectral' && renderSpectral(width, height, pal, r, detail, uid)}
      {patternType === 'hexagons' && renderHexagons(width, height, pal, r, detail, uid)}
      {patternType === 'stars' && renderStars(width, height, pal, r, detail, uid)}
      {patternType === 'clockwork' && renderClockwork(width, height, pal, r, detail, uid)}
      {patternType === 'geometric' && renderGeometric(width, height, pal, r, detail, uid)}

      {/* Card type visual overlay */}
      {cardType === 'SPELL' && renderSpellOverlay(width, height, pal, r)}
      {cardType === 'STRUCTURE' && renderStructureOverlay(width, height, pal, r)}

      {/* Cost-based energy rings for expensive cards */}
      {cost >= 5 && (
        <>
          <circle cx={width / 2} cy={height / 2} r={Math.min(width, height) * 0.35}
            fill="none" stroke={pal.accent} strokeWidth="0.5" opacity="0.25" strokeDasharray="2,3" />
          {cost >= 8 && (
            <circle cx={width / 2} cy={height / 2} r={Math.min(width, height) * 0.42}
              fill="none" stroke={pal.highlight} strokeWidth="0.3" opacity="0.15" strokeDasharray="1,4" />
          )}
        </>
      )}

      {/* Vignette overlay for depth */}
      <rect width={width} height={height} fill={`url(#${uid}_vig)`} />

      {/* Forged cosmic overlay */}
      {isForged && (
        <>
          <rect width={width} height={height} fill={`url(#${uid}_forge)`} />
          {/* Forged energy sparkles */}
          {Array.from({ length: 6 }, (_, i) => (
            <circle key={`fs${i}`}
              cx={r(200 + i) * width} cy={r(210 + i) * height}
              r={0.5 + r(220 + i) * 1.5}
              fill={i % 2 === 0 ? '#ffdd66' : '#cc88ff'}
              opacity={0.4 + r(230 + i) * 0.5}
              filter={`url(#${uid}_forgeglow)`}
            />
          ))}
        </>
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

type Palette = { primary: string; secondary: string; accent: string; bg: string; highlight: string; shadow: string; glow: string };
type RFn = (i: number) => number;

// ── COGSMITHS: Industrial gears, pistons, steam pipes ──

function renderGears(w: number, h: number, p: Palette, r: RFn, detail: number, uid: string) {
  const els: React.ReactNode[] = [];

  // Steam/smoke wisps in background
  for (let i = 0; i < 3; i++) {
    const sx = r(i * 7 + 100) * w;
    const sy = r(i * 7 + 101) * h;
    els.push(
      <ellipse key={`smoke${i}`} cx={sx} cy={sy}
        rx={8 + r(i * 7 + 102) * 12} ry={4 + r(i * 7 + 103) * 6}
        fill={p.primary} opacity={0.06 + r(i * 7 + 104) * 0.06}
      />
    );
  }

  // Pipe/conduit lines
  for (let i = 0; i < 2 + detail; i++) {
    const y = r(i * 5 + 50) * h;
    els.push(
      <line key={`pipe${i}`} x1={0} y1={y} x2={w} y2={y + (r(i * 5 + 51) - 0.5) * 10}
        stroke={p.secondary} strokeWidth={2 + r(i * 5 + 52) * 2} opacity={0.15} strokeLinecap="round" />
    );
  }

  // Main gears with teeth and inner detail
  const gearCount = 2 + detail;
  for (let i = 0; i < gearCount; i++) {
    const cx = r(i * 8) * w * 0.8 + w * 0.1;
    const cy = r(i * 8 + 1) * h * 0.8 + h * 0.1;
    const radius = 5 + r(i * 8 + 2) * (6 + detail * 3);
    const teeth = 6 + Math.floor(r(i * 8 + 3) * 6);
    const rotation = r(i * 8 + 7) * 360;

    // Gear body glow
    els.push(
      <circle key={`gbg${i}`} cx={cx} cy={cy} r={radius * 1.2}
        fill={p.glow} opacity={0.08} />
    );

    // Outer gear ring
    els.push(
      <circle key={`go${i}`} cx={cx} cy={cy} r={radius}
        fill="none" stroke={p.primary} strokeWidth="2" opacity="0.6" />
    );

    // Inner ring
    els.push(
      <circle key={`gi${i}`} cx={cx} cy={cy} r={radius * 0.55}
        fill={p.accent + '15'} stroke={p.accent} strokeWidth="0.8" opacity="0.4" />
    );

    // Center hub
    els.push(
      <circle key={`gc${i}`} cx={cx} cy={cy} r={radius * 0.15}
        fill={p.highlight} opacity="0.5" />
    );

    // Gear teeth
    for (let t = 0; t < teeth; t++) {
      const angle = (t / teeth) * Math.PI * 2 + (rotation * Math.PI / 180);
      const inner = radius * 0.85;
      const outer = radius * 1.15;
      const toothW = radius * 0.2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const cosP = Math.cos(angle + toothW / radius);
      const sinP = Math.sin(angle + toothW / radius);
      const cosM = Math.cos(angle - toothW / radius);
      const sinM = Math.sin(angle - toothW / radius);
      els.push(
        <path key={`gt${i}_${t}`}
          d={`M ${cx + cosM * inner} ${cy + sinM * inner} L ${cx + cosM * outer} ${cy + sinM * outer} L ${cx + cosP * outer} ${cy + sinP * outer} L ${cx + cosP * inner} ${cy + sinP * inner}`}
          fill={p.primary} opacity="0.4" />
      );
    }

    // Spoke lines
    for (let s = 0; s < 4; s++) {
      const angle = (s / 4) * Math.PI * 2 + (rotation * Math.PI / 180);
      els.push(
        <line key={`gs${i}_${s}`}
          x1={cx + Math.cos(angle) * radius * 0.2} y1={cy + Math.sin(angle) * radius * 0.2}
          x2={cx + Math.cos(angle) * radius * 0.5} y2={cy + Math.sin(angle) * radius * 0.5}
          stroke={p.accent} strokeWidth="1" opacity="0.3" />
      );
    }
  }

  // Rivets along edges
  for (let i = 0; i < 4 + detail * 2; i++) {
    const rx = r(i + 150) * w;
    const ry = r(i + 160) < 0.5 ? 3 + r(i + 170) * 5 : h - 3 - r(i + 170) * 5;
    els.push(
      <circle key={`rivet${i}`} cx={rx} cy={ry} r={1.5}
        fill={p.highlight} opacity="0.3" />
    );
  }

  return <>{els}</>;
}

// ── LUMINAR: Radiant light beams, halos, prismatic shafts ──

function renderRays(w: number, h: number, p: Palette, r: RFn, detail: number, uid: string) {
  const els: React.ReactNode[] = [];
  const cx = w * (0.3 + r(80) * 0.4);
  const cy = h * (0.2 + r(81) * 0.3);

  // Ambient glow rings
  for (let i = 0; i < 3; i++) {
    els.push(
      <circle key={`halo${i}`} cx={cx} cy={cy} r={8 + i * 6 + r(i + 82) * 4}
        fill="none" stroke={p.accent} strokeWidth="0.5" opacity={0.15 - i * 0.03} />
    );
  }

  // Light beams radiating out
  const beamCount = 8 + detail * 3;
  for (let i = 0; i < beamCount; i++) {
    const angle = (i / beamCount) * Math.PI * 2 + r(i + 10) * 0.2;
    const len = 15 + r(i + 20) * 25;
    const beamWidth = 0.8 + r(i + 30) * 1.5;
    const opacity = 0.15 + r(i + 40) * 0.25;

    // Beam with tapered end
    const endX = cx + Math.cos(angle) * len;
    const endY = cy + Math.sin(angle) * len;
    const perpX = Math.cos(angle + Math.PI / 2) * beamWidth;
    const perpY = Math.sin(angle + Math.PI / 2) * beamWidth;

    els.push(
      <path key={`beam${i}`}
        d={`M ${cx + perpX} ${cy + perpY} L ${endX} ${endY} L ${cx - perpX} ${cy - perpY} Z`}
        fill={i % 3 === 0 ? p.accent : p.primary}
        opacity={opacity}
      />
    );
  }

  // Prismatic sparkles scattered
  for (let i = 0; i < 5 + detail * 2; i++) {
    const sx = r(i * 4 + 60) * w;
    const sy = r(i * 4 + 61) * h;
    const size = 1 + r(i * 4 + 62) * 2;
    const sparkleColor = ['#ffffff', '#ffffaa', '#ffddaa', p.accent, p.highlight][i % 5];
    // 4-point star sparkle
    els.push(
      <path key={`sparkle${i}`}
        d={`M ${sx} ${sy - size} L ${sx + size * 0.3} ${sy} L ${sx} ${sy + size} L ${sx - size * 0.3} ${sy} Z
            M ${sx - size} ${sy} L ${sx} ${sy + size * 0.3} L ${sx + size} ${sy} L ${sx} ${sy - size * 0.3} Z`}
        fill={sparkleColor} opacity={0.3 + r(i * 4 + 63) * 0.5}
      />
    );
  }

  // Central sun/orb
  els.push(
    <circle key="sun2" cx={cx} cy={cy} r={5} fill={p.accent} opacity="0.25" />,
    <circle key="sun1" cx={cx} cy={cy} r={3} fill={p.highlight} opacity="0.5" />,
    <circle key="sun0" cx={cx} cy={cy} r={1.5} fill="#ffffff" opacity="0.8" />,
  );

  return <>{els}</>;
}

// ── PYROCLAST: Layered flames, ember particles, lava cracks ──

function renderFlames(w: number, h: number, p: Palette, r: RFn, detail: number, uid: string) {
  const els: React.ReactNode[] = [];

  // Lava cracks at bottom
  for (let i = 0; i < 2 + detail; i++) {
    const sx = r(i * 6 + 80) * w;
    const points: string[] = [`${sx},${h}`];
    let x = sx;
    let y = h;
    for (let j = 0; j < 4; j++) {
      x += (r(i * 20 + j * 3 + 82) - 0.5) * 15;
      y -= 3 + r(i * 20 + j * 3 + 83) * 6;
      points.push(`${x},${y}`);
    }
    els.push(
      <polyline key={`crack${i}`} points={points.join(' ')}
        fill="none" stroke={p.accent} strokeWidth="1.5" opacity="0.4" strokeLinecap="round" />
    );
    // Glow around cracks
    els.push(
      <polyline key={`crackglow${i}`} points={points.join(' ')}
        fill="none" stroke={p.glow} strokeWidth="4" opacity="0.1" strokeLinecap="round" />
    );
  }

  // Background heat shimmer
  for (let i = 0; i < 4; i++) {
    const hx = r(i + 120) * w;
    const hy = h * 0.3 + r(i + 121) * h * 0.5;
    els.push(
      <ellipse key={`heat${i}`} cx={hx} cy={hy}
        rx={6 + r(i + 122) * 10} ry={3 + r(i + 123) * 5}
        fill={p.primary} opacity={0.04 + r(i + 124) * 0.06} />
    );
  }

  // Layered flame tongues
  const flameCount = 5 + detail * 2;
  for (let layer = 0; layer < 3; layer++) {
    for (let i = 0; i < flameCount; i++) {
      const x = r(layer * 40 + i * 4) * w;
      const baseY = h + 2;
      const tipY = h * (0.1 + layer * 0.1) + r(layer * 40 + i * 4 + 1) * h * 0.3;
      const spread = 3 + r(layer * 40 + i * 4 + 2) * (5 + detail * 2);
      const layerOpacity = layer === 0 ? 0.15 : layer === 1 ? 0.25 : 0.35;
      const color = layer === 0 ? p.accent : layer === 1 ? p.primary : p.secondary;

      els.push(
        <path key={`flame${layer}_${i}`}
          d={`M ${x - spread * 0.5} ${baseY}
              Q ${x - spread * 0.8} ${(baseY + tipY) * 0.6} ${x - spread * 0.1} ${tipY + 3}
              Q ${x} ${tipY - 2} ${x + spread * 0.1} ${tipY + 3}
              Q ${x + spread * 0.8} ${(baseY + tipY) * 0.6} ${x + spread * 0.5} ${baseY} Z`}
          fill={color} opacity={layerOpacity}
        />
      );
    }
  }

  // Ember particles floating up
  for (let i = 0; i < 6 + detail * 3; i++) {
    const ex = r(i * 3 + 50) * w;
    const ey = r(i * 3 + 51) * h * 0.8;
    const size = 0.5 + r(i * 3 + 52) * 1.5;
    els.push(
      <circle key={`ember${i}`} cx={ex} cy={ey} r={size}
        fill={i % 3 === 0 ? p.highlight : p.accent}
        opacity={0.3 + r(i * 3 + 53) * 0.5} />
    );
  }

  return <>{els}</>;
}

// ── VOIDBORN: Eldritch tendrils, eyes, dark energy wisps ──

function renderTendrils(w: number, h: number, p: Palette, r: RFn, detail: number, uid: string) {
  const els: React.ReactNode[] = [];

  // Dark energy nebula blobs
  for (let i = 0; i < 4; i++) {
    const bx = r(i * 5 + 100) * w;
    const by = r(i * 5 + 101) * h;
    els.push(
      <ellipse key={`nebula${i}`} cx={bx} cy={by}
        rx={10 + r(i * 5 + 102) * 15} ry={8 + r(i * 5 + 103) * 10}
        fill={p.primary} opacity={0.06 + r(i * 5 + 104) * 0.06}
        transform={`rotate(${r(i + 110) * 90}, ${bx}, ${by})`} />
    );
  }

  // Writhing tendrils
  const tendrilCount = 4 + detail * 2;
  for (let i = 0; i < tendrilCount; i++) {
    const sx = r(i * 8) * w;
    const sy = r(i * 8 + 1) * h;
    const cx1 = r(i * 8 + 2) * w;
    const cy1 = r(i * 8 + 3) * h;
    const cx2 = r(i * 8 + 4) * w;
    const cy2 = r(i * 8 + 5) * h;
    const ex = r(i * 8 + 6) * w;
    const ey = r(i * 8 + 7) * h;
    const thickness = 1 + r(i + 60) * 2;

    // Tendril glow
    els.push(
      <path key={`tglow${i}`}
        d={`M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${ex} ${ey}`}
        fill="none" stroke={p.glow} strokeWidth={thickness + 3} opacity="0.08" strokeLinecap="round" />
    );
    // Tendril body
    els.push(
      <path key={`t${i}`}
        d={`M ${sx} ${sy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${ex} ${ey}`}
        fill="none" stroke={p.primary} strokeWidth={thickness} opacity="0.5" strokeLinecap="round" />
    );
    // Tendril tip sucker/dot
    els.push(
      <circle key={`tip${i}`} cx={ex} cy={ey} r={thickness * 0.6}
        fill={p.accent} opacity="0.4" />
    );
  }

  // Central eldritch eye
  const ecx = w * (0.35 + r(70) * 0.3);
  const ecy = h * (0.35 + r(71) * 0.3);
  // Eye glow
  els.push(<circle key="eyeglow" cx={ecx} cy={ecy} r={10} fill={p.glow} opacity="0.12" />);
  // Eye white
  els.push(
    <ellipse key="eyeball" cx={ecx} cy={ecy} rx={6} ry={4.5}
      fill={p.accent + '22'} stroke={p.accent} strokeWidth="0.8" opacity="0.6" />
  );
  // Iris
  els.push(
    <circle key="iris" cx={ecx} cy={ecy} r={2.5}
      fill={p.primary} opacity="0.7" />
  );
  // Pupil
  els.push(
    <ellipse key="pupil" cx={ecx} cy={ecy} rx={1.2} ry={2}
      fill="#000000" opacity="0.8" />
  );
  // Eye highlight
  els.push(
    <circle key="eyehi" cx={ecx - 1} cy={ecy - 1} r={0.8}
      fill="#ffffff" opacity="0.6" />
  );

  // Floating void particles
  for (let i = 0; i < 5 + detail * 2; i++) {
    const px = r(i * 3 + 130) * w;
    const py = r(i * 3 + 131) * h;
    els.push(
      <circle key={`vp${i}`} cx={px} cy={py} r={0.5 + r(i * 3 + 132) * 1}
        fill={p.accent} opacity={0.2 + r(i * 3 + 133) * 0.3} />
    );
  }

  return <>{els}</>;
}

// ── BIOTITANS: Organic cells, DNA helixes, biomes ──

function renderOrganic(w: number, h: number, p: Palette, r: RFn, detail: number, uid: string) {
  const els: React.ReactNode[] = [];

  // Background bio-luminescence
  for (let i = 0; i < 3; i++) {
    els.push(
      <ellipse key={`biolum${i}`}
        cx={r(i * 4 + 100) * w} cy={r(i * 4 + 101) * h}
        rx={12 + r(i * 4 + 102) * 10} ry={8 + r(i * 4 + 103) * 8}
        fill={p.glow} opacity="0.06" />
    );
  }

  // Cell membranes
  const cellCount = 4 + detail * 2;
  for (let i = 0; i < cellCount; i++) {
    const cx = r(i * 5) * w * 0.9 + w * 0.05;
    const cy = r(i * 5 + 1) * h * 0.9 + h * 0.05;
    const rx = 4 + r(i * 5 + 2) * (8 + detail * 3);
    const ry = 4 + r(i * 5 + 3) * (6 + detail * 2);
    const rot = r(i * 5 + 4) * 180;

    // Cell body
    els.push(
      <ellipse key={`cell${i}`} cx={cx} cy={cy} rx={rx} ry={ry}
        fill={i % 3 === 0 ? p.primary + '18' : p.secondary + '12'}
        stroke={p.primary} strokeWidth="0.8" opacity="0.5"
        transform={`rotate(${rot}, ${cx}, ${cy})`} />
    );
    // Nucleus
    if (r(i + 50) > 0.3) {
      els.push(
        <ellipse key={`nuc${i}`} cx={cx + (r(i + 52) - 0.5) * rx * 0.4} cy={cy + (r(i + 53) - 0.5) * ry * 0.4}
          rx={rx * 0.25} ry={ry * 0.25}
          fill={p.accent + '33'} stroke={p.accent} strokeWidth="0.5" opacity="0.4"
          transform={`rotate(${rot}, ${cx}, ${cy})`} />
      );
    }
  }

  // DNA helix strands
  const helixX = w * (0.3 + r(60) * 0.4);
  for (let i = 0; i < 12; i++) {
    const y = (i / 12) * h;
    const offset = Math.sin(i * 0.8 + r(61) * 6) * 8;
    const offset2 = Math.sin(i * 0.8 + r(61) * 6 + Math.PI) * 8;
    els.push(
      <circle key={`dna1_${i}`} cx={helixX + offset} cy={y} r={1.5}
        fill={p.primary} opacity="0.35" />,
      <circle key={`dna2_${i}`} cx={helixX + offset2} cy={y} r={1.5}
        fill={p.accent} opacity="0.35" />,
    );
    if (i % 2 === 0) {
      els.push(
        <line key={`dnac_${i}`}
          x1={helixX + offset} y1={y}
          x2={helixX + offset2} y2={y}
          stroke={p.highlight} strokeWidth="0.5" opacity="0.2" />
      );
    }
  }

  // Spore particles
  for (let i = 0; i < 4 + detail * 2; i++) {
    els.push(
      <circle key={`spore${i}`}
        cx={r(i + 70) * w} cy={r(i + 80) * h}
        r={0.5 + r(i + 90) * 1.2}
        fill={p.accent} opacity={0.25 + r(i + 95) * 0.3} />
    );
  }

  return <>{els}</>;
}

// ── CRYSTALLINE: Faceted crystal formations, refractions ──

function renderCrystals(w: number, h: number, p: Palette, r: RFn, detail: number, uid: string) {
  const els: React.ReactNode[] = [];

  // Ice/crystal background shards
  for (let i = 0; i < 3; i++) {
    const sx = r(i * 4 + 100) * w;
    const sy = r(i * 4 + 101) * h;
    const size = 15 + r(i * 4 + 102) * 20;
    const angle = r(i * 4 + 103) * 360;
    els.push(
      <rect key={`icebg${i}`}
        x={sx - size / 6} y={sy - size / 2} width={size / 3} height={size}
        fill={p.primary} opacity="0.04"
        transform={`rotate(${angle}, ${sx}, ${sy})`}
        rx="2" />
    );
  }

  // Main crystal formations
  const crystalCount = 3 + detail * 2;
  for (let i = 0; i < crystalCount; i++) {
    const cx = r(i * 7) * w * 0.8 + w * 0.1;
    const cy = r(i * 7 + 1) * h * 0.8 + h * 0.1;
    const size = 5 + r(i * 7 + 2) * (8 + detail * 3);
    const tilt = (r(i * 7 + 3) - 0.5) * 40;
    const facets = 4 + Math.floor(r(i * 7 + 4) * 3);

    // Crystal glow
    els.push(
      <ellipse key={`cglow${i}`} cx={cx} cy={cy + size * 0.2}
        rx={size * 0.6} ry={size * 0.3}
        fill={p.glow} opacity="0.1" />
    );

    // Crystal body (elongated diamond/hexagonal prism)
    const points: string[] = [];
    points.push(`${cx},${cy - size}`); // top point
    for (let f = 0; f < facets; f++) {
      const frac = (f + 1) / (facets + 1);
      const bodyW = size * 0.4 * Math.sin(frac * Math.PI);
      const bodyY = cy - size + frac * size * 2;
      points.push(`${cx + bodyW},${bodyY}`);
    }
    points.push(`${cx},${cy + size * 0.4}`); // bottom point
    for (let f = facets - 1; f >= 0; f--) {
      const frac = (f + 1) / (facets + 1);
      const bodyW = size * 0.4 * Math.sin(frac * Math.PI);
      const bodyY = cy - size + frac * size * 2;
      points.push(`${cx - bodyW},${bodyY}`);
    }

    els.push(
      <polygon key={`crystal${i}`} points={points.join(' ')}
        fill={p.primary + '25'} stroke={p.accent} strokeWidth="1" opacity="0.65"
        transform={`rotate(${tilt}, ${cx}, ${cy})`} />
    );

    // Facet highlight line
    els.push(
      <line key={`facet${i}`}
        x1={cx} y1={cy - size} x2={cx} y2={cy + size * 0.4}
        stroke={p.highlight} strokeWidth="0.5" opacity="0.3"
        transform={`rotate(${tilt}, ${cx}, ${cy})`} />
    );

    // Refraction sparkle at top
    els.push(
      <circle key={`refl${i}`}
        cx={cx + (r(i + 50) - 0.5) * 3} cy={cy - size + 2}
        r={1} fill={p.highlight} opacity="0.6"
        transform={`rotate(${tilt}, ${cx}, ${cy})`} />
    );
  }

  // Small shattered crystal debris
  for (let i = 0; i < 5 + detail * 2; i++) {
    const dx = r(i * 3 + 60) * w;
    const dy = r(i * 3 + 61) * h;
    const ds = 1 + r(i * 3 + 62) * 3;
    els.push(
      <polygon key={`shard${i}`}
        points={`${dx},${dy - ds} ${dx + ds * 0.5},${dy} ${dx},${dy + ds * 0.3} ${dx - ds * 0.5},${dy}`}
        fill={p.accent} opacity={0.15 + r(i + 70) * 0.2}
        transform={`rotate(${r(i + 75) * 180}, ${dx}, ${dy})`} />
    );
  }

  return <>{els}</>;
}

// ── PHANTOM CORSAIRS: Ghost ships, spectral fog, skull motifs ──

function renderSpectral(w: number, h: number, p: Palette, r: RFn, detail: number, uid: string) {
  const els: React.ReactNode[] = [];

  // Spectral fog layers
  for (let i = 0; i < 4; i++) {
    const fy = h * (0.3 + i * 0.15) + (r(i + 100) - 0.5) * 10;
    els.push(
      <ellipse key={`fog${i}`}
        cx={w * 0.5 + (r(i + 101) - 0.5) * w * 0.6} cy={fy}
        rx={w * 0.4 + r(i + 102) * w * 0.3} ry={4 + r(i + 103) * 6}
        fill={p.primary} opacity={0.06 + r(i + 104) * 0.06} />
    );
  }

  // Ghost orbs floating
  const orbCount = 5 + detail * 2;
  for (let i = 0; i < orbCount; i++) {
    const ox = r(i * 3) * w;
    const oy = r(i * 3 + 1) * h;
    const orbR = 2 + r(i * 3 + 2) * (4 + detail * 2);

    // Orb outer glow
    els.push(
      <circle key={`oglow${i}`} cx={ox} cy={oy} r={orbR * 2}
        fill={p.glow} opacity="0.05" />
    );
    // Orb body
    els.push(
      <circle key={`orb${i}`} cx={ox} cy={oy} r={orbR}
        fill={p.primary + '15'} stroke={p.primary + '44'} strokeWidth="0.5"
        strokeDasharray={`${1 + r(i + 30) * 2},${1 + r(i + 31) * 2}`} />
    );
  }

  // Central skull motif
  const sx = w * (0.35 + r(50) * 0.3);
  const sy = h * (0.3 + r(51) * 0.3);
  const ss = 5 + detail * 2;

  // Skull glow
  els.push(<circle key="skullglow" cx={sx} cy={sy} r={ss * 2} fill={p.glow} opacity="0.08" />);
  // Skull outline
  els.push(
    <ellipse key="skullhead" cx={sx} cy={sy - ss * 0.1} rx={ss} ry={ss * 0.85}
      fill="none" stroke={p.accent} strokeWidth="1" opacity="0.45" />
  );
  // Jaw
  els.push(
    <ellipse key="jaw" cx={sx} cy={sy + ss * 0.5} rx={ss * 0.6} ry={ss * 0.3}
      fill="none" stroke={p.accent} strokeWidth="0.7" opacity="0.3" />
  );
  // Eye sockets
  els.push(
    <ellipse key="seye1" cx={sx - ss * 0.3} cy={sy - ss * 0.15}
      rx={ss * 0.22} ry={ss * 0.25}
      fill={p.glow} opacity="0.5" />,
    <ellipse key="seye2" cx={sx + ss * 0.3} cy={sy - ss * 0.15}
      rx={ss * 0.22} ry={ss * 0.25}
      fill={p.glow} opacity="0.5" />,
  );
  // Nose
  els.push(
    <path key="nose" d={`M ${sx} ${sy + ss * 0.1} L ${sx - ss * 0.1} ${sy + ss * 0.25} L ${sx + ss * 0.1} ${sy + ss * 0.25} Z`}
      fill="none" stroke={p.accent} strokeWidth="0.5" opacity="0.3" />
  );

  // Crossed bones behind skull
  els.push(
    <line key="bone1" x1={sx - ss * 1.2} y1={sy - ss * 0.8} x2={sx + ss * 1.2} y2={sy + ss * 1}
      stroke={p.primary} strokeWidth="1.5" opacity="0.2" strokeLinecap="round" />,
    <line key="bone2" x1={sx + ss * 1.2} y1={sy - ss * 0.8} x2={sx - ss * 1.2} y2={sy + ss * 1}
      stroke={p.primary} strokeWidth="1.5" opacity="0.2" strokeLinecap="round" />,
  );

  return <>{els}</>;
}

// ── HIVEMIND: Dense hexagonal tessellation, connecting nodes ──

function renderHexagons(w: number, h: number, p: Palette, r: RFn, detail: number, uid: string) {
  const els: React.ReactNode[] = [];
  const hexSize = 5 + detail * 1.5;
  const hexH = hexSize * Math.sqrt(3);

  // Background pulsing network
  for (let i = 0; i < 3; i++) {
    els.push(
      <circle key={`netbg${i}`}
        cx={r(i + 100) * w} cy={r(i + 101) * h}
        r={15 + r(i + 102) * 15}
        fill={p.glow} opacity="0.04" />
    );
  }

  // Hexagonal grid
  const cols = Math.ceil(w / (hexSize * 1.5)) + 1;
  const rows = Math.ceil(h / hexH) + 1;
  const centers: { x: number; y: number; active: boolean }[] = [];

  for (let row = -1; row < rows; row++) {
    for (let col = -1; col < cols; col++) {
      const cx = col * hexSize * 1.5;
      const cy = row * hexH + (col % 2 === 0 ? 0 : hexH / 2);
      const isActive = r(row * 31 + col * 17 + 200) > 0.55;

      centers.push({ x: cx, y: cy, active: isActive });

      const points = Array.from({ length: 6 }, (_, j) => {
        const angle = (j / 6) * Math.PI * 2 - Math.PI / 6;
        return `${cx + Math.cos(angle) * hexSize},${cy + Math.sin(angle) * hexSize}`;
      }).join(' ');

      els.push(
        <polygon key={`hex_${row}_${col}`} points={points}
          fill={isActive ? p.primary + '18' : 'transparent'}
          stroke={p.primary} strokeWidth="0.5"
          opacity={isActive ? 0.5 : 0.15} />
      );

      // Active hex inner glow
      if (isActive) {
        els.push(
          <circle key={`hexglow_${row}_${col}`} cx={cx} cy={cy} r={hexSize * 0.4}
            fill={p.accent} opacity="0.15" />
        );
      }
    }
  }

  // Connection lines between active hexes
  const activeHexes = centers.filter(c => c.active);
  for (let i = 0; i < activeHexes.length - 1; i++) {
    const a = activeHexes[i];
    const b = activeHexes[i + 1];
    const dist = Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
    if (dist < hexSize * 4) {
      els.push(
        <line key={`conn_${i}`}
          x1={a.x} y1={a.y} x2={b.x} y2={b.y}
          stroke={p.accent} strokeWidth="0.8" opacity="0.2" />
      );
    }
  }

  // Central hive node
  const hcx = w * 0.5;
  const hcy = h * 0.5;
  els.push(
    <circle key="hivecore" cx={hcx} cy={hcy} r={hexSize * 0.8}
      fill={p.accent + '22'} stroke={p.accent} strokeWidth="1" opacity="0.5" />,
    <circle key="hivecenter" cx={hcx} cy={hcy} r={hexSize * 0.3}
      fill={p.highlight} opacity="0.35" />,
  );

  return <>{els}</>;
}

// ── ASTROMANCERS: Star field, constellations, nebula wisps ──

function renderStars(w: number, h: number, p: Palette, r: RFn, detail: number, uid: string) {
  const els: React.ReactNode[] = [];

  // Deep space nebula clouds
  for (let i = 0; i < 3; i++) {
    els.push(
      <ellipse key={`nebula${i}`}
        cx={r(i * 5 + 100) * w} cy={r(i * 5 + 101) * h}
        rx={15 + r(i * 5 + 102) * 20} ry={10 + r(i * 5 + 103) * 12}
        fill={i % 2 === 0 ? p.primary : p.secondary}
        opacity={0.06 + r(i * 5 + 104) * 0.06}
        transform={`rotate(${r(i + 110) * 60}, ${r(i * 5 + 100) * w}, ${r(i * 5 + 101) * h})`} />
    );
  }

  // Background dim stars
  for (let i = 0; i < 20 + detail * 5; i++) {
    const sx = r(i * 2 + 50) * w;
    const sy = r(i * 2 + 51) * h;
    const size = 0.3 + r(i + 60) * 0.8;
    els.push(
      <circle key={`dimstar${i}`} cx={sx} cy={sy} r={size}
        fill={p.accent} opacity={0.1 + r(i + 70) * 0.2} />
    );
  }

  // Bright named stars
  const starCount = 6 + detail * 3;
  const starPositions: { x: number; y: number }[] = [];
  for (let i = 0; i < starCount; i++) {
    const sx = r(i * 3) * w;
    const sy = r(i * 3 + 1) * h;
    const size = 1 + r(i * 3 + 2) * 2.5;
    const brightness = 0.3 + r(i + 20) * 0.6;
    starPositions.push({ x: sx, y: sy });

    // Star glow
    els.push(
      <circle key={`starglow${i}`} cx={sx} cy={sy} r={size * 3}
        fill={p.glow} opacity={brightness * 0.12} />
    );
    // 4-point sparkle
    els.push(
      <path key={`star${i}`}
        d={`M ${sx} ${sy - size * 2} L ${sx + size * 0.4} ${sy} L ${sx} ${sy + size * 2} L ${sx - size * 0.4} ${sy} Z
            M ${sx - size * 2} ${sy} L ${sx} ${sy + size * 0.4} L ${sx + size * 2} ${sy} L ${sx} ${sy - size * 0.4} Z`}
        fill={p.accent} opacity={brightness}
      />
    );
  }

  // Constellation lines
  for (let i = 0; i < Math.min(starPositions.length - 1, 4 + detail * 2); i++) {
    const a = starPositions[i];
    const b = starPositions[i + 1];
    els.push(
      <line key={`const${i}`}
        x1={a.x} y1={a.y} x2={b.x} y2={b.y}
        stroke={p.primary} strokeWidth="0.5" opacity="0.2"
        strokeDasharray="2,2" />
    );
  }

  // Shooting star / comet trail
  if (detail >= 2) {
    const csx = r(80) * w * 0.3;
    const csy = r(81) * h * 0.3;
    const cex = csx + w * 0.5;
    const cey = csy + h * 0.4;
    els.push(
      <line key="comet"
        x1={csx} y1={csy} x2={cex} y2={cey}
        stroke={p.highlight} strokeWidth="1" opacity="0.25" strokeLinecap="round" />,
      <circle key="comethead" cx={cex} cy={cey} r={1.5} fill={p.highlight} opacity="0.6" />,
    );
  }

  return <>{els}</>;
}

// ── CHRONOBOUND: Clockwork mechanisms, time spirals, sand ──

function renderClockwork(w: number, h: number, p: Palette, r: RFn, detail: number, uid: string) {
  const els: React.ReactNode[] = [];
  const cx = w * (0.35 + r(80) * 0.3);
  const cy = h * (0.35 + r(81) * 0.3);
  const mainR = Math.min(w, h) * (0.3 + detail * 0.05);

  // Background time distortion rings
  for (let i = 0; i < 3; i++) {
    els.push(
      <circle key={`timering${i}`}
        cx={cx + (r(i + 90) - 0.5) * 10} cy={cy + (r(i + 91) - 0.5) * 6}
        r={mainR + 3 + i * 4}
        fill="none" stroke={p.primary} strokeWidth="0.3"
        opacity={0.08 + r(i + 92) * 0.06}
        strokeDasharray={`${2 + i},${3 + i * 2}`} />
    );
  }

  // Clock face glow
  els.push(
    <circle key="faceglow" cx={cx} cy={cy} r={mainR * 1.3}
      fill={p.glow} opacity="0.08" />
  );

  // Outer clock ring
  els.push(
    <circle key="outerring" cx={cx} cy={cy} r={mainR}
      fill="none" stroke={p.primary} strokeWidth="1.5" opacity="0.5" />
  );
  // Inner ring
  els.push(
    <circle key="innerring" cx={cx} cy={cy} r={mainR * 0.75}
      fill="none" stroke={p.secondary} strokeWidth="0.5" opacity="0.3" />
  );

  // Hour marks with varying length
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const isQuarter = i % 3 === 0;
    const inner = mainR * (isQuarter ? 0.7 : 0.8);
    const outer = mainR * 0.95;
    els.push(
      <line key={`hm${i}`}
        x1={cx + Math.cos(angle) * inner} y1={cy + Math.sin(angle) * inner}
        x2={cx + Math.cos(angle) * outer} y2={cy + Math.sin(angle) * outer}
        stroke={isQuarter ? p.accent : p.primary} strokeWidth={isQuarter ? 1.5 : 0.8} opacity="0.5"
        strokeLinecap="round" />
    );
  }

  // Roman numeral indicators at quarters
  const numerals = ['XII', 'III', 'VI', 'IX'];
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 - Math.PI / 2;
    const nx = cx + Math.cos(angle) * mainR * 0.55;
    const ny = cy + Math.sin(angle) * mainR * 0.55;
    els.push(
      <text key={`num${i}`} x={nx} y={ny}
        fill={p.accent} fontSize={mainR * 0.18} fontFamily="serif"
        textAnchor="middle" dominantBaseline="central" opacity="0.4">
        {numerals[i]}
      </text>
    );
  }

  // Clock hands
  const handAngle1 = r(0) * Math.PI * 2 - Math.PI / 2;
  const handAngle2 = r(1) * Math.PI * 2 - Math.PI / 2;
  const handAngle3 = r(2) * Math.PI * 2 - Math.PI / 2;

  // Hour hand (short, thick)
  els.push(
    <line key="hourhand"
      x1={cx} y1={cy}
      x2={cx + Math.cos(handAngle1) * mainR * 0.45} y2={cy + Math.sin(handAngle1) * mainR * 0.45}
      stroke={p.accent} strokeWidth="2" opacity="0.6" strokeLinecap="round" />
  );
  // Minute hand (long, medium)
  els.push(
    <line key="minhand"
      x1={cx} y1={cy}
      x2={cx + Math.cos(handAngle2) * mainR * 0.7} y2={cy + Math.sin(handAngle2) * mainR * 0.7}
      stroke={p.primary} strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
  );
  // Second hand (thin)
  if (detail >= 2) {
    els.push(
      <line key="sechand"
        x1={cx - Math.cos(handAngle3) * mainR * 0.15} y1={cy - Math.sin(handAngle3) * mainR * 0.15}
        x2={cx + Math.cos(handAngle3) * mainR * 0.8} y2={cy + Math.sin(handAngle3) * mainR * 0.8}
        stroke={p.highlight} strokeWidth="0.5" opacity="0.4" strokeLinecap="round" />
    );
  }

  // Center pin
  els.push(
    <circle key="pin" cx={cx} cy={cy} r={2} fill={p.highlight} opacity="0.5" />,
    <circle key="pininner" cx={cx} cy={cy} r={0.8} fill={p.accent} opacity="0.7" />,
  );

  // Floating sand/time particles
  for (let i = 0; i < 6 + detail * 2; i++) {
    const px = r(i * 3 + 40) * w;
    const py = r(i * 3 + 41) * h;
    els.push(
      <circle key={`sand${i}`} cx={px} cy={py}
        r={0.4 + r(i * 3 + 42) * 0.8}
        fill={p.accent} opacity={0.15 + r(i + 50) * 0.25} />
    );
  }

  // Spiral time-warp arcs
  if (detail >= 2) {
    for (let i = 0; i < 2; i++) {
      const spiralR = mainR * (1.2 + i * 0.3);
      const startAngle = r(i + 70) * Math.PI * 2;
      const arcLen = Math.PI * (0.5 + r(i + 72) * 0.8);
      const sx = cx + Math.cos(startAngle) * spiralR;
      const sy = cy + Math.sin(startAngle) * spiralR;
      const ex = cx + Math.cos(startAngle + arcLen) * spiralR;
      const ey = cy + Math.sin(startAngle + arcLen) * spiralR;
      els.push(
        <path key={`spiral${i}`}
          d={`M ${sx} ${sy} A ${spiralR} ${spiralR} 0 0 1 ${ex} ${ey}`}
          fill="none" stroke={p.primary} strokeWidth="0.5" opacity="0.15"
          strokeDasharray="1,2" />
      );
    }
  }

  return <>{els}</>;
}

// ── NEUTRAL: Abstract geometric patterns ──

function renderGeometric(w: number, h: number, p: Palette, r: RFn, detail: number, uid: string) {
  const els: React.ReactNode[] = [];

  // Background grid lines
  for (let i = 0; i < 4; i++) {
    const x = r(i + 100) * w;
    const y = r(i + 110) * h;
    els.push(
      <line key={`gridv${i}`} x1={x} y1={0} x2={x} y2={h}
        stroke={p.primary} strokeWidth="0.3" opacity="0.08" />,
      <line key={`gridh${i}`} x1={0} y1={y} x2={w} y2={y}
        stroke={p.primary} strokeWidth="0.3" opacity="0.08" />,
    );
  }

  // Layered geometric shapes
  const shapeCount = 4 + detail * 2;
  for (let i = 0; i < shapeCount; i++) {
    const cx = r(i * 5) * w * 0.8 + w * 0.1;
    const cy = r(i * 5 + 1) * h * 0.8 + h * 0.1;
    const size = 4 + r(i * 5 + 2) * (8 + detail * 3);
    const rotation = r(i * 5 + 3) * 360;
    const shapeType = Math.floor(r(i * 5 + 4) * 3);

    const color = i % 3 === 0 ? p.primary : i % 3 === 1 ? p.secondary : p.accent;

    if (shapeType === 0) {
      // Rotated square
      els.push(
        <rect key={`shape${i}`} x={cx - size / 2} y={cy - size / 2} width={size} height={size}
          fill={color + '18'} stroke={color} strokeWidth="0.8" opacity="0.45"
          transform={`rotate(${rotation}, ${cx}, ${cy})`} rx="1" />
      );
    } else if (shapeType === 1) {
      // Triangle
      const pts = `${cx},${cy - size * 0.7} ${cx + size * 0.6},${cy + size * 0.4} ${cx - size * 0.6},${cy + size * 0.4}`;
      els.push(
        <polygon key={`shape${i}`} points={pts}
          fill={color + '15'} stroke={color} strokeWidth="0.8" opacity="0.45"
          transform={`rotate(${rotation}, ${cx}, ${cy})`} />
      );
    } else {
      // Circle
      els.push(
        <circle key={`shape${i}`} cx={cx} cy={cy} r={size / 2}
          fill={color + '12'} stroke={color} strokeWidth="0.8" opacity="0.4" />
      );
    }
  }

  // Central intersecting circles (Venn-like)
  els.push(
    <circle key="venn1" cx={w * 0.42} cy={h * 0.48} r={8}
      fill="none" stroke={p.accent} strokeWidth="0.5" opacity="0.2" />,
    <circle key="venn2" cx={w * 0.58} cy={h * 0.48} r={8}
      fill="none" stroke={p.primary} strokeWidth="0.5" opacity="0.2" />,
    <circle key="venn3" cx={w * 0.5} cy={h * 0.38} r={8}
      fill="none" stroke={p.highlight} strokeWidth="0.5" opacity="0.15" />,
  );

  return <>{els}</>;
}

// ── Spell and Structure overlays ──

function renderSpellOverlay(w: number, h: number, p: Palette, r: RFn) {
  const cx = w / 2;
  const cy = h / 2;
  const size = Math.min(w, h) * 0.3;

  return (
    <>
      {/* Magic circle outer ring */}
      <circle cx={cx} cy={cy} r={size}
        fill="none" stroke={p.accent} strokeWidth="1" opacity="0.35"
        strokeDasharray="3,2" />
      {/* Inner ring */}
      <circle cx={cx} cy={cy} r={size * 0.65}
        fill="none" stroke={p.highlight} strokeWidth="0.5" opacity="0.25" />
      {/* Arcane symbol - pentagram star */}
      {Array.from({ length: 5 }, (_, i) => {
        const a1 = (i / 5) * Math.PI * 2 - Math.PI / 2;
        const a2 = ((i + 2) / 5) * Math.PI * 2 - Math.PI / 2;
        return (
          <line key={`pent${i}`}
            x1={cx + Math.cos(a1) * size * 0.65} y1={cy + Math.sin(a1) * size * 0.65}
            x2={cx + Math.cos(a2) * size * 0.65} y2={cy + Math.sin(a2) * size * 0.65}
            stroke={p.accent} strokeWidth="0.5" opacity="0.3" />
        );
      })}
      {/* Center dot */}
      <circle cx={cx} cy={cy} r={1.5} fill={p.highlight} opacity="0.5" />
    </>
  );
}

function renderStructureOverlay(w: number, h: number, p: Palette, r: RFn) {
  const cx = w / 2;
  const cy = h / 2;
  const s = Math.min(w, h) * 0.25;

  return (
    <>
      {/* Stone block frame */}
      <rect x={cx - s} y={cy - s * 0.7} width={s * 2} height={s * 1.4}
        fill="none" stroke={p.accent} strokeWidth="1.2" opacity="0.3" rx="2" />
      {/* Pillars */}
      <rect x={cx - s + 1} y={cy - s * 0.7} width={3} height={s * 1.4}
        fill={p.primary} opacity="0.15" />
      <rect x={cx + s - 4} y={cy - s * 0.7} width={3} height={s * 1.4}
        fill={p.primary} opacity="0.15" />
      {/* Capstone */}
      <polygon
        points={`${cx - s - 2},${cy - s * 0.7} ${cx},${cy - s * 1.1} ${cx + s + 2},${cy - s * 0.7}`}
        fill={p.accent + '15'} stroke={p.accent} strokeWidth="0.8" opacity="0.3" />
      {/* Foundation line */}
      <line x1={cx - s - 2} y1={cy + s * 0.7} x2={cx + s + 2} y2={cy + s * 0.7}
        stroke={p.primary} strokeWidth="1" opacity="0.2" />
    </>
  );
}
