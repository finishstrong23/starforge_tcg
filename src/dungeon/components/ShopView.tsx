import React, { useState } from 'react';
import { useDungeonRun } from '../context/DungeonRunContext';
import { CardComponent } from './CardComponent';
import { PotionPickupModal } from './PotionPickupModal';
import { CARD_POOL } from '../data/cards';
import { RELIC_POOL } from '../data/relics';
import { createCardInstance } from '../engine/draft';
import { getPotionDef, potionShopPrice, rollShopPotions } from '../data/potions';
import { getAscensionMods } from '../engine/ascension';
import type { CardDefinition, PotionInstance, RelicDefinition } from '../types';

const CARD_PRICE: Record<string, number> = {
  Common: 50, Uncommon: 75, Rare: 100, Epic: 140, Legendary: 175,
};

const REMOVAL_COST = 75;

function pickRandom<T>(arr: T[]): T | undefined {
  return arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined;
}

function randomCards(count: number, faction?: string, deck: { id: string; upgraded: boolean }[] = []): CardDefinition[] {
  // Same faction-lock rationale as generateRewardOptions: cross-faction cards
  // are mechanically useless and feel like dead picks.
  // Phase 5 integration: also skip cards the player already owns in upgraded
  // form. Selling the player a base copy of Cinder Strike when they have
  // Cinder Strike+ in their deck would be strictly worse than what they own.
  const ownedUpgradedIds = new Set(deck.filter((c) => c.upgraded).map((c) => c.id));
  const pool = (faction ? CARD_POOL.filter((c) => c.faction === faction) : CARD_POOL)
    .filter((c) => !ownedUpgradedIds.has(c.id));
  const used = new Set<string>();
  const out: CardDefinition[] = [];
  let tries = 0;
  while (out.length < count && tries++ < 200) {
    const c = pickRandom(pool);
    if (c && !used.has(c.id)) { used.add(c.id); out.push(c); }
  }
  return out;
}

function randomRelics(count: number): RelicDefinition[] {
  const pool = RELIC_POOL.filter((r) => r.rarity === 'Common' || r.rarity === 'Uncommon' || r.rarity === 'Rare');
  const used = new Set<string>();
  const out: RelicDefinition[] = [];
  let tries = 0;
  while (out.length < count && tries++ < 100) {
    const r = pickRandom(pool);
    if (r && !used.has(r.id)) { used.add(r.id); out.push(r); }
  }
  return out;
}

function relicPrice(relic: RelicDefinition): number {
  return relic.rarity === 'Boss' ? 200 : relic.rarity === 'Rare' ? 150 : relic.rarity === 'Uncommon' ? 120 : 100;
}

export const ShopView: React.FC = () => {
  const { runState, draftFaction, addCardToDeck, addRelic, addPotion, discardPotion, removeCardFromDeck, spendGold, returnToMap } = useDungeonRun();
  const act = (runState?.currentAct ?? 1) as 1 | 2 | 3;
  // Phase 5: pass deck so the shop skips cards the player already owns in upgraded form.
  const [shopCards] = useState<CardDefinition[]>(() =>
    randomCards(4, draftFaction ?? undefined, runState?.deck ?? []),
  );
  const [shopRelics] = useState<RelicDefinition[]>(() => randomRelics(2));
  // 2-3 potions per shop. Roll deterministically once on mount.
  const [shopPotions] = useState<PotionInstance[]>(() => rollShopPotions(2 + Math.floor(Math.random() * 2)));
  const [boughtCardIds, setBoughtCardIds] = useState<Set<string>>(new Set());
  const [boughtRelicIds, setBoughtRelicIds] = useState<Set<string>>(new Set());
  const [boughtPotionIdx, setBoughtPotionIdx] = useState<Set<number>>(new Set());
  const [removingCard, setRemovingCard] = useState(false);
  // Pending potion purchase (when inventory is full and we need a discard pick).
  const [pendingPurchase, setPendingPurchase] = useState<{ potion: PotionInstance; shopIndex: number; price: number } | null>(null);

  const gold = runState?.gold ?? 0;
  const currentHealth = runState?.currentHealth ?? 0;
  const maxHealth = runState?.maxHealth ?? 0;
  const healthPct = maxHealth > 0 ? currentHealth / maxHealth : 1;
  const healthColor = healthPct <= 0.35 ? '#ff5c45' : healthPct <= 0.7 ? '#f0d060' : '#72e6a3';
  const deck = runState?.deck ?? [];
  const ascensionMods = getAscensionMods(runState?.ascensionLevel ?? 0);
  // A3 — shop price multiplier. Round up so the multiplier always actually bites.
  const scalePrice = (n: number): number => Math.ceil(n * ascensionMods.shopPriceMul);
  const potionPrice = scalePrice(potionShopPrice(act));

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

  const buyCard = (def: CardDefinition) => {
    const price = scalePrice(CARD_PRICE[def.rarity] ?? 75);
    if (gold < price || boughtCardIds.has(def.id)) return;
    addCardToDeck(createCardInstance(def));
    spendGold(price);
    setBoughtCardIds((prev) => new Set([...prev, def.id]));
  };

  const buyRelic = (relic: RelicDefinition) => {
    const price = scalePrice(relicPrice(relic));
    if (gold < price || boughtRelicIds.has(relic.id)) return;
    addRelic(relic);
    spendGold(price);
    setBoughtRelicIds((prev) => new Set([...prev, relic.id]));
  };

  const buyPotion = (potion: PotionInstance, shopIndex: number) => {
    if (gold < potionPrice || boughtPotionIdx.has(shopIndex)) return;
    const slots = runState?.potions ?? [];
    const empty = slots.findIndex((p) => p === null);
    if (empty === -1) {
      // Inventory full — defer the purchase, show the pickup modal so the
      // player picks a slot (or cancels). Gold is only spent if they accept.
      setPendingPurchase({ potion, shopIndex, price: potionPrice });
      return;
    }
    addPotion(potion);
    spendGold(potionPrice);
    setBoughtPotionIdx((prev) => new Set([...prev, shopIndex]));
  };

  const handlePurchaseSwap = (slotIndex: number) => {
    if (!pendingPurchase) return;
    discardPotion(slotIndex);
    addPotion(pendingPurchase.potion, slotIndex);
    spendGold(pendingPurchase.price);
    setBoughtPotionIdx((prev) => new Set([...prev, pendingPurchase.shopIndex]));
    setPendingPurchase(null);
  };

  const handlePurchaseCancel = () => setPendingPurchase(null);

  const removeCard = (instanceId: string) => {
    if (gold < REMOVAL_COST) return;
    removeCardFromDeck(instanceId);
    spendGold(REMOVAL_COST);
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
      background: 'radial-gradient(ellipse at 50% 20%, #1a140a 0%, #060610 100%)',
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
        <h2 style={s.title}>🛒 Shop</h2>
        <div style={s.headerStats}>
          <div style={s.healthBadge}>HP {currentHealth}/{maxHealth}</div>
          <div style={s.goldBadge}>💰 {gold}g</div>
        </div>
      </div>

      {/* Cards */}
      <div style={s.sectionLabel}>Cards for sale</div>
      <div style={s.cardRow}>
        {shopCards.map((def) => {
          const price = scalePrice(CARD_PRICE[def.rarity] ?? 75);
          const bought = boughtCardIds.has(def.id);
          const affordable = gold >= price;
          return (
            <div
              key={def.id}
              style={itemWrapperStyle(bought, affordable)}
              onClick={!bought && affordable ? () => buyCard(def) : undefined}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' && !bought && affordable) buyCard(def); }}
            >
              <CardComponent card={createCardInstance(def)} unaffordable={!affordable || bought} />
              <div style={priceBadgeFn(price, bought)}>
                {bought ? 'Sold' : `${price}g`}
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
          const bought = boughtRelicIds.has(relic.id);
          const affordable = gold >= price;
          return (
            <div
              key={relic.id}
              style={relicBoxStyle(bought, affordable)}
              onClick={!bought && affordable ? () => buyRelic(relic) : undefined}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' && !bought && affordable) buyRelic(relic); }}
            >
              <span style={s.relicArt}>{relic.art}</span>
              <div style={s.relicInfo}>
                <div style={s.relicName}>{relic.name}</div>
                <div style={s.relicDesc}>{relic.description}</div>
              </div>
              <div style={relicPriceStyle(affordable && !bought)}>
                {bought ? '✓' : `${price}g`}
              </div>
            </div>
          );
        })}
      </div>

      {/* Card removal */}
      <div style={s.sectionLabel}>Services</div>
      <div style={s.serviceBox}>
        <div style={s.serviceInfo}>
          <div style={s.serviceTitle}>🗑 Card Removal</div>
          <div style={s.serviceDesc}>Permanently remove a card from your deck</div>
        </div>
        <button
          type="button"
          style={serviceBtnStyle(gold >= REMOVAL_COST)}
          onClick={() => gold >= REMOVAL_COST && setRemovingCard(true)}
        >
          {REMOVAL_COST}g
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
              const bought = boughtPotionIdx.has(idx);
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
                  <span style={s.relicArt}>🧪</span>
                  <div style={s.relicInfo}>
                    <div style={{ ...s.relicName, color: bought ? '#666' : rarityColor }}>{def.name}</div>
                    <div style={s.relicDesc}>{def.effect}</div>
                  </div>
                  <div style={relicPriceStyle(affordable && !bought)}>
                    {bought ? '✓' : `${potionPrice}g`}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Pickup picker — appears when buying a potion would overflow inventory */}
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
