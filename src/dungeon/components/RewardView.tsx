import React, { useEffect, useState } from 'react';
import { useDungeonRun } from '../context/DungeonRunContext';
import { CardComponent } from './CardComponent';
import { PotionPickupModal } from './PotionPickupModal';
import { RELIC_POOL } from '../data/relics';
import { createCardInstance, generateRewardOptions } from '../engine/draft';
import { getPotionDef, rollPotionDrop } from '../data/potions';
import { getAscensionMods } from '../engine/ascension';
import type { CardDefinition, PotionInstance, RelicDefinition } from '../types';

function pickRandom<T>(arr: T[]): T | undefined {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined;
}

function generateRewardRelic(isBoss: boolean, rareWeightMul = 1): RelicDefinition | undefined {
  if (isBoss) return pickRandom(RELIC_POOL.filter((r) => r.rarity === 'Boss'));

  // Weighted pick across Uncommon (weight 1) and Rare (weight rareWeightMul).
  // A8 halves rareWeightMul to 0.5 → a Rare drop is half as likely.
  const uncommons = RELIC_POOL.filter((r) => r.rarity === 'Uncommon');
  const rares     = RELIC_POOL.filter((r) => r.rarity === 'Rare');
  if (uncommons.length === 0 && rares.length === 0) return undefined;

  const totalW = uncommons.length + rares.length * rareWeightMul;
  if (totalW <= 0) return pickRandom(uncommons);
  const roll = Math.random() * totalW;
  if (roll < uncommons.length) return pickRandom(uncommons);
  return pickRandom(rares) ?? pickRandom(uncommons);
}

export const RewardView: React.FC = () => {
  const { runState, draftFaction, addCardToDeck, addRelic, addGold, addPotion, discardPotion, returnToMap, advanceAct } = useDungeonRun();

  const act = runState?.currentAct ?? 1;
  const currentMap = runState?.actMaps[(runState?.currentAct ?? 1) - 1];
  const isBossReward = currentMap?.completed ?? false;
  const combatIndex = runState?.runStats.totalCombats ?? 0;
  const showRelic = isBossReward || combatIndex % 3 === 0;

  // Per-act room number for tier-weighted rewards: count of visited nodes in
  // the current act's map. Restarts each act per spec ("Act 2 room 1 is room
  // 1 for weighting, NOT room 14").
  const roomNumber = currentMap?.nodes.filter((n) => n.visited).length ?? 1;

  // Determine elite from the most-recently-visited node's type.
  const lastNode = currentMap?.nodes.find((n) => n.id === currentMap?.currentNodeId);
  const isElite = lastNode?.type === 'elite';

  // Ascension modifiers — A7 scales gold reward, A8 halves rare relic odds.
  const ascensionMods = getAscensionMods(runState?.ascensionLevel ?? 0);

  // Combat gold rewards (rolled once on mount). Regular ~10-18, elite ~25-35,
  // boss ~45-60. Scaled by A7's goldRewardMul.
  const [goldGained] = useState<number>(() => {
    const base = isBossReward ? 45 + Math.floor(Math.random() * 16)  // 45-60
               : isElite       ? 25 + Math.floor(Math.random() * 11) // 25-35
                               : 10 + Math.floor(Math.random() * 9); // 10-18
    return Math.max(1, Math.round(base * ascensionMods.goldRewardMul));
  });
  // Award the gold once on mount (StrictMode-safe: initialiser of useState only runs once).
  const [, setGoldAwarded] = useState(false);

  const [cardOptions] = useState<CardDefinition[]>(() =>
    // Pass the deck so the roller can skip cards the player already owns
    // in upgraded form (Phase 5 integration policy).
    generateRewardOptions(
      roomNumber,
      act as 1 | 2 | 3,
      draftFaction ?? undefined,
      Math.random,
      runState?.deck ?? [],
    ),
  );
  const [relicOffer] = useState<RelicDefinition | undefined>(() =>
    showRelic ? generateRewardRelic(isBossReward, ascensionMods.rareRelicMul) : undefined,
  );
  // Roll a potion drop once per reward screen. Elites + bosses always drop,
  // regular combats roll at 40 % per spec.
  const [potionOffer] = useState<PotionInstance | null>(() =>
    rollPotionDrop({ isElite, isBoss: isBossReward }),
  );

  // Award the rolled gold exactly once when the reward screen mounts.
  useEffect(() => {
    setGoldAwarded((awarded) => {
      if (!awarded && goldGained > 0) addGold(goldGained);
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [picked, setPicked] = useState(false);
  const [relicTaken, setRelicTaken] = useState(false);
  const [potionTaken, setPotionTaken] = useState(false);
  const [pickupModalOpen, setPickupModalOpen] = useState(false);

  const handleCardPick = (def: CardDefinition) => {
    addCardToDeck(createCardInstance(def));
    setPicked(true);
  };

  const handleRelicTake = (relic: RelicDefinition) => {
    addRelic(relic);
    setRelicTaken(true);
  };

  const handlePotionTake = (potion: PotionInstance) => {
    if (!runState) return;
    const slots = runState.potions ?? [];
    const empty = slots.findIndex((p) => p === null);
    if (empty === -1) {
      // Inventory full → open the pickup picker
      setPickupModalOpen(true);
      return;
    }
    const ok = addPotion(potion);
    if (ok) setPotionTaken(true);
  };

  const handlePotionSwap = (slotIndex: number) => {
    if (!potionOffer) return;
    discardPotion(slotIndex);          // free the slot
    addPotion(potionOffer, slotIndex); // and immediately fill it with the new potion
    setPotionTaken(true);
    setPickupModalOpen(false);
  };

  const handlePotionSkip = () => {
    setPotionTaken(true);
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
              onClick={() => handlePotionTake(potionOffer)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePotionTake(potionOffer); }}
            >
              <span style={{ fontSize: 28 }}>🧪</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: rarityColor }}>{def.name}</div>
                <div style={{ fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', opacity: 0.55 }}>
                  {def.rarity} · {def.category}
                </div>
                <div style={{ fontSize: 10, opacity: 0.85, lineHeight: 1.4 }}>{def.effect}</div>
              </div>
            </div>
            <button type="button" style={s.skipBtn} onClick={() => setPotionTaken(true)}>
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
