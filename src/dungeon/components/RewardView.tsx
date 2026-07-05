import React, { useState } from 'react';
import { useDungeonRun } from '../context/DungeonRunContext';
import { CardComponent } from './CardComponent';
import { PotionPickupModal } from './PotionPickupModal';
import { createCardInstance } from '../engine/draft';
import { getCardDefById, getRelicById } from '../engine/nodeRewards';
import { getPotionDef } from '../data/potions';
import { getPotionArt, getRelicArt } from '../assets/artRegistry';
import { TokenArt } from './TokenArt';
import type { CardDefinition } from '../types';
import { getDungeonSceneArt } from '../assets/basicTokenArt';

/**
 * Post-combat / treasure reward screen.
 *
 * Pure renderer: the reward bundle (gold, card options, relic, potion) is
 * rolled ONCE by the run reducer when the reward phase is entered, persisted
 * on RunState, and claimed through idempotent reducer actions. Refreshing
 * the page restores the identical bundle with claim flags intact — the old
 * mount-time Math.random rolls made F5 an infinite gold/reroll exploit.
 */
export const RewardView: React.FC = () => {
  const {
    runState,
    takeRewardCard, skipRewardCard, takeRewardRelic, takeRewardPotion, skipRewardPotion,
    returnToMap, advanceAct,
  } = useDungeonRun();

  const [pickupModalOpen, setPickupModalOpen] = useState(false);

  const reward = runState?.pendingReward ?? null;
  const isBossReward = reward?.isBossReward ?? false;
  const isElite = reward?.isElite ?? false;
  const isTreasure = reward?.isTreasure ?? false;

  const cardOptions = (reward?.cardOptionIds ?? [])
    .map((id) => getCardDefById(id))
    .filter((def): def is CardDefinition => Boolean(def));
  const relicOffer = reward?.relicId ? getRelicById(reward.relicId) : undefined;
  const potionOffer = reward?.potion ?? null;

  const picked = reward?.cardResolved ?? true;
  const relicTaken = reward?.relicTaken ?? true;
  const potionTaken = reward?.potionResolved ?? true;
  const goldGained = reward?.gold ?? 0;

  const handlePotionTake = () => {
    if (!runState || !potionOffer) return;
    const empty = runState.potions.findIndex((p) => p === null);
    if (empty === -1) {
      // Inventory full → open the pickup picker
      setPickupModalOpen(true);
      return;
    }
    takeRewardPotion();
  };

  const handlePotionSwap = (slotIndex: number) => {
    takeRewardPotion(slotIndex);
    setPickupModalOpen(false);
  };

  const handlePotionSkip = () => {
    skipRewardPotion();
    setPickupModalOpen(false);
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
      backgroundColor: '#060610',
      backgroundImage: [
        'linear-gradient(180deg, rgba(7,7,18,0.66), rgba(7,7,18,0.92))',
        `url("${getDungeonSceneArt('reward')}")`,
      ].join(', '),
      backgroundSize: 'cover, cover',
      backgroundPosition: 'center, center',
      backgroundRepeat: 'no-repeat',
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

  const title = isBossReward ? 'Boss Reward' : isTreasure ? 'Treasure' : 'Victory';

  return (
    <div style={s.root}>
      <div style={{ textAlign: 'center' }}>
        <h2 style={s.title}>{title}</h2>
        <div style={s.subtitle}>
          {picked ? 'Card added to deck.' : 'Choose a card to add to your deck.'}
        </div>
        {goldGained > 0 && (
          <div style={{ marginTop: 6, color: '#f0d060', fontWeight: 700, fontSize: 14 }}>
            +{goldGained}g
          </div>
        )}
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
                onClick={() => takeRewardCard(def.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') takeRewardCard(def.id); }}
              >
                <CardComponent card={createCardInstance(def)} selectable />
              </div>
            ))}
          </div>
          <button type="button" style={s.skipBtn} onClick={skipRewardCard}>
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
            {isBossReward ? 'Boss Relic' : isTreasure ? 'Chest Relic' : 'Relic Offer'}
          </div>
          <div
            style={s.relicBox}
            onClick={takeRewardRelic}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') takeRewardRelic(); }}
          >
            <TokenArt
              src={getRelicArt(relicOffer.id)}
              fallback={relicOffer.art}
              alt=""
              style={{ width: 34, height: 34, flexShrink: 0 }}
              fallbackStyle={{ fontSize: 28, lineHeight: 1 }}
            />
            <div style={s.relicInfo}>
              <div style={s.relicName}>{relicOffer.name}</div>
              <div style={s.relicDesc}>{relicOffer.description}</div>
            </div>
          </div>
        </>
      )}

      {/* Potion drop */}
      {potionOffer && !potionTaken && (() => {
        const def = getPotionDef(potionOffer.definitionId);
        if (!def) return null;
        const rarityColor = def.rarity === 'rare' ? '#ffcc00' : def.rarity === 'uncommon' ? '#3b8fff' : '#aaaaaa';
        return (
          <>
            <div style={s.sectionLabel}>
              {isElite ? 'Elite drop' : isBossReward ? 'Boss drop' : 'Potion found'}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 16px',
                background: `${rarityColor}11`,
                border: `1px solid ${rarityColor}66`,
                borderRadius: 8,
                cursor: 'pointer',
                maxWidth: 320,
                width: '100%',
                boxShadow: `0 0 12px ${rarityColor}33`,
              }}
              onClick={handlePotionTake}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePotionTake(); }}
            >
              <TokenArt
                src={getPotionArt(def.id)}
                fallback="PT"
                alt=""
                style={{ width: 34, height: 38, flexShrink: 0 }}
                fallbackStyle={{ fontSize: 28, lineHeight: 1 }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: rarityColor }}>{def.name}</div>
                <div style={{ fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.55 }}>
                  {def.rarity} - {def.category}
                </div>
                <div style={{ fontSize: 10, opacity: 0.85, lineHeight: 1.4 }}>{def.effect}</div>
              </div>
            </div>
            <button type="button" style={s.skipBtn} onClick={skipRewardPotion}>
              Skip potion
            </button>
          </>
        );
      })()}

      {/* Full-inventory pickup picker */}
      {pickupModalOpen && potionOffer && runState && (
        <PotionPickupModal
          incoming={potionOffer}
          currentSlots={runState.potions}
          onSwap={handlePotionSwap}
          onDiscardIncoming={handlePotionSkip}
        />
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
