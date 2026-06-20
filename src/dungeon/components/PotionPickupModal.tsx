import React from 'react';
import type { PotionDefinition, PotionInstance, PotionRarity } from '../types';
import { getPotionDef } from '../data/potions';
import { getPotionArt } from '../assets/artRegistry';
import { TokenArt } from './TokenArt';

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

export interface PotionPickupModalProps {
  /** The potion the player just acquired. */
  incoming: PotionInstance;
  /** The current 3-slot inventory (any slot may be null but in practice all are filled here). */
  currentSlots: (PotionInstance | null)[];
  /** Player chose to discard the incoming potion (skip the pickup). */
  onDiscardIncoming: () => void;
  /**
   * Player chose to discard one of the existing inventory slots and take the
   * incoming potion in its place. Slot index 0–2.
   */
  onSwap: (slotIndex: number) => void;
}

interface BottleProps {
  def: PotionDefinition;
  label: string;
  onClick: () => void;
  badge?: string;
}

const PotionBottle: React.FC<BottleProps> = ({ def, label, onClick, badge }) => {
  const color = RARITY_COLOR[def.rarity];
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        padding: '12px 14px',
        width: 160,
        background: `linear-gradient(180deg, ${color}22 0%, ${color}08 100%)`,
        border: `1px solid ${color}88`,
        borderRadius: 8,
        cursor: 'pointer',
        boxShadow: `0 0 14px ${color}44`,
        color: '#eee',
        textAlign: 'left',
      }}
    >
      {badge && (
        <div
          style={{
            alignSelf: 'flex-start',
            fontSize: 7,
            letterSpacing: '0.25em',
            textTransform: 'uppercase',
            color: '#c89b3c',
            marginBottom: -4,
          }}
        >
          {badge}
        </div>
      )}
      <TokenArt
        src={getPotionArt(def.id)}
        fallback={POTION_EMOJI[def.id] ?? '🧪'}
        alt=""
        style={{ width: 42, height: 48, marginTop: 2 }}
        fallbackStyle={{ fontSize: 32, lineHeight: 1 }}
      />
      <div style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: '0.04em' }}>
        {def.name}
      </div>
      <div style={{ fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.55 }}>
        {def.rarity} · {def.category}
      </div>
      <div style={{ fontSize: 10, color: '#ddd', lineHeight: 1.35, minHeight: 28 }}>
        {def.effect}
      </div>
      <div style={{ fontSize: 8, fontStyle: 'italic', color: '#888', lineHeight: 1.3 }}>
        "{def.flavorText}"
      </div>
      <div
        style={{
          alignSelf: 'stretch',
          marginTop: 6,
          padding: '4px 0',
          textAlign: 'center',
          background: '#1a1a2e',
          color,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          borderRadius: 3,
        }}
      >
        {label}
      </div>
    </button>
  );
};

export const PotionPickupModal: React.FC<PotionPickupModalProps> = ({
  incoming,
  currentSlots,
  onDiscardIncoming,
  onSwap,
}) => {
  const incomingDef = getPotionDef(incoming.definitionId);
  if (!incomingDef) return null;

  return (
    <div
      role="dialog"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(0,0,0,0.78)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        padding: 24,
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: '#c89b3c',
          opacity: 0.7,
        }}
      >
        ▸ Potion Inventory Full
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#eee', textAlign: 'center', maxWidth: 480 }}>
        Pick one to discard, or skip the new potion entirely.
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', maxWidth: 720 }}>
        {/* 3 existing slots */}
        {currentSlots.map((slot, i) => {
          if (!slot) return null;
          const def = getPotionDef(slot.definitionId);
          if (!def) return null;
          return (
            <PotionBottle
              key={`slot-${i}`}
              def={def}
              label={`Discard slot ${i + 1}`}
              onClick={() => onSwap(i)}
              badge={`Slot ${i + 1}`}
            />
          );
        })}

        {/* The incoming potion (always shown last) */}
        <PotionBottle
          def={incomingDef}
          label="Skip this potion"
          onClick={onDiscardIncoming}
          badge="New drop"
        />
      </div>
    </div>
  );
};
