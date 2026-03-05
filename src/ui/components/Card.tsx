/**
 * STARFORGE TCG - Card Component
 *
 * Renders a card with:
 * - Green glowing border when playable from hand
 * - Orange glowing border when can attack
 * - Red glowing border when valid attack target
 * - Hover popup with full card details and keyword explanations
 * - Hearthstone-style attack/health badges overlapping card edges
 * - Tribe/subtype display
 * - Buff/damage color coding on stats
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { hasKeyword } from '../../types/Card';
import type { CardInstance } from '../../types/Card';
import { CombatKeyword, OriginalKeyword, TriggerKeyword } from '../../types/Keywords';
import { globalCardDatabase } from '../../cards/CardDatabase';
import { KEYWORD_DESCRIPTIONS } from './KeywordTooltip';
import { CardArt } from './CardArt';
import type { Race } from '../../types/Race';

// Card art mapping (emoji-based for now, can be replaced with actual images)
const CARD_ART: Record<string, string> = {
  // Neutral
  'neutral_stellar_scout': '🔭',
  'neutral_cosmic_courier': '📦',
  'neutral_void_walker': '🌀',
  'neutral_nebula_drake': '🐉',
  'neutral_barrier_bot': '🤖',
  'neutral_swift_runner': '🏃',

  // Cogsmiths
  'cogsmiths_': '⚙️',
  'cog_worker': '🔧',

  // Luminar
  'luminar_': '✨',
  'light_': '💡',

  // Pyroclast
  'pyroclast_': '🔥',
  'flame_': '🔥',
  'fire_': '🔥',

  // Biotitans
  'biotitans_': '🧬',
  'bio_': '🦠',

  // Crystalline
  'crystalline_': '💎',
  'crystal_': '💠',

  // Default by type
  'default_minion': '👤',
  'default_spell': '✨',
  'default_structure': '🏛️',
};

function getCardArt(cardId: string, cardType?: string): string {
  // Check exact match first
  if (CARD_ART[cardId]) return CARD_ART[cardId];

  // Check prefix matches
  for (const [prefix, art] of Object.entries(CARD_ART)) {
    if (cardId.toLowerCase().includes(prefix.toLowerCase())) {
      return art;
    }
  }

  // Default by type
  if (cardType === 'SPELL') return CARD_ART['default_spell'];
  if (cardType === 'STRUCTURE') return CARD_ART['default_structure'];
  return CARD_ART['default_minion'];
}

// Tribe color mapping for visual distinction
const TRIBE_COLORS: Record<string, string> = {
  MECH: '#00ccff',
  BEAST: '#44cc44',
  ELEMENTAL: '#ff8800',
  DRAGON: '#ff2222',
  PIRATE: '#aa8855',
  DEMON: '#cc44cc',
  INSECT: '#88cc00',
  CONSTRUCT: '#8888aa',
  VOID: '#aa44ff',
};

interface CardProps {
  card: CardInstance;
  isInHand?: boolean;
  isOnBoard?: boolean;
  isEnemy?: boolean;
  canPlay?: boolean;
  canAttack?: boolean;
  isSelected?: boolean;
  isValidTarget?: boolean;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
  card,
  isInHand = false,
  isOnBoard = false,
  isEnemy = false,
  canPlay = false,
  canAttack = false,
  isSelected = false,
  isValidTarget = false,
  onClick,
  onDragStart,
  onDragEnd,
  style = {},
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [popupSide, setPopupSide] = useState<'above' | 'below'>('above');
  const [popupAlign, setPopupAlign] = useState<'center' | 'left' | 'right'>('center');
  const cardRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDraggable = isInHand && canPlay;

  // Compute popup positioning when shown
  const updatePopupPosition = useCallback(() => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    // Show below if too close to top
    setPopupSide(rect.top < 260 ? 'below' : 'above');
    // Align left/right if near screen edges
    if (rect.left < 120) {
      setPopupAlign('left');
    } else if (window.innerWidth - rect.right < 120) {
      setPopupAlign('right');
    } else {
      setPopupAlign('center');
    }
  }, []);

  // Long-press for touch devices to show popup
  const handleTouchStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      updatePopupPosition();
      setIsHovered(true);
    }, 400);
  }, [updatePopupPosition]);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    // Dismiss popup after a short delay
    if (isHovered) {
      setTimeout(() => setIsHovered(false), 1500);
    }
  }, [isHovered]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);
  const definition = globalCardDatabase.getCard(card.definitionId);
  const isMinion = card.currentAttack !== undefined;

  // Tribe from definition
  const tribe = (definition as any)?.tribe as string | undefined;
  const showTribe = tribe && tribe !== 'NONE';
  const tribeColor = tribe ? TRIBE_COLORS[tribe] || '#aaaacc' : '#aaaacc';

  // Stat color coding: green=buffed, red=damaged, white=normal
  const baseAttack = definition?.attack ?? 0;
  const baseHealth = definition?.health ?? 0;
  const currentAttack = card.currentAttack ?? 0;
  const currentHealth = card.currentHealth ?? 0;
  const attackColor = currentAttack > baseAttack ? '#00ff44' : currentAttack < baseAttack ? '#ff4444' : '#000000';
  const healthTextColor = currentHealth < baseHealth ? '#ff4444' : currentHealth > baseHealth ? '#00ff44' : '#ffffff';

  // Determine border/glow style
  let borderColor = '#444466';
  let glowClass = '';
  let boxShadow = 'none';

  if (isValidTarget) {
    borderColor = '#ff0066';
    boxShadow = '0 0 10px #ff0066, 0 0 20px #ff0066, 0 0 30px #ff0066';
    glowClass = 'target-glow';
  } else if (isSelected) {
    borderColor = '#ffcc00';
    boxShadow = '0 0 10px #ffcc00, 0 0 20px #ffcc00';
  } else if (canAttack && !isEnemy) {
    borderColor = '#ff6600';
    boxShadow = '0 0 10px #ff6600, 0 0 20px #ff6600, 0 0 30px #ff6600';
    glowClass = 'can-attack-glow';
  } else if (canPlay) {
    borderColor = '#00ff88';
    boxShadow = '0 0 10px #00ff88, 0 0 20px #00ff88, 0 0 30px #00ff88';
    glowClass = 'playable-glow';
  }

  // Rarity color
  const rarityColors: Record<string, string> = {
    COMMON: '#9d9d9d',
    RARE: '#0070dd',
    EPIC: '#a335ee',
    LEGENDARY: '#ff8000',
  };
  const rarityColor = rarityColors[definition?.rarity || 'COMMON'];

  // Get keywords for display
  const cardKeywords: string[] = [];
  if (hasKeyword(card, CombatKeyword.GUARDIAN)) cardKeywords.push('GUARDIAN');
  if (hasKeyword(card, CombatKeyword.BARRIER)) cardKeywords.push('BARRIER');
  if (hasKeyword(card, CombatKeyword.SWIFT)) cardKeywords.push('SWIFT');
  if (hasKeyword(card, CombatKeyword.BLITZ)) cardKeywords.push('BLITZ');
  if (hasKeyword(card, CombatKeyword.DRAIN)) cardKeywords.push('DRAIN');
  if (hasKeyword(card, CombatKeyword.LETHAL)) cardKeywords.push('LETHAL');
  if (hasKeyword(card, CombatKeyword.CLOAK)) cardKeywords.push('CLOAK');
  if (hasKeyword(card, CombatKeyword.DOUBLE_STRIKE)) cardKeywords.push('DOUBLE_STRIKE');
  if (hasKeyword(card, TriggerKeyword.DEPLOY)) cardKeywords.push('DEPLOY');
  if (hasKeyword(card, TriggerKeyword.LAST_WORDS)) cardKeywords.push('LAST_WORDS');
  if (hasKeyword(card, OriginalKeyword.SALVAGE)) cardKeywords.push('SALVAGE');

  const keywordIcons: Record<string, string> = {
    GUARDIAN: '🛡️',
    BARRIER: '✨',
    SWIFT: '⚡',
    BLITZ: '💨',
    DRAIN: '💜',
    LETHAL: '☠️',
    CLOAK: '👻',
    DOUBLE_STRIKE: '⚔️',
    DEPLOY: '📥',
    LAST_WORDS: '💀',
    SALVAGE: '♻️',
  };

  const cardArt = getCardArt(card.definitionId, definition?.type);

  const cardStyles: React.CSSProperties = {
    ...styles.card,
    ...(isInHand ? styles.cardInHand : {}),
    ...(isOnBoard ? styles.cardOnBoard : {}),
    border: `3px solid ${borderColor}`,
    boxShadow,
    cursor: onClick ? 'pointer' : 'default',
    ...style,
  };

  // Barrier visual
  const showBarrier = card.hasBarrier;

  // STARFORGED visual — cosmic golden-purple glow with pulsing effect
  const isForged = card.isForged;
  if (isForged) {
    borderColor = '#ffcc00';
    boxShadow = '0 0 12px #ffcc00, 0 0 24px #ff8800, 0 0 40px #ff4400, 0 0 60px rgba(160, 60, 255, 0.4)';
  }

  return (
    <div
      ref={cardRef}
      style={{
        position: 'relative',
        display: 'inline-block',
        opacity: isDragging ? 0.4 : 1,
        transition: 'opacity 0.15s ease',
      }}
      draggable={isDraggable}
      onDragStart={(e) => {
        if (!isDraggable) { e.preventDefault(); return; }
        setIsDragging(true);
        setIsHovered(false);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', card.instanceId);
        onDragStart?.(e);
      }}
      onDragEnd={(e) => {
        setIsDragging(false);
        onDragEnd?.(e);
      }}
      onMouseEnter={() => { if (!isDragging) { updatePopupPosition(); setIsHovered(true); } }}
      onMouseLeave={() => { setIsHovered(false); }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Main Card */}
      <div
        style={{
          ...cardStyles,
          ...(isForged ? {
            border: `3px solid #ffcc00`,
            boxShadow: '0 0 12px #ffcc00, 0 0 24px #ff8800, 0 0 40px #ff4400, 0 0 60px rgba(160, 60, 255, 0.4)',
            background: 'linear-gradient(135deg, #3a2800 0%, #1a0f2e 50%, #2a1a00 100%)',
          } : {}),
        }}
        className={glowClass}
        onClick={(e) => {
          e.stopPropagation();
          if (isInHand) {
            // In hand: click to preview, NOT to play
            setShowPreview(prev => !prev);
          } else {
            // On board or enemy: use normal click handler (select for attack, target, etc.)
            onClick?.();
          }
        }}
      >
        {/* Barrier overlay */}
        {showBarrier && <div style={styles.barrierOverlay} />}

        {/* STARFORGED badge */}
        {isForged && (
          <div style={styles.forgedBadge}>STARFORGED</div>
        )}

        {/* Cost */}
        <div style={styles.costBadge}>
          {card.currentCost}
        </div>

        {/* Card name */}
        <div style={styles.nameArea}>
          <div style={{ ...styles.cardName, borderBottom: `2px solid ${rarityColor}` }}>
            {definition?.name || 'Unknown'}
          </div>
        </div>

        {/* Tribe badge */}
        {showTribe && (
          <div style={{ ...styles.tribeBadge, color: tribeColor }}>
            {tribe!.toLowerCase()}
          </div>
        )}

        {/* Card art area */}
        <div style={styles.artArea}>
          {card.isCloaked ? (
            <div style={styles.cloakedOverlay}>👻</div>
          ) : (
            <CardArt
              cardId={card.definitionId}
              race={(definition as any)?.race as Race | undefined}
              cardType={(definition?.type || 'MINION') as 'MINION' | 'SPELL' | 'STRUCTURE'}
              cost={card.currentCost}
              width={isInHand ? 140 : 120}
              height={isInHand ? 90 : 75}
              isForged={card.isForged}
            />
          )}
        </div>

        {/* Keywords row */}
        {cardKeywords.length > 0 && (
          <div style={styles.keywordRow}>
            {cardKeywords.slice(0, 3).map(kw => keywordIcons[kw] || '').join('')}
          </div>
        )}

        {/* Card text for spells (simplified) */}
        {!isMinion && isInHand && (
          <div style={styles.spellText}>
            {definition?.cardText?.slice(0, 30) || ''}
          </div>
        )}

        {/* Attack/Health badges - absolute positioned, Hearthstone-style */}
        {isMinion && (
          <>
            <div style={{ ...styles.attackBadge, color: attackColor }}>
              {currentAttack}
            </div>
            <div style={{ ...styles.healthBadge, color: healthTextColor }}>
              {currentHealth}
            </div>
          </>
        )}
      </div>

      {/* Full Card Preview Overlay (click in hand to see) */}
      {showPreview && isInHand && (
        <div
          style={styles.previewOverlay}
          onClick={(e) => {
            e.stopPropagation();
            setShowPreview(false);
          }}
        >
          <div style={styles.previewCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.previewHeader}>
              <span style={styles.previewCost}>{card.currentCost}</span>
              <span style={styles.previewName}>{definition?.name || 'Unknown'}</span>
            </div>

            <div style={styles.previewArtArea}>
              <CardArt
                cardId={card.definitionId}
                race={(definition as any)?.race as Race | undefined}
                cardType={(definition?.type || 'MINION') as 'MINION' | 'SPELL' | 'STRUCTURE'}
                cost={card.currentCost}
                width={360}
                height={180}
                isForged={card.isForged}
              />
            </div>

            {isMinion && (
              <div style={styles.previewStats}>
                <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#ffcc00' }}>
                  ⚔️ {currentAttack}
                </span>
                <span style={{ fontSize: '28px', fontWeight: 'bold', color: '#ff4444' }}>
                  ❤️ {currentHealth}
                </span>
              </div>
            )}

            {showTribe && (
              <div style={{ textAlign: 'center', fontSize: '16px', color: tribeColor, fontWeight: 'bold', marginBottom: '8px' }}>
                ⬡ {tribe!.charAt(0) + tribe!.slice(1).toLowerCase()}
              </div>
            )}

            <div style={{ textAlign: 'center', fontSize: '15px', color: rarityColor, marginBottom: '10px' }}>
              {definition?.rarity}
            </div>

            {definition?.cardText && (
              <div style={styles.previewText}>{definition.cardText}</div>
            )}

            {cardKeywords.length > 0 && (
              <div style={styles.previewKeywords}>
                {cardKeywords.map(kw => {
                  const info = KEYWORD_DESCRIPTIONS[kw];
                  return info ? (
                    <div key={kw} style={{ marginBottom: '8px' }}>
                      <span style={{ fontSize: '17px', color: '#ffcc00', fontWeight: 'bold' }}>{keywordIcons[kw]} {info.name}</span>
                      <span style={{ display: 'block', fontSize: '14px', color: '#aaa', lineHeight: '1.5' }}>{info.description}</span>
                    </div>
                  ) : null;
                })}
              </div>
            )}

            <button
              style={styles.previewClose}
              onClick={(e) => { e.stopPropagation(); setShowPreview(false); }}
            >
              Tap to close
            </button>
          </div>
        </div>
      )}

      {/* Hover Popup - Large card with details */}
      {isHovered && !showPreview && (
        <div style={{
          ...styles.hoverPopup,
          ...(popupSide === 'below' ? { top: '100%', bottom: 'auto', marginTop: '10px', marginBottom: 0 } : {}),
          ...(popupAlign === 'left' ? { left: 0, transform: 'none' } : {}),
          ...(popupAlign === 'right' ? { left: 'auto', right: 0, transform: 'none' } : {}),
        }}>
          <div style={styles.popupHeader}>
            <span style={styles.popupCost}>{card.currentCost}</span>
            <span style={styles.popupName}>{definition?.name || 'Unknown'}</span>
          </div>

          <div style={styles.popupArt}>
            <CardArt
              cardId={card.definitionId}
              race={(definition as any)?.race as Race | undefined}
              cardType={(definition?.type || 'MINION') as 'MINION' | 'SPELL' | 'STRUCTURE'}
              cost={card.currentCost}
              width={196}
              height={100}
              isForged={card.isForged}
            />
          </div>

          {isMinion && (
            <div style={styles.popupStats}>
              <span style={{ ...styles.popupAttack, color: currentAttack > baseAttack ? '#00ff44' : '#ffcc00' }}>
                ⚔️ {currentAttack}
              </span>
              <span style={{ ...styles.popupHealth, color: currentHealth < baseHealth ? '#ff4444' : currentHealth > baseHealth ? '#00ff44' : '#ff4444' }}>
                ❤️ {currentHealth}
              </span>
            </div>
          )}

          {/* Tribe in popup */}
          {showTribe && (
            <div style={styles.popupTribe}>
              <span style={{ color: tribeColor }}>⬡ {tribe!.charAt(0) + tribe!.slice(1).toLowerCase()}</span>
            </div>
          )}

          <div style={styles.popupRarity}>
            <span style={{ color: rarityColor }}>{definition?.rarity}</span>
          </div>

          {isForged && (
            <div style={{
              textAlign: 'center',
              padding: '4px 8px',
              marginBottom: '6px',
              background: 'linear-gradient(90deg, rgba(255,170,0,0.2), rgba(160,60,255,0.2), rgba(255,170,0,0.2))',
              border: '1px solid #ffaa00',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 'bold',
              color: '#ffdd44',
              textShadow: '0 0 6px #ff8800',
              letterSpacing: '2px',
            }}>
              STARFORGED
              <div style={{ fontSize: '9px', color: '#cc88ff', fontWeight: 'normal', letterSpacing: '0.5px', marginTop: '2px' }}>
                2x Stats | Immune to Silence
              </div>
            </div>
          )}

          {definition?.cardText && (
            <div style={styles.popupText}>{definition.cardText}</div>
          )}

          {/* Keyword explanations */}
          {cardKeywords.length > 0 && (
            <div style={styles.popupKeywords}>
              {cardKeywords.map(kw => {
                const info = KEYWORD_DESCRIPTIONS[kw];
                return info ? (
                  <div key={kw} style={styles.keywordItem}>
                    <span style={styles.keywordName}>{keywordIcons[kw]} {info.name}</span>
                    <span style={styles.keywordDesc}>{info.description}</span>
                  </div>
                ) : null;
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  card: {
    position: 'relative',
    width: '110px',
    height: '155px',
    background: 'linear-gradient(135deg, #2a2a4a 0%, #1a1a3a 100%)',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'visible',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    userSelect: 'none',
  },
  cardInHand: {
    width: '130px',
    height: '185px',
  },
  cardOnBoard: {
    width: '110px',
    height: '155px',
  },
  barrierOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    border: '3px solid #ffdd00',
    borderRadius: '8px',
    boxShadow: 'inset 0 0 15px rgba(255, 221, 0, 0.5)',
    pointerEvents: 'none',
    zIndex: 10,
  },
  costBadge: {
    position: 'absolute',
    top: '-8px',
    left: '-8px',
    width: '36px',
    height: '36px',
    background: 'linear-gradient(135deg, #0066cc 0%, #0044aa 100%)',
    border: '2px solid #88ccff',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#ffffff',
    zIndex: 20,
  },
  nameArea: {
    padding: '22px 6px 2px 6px',
    textAlign: 'center',
  },
  cardName: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#ffffff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    paddingBottom: '2px',
  },
  tribeBadge: {
    fontSize: '10px',
    textAlign: 'center',
    textTransform: 'capitalize',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    padding: '0 5px',
    lineHeight: '1',
  },
  artArea: {
    flex: 1,
    background: 'linear-gradient(135deg, #1a1a2e 0%, #252540 100%)',
    margin: '3px',
    borderRadius: '4px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cardArtEmoji: {
    fontSize: '32px',
  },
  cloakedOverlay: {
    fontSize: '30px',
    opacity: 0.5,
  },
  keywordRow: {
    fontSize: '15px',
    textAlign: 'center',
    padding: '3px 0',
  },
  // Hearthstone-style stat badges - absolute positioned, overlapping card edges
  attackBadge: {
    position: 'absolute',
    bottom: '-10px',
    left: '-10px',
    width: '38px',
    height: '38px',
    background: 'linear-gradient(135deg, #ffcc00 0%, #cc9900 100%)',
    border: '2px solid #ffee88',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '20px',
    fontWeight: 'bold',
    zIndex: 20,
    boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
  },
  healthBadge: {
    position: 'absolute',
    bottom: '-10px',
    right: '-10px',
    width: '38px',
    height: '38px',
    background: 'linear-gradient(135deg, #cc2222 0%, #aa0000 100%)',
    border: '2px solid #ff6666',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '20px',
    fontWeight: 'bold',
    zIndex: 20,
    boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
  },
  spellText: {
    fontSize: '11px',
    color: '#aaaaaa',
    textAlign: 'center',
    padding: '5px',
    lineHeight: '1.3',
  },
  forgedBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%) rotate(-12deg)',
    fontSize: '8px',
    fontWeight: 'bold',
    color: '#ffdd44',
    textShadow: '0 0 8px #ffaa00, 0 0 16px #ff6600, 0 0 24px rgba(160, 60, 255, 0.6)',
    letterSpacing: '1.5px',
    zIndex: 15,
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  },
  // Full card preview overlay
  previewOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.85)',
    zIndex: 2000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(4px)',
    pointerEvents: 'auto',
  },
  previewCard: {
    width: '420px',
    maxWidth: '95vw',
    maxHeight: '90vh',
    background: 'linear-gradient(135deg, #1a1a3a 0%, #0a0a2a 100%)',
    border: '3px solid #ffcc00',
    borderRadius: '16px',
    padding: '24px',
    overflowY: 'auto',
    boxShadow: '0 0 40px rgba(255, 204, 0, 0.3), 0 20px 60px rgba(0, 0, 0, 0.8)',
  },
  previewHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    marginBottom: '16px',
  },
  previewCost: {
    width: '52px',
    height: '52px',
    background: 'linear-gradient(135deg, #0066cc 0%, #0044aa 100%)',
    border: '3px solid #88ccff',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#ffffff',
    flexShrink: 0,
  },
  previewName: {
    fontSize: '26px',
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  previewArtArea: {
    textAlign: 'center',
    padding: '12px 0',
    background: 'linear-gradient(135deg, #252540 0%, #1a1a30 100%)',
    borderRadius: '10px',
    marginBottom: '12px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewStats: {
    display: 'flex',
    justifyContent: 'center',
    gap: '40px',
    marginBottom: '12px',
  },
  previewText: {
    fontSize: '18px',
    color: '#cccccc',
    textAlign: 'center',
    padding: '14px 16px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '8px',
    marginBottom: '14px',
    lineHeight: '1.6',
  },
  previewKeywords: {
    borderTop: '1px solid #444466',
    paddingTop: '12px',
    marginBottom: '12px',
  },
  previewClose: {
    width: '100%',
    padding: '12px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '8px',
    color: '#888',
    fontSize: '16px',
    cursor: 'pointer',
    textAlign: 'center',
  },
  // Hover popup styles
  hoverPopup: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '280px',
    maxWidth: 'calc(100vw - 20px)',
    background: 'linear-gradient(135deg, #1a1a3a 0%, #0a0a2a 100%)',
    border: '2px solid #ffcc00',
    borderRadius: '12px',
    padding: '14px',
    zIndex: 1000,
    marginBottom: '10px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
    pointerEvents: 'none',
  },
  popupHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  popupCost: {
    width: '34px',
    height: '34px',
    background: 'linear-gradient(135deg, #0066cc 0%, #0044aa 100%)',
    border: '2px solid #88ccff',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#ffffff',
    flexShrink: 0,
  },
  popupName: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  popupArt: {
    fontSize: '48px',
    textAlign: 'center',
    padding: '10px 0',
    background: 'linear-gradient(135deg, #252540 0%, #1a1a30 100%)',
    borderRadius: '8px',
    marginBottom: '8px',
  },
  popupStats: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    marginBottom: '4px',
  },
  popupAttack: {
    fontSize: '18px',
    color: '#ffcc00',
    fontWeight: 'bold',
  },
  popupHealth: {
    fontSize: '18px',
    color: '#ff4444',
    fontWeight: 'bold',
  },
  popupTribe: {
    textAlign: 'center',
    fontSize: '13px',
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  popupRarity: {
    textAlign: 'center',
    fontSize: '12px',
    marginBottom: '8px',
    textTransform: 'capitalize',
  },
  popupText: {
    fontSize: '14px',
    color: '#cccccc',
    textAlign: 'center',
    padding: '10px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '6px',
    marginBottom: '8px',
    lineHeight: '1.5',
  },
  popupKeywords: {
    borderTop: '1px solid #444466',
    paddingTop: '8px',
  },
  keywordItem: {
    marginBottom: '6px',
  },
  keywordName: {
    display: 'block',
    fontSize: '12px',
    color: '#ffcc00',
    fontWeight: 'bold',
  },
  keywordDesc: {
    display: 'block',
    fontSize: '10px',
    color: '#aaaaaa',
    lineHeight: '1.3',
  },
};
