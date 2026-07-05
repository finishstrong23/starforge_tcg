import React, { useState } from 'react';
import { useDungeonRun } from '../context/DungeonRunContext';
import { CardComponent } from './CardComponent';
import { PotionPickupModal } from './PotionPickupModal';
import { createCardInstance } from '../engine/draft';
import {
  REMOVAL_COST,
  REMOVALS_PER_SHOP,
  cardPrice,
  getCardDefById,
  getRelicById,
  relicPrice,
} from '../engine/nodeRewards';
import { getPotionDef, potionShopPrice } from '../data/potions';
import { getAscensionMods } from '../engine/ascension';
import { getDungeonSceneArt } from '../assets/basicTokenArt';
import { getMapNodeArt, getPotionArt, getRelicArt, uiArt } from '../assets/artRegistry';
import { TokenArt } from './TokenArt';
import type { CardDefinition, PotionInstance, RelicDefinition } from '../types';

const GoldValue: React.FC<{ amount: number; iconSize?: number }> = ({ amount, iconSize = 16 }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, lineHeight: 1 }}>
    <TokenArt
      src={uiArt.gold}
      fallback="g"
      alt=""
      style={{ width: iconSize, height: iconSize, flexShrink: 0 }}
      fallbackStyle={{ fontSize: Math.max(9, iconSize - 4), lineHeight: 1 }}
    />
    <span>{amount}g</span>
  </span>
);

/**
 * Shop screen.
 *
 * Pure renderer: the stock is rolled ONCE by the run reducer when the shop
 * node is entered (seeded from run seed + node id) and persisted on RunState
 * with sold flags. Purchases are atomic reducer actions (gold + item + sold
 * flag in one dispatch). Refreshing the page restores the identical stock —
 * the old mount-time rolls let players reroll inventory with F5.
 */
export const ShopView: React.FC = () => {
  const {
    runState,
    shopBuyCard, shopBuyRelic, shopBuyPotion, shopRemoveCard,
    returnToMap,
  } = useDungeonRun();
  const act = (runState?.currentAct ?? 1) as 1 | 2 | 3;
  const stock = runState?.shopStock ?? null;

  const shopCards = (stock?.cardIds ?? [])
    .map((id) => getCardDefById(id))
    .filter((def): def is CardDefinition => Boolean(def));
  const shopRelics = (stock?.relicIds ?? [])
    .map((id) => getRelicById(id))
    .filter((relic): relic is RelicDefinition => Boolean(relic));
  const shopPotions = stock?.potions ?? [];

  const [removingCard, setRemovingCard] = useState(false);
  // Pending potion purchase (when inventory is full and we need a discard pick).
  const [pendingPurchase, setPendingPurchase] = useState<{ potion: PotionInstance; shopIndex: number } | null>(null);

  const gold = runState?.gold ?? 0;
  const currentHealth = runState?.currentHealth ?? 0;
  const maxHealth = runState?.maxHealth ?? 0;
  const healthPct = maxHealth > 0 ? currentHealth / maxHealth : 1;
  const healthColor = healthPct <= 0.35 ? '#ff5c45' : healthPct <= 0.7 ? '#f0d060' : '#72e6a3';
  const deck = runState?.deck ?? [];
  const ascensionMods = getAscensionMods(runState?.ascensionLevel ?? 0);
  // A3 shop price multiplier. Round up so the multiplier always actually bites.
  const scalePrice = (n: number): number => Math.ceil(n * ascensionMods.shopPriceMul);
  const potionPrice = scalePrice(potionShopPrice(act));
  const removalsLeft = REMOVALS_PER_SHOP - (stock?.removalsUsed ?? 0);
  const canRemove = removalsLeft > 0 && gold >= REMOVAL_COST;

  const itemWrapperStyle = (bought: boolean, affordable: boolean): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 5,
    cursor: bought || !affordable ? 'default' : 'pointer',
    opacity: bought ? 0.35 : 1,
  });

  const priceBadgeStyle = (affordable: boolean, bought: boolean): React.CSSProperties => ({
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 8px',
    background: bought ? '#1a1a1a' : affordable ? '#2a2010' : '#1a1a1a',
    border: bought ? '1px solid #333' : affordable ? '1px solid #c89b3c66' : '1px solid #333',
    borderRadius: 3,
    color: bought ? '#555' : affordable ? '#f0d060' : '#555',
    letterSpacing: '0.1em',
  });

  const relicBoxStyle = (bought: boolean, affordable: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 14px',
    background: bought ? '#0a0a0a' : affordable ? '#1a1408' : '#0d0d0d',
    border: bought ? '1px solid #1a1a1a' : affordable ? '1px solid #c89b3c55' : '1px solid #1a1a2e',
    borderRadius: 7,
    cursor: bought || !affordable ? 'default' : 'pointer',
    opacity: bought ? 0.35 : 1,
    flex: 1,
    minWidth: 180,
  });

  const relicPriceStyle = (affordable: boolean): React.CSSProperties => ({
    fontSize: 10,
    color: affordable ? '#f0d060' : '#555',
    fontWeight: 700,
    flexShrink: 0,
  });

  const serviceBtnStyle = (affordable: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    background: affordable ? '#1a1408' : 'transparent',
    border: affordable ? '1px solid #c89b3c66' : '1px solid #2a2a3a',
    color: affordable ? '#f0d060' : '#555',
    borderRadius: 4,
    fontSize: 10,
    cursor: affordable ? 'pointer' : 'default',
    fontWeight: 700,
    letterSpacing: '0.08em',
  });

  const buyPotion = (potion: PotionInstance, shopIndex: number) => {
    if (gold < potionPrice || stock?.soldPotionIndexes.includes(shopIndex)) return;
    const slots = runState?.potions ?? [];
    const empty = slots.findIndex((p) => p === null);
    if (empty === -1) {
      // Inventory full - defer the purchase, show the pickup modal so the
      // player picks a slot (or cancels). Gold is only spent if they accept.
      setPendingPurchase({ potion, shopIndex });
      return;
    }
    shopBuyPotion(shopIndex);
  };

  const handlePurchaseSwap = (slotIndex: number) => {
    if (!pendingPurchase) return;
    shopBuyPotion(pendingPurchase.shopIndex, slotIndex);
    setPendingPurchase(null);
  };

  const handlePurchaseCancel = () => setPendingPurchase(null);

  const removeCard = (instanceId: string) => {
    if (!canRemove) return;
    shopRemoveCard(instanceId);
    setRemovingCard(false);
  };

  const s: Record<string, React.CSSProperties> = {
    root: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 20,
      padding: '1.5rem 1rem 2rem',
      minHeight: '100%',
      backgroundImage: [
        'linear-gradient(180deg, rgba(7,7,18,0.22), rgba(7,7,18,0.68))',
        `url("${getDungeonSceneArt('shop')}")`,
      ].join(', '),
      backgroundSize: 'cover, cover',
      backgroundPosition: 'center, center',
      backgroundRepeat: 'no-repeat',
      color: '#f0f0f8',
      overflowY: 'auto',
    },
    header: {
      width: '100%',
      maxWidth: 500,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    title: {
      fontSize: '1.3rem',
      fontWeight: 700,
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      margin: 0,
    },
    goldBadge: {
      fontSize: 14,
      fontWeight: 700,
      color: '#f0d060',
      background: '#2a2010',
      border: '1px solid #c89b3c66',
      borderRadius: 4,
      padding: '4px 10px',
      letterSpacing: '0.08em',
    },
    headerStats: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
    },
    healthBadge: {
      fontSize: 14,
      fontWeight: 800,
      color: healthColor,
      background: '#17151b',
      border: `1px solid ${healthColor}77`,
      borderRadius: 4,
      padding: '4px 10px',
      letterSpacing: '0.08em',
      boxShadow: `0 0 12px ${healthColor}22`,
    },
    sectionLabel: {
      width: '100%',
      maxWidth: 500,
      fontSize: '0.65rem',
      letterSpacing: '0.25em',
      opacity: 0.35,
      textTransform: 'uppercase',
    },
    cardRow: {
      display: 'flex',
      gap: 12,
      flexWrap: 'wrap',
      justifyContent: 'center',
      width: '100%',
      maxWidth: 500,
    },
    relicRow: {
      display: 'flex',
      gap: 12,
      flexWrap: 'wrap',
      justifyContent: 'center',
      width: '100%',
      maxWidth: 500,
    },
    relicArt: { fontSize: 24 },
    relicInfo: { flex: 1, display: 'flex', flexDirection: 'column', gap: 2 },
    relicName: { fontSize: 11, fontWeight: 700 },
    relicDesc: { fontSize: 9, opacity: 0.6, lineHeight: 1.4 },
    serviceBox: {
      width: '100%',
      maxWidth: 500,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      background: '#0e0e1e',
      border: '1px solid #2a2a3a',
      borderRadius: 7,
    },
    serviceInfo: { display: 'flex', flexDirection: 'column', gap: 3 },
    serviceTitle: { fontSize: 13, fontWeight: 700 },
    serviceDesc: { fontSize: 10, opacity: 0.55 },
    leaveBtn: {
      padding: '9px 26px',
      background: 'transparent',
      border: '1px solid #3a3a5a',
      color: '#aaa',
      borderRadius: 4,
      fontSize: 10,
      cursor: 'pointer',
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      marginTop: 4,
    },
    deckGrid: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
      justifyContent: 'center',
      width: '100%',
      maxWidth: 500,
    },
    cancelBtn: {
      background: 'transparent',
      border: '1px solid #2a2a3a',
      color: '#666',
      padding: '5px 14px',
      borderRadius: 4,
      fontSize: 10,
      cursor: 'pointer',
    },
  };

  const priceBadgeFn = (price: number, bought: boolean): React.CSSProperties =>
    priceBadgeStyle(gold >= price, bought);

  return (
    <div style={s.root}>
      <div style={s.header}>
        <h2 style={{ ...s.title, display: 'flex', alignItems: 'center', gap: 8 }}>
          <TokenArt
            src={getMapNodeArt('shop')}
            fallback="S"
            alt=""
            style={{ width: 30, height: 30, flexShrink: 0 }}
            fallbackStyle={{ fontSize: 14, lineHeight: 1 }}
          />
          <span>Shop</span>
        </h2>
        <div style={s.headerStats}>
          <div style={s.healthBadge}>HP {currentHealth}/{maxHealth}</div>
          <div style={s.goldBadge}><GoldValue amount={gold} iconSize={18} /></div>
        </div>
      </div>

      {/* Cards */}
      <div style={s.sectionLabel}>Cards for sale</div>
      <div style={s.cardRow}>
        {shopCards.map((def) => {
          const price = scalePrice(cardPrice(def));
          const bought = stock?.soldCardIds.includes(def.id) ?? false;
          const affordable = gold >= price;
          return (
            <div
              key={def.id}
              style={itemWrapperStyle(bought, affordable)}
              onClick={!bought && affordable ? () => shopBuyCard(def.id) : undefined}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' && !bought && affordable) shopBuyCard(def.id); }}
            >
              <CardComponent card={createCardInstance(def)} unaffordable={!affordable || bought} />
              <div style={priceBadgeFn(price, bought)}>
                {bought ? 'Sold' : <GoldValue amount={price} iconSize={14} />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Relics */}
      <div style={s.sectionLabel}>Relics for sale</div>
      <div style={s.relicRow}>
        {shopRelics.map((relic) => {
          const price = scalePrice(relicPrice(relic));
          const bought = stock?.soldRelicIds.includes(relic.id) ?? false;
          const affordable = gold >= price;
          return (
            <div
              key={relic.id}
              style={relicBoxStyle(bought, affordable)}
              onClick={!bought && affordable ? () => shopBuyRelic(relic.id) : undefined}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' && !bought && affordable) shopBuyRelic(relic.id); }}
            >
              <TokenArt
                src={getRelicArt(relic.id)}
                fallback={relic.art}
                alt=""
                style={{ width: 28, height: 28, flexShrink: 0 }}
                fallbackStyle={{ fontSize: 24, lineHeight: 1 }}
              />
              <div style={s.relicInfo}>
                <div style={s.relicName}>{relic.name}</div>
                <div style={s.relicDesc}>{relic.description}</div>
              </div>
              <div style={relicPriceStyle(affordable && !bought)}>
                {bought ? 'Sold' : <GoldValue amount={price} iconSize={14} />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Card removal */}
      <div style={s.sectionLabel}>Services</div>
      <div style={s.serviceBox}>
        <div style={s.serviceInfo}>
          <div style={{ ...s.serviceTitle, display: 'flex', alignItems: 'center', gap: 7 }}>
            <TokenArt
              src={uiArt.cardRemoval}
              fallback="X"
              alt=""
              style={{ width: 24, height: 24, flexShrink: 0 }}
              fallbackStyle={{ fontSize: 13, lineHeight: 1 }}
            />
            <span>Card Removal</span>
          </div>
          <div style={s.serviceDesc}>
            {removalsLeft > 0
              ? 'Permanently remove a card from your deck (once per shop)'
              : 'Removal already used at this shop'}
          </div>
        </div>
        <button
          type="button"
          style={serviceBtnStyle(canRemove)}
          onClick={() => canRemove && setRemovingCard(true)}
        >
          {removalsLeft > 0 ? <GoldValue amount={REMOVAL_COST} iconSize={14} /> : 'Used'}
        </button>
      </div>

      {/* Deck picker for removal */}
      {removingCard && (
        <>
          <div style={s.sectionLabel}>Choose a card to remove</div>
          <div style={s.deckGrid}>
            {deck.map((card) => (
              <div
                key={card.instanceId}
                role="button"
                tabIndex={0}
                onClick={() => removeCard(card.instanceId)}
                onKeyDown={(e) => { if (e.key === 'Enter') removeCard(card.instanceId); }}
                style={{ cursor: 'pointer' }}
              >
                <CardComponent card={card} targetable compact />
              </div>
            ))}
          </div>
          <button type="button" style={s.cancelBtn} onClick={() => setRemovingCard(false)}>
            Cancel
          </button>
        </>
      )}

      {/* Potions for sale */}
      {shopPotions.length > 0 && (
        <>
          <div style={s.sectionLabel}>Potions for sale</div>
          <div style={s.relicRow}>
            {shopPotions.map((inst, idx) => {
              const def = getPotionDef(inst.definitionId);
              if (!def) return null;
              const bought = stock?.soldPotionIndexes.includes(idx) ?? false;
              const affordable = gold >= potionPrice;
              const rarityColor =
                def.rarity === 'rare' ? '#ffcc00' : def.rarity === 'uncommon' ? '#3b8fff' : '#aaaaaa';
              return (
                <div
                  key={`${inst.definitionId}-${idx}`}
                  role={!bought && affordable ? 'button' : undefined}
                  tabIndex={!bought && affordable ? 0 : -1}
                  onClick={!bought && affordable ? () => buyPotion(inst, idx) : undefined}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !bought && affordable) buyPotion(inst, idx); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    background: bought ? '#0a0a0a' : affordable ? `${rarityColor}11` : '#0d0d0d',
                    border: bought ? '1px solid #1a1a1a' : `1px solid ${affordable ? rarityColor + '66' : '#1a1a2e'}`,
                    borderRadius: 7,
                    cursor: bought || !affordable ? 'default' : 'pointer',
                    opacity: bought ? 0.35 : 1,
                    flex: 1,
                    minWidth: 180,
                  }}
                >
                  <TokenArt
                    src={getPotionArt(def.id)}
                    fallback="POT"
                    alt=""
                    style={{ width: 28, height: 28, flexShrink: 0 }}
                    fallbackStyle={{ fontSize: 24, lineHeight: 1 }}
                  />
                  <div style={s.relicInfo}>
                    <div style={{ ...s.relicName, color: bought ? '#666' : rarityColor }}>{def.name}</div>
                    <div style={s.relicDesc}>{def.effect}</div>
                  </div>
                  <div style={relicPriceStyle(affordable && !bought)}>
                    {bought ? 'Sold' : <GoldValue amount={potionPrice} iconSize={14} />}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Pickup picker - appears when buying a potion would overflow inventory */}
      {pendingPurchase && runState && (
        <PotionPickupModal
          incoming={pendingPurchase.potion}
          currentSlots={runState.potions}
          onSwap={handlePurchaseSwap}
          onDiscardIncoming={handlePurchaseCancel}
        />
      )}

      <button type="button" style={s.leaveBtn} onClick={returnToMap}>
        Leave Shop
      </button>
    </div>
  );
};
