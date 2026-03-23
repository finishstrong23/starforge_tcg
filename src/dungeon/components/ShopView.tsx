import React, { useState } from 'react';
import type { ShopItem, RunCard } from '../types';
import { CardComponent } from './CardComponent';

interface ShopViewProps {
  items: ShopItem[];
  gold: number;
  deck: RunCard[];
  onBuyCard: (cardId: string) => void;
  onBuyRelic: (relicId: string) => void;
  onRemoveCard: (instanceId: string) => void;
  onUpgradeCard: (instanceId: string) => void;
  onLeave: () => void;
}

const REMOVE_COST = 75;
const UPGRADE_COST = 100;

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  minHeight: '100vh',
  background: 'linear-gradient(180deg, #0d0a1a 0%, #1a1428 50%, #0d0a1a 100%)',
  padding: '24px 16px',
  color: '#fff',
  fontFamily: 'sans-serif',
};

const titleStyle: React.CSSProperties = {
  fontSize: 32,
  fontWeight: 'bold',
  letterSpacing: 4,
  textTransform: 'uppercase',
  marginBottom: 4,
  background: 'linear-gradient(135deg, #ffd700, #ffaa00, #ffd700)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  textShadow: 'none',
  filter: 'drop-shadow(0 0 12px rgba(255, 215, 0, 0.4))',
};

const goldDisplayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 24,
  right: 24,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: 'rgba(0, 0, 0, 0.6)',
  border: '1px solid rgba(255, 215, 0, 0.4)',
  borderRadius: 20,
  padding: '8px 16px',
  fontSize: 18,
  fontWeight: 'bold',
  color: '#ffd700',
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 'bold',
  color: '#aaa',
  textTransform: 'uppercase',
  letterSpacing: 2,
  marginTop: 32,
  marginBottom: 12,
};

const cardsRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 16,
  justifyContent: 'center',
  flexWrap: 'wrap',
  marginBottom: 8,
};

const cardSlotStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  position: 'relative',
};

const priceTagStyle = (canAfford: boolean, sold: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 12px',
  borderRadius: 12,
  background: sold
    ? 'rgba(100, 100, 100, 0.4)'
    : canAfford
      ? 'rgba(255, 215, 0, 0.15)'
      : 'rgba(255, 60, 60, 0.15)',
  border: `1px solid ${sold ? '#555' : canAfford ? 'rgba(255, 215, 0, 0.4)' : 'rgba(255, 60, 60, 0.4)'}`,
  color: sold ? '#666' : canAfford ? '#ffd700' : '#ff4444',
  fontSize: 13,
  fontWeight: 'bold',
  cursor: sold ? 'default' : canAfford ? 'pointer' : 'default',
});

const soldOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 30,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0, 0, 0, 0.6)',
  borderRadius: 10,
  zIndex: 10,
};

const soldTextStyle: React.CSSProperties = {
  fontSize: 24,
  fontWeight: 'bold',
  color: '#888',
  letterSpacing: 4,
  textTransform: 'uppercase',
  transform: 'rotate(-15deg)',
  border: '3px solid #888',
  padding: '4px 16px',
  borderRadius: 4,
};

const relicRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 16,
  justifyContent: 'center',
  flexWrap: 'wrap',
  marginBottom: 8,
};

const relicItemStyle = (canAfford: boolean, sold: boolean, hovered: boolean): React.CSSProperties => ({
  width: 240,
  padding: 16,
  background: sold
    ? 'rgba(50, 50, 50, 0.3)'
    : hovered && canAfford
      ? 'rgba(255, 215, 0, 0.1)'
      : 'rgba(255, 255, 255, 0.05)',
  border: `2px solid ${sold ? '#444' : hovered && canAfford ? '#ffd700' : 'rgba(255, 215, 0, 0.2)'}`,
  borderRadius: 10,
  cursor: sold ? 'default' : canAfford ? 'pointer' : 'default',
  transition: 'all 0.2s ease',
  textAlign: 'center' as const,
  position: 'relative' as const,
  opacity: sold ? 0.5 : canAfford ? 1 : 0.6,
  filter: sold ? 'grayscale(0.8)' : canAfford ? 'none' : 'grayscale(0.5)',
  transform: hovered && canAfford && !sold ? 'scale(1.03)' : 'scale(1)',
});

const servicesRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 16,
  justifyContent: 'center',
  flexWrap: 'wrap',
  marginBottom: 24,
};

const serviceButtonStyle = (canAfford: boolean, hovered: boolean): React.CSSProperties => ({
  padding: '16px 24px',
  borderRadius: 10,
  border: `2px solid ${canAfford ? (hovered ? '#ffd700' : 'rgba(255, 215, 0, 0.3)') : 'rgba(100, 100, 100, 0.3)'}`,
  background: canAfford
    ? hovered
      ? 'rgba(255, 215, 0, 0.1)'
      : 'rgba(255, 255, 255, 0.05)'
    : 'rgba(50, 50, 50, 0.3)',
  cursor: canAfford ? 'pointer' : 'default',
  transition: 'all 0.2s ease',
  textAlign: 'center' as const,
  opacity: canAfford ? 1 : 0.5,
  transform: hovered && canAfford ? 'scale(1.03)' : 'scale(1)',
  minWidth: 180,
});

const leaveButtonStyle: React.CSSProperties = {
  marginTop: 24,
  padding: '12px 40px',
  fontSize: 16,
  fontWeight: 'bold',
  letterSpacing: 3,
  textTransform: 'uppercase',
  background: 'linear-gradient(135deg, #555, #333)',
  color: '#fff',
  border: '2px solid rgba(255, 255, 255, 0.2)',
  borderRadius: 8,
  cursor: 'pointer',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0, 0, 0, 0.85)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const confirmDialogStyle: React.CSSProperties = {
  background: 'linear-gradient(180deg, #1a1a2e, #0a0a1a)',
  border: '2px solid rgba(255, 215, 0, 0.4)',
  borderRadius: 12,
  padding: 24,
  textAlign: 'center',
  maxWidth: 360,
};

const deckGridStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 8,
  justifyContent: 'center',
  maxWidth: 700,
  maxHeight: '60vh',
  overflowY: 'auto',
  padding: 16,
};

const ShopView: React.FC<ShopViewProps> = ({
  items,
  gold,
  deck,
  onBuyCard,
  onBuyRelic,
  onRemoveCard,
  onUpgradeCard,
  onLeave,
}) => {
  const [hoveredRelicId, setHoveredRelicId] = useState<string | null>(null);
  const [hoveredService, setHoveredService] = useState<string | null>(null);
  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null);
  const [serviceMode, setServiceMode] = useState<'remove' | 'upgrade' | null>(null);

  const cardItems = items.filter((item) => item.type === 'card' && item.card);
  const relicItems = items.filter((item) => item.type === 'relic' && item.relic);

  const handleBuyClick = (item: ShopItem) => {
    if (item.sold || item.cost > gold) return;
    setConfirmItem(item);
  };

  const handleConfirmBuy = () => {
    if (!confirmItem) return;
    if (confirmItem.type === 'card' && confirmItem.card) {
      onBuyCard(confirmItem.card.id);
    } else if (confirmItem.type === 'relic' && confirmItem.relic) {
      onBuyRelic(confirmItem.relic.id);
    }
    setConfirmItem(null);
  };

  const handleServiceClick = (type: 'remove' | 'upgrade') => {
    const cost = type === 'remove' ? REMOVE_COST : UPGRADE_COST;
    if (gold < cost) return;
    setServiceMode(type);
  };

  const handleDeckCardClick = (card: RunCard) => {
    if (serviceMode === 'remove') {
      onRemoveCard(card.instanceId);
      setServiceMode(null);
    } else if (serviceMode === 'upgrade') {
      onUpgradeCard(card.instanceId);
      setServiceMode(null);
    }
  };

  // ─── Confirmation Dialog ────────────────────────────────────
  if (confirmItem) {
    const itemName = confirmItem.card?.name || confirmItem.relic?.name || 'item';
    return (
      <div style={overlayStyle} onClick={() => setConfirmItem(null)}>
        <div style={confirmDialogStyle} onClick={(e) => e.stopPropagation()}>
          <div style={{ fontSize: 18, fontWeight: 'bold', color: '#ffd700', marginBottom: 12 }}>
            Purchase {itemName}?
          </div>
          <div style={{ fontSize: 14, color: '#ccc', marginBottom: 16 }}>
            Cost: <span style={{ color: '#ffd700', fontWeight: 'bold' }}>{confirmItem.cost} gold</span>
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={handleConfirmBuy}
              style={{
                padding: '8px 24px',
                fontSize: 14,
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #4a9eff, #1a5abb)',
                color: '#fff',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              BUY
            </button>
            <button
              onClick={() => setConfirmItem(null)}
              style={{
                padding: '8px 24px',
                fontSize: 14,
                fontWeight: 'bold',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#aaa',
                border: '2px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              CANCEL
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Deck Viewer for Remove/Upgrade ─────────────────────────
  if (serviceMode) {
    const label = serviceMode === 'remove' ? 'REMOVE A CARD' : 'UPGRADE A CARD';
    return (
      <div style={overlayStyle}>
        <div style={{ fontSize: 22, fontWeight: 'bold', color: '#ffd700', marginBottom: 4 }}>
          {label}
        </div>
        <div style={{ fontSize: 13, color: '#aaa', marginBottom: 16 }}>
          Click a card to {serviceMode === 'remove' ? 'remove it from' : 'upgrade it in'} your deck
        </div>
        <div style={deckGridStyle}>
          {deck.map((card) => {
            const dimmed = serviceMode === 'upgrade' && card.upgraded;
            return (
              <CardComponent
                key={card.instanceId}
                card={card}
                compact
                disabled={dimmed}
                onClick={dimmed ? undefined : () => handleDeckCardClick(card)}
              />
            );
          })}
        </div>
        <button
          onClick={() => setServiceMode(null)}
          style={{
            marginTop: 16,
            padding: '8px 24px',
            fontSize: 14,
            fontWeight: 'bold',
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#aaa',
            border: '2px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          BACK
        </button>
      </div>
    );
  }

  // ─── Main Shop View ─────────────────────────────────────────
  return (
    <div style={{ ...containerStyle, position: 'relative' }}>
      {/* Gold display */}
      <div style={goldDisplayStyle}>
        <span style={{ fontSize: 20 }}>&#x1FA99;</span>
        <span>{gold}</span>
      </div>

      {/* Title */}
      <div style={titleStyle}>COSMIC BAZAAR</div>
      <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>
        Spend your hard-earned gold on powerful upgrades
      </div>

      {/* Cards for sale */}
      <div style={sectionTitleStyle}>Cards</div>
      <div style={cardsRowStyle}>
        {cardItems.map((item, idx) => {
          const canAfford = gold >= item.cost;
          return (
            <div key={item.card!.id + '-' + idx} style={cardSlotStyle}>
              {item.sold && (
                <div style={soldOverlayStyle}>
                  <div style={soldTextStyle}>SOLD</div>
                </div>
              )}
              <CardComponent
                card={item.card!}
                disabled={item.sold || !canAfford}
                onClick={() => handleBuyClick(item)}
              />
              <div style={priceTagStyle(canAfford, item.sold)}>
                <span>&#x1FA99;</span>
                <span>{item.cost}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Relics for sale */}
      {relicItems.length > 0 && (
        <>
          <div style={sectionTitleStyle}>Relics</div>
          <div style={relicRowStyle}>
            {relicItems.map((item) => {
              const relic = item.relic!;
              const canAfford = gold >= item.cost;
              const isHovered = hoveredRelicId === relic.id;
              return (
                <div
                  key={relic.id}
                  style={relicItemStyle(canAfford, item.sold, isHovered)}
                  onClick={() => handleBuyClick(item)}
                  onMouseEnter={() => setHoveredRelicId(relic.id)}
                  onMouseLeave={() => setHoveredRelicId(null)}
                >
                  {item.sold && (
                    <div style={{ ...soldOverlayStyle, bottom: 0, borderRadius: 8 }}>
                      <div style={soldTextStyle}>SOLD</div>
                    </div>
                  )}
                  <div style={{ fontSize: 15, fontWeight: 'bold', color: '#ffd700', marginBottom: 6 }}>
                    {relic.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#ccc', marginBottom: 8, lineHeight: 1.4 }}>
                    {relic.description}
                  </div>
                  <div style={priceTagStyle(canAfford, item.sold)}>
                    <span>&#x1FA99;</span>
                    <span>{item.cost}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Services */}
      <div style={sectionTitleStyle}>Services</div>
      <div style={servicesRowStyle}>
        <div
          style={serviceButtonStyle(gold >= REMOVE_COST, hoveredService === 'remove')}
          onClick={() => handleServiceClick('remove')}
          onMouseEnter={() => setHoveredService('remove')}
          onMouseLeave={() => setHoveredService(null)}
        >
          <div style={{ fontSize: 24, marginBottom: 4 }}>&#x2702;&#xFE0F;</div>
          <div style={{ fontSize: 14, fontWeight: 'bold', color: '#e63946', marginBottom: 4 }}>
            Remove a Card
          </div>
          <div style={{ fontSize: 12, color: '#aaa', marginBottom: 6 }}>
            Trim your deck for consistency
          </div>
          <div style={{ fontSize: 13, fontWeight: 'bold', color: gold >= REMOVE_COST ? '#ffd700' : '#666' }}>
            <span>&#x1FA99;</span> {REMOVE_COST}
          </div>
        </div>

        <div
          style={serviceButtonStyle(gold >= UPGRADE_COST, hoveredService === 'upgrade')}
          onClick={() => handleServiceClick('upgrade')}
          onMouseEnter={() => setHoveredService('upgrade')}
          onMouseLeave={() => setHoveredService(null)}
        >
          <div style={{ fontSize: 24, marginBottom: 4 }}>&#x1F528;</div>
          <div style={{ fontSize: 14, fontWeight: 'bold', color: '#4a9eff', marginBottom: 4 }}>
            Upgrade a Card
          </div>
          <div style={{ fontSize: 12, color: '#aaa', marginBottom: 6 }}>
            Enhance a card in your deck
          </div>
          <div style={{ fontSize: 13, fontWeight: 'bold', color: gold >= UPGRADE_COST ? '#ffd700' : '#666' }}>
            <span>&#x1FA99;</span> {UPGRADE_COST}
          </div>
        </div>
      </div>

      {/* Leave button */}
      <button
        style={leaveButtonStyle}
        onClick={onLeave}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 15px rgba(255, 255, 255, 0.2)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
        }}
      >
        LEAVE SHOP
      </button>
    </div>
  );
};

export { ShopView };
export default ShopView;
