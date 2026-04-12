import React, { useRef, useEffect } from 'react';
import type { MapNode } from '../types';

interface MapViewProps {
  map: MapNode[][];
  currentNodeId: string;
  onSelectNode: (nodeId: string) => void;
  act: number;
}

const ACT_TITLES: Record<number, string> = {
  1: 'The Outer Forge',
  2: 'The Void Depths',
  3: 'The Star Core',
};

type MapNodeType = MapNode['type'];

const NODE_COLORS: Record<MapNodeType, string> = {
  COMBAT: '#e63946',
  ELITE: '#ff8c00',
  BOSS: '#cc0000',
  REST: '#2ecc71',
  SHOP: '#f1c40f',
  TREASURE: '#ffd700',
  FORGE: '#ff6b35',
};

// Icons per node type — crossed swords, flame, skull, campfire leaf, money bag, chest
const NODE_ICONS: Record<MapNodeType, string> = {
  COMBAT: '\u2694',
  ELITE: '\uD83D\uDD25',
  BOSS: '\uD83D\uDC80',
  REST: '\uD83C\uDF43',
  SHOP: '\uD83D\uDCB0',
  TREASURE: '\uD83D\uDCE6',
  FORGE: '\uD83D\uDD28',
};

const NODE_LABELS: Record<MapNodeType, string> = {
  COMBAT: 'Combat',
  ELITE: 'Elite',
  BOSS: 'Boss',
  REST: 'Rest Site',
  SHOP: 'Shop',
  TREASURE: 'Treasure',
  FORGE: 'Forge',
};

const PULSE_KEYFRAMES = `
@keyframes dungeonNodePulse {
  0%, 100% { filter: drop-shadow(0 0 4px rgba(255,255,255,0.4)); }
  50% { filter: drop-shadow(0 0 14px rgba(255,255,255,0.95)); }
}
`;

const MapView: React.FC<MapViewProps> = ({ map, currentNodeId, onSelectNode, act }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNodeId, setHoveredNodeId] = React.useState<string | null>(null);

  const totalRows = map.length;
  const rowHeight = 70;
  const svgHeight = Math.max(600, totalRows * rowHeight + 80);
  const svgWidth = 360;

  // Auto-scroll to show the current node's row
  useEffect(() => {
    if (!containerRef.current) return;
    let currentRow = -1;
    for (let r = 0; r < map.length; r++) {
      if (map[r].some((n) => n.id === currentNodeId)) {
        currentRow = r;
        break;
      }
    }
    if (currentRow >= 0) {
      // Row 0 is at the bottom, so visual Y is inverted
      const visualY = svgHeight - 40 - currentRow * rowHeight;
      const containerHeight = containerRef.current.clientHeight;
      const scrollTarget = visualY - containerHeight / 2;
      containerRef.current.scrollTo({ top: scrollTarget, behavior: 'smooth' });
    }
  }, [currentNodeId, map, svgHeight]);

  const getNodePosition = (row: number, col: number, rowLength: number) => {
    const spacing = svgWidth / (rowLength + 1);
    const x = spacing * (col + 1);
    // Row 0 at the bottom, highest row (boss) at the top
    const y = svgHeight - 40 - row * rowHeight;
    return { x, y };
  };

  const getNodeStyle = (
    node: MapNode
  ): { opacity: number; glow: boolean; pulse: boolean; size: number } => {
    const isCurrent = node.id === currentNodeId;
    // Boss nodes are 50px diameter (radius 25), others 30px diameter (radius 15)
    const size = node.type === 'BOSS' ? 25 : 15;

    if (node.completed) {
      return { opacity: 0.3, glow: false, pulse: false, size };
    }
    if (isCurrent) {
      return { opacity: 1, glow: true, pulse: false, size };
    }
    if (node.accessible) {
      return { opacity: 1, glow: false, pulse: true, size };
    }
    return { opacity: 0.5, glow: false, pulse: false, size };
  };

  // Build a lookup of node positions by id
  const nodePositions: Record<string, { x: number; y: number }> = {};
  for (let r = 0; r < map.length; r++) {
    const row = map[r];
    for (let c = 0; c < row.length; c++) {
      nodePositions[row[c].id] = getNodePosition(r, c, row.length);
    }
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(180deg, #0a0a1a 0%, #0d1b2a 50%, #1b0a2e 100%)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{PULSE_KEYFRAMES}</style>

      {/* Act title */}
      <div
        style={{
          textAlign: 'center',
          padding: '12px 0 8px',
          fontFamily: 'serif',
          fontSize: '20px',
          fontWeight: 'bold',
          color: '#e0d6c2',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          textShadow: '0 0 10px rgba(255,200,100,0.4)',
          flexShrink: 0,
        }}
      >
        Act {act} &mdash; {ACT_TITLES[act] || 'Unknown'}
      </div>

      {/* Scrollable map container */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          position: 'relative',
        }}
      >
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ display: 'block', margin: '0 auto' }}
        >
          {/* SVG filter for glow effect */}
          <defs>
            <filter id="currentGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Connection lines between nodes and their children */}
          {map.map((row) =>
            row.map((node) =>
              node.connections.map((childId) => {
                const from = nodePositions[node.id];
                const to = nodePositions[childId];
                if (!from || !to) return null;

                const completed = node.completed;
                return (
                  <line
                    key={`${node.id}-${childId}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={completed ? '#333' : '#555'}
                    strokeWidth={completed ? 1 : 2}
                    strokeDasharray={completed ? '4,4' : 'none'}
                    opacity={completed ? 0.3 : 0.6}
                  />
                );
              })
            )
          )}

          {/* Nodes */}
          {map.map((row) =>
            row.map((node) => {
              const pos = nodePositions[node.id];
              if (!pos) return null;
              const style = getNodeStyle(node);
              const color = NODE_COLORS[node.type];
              const icon = NODE_ICONS[node.type];
              const isCurrent = node.id === currentNodeId;
              const isHovered = hoveredNodeId === node.id;

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  opacity={style.opacity}
                  style={{
                    cursor: node.accessible ? 'pointer' : 'default',
                    animation: style.pulse
                      ? 'dungeonNodePulse 1.5s ease-in-out infinite'
                      : 'none',
                  }}
                  onClick={() => {
                    if (node.accessible) {
                      onSelectNode(node.id);
                    }
                  }}
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                >
                  {/* Bright white glow ring for current node */}
                  {style.glow && (
                    <circle
                      r={style.size + 8}
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth={2}
                      opacity={0.6}
                      filter="url(#currentGlow)"
                    />
                  )}

                  {/* Node circle background */}
                  <circle
                    r={style.size}
                    fill={`${color}33`}
                    stroke={isCurrent ? '#ffffff' : color}
                    strokeWidth={isCurrent ? 3 : 2}
                  />

                  {/* Icon */}
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={node.type === 'BOSS' ? 22 : 14}
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {icon}
                  </text>

                  {/* Tooltip on hover */}
                  {isHovered && (
                    <g>
                      <rect
                        x={-40}
                        y={-style.size - 30}
                        width={80}
                        height={22}
                        rx={4}
                        fill="rgba(0,0,0,0.85)"
                        stroke="#666"
                        strokeWidth={1}
                      />
                      <text
                        x={0}
                        y={-style.size - 16}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize={11}
                        fontFamily="sans-serif"
                        style={{ pointerEvents: 'none' }}
                      >
                        {NODE_LABELS[node.type]}
                      </text>
                    </g>
                  )}
                </g>
              );
            })
          )}
        </svg>
      </div>
    </div>
  );
};

export default MapView;
