import React, { useState } from 'react';
import type { ActMap, MapNode, NodeType } from '../types';
import { useDungeonRun } from '../context/DungeonRunContext';
import { getAvailableNodes } from '../engine/mapgen';

// ─── Layout constants ─────────────────────────────────────────────────────────

const MAP_W = 820;
const MAP_H = 300;
const ROW_X = [58, 145, 232, 319, 406, 493, 580, 667, 762];
const LANE_Y = [70, 150, 230];
const R = 23;   // node radius

// ─── Theme ────────────────────────────────────────────────────────────────────

const NODE_COLOR: Record<NodeType, string> = {
  combat:   '#3b8fff',
  elite:    '#ff8c00',
  boss:     '#ff2255',
  rest:     '#22c46e',
  shop:     '#c89b3c',
  treasure: '#a855f7',
  event:    '#2dd4bf',
};

const NODE_EMOJI: Record<NodeType, string> = {
  combat:   '⚔',
  elite:    '💀',
  boss:     '👑',
  rest:     '⛺',
  shop:     '🛒',
  treasure: '💎',
  event:    '?',
};

const NODE_LABEL: Record<NodeType, string> = {
  combat:   'Combat',
  elite:    'Elite',
  boss:     'BOSS',
  rest:     'Rest',
  shop:     'Shop',
  treasure: 'Chest',
  event:    'Event',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface NodeProps {
  node: MapNode;
  x: number;
  y: number;
  state: 'current' | 'available' | 'visited' | 'future';
  hovered: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onClick: () => void;
}

const MapNodeCircle: React.FC<NodeProps> = ({
  node, x, y, state, hovered, onEnter, onLeave, onClick,
}) => {
  const color = NODE_COLOR[node.type];
  const isInteractive = state === 'available';
  const isCurrent = state === 'current';
  const isVisited = state === 'visited';
  const isFuture = state === 'future';

  const fillAlpha = isVisited ? '18' : isFuture ? '0a' : isCurrent ? '44' : hovered ? '55' : '33';
  const strokeAlpha = isVisited ? '44' : isFuture ? '28' : '';
  const opacity = isFuture ? 0.35 : isVisited ? 0.5 : 1;
  const strokeWidth = isCurrent ? 2.5 : hovered && isInteractive ? 3 : 1.5;
  const nodeRadius = hovered && isInteractive ? R + 4 : isCurrent ? R + 2 : R;
  const glowFilter = isCurrent ? 'url(#glow-current)' : isInteractive && hovered ? 'url(#glow-available)' : undefined;

  const strokeColor = isVisited
    ? `${color}66`
    : isFuture
    ? `${color}44`
    : isInteractive && hovered
    ? color
    : `${color}${strokeAlpha || 'cc'}`;

  return (
    <g
      transform={`translate(${x},${y})`}
      style={{ cursor: isInteractive ? 'pointer' : 'default' }}
      onClick={isInteractive ? onClick : undefined}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <circle r={R + 14} fill="transparent" />

      {/* Outer pulse ring for current node */}
      {isCurrent && (
        <circle r={R + 7} fill="none" stroke={color} strokeWidth="1" opacity="0.4">
          <animate attributeName="r" values={`${R + 4};${R + 10};${R + 4}`} dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2.4s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Node body */}
      <circle
        r={nodeRadius}
        fill={`${color}${fillAlpha}`}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        opacity={opacity}
        filter={glowFilter}
        style={{ transition: 'r 120ms ease, stroke-width 120ms ease, fill 120ms ease' }}
      />

      {/* Emoji */}
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={isCurrent ? 15 : 13}
        opacity={isFuture ? 0.4 : isVisited ? 0.55 : 1}
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {NODE_EMOJI[node.type]}
      </text>

      {/* Label below node */}
      <text
        y={R + 12}
        textAnchor="middle"
        dominantBaseline="hanging"
        fontSize={8}
        fill={isVisited ? '#666' : isFuture ? '#444' : color}
        letterSpacing="0.08em"
        style={{ pointerEvents: 'none', userSelect: 'none', textTransform: 'uppercase' }}
      >
        {NODE_LABEL[node.type]}
      </text>
    </g>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nodePos(row: number, col: number): { x: number; y: number } {
  return { x: ROW_X[row] ?? ROW_X[0], y: LANE_Y[col] ?? LANE_Y[1] };
}

function nodeState(
  node: MapNode,
  currentId: string | null,
  availableIds: Set<string>,
): 'current' | 'available' | 'visited' | 'future' {
  if (node.id === currentId) return 'current';
  if (availableIds.has(node.id)) return 'available';
  if (node.visited) return 'visited';
  return 'future';
}

// ─── MapView ──────────────────────────────────────────────────────────────────

interface MapViewProps {
  /** Override the act map (defaults to the context's current act map). */
  map?: ActMap;
}

export const MapView: React.FC<MapViewProps> = ({ map: mapProp }) => {
  const { runState, travelToNode } = useDungeonRun();
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const map: ActMap | null =
    mapProp ??
    (runState ? runState.actMaps[runState.currentAct - 1] : null);

  if (!map) return null;

  const availableNodes = getAvailableNodes(map, map.currentNodeId);
  const availableIds = new Set(availableNodes.map((n) => n.id));
  const nodeById = new Map(map.nodes.map((n) => [n.id, n]));

  const s: Record<string, React.CSSProperties> = {
    wrapper: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      width: '100%',
      overflowY: 'auto',
      overflowX: 'auto',
      padding: '0.25rem 0 1rem',
    },
    actLabel: {
          fontSize: '0.7rem',
      letterSpacing: '0.3em',
      opacity: 0.4,
      textTransform: 'uppercase',
      marginBottom: '0.5rem',
      textAlign: 'center',
    },
    legendRow: {
      display: 'flex',
      gap: '0.8rem',
      flexWrap: 'wrap',
      justifyContent: 'center',
      marginTop: '0.75rem',
    },
    legendItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.3rem',
      fontSize: '0.65rem',
      opacity: 0.65,
    },
  };

  const LEGEND: { type: NodeType; label: string }[] = [
    { type: 'combat',   label: 'Combat'  },
    { type: 'elite',    label: 'Elite'   },
    { type: 'rest',     label: 'Rest'    },
    { type: 'shop',     label: 'Shop'    },
    { type: 'treasure', label: 'Chest'   },
    { type: 'event',    label: 'Event'   },
    { type: 'boss',     label: 'Boss'    },
  ];

  return (
    <div style={s.wrapper}>
      <div style={s.actLabel}>Act {map.actNumber} — Choose your path</div>

      <svg
        viewBox={`0 0 ${MAP_W} ${MAP_H}`}
        width="100%"
        style={{ width: 'min(96vw, 1500px)', minWidth: 980, maxWidth: 1500, display: 'block', margin: '0 auto' }}
        aria-label="Dungeon map"
      >
        <defs>
          {/* Glow filters */}
          <filter id="glow-current" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-available" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Background ──────────────────────────────────────────────────── */}
        <rect width={MAP_W} height={MAP_H} fill="#08081a" rx="8" />

        {/* Subtle lane guide lines */}
        {LANE_Y.map((cy) => (
          <line
            key={cy}
            x1={ROW_X[0]} y1={cy}
            x2={ROW_X[ROW_X.length - 1]} y2={cy}
            stroke="#ffffff08"
            strokeWidth="1"
            strokeDasharray="5,10"
          />
        ))}

        {/* ── Edges ───────────────────────────────────────────────────────── */}
        {map.nodes.map((src) => {
          const sp = nodePos(src.row, src.col);
          return src.connections.map((tgtId) => {
            const tgt = nodeById.get(tgtId);
            if (!tgt) return null;
            const tp = nodePos(tgt.row, tgt.col);
            const isActive = availableIds.has(tgtId) && src.id === map.currentNodeId;
            const isOld = src.visited && tgt.visited;
            return (
              <line
                key={`${src.id}-${tgtId}`}
                x1={sp.x + R + 1} y1={sp.y}
                x2={tp.x - R - 1} y2={tp.y}
                stroke={isOld ? '#ffffff18' : isActive ? '#ffffff50' : '#ffffff14'}
                strokeWidth={isActive ? 1.5 : 1}
                strokeDasharray={isActive ? undefined : '4,5'}
              />
            );
          });
        })}

        {/* ── Nodes ───────────────────────────────────────────────────────── */}
        {map.nodes.map((node) => {
          const { x, y } = nodePos(node.row, node.col);
          const ns = nodeState(node, map.currentNodeId, availableIds);
          return (
            <MapNodeCircle
              key={node.id}
              node={node}
              x={x}
              y={y}
              state={ns}
              hovered={hoveredId === node.id}
              onEnter={() => setHoveredId(node.id)}
              onLeave={() => setHoveredId(null)}
              onClick={() => travelToNode(node.id)}
            />
          );
        })}
      </svg>

      {/* Legend */}
      <div style={s.legendRow}>
        {LEGEND.map(({ type, label }) => (
          <div key={type} style={s.legendItem}>
            <svg width="10" height="10">
              <circle cx="5" cy="5" r="4" fill={`${NODE_COLOR[type]}55`} stroke={NODE_COLOR[type]} strokeWidth="1" />
            </svg>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
