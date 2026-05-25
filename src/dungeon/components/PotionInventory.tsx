import React, { useEffect, useRef, useState } from 'react';
import type { PotionDefinition, PotionInstance, PotionRarity } from '../types';
import { getPotionDef } from '../data/potions';

const RARITY_COLOR: Record<PotionRarity, string> = {
  common:   '#aaaaaa',
  uncommon: '#3b8fff',
  rare:     '#ffcc00',
};

const POTION_EMOJI: Record<string, string> = {
  block_draught:       '🧪',
  swift_brew:          '💨',
  surge_vial:          '⚡',
  kindling_flask:      '🔥',
  focus_tincture:      '💪',
  stoneblood_elixir:   '🛡',
  cleansing_draft:     '✨',
  forgefire_flask:     '🌋',
  lumen_infusion:      '☀',
  wyrmfire_breath:     '🐉',
  aegis_mixture:       '🔰',
  tacticians_brew:     '🃏',
  phoenix_vial:        '🔆',
  chronoshift_philter: '⏳',
};

export interface PotionInventoryProps {
  slots: (PotionInstance | null)[];
  /** Click handler for a filled slot. Slot index 0–2. */
  onUse: (slotIndex: number) => void;
  /** Optional: hold-to-discard handler (not wired in Phase 2 minimum). */
  onDiscard?: (slotIndex: number) => void;
  /** Disable click handlers (enemy turn, mid-resolution, combat over). */
  disabled?: boolean;
  /** Compact size for HUD placement. */
  compact?: boolean;
}

const SLOT_W_FULL = 30;
const SLOT_H_FULL = 40;
const SLOT_W_COMPACT = 26;
const SLOT_H_COMPACT = 34;

interface PotionTooltipProps {
  def: PotionDefinition;
  x: number;
  y: number;
}

const PotionTooltip: React.FC<PotionTooltipProps> = ({ def, x, y }) => (
  <div
    style={{
      position: 'fixed',
      left: Math.min(x, typeof window !== 'undefined' ? window.innerWidth - 220 : 0),
      top: y,
      width: 200,
      padding: '8px 10px',
      background: '#0d0d1e',
      border: `1px solid ${RARITY_COLOR[def.rarity]}88`,
      borderRadius: 6,
      boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
      pointerEvents: 'none',
      zIndex: 999,
    }}
  >
    <div
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: RARITY_COLOR[def.rarity],
        letterSpacing: '0.04em',
        marginBottom: 2,
      }}
    >
      {def.name}
    </div>
    <div
      style={{
        fontSize: 8,
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: '#888',
        marginBottom: 5,
      }}
    >
      {def.rarity} · {def.category}
    </div>
    <div style={{ fontSize: 10, color: '#ddd', lineHeight: 1.4, marginBottom: 4 }}>
      {def.effect}
    </div>
    <div style={{ fontSize: 9, fontStyle: 'italic', color: '#888', lineHeight: 1.35 }}>
      "{def.flavorText}"
    </div>
  </div>
);

export const PotionInventory: React.FC<PotionInventoryProps> = ({
  slots,
  onUse,
  disabled = false,
  compact = false,
}) => {
  const [hovered, setHovered] = useState<{ index: number; x: number; y: number } | null>(null);
  const w = compact ? SLOT_W_COMPACT : SLOT_W_FULL;
  const h = compact ? SLOT_H_COMPACT : SLOT_H_FULL;

  const padded: (PotionInstance | null)[] = [
    slots[0] ?? null,
    slots[1] ?? null,
    slots[2] ?? null,
  ];

  // Track slot transitions filled → null and play a one-shot "drain" key on
  // the affected slot. Re-keyed each transition so the CSS animation restarts.
  const prev = useRef<(string | null)[]>([null, null, null]);
  const [drainKey, setDrainKey] = useState<[number, number, number]>([0, 0, 0]);
  useEffect(() => {
    setDrainKey((cur) => {
      const next: [number, number, number] = [...cur];
      let changed = false;
      for (let i = 0; i < 3; i++) {
        const wasFilled = prev.current[i] !== null;
        const nowEmpty = padded[i] === null;
        if (wasFilled && nowEmpty) {
          next[i] = cur[i] + 1;
          changed = true;
        }
        prev.current[i] = padded[i]?.definitionId ?? null;
      }
      return changed ? next : cur;
    });
  }, [padded[0]?.definitionId, padded[1]?.definitionId, padded[2]?.definitionId]);
  const hoveredDef = hovered !== null
    ? (() => {
        const inst = padded[hovered.index];
        return inst ? getPotionDef(inst.definitionId) : null;
      })()
    : null;

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {padded.map((slot, i) => {
        const def = slot ? getPotionDef(slot.definitionId) : null;
        const color = def ? RARITY_COLOR[def.rarity] : '#3a3a4a';
        const filled = !!slot;
        const interactive = filled && !disabled;

        return (
          <button
            key={`${i}-${drainKey[i]}`}
            type="button"
            onClick={interactive ? () => onUse(i) : undefined}
            onMouseEnter={(e) => {
              if (!def) return;
              const r = e.currentTarget.getBoundingClientRect();
              setHovered({ index: i, x: r.right + 6, y: r.top });
            }}
            onMouseLeave={() => setHovered(null)}
            disabled={!interactive}
            title={def ? def.name : 'Empty potion slot'}
            aria-label={def ? `Drink ${def.name}` : 'Empty potion slot'}
            style={{
              width: w,
              height: h,
              padding: 0,
              border: `1px solid ${filled ? color : '#2a2a3a'}`,
              borderRadius: 4,
              cursor: interactive ? 'pointer' : 'default',
              background: filled
                ? `linear-gradient(180deg, ${color}33 0%, ${color}11 100%)`
                : 'rgba(8,8,20,0.55)',
              boxShadow: filled && interactive ? `0 0 8px ${color}55` : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: compact ? 14 : 16,
              opacity: filled ? (disabled ? 0.4 : 1) : 0.4,
              transition: 'box-shadow 100ms, opacity 100ms, background 100ms',
              position: 'relative',
              animation: !filled && drainKey[i] > 0 ? 'dungeonPotionDrain 380ms ease-out' : undefined,
            }}
          >
            {def ? (POTION_EMOJI[def.id] ?? '🧪') : '·'}

            {/* Bottle "neck" detail on filled slots — small notch at the top */}
            {filled && (
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: -3,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 6,
                  height: 4,
                  background: color,
                  borderRadius: '2px 2px 0 0',
                }}
              />
            )}
          </button>
        );
      })}

      {hoveredDef && hovered && (
        <PotionTooltip def={hoveredDef} x={hovered.x} y={hovered.y} />
      )}
    </div>
  );
};
