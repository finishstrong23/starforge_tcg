import React, { useState } from 'react';
import { useDungeonRun } from '../context/DungeonRunContext';
import { CardComponent } from './CardComponent';
import { RELIC_POOL } from '../data/relics';
import { createCardInstance, generateRewardOptions } from '../engine/draft';
import type { CardDefinition, RelicDefinition } from '../types';

function pickRandom<T>(arr: T[]): T | undefined {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined;
}

function generateRewardRelic(isBoss: boolean): RelicDefinition | undefined {
  const pool = isBoss
    ? RELIC_POOL.filter((r) => r.rarity === 'Boss')
    : RELIC_POOL.filter((r) => r.rarity === 'Rare' || r.rarity === 'Uncommon');
  return pickRandom(pool);
}

export const RewardView: React.FC = () => {
  const { runState, draftFaction, addCardToDeck, addRelic, returnToMap, advanceAct } = useDungeonRun();

  const act = runState?.currentAct ?? 1;
  const currentMap = runState?.actMaps[(runState?.currentAct ?? 1) - 1];
  const isBossReward = currentMap?.completed ?? false;
  const combatIndex = runState?.runStats.totalCombats ?? 0;
  const showRelic = isBossReward || combatIndex % 3 === 0;

  // Per-act room number for tier-weighted rewards: count of visited nodes in
  // the current act's map. Restarts each act per spec ("Act 2 room 1 is room
  // 1 for weighting, NOT room 14").
  const roomNumber = currentMap?.nodes.filter((n) => n.visited).length ?? 1;

  const [cardOptions] = useState<CardDefinition[]>(() =>
    generateRewardOptions(roomNumber, act as 1 | 2 | 3, draftFaction ?? undefined),
  );
  const [relicOffer] = useState<RelicDefinition | undefined>(() =>
    showRelic ? generateRewardRelic(isBossReward) : undefined,
  );
  const [picked, setPicked] = useState(false);
  const [relicTaken, setRelicTaken] = useState(false);

  const handleCardPick = (def: CardDefinition) => {
    addCardToDeck(createCardInstance(def));
    setPicked(true);
  };

  const handleRelicTake = (relic: RelicDefinition) => {
    addRelic(relic);
    setRelicTaken(true);
  };

  const handleContinue = () => {
    if (isBossReward && (runState?.currentAct ?? 1) < 3) {
      advanceAct();
    } else {
      returnToMap();
    }
  };

  const s: Record<string, React.CSSProperties> = {
    root: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 24,
      padding: '2rem 1rem',
      minHeight: '100%',
      background: 'radial-gradient(ellipse at top, #10101e 0%, #060610 100%)',
      color: '#f0f0f8',
    },
    title: {
      fontSize: '1.3rem',
      fontWeight: 700,
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      margin: 0,
    },
    subtitle: {
      fontSize: '0.7rem',
      opacity: 0.45,
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      marginTop: 4,
      textAlign: 'center',
    },
    sectionLabel: {
      fontSize: '0.65rem',
      letterSpacing: '0.25em',
      opacity: 0.4,
      textTransform: 'uppercase',
    },
    cardRow: {
      display: 'flex',
      gap: 16,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    relicBox: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '10px 16px',
      background: '#1a1020',
      border: '1px solid #a855f766',
      borderRadius: 8,
      cursor: relicTaken ? 'default' : 'pointer',
      opacity: relicTaken ? 0.45 : 1,
      maxWidth: 320,
      width: '100%',
    },
    relicArt: { fontSize: 28 },
    relicInfo: { display: 'flex', flexDirection: 'column', gap: 2 },
    relicName: { fontSize: 13, fontWeight: 700 },
    relicDesc: { fontSize: 10, opacity: 0.7, lineHeight: 1.4 },
    continueBtn: {
      padding: '10px 28px',
      background: 'linear-gradient(180deg, #3b8fff, #1a5fcc)',
      color: '#fff',
      border: '1px solid #3b8fff',
      borderRadius: 4,
      fontWeight: 700,
      fontSize: 11,
      letterSpacing: '0.15em',
      cursor: 'pointer',
      textTransform: 'uppercase',
      marginTop: 8,
    },
    skipBtn: {
      background: 'transparent',
      border: '1px solid #2a2a3a',
      color: '#666',
      padding: '6px 18px',
      borderRadius: 4,
      fontSize: 10,
      cursor: 'pointer',
      letterSpacing: '0.1em',
    },
  };

  const cardWrapperFn = (isPicked: boolean): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    cursor: isPicked ? 'default' : 'pointer',
    opacity: isPicked ? 0.4 : 1,
    transition: 'opacity 200ms',
  });

  return (
    <div style={s.root}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={s.title}>{isBossReward ? '👑 Boss Reward' : '⚔ Victory!'}</h2>
        <div style={s.subtitle}>
          {picked ? 'Card added to deck.' : 'Choose a card to add to your deck.'}
        </div>
      </div>

      {/* Card choices */}
      {!picked && (
        <>
          <div style={s.sectionLabel}>Pick one card</div>
          <div style={s.cardRow}>
            {cardOptions.map((def) => (
              <div
                key={def.id}
                style={cardWrapperFn(false)}
                onClick={() => handleCardPick(def)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCardPick(def); }}
              >
                <CardComponent card={createCardInstance(def)} selectable />
              </div>
            ))}
          </div>
          <button type="button" style={s.skipBtn} onClick={() => setPicked(true)}>
            Skip card
          </button>
        </>
      )}

      {picked && cardOptions.length > 0 && (
        <div style={s.cardRow}>
          {cardOptions.map((def) => (
            <div key={def.id} style={cardWrapperFn(true)}>
              <CardComponent card={createCardInstance(def)} />
            </div>
          ))}
        </div>
      )}

      {/* Relic offer */}
      {relicOffer && !relicTaken && (
        <>
          <div style={s.sectionLabel}>
            {isBossReward ? 'Boss Relic' : 'Relic Offer'}
          </div>
          <div
            style={s.relicBox}
            onClick={() => handleRelicTake(relicOffer)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRelicTake(relicOffer); }}
          >
            <span style={s.relicArt}>{relicOffer.art}</span>
            <div style={s.relicInfo}>
              <div style={s.relicName}>{relicOffer.name}</div>
              <div style={s.relicDesc}>{relicOffer.description}</div>
            </div>
          </div>
        </>
      )}

      {/* Continue */}
      {picked && (
        <button type="button" style={s.continueBtn} onClick={handleContinue}>
          {isBossReward && (runState?.currentAct ?? 1) < 3
            ? `Advance to Act ${(runState?.currentAct ?? 1) + 1}`
            : 'Return to Map'}
        </button>
      )}
    </div>
  );
};
