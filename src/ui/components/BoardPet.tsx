/**
 * STARFORGE TCG - Board Pet Component (8.3.2)
 *
 * Renders the player's equipped pet on the game board:
 * - Positioned on the player's side of the board
 * - Animated idle behaviors
 * - Reacts to game events
 * - Shows evolution stage for legendary pets
 * - Opponent can see your pet
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  PetMood,
  PetGameEvent,
  getPetReaction,
  getPetAnimation,
  getPetEvolutionEmoji,
  getEquippedPet,
  loadPetData,
  addPetExperience,
  ALL_PETS,
  type PetDefinition,
  type PetSaveData,
  PetRarity,
} from '../../cosmetics/BoardPets';

interface BoardPetProps {
  /** Which side of the board */
  side: 'player' | 'opponent';
  /** Pet definition override (for opponent's pet) */
  petOverride?: PetDefinition | null;
}

export const BoardPet: React.FC<BoardPetProps> = ({ side, petOverride }) => {
  const [petData, setPetData] = useState<PetSaveData>(() => loadPetData());
  const [mood, setMood] = useState<PetMood>(PetMood.IDLE);
  const [animText, setAnimText] = useState<string>('');
  const [showBubble, setShowBubble] = useState(false);
  const [bobOffset, setBobOffset] = useState(0);
  const moodTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const bobTimerRef = useRef<ReturnType<typeof setInterval>>();

  const pet = petOverride || getEquippedPet(petData);
  if (!pet) return null;

  const experience = petData.petExperience[pet.id] || 0;
  const displayEmoji = getPetEvolutionEmoji(pet, experience);

  // Idle bobbing animation
  useEffect(() => {
    let tick = 0;
    bobTimerRef.current = setInterval(() => {
      tick += 1;
      setBobOffset(Math.sin(tick * 0.15) * 4);
    }, 50);
    return () => { if (bobTimerRef.current) clearInterval(bobTimerRef.current); };
  }, []);

  // Random idle animations
  useEffect(() => {
    const idleInterval = setInterval(() => {
      if (mood === PetMood.IDLE) {
        const anim = getPetAnimation(pet, PetMood.IDLE);
        setAnimText(anim);
        setShowBubble(true);
        setTimeout(() => setShowBubble(false), 2000);
      }
    }, 5000 + Math.random() * 5000);

    return () => clearInterval(idleInterval);
  }, [pet, mood]);

  // Reset mood after a delay
  const triggerMood = useCallback((newMood: PetMood) => {
    setMood(newMood);
    const anim = getPetAnimation(pet, newMood);
    setAnimText(anim);
    setShowBubble(true);

    if (moodTimerRef.current) clearTimeout(moodTimerRef.current);
    moodTimerRef.current = setTimeout(() => {
      setMood(PetMood.IDLE);
      setShowBubble(false);
    }, 2500);
  }, [pet]);

  // Expose event handler via data attribute for parent components
  useEffect(() => {
    const handler = (e: CustomEvent<{ event: PetGameEvent }>) => {
      const reaction = getPetReaction(e.detail.event);
      triggerMood(reaction);
    };

    window.addEventListener('pet-event' as any, handler);
    return () => window.removeEventListener('pet-event' as any, handler);
  }, [triggerMood]);

  const isLegendary = pet.rarity === PetRarity.LEGENDARY;
  const moodEmoji = getMoodEmoji(mood);

  return (
    <div
      style={{
        ...st.petContainer,
        bottom: side === 'player' ? 90 : undefined,
        top: side === 'opponent' ? 90 : undefined,
        right: 16,
        transform: `translateY(${bobOffset}px)`,
      }}
      data-pet-id={pet.id}
      onClick={() => triggerMood(PetMood.HAPPY)}
    >
      {/* Pet emoji with glow */}
      <div style={{
        ...st.petEmoji,
        textShadow: isLegendary
          ? `0 0 12px rgba(255,215,0,0.5)`
          : `0 0 8px rgba(255,255,255,0.2)`,
        filter: mood === PetMood.SCARED ? 'hue-rotate(180deg)' : 'none',
        transform: mood === PetMood.EXCITED || mood === PetMood.CELEBRATING
          ? 'scale(1.3)' : mood === PetMood.SCARED ? 'scale(0.7)' : 'scale(1)',
        transition: 'transform 0.3s ease',
      }}>
        {displayEmoji}
      </div>

      {/* Mood indicator */}
      {mood !== PetMood.IDLE && (
        <div style={st.moodBadge}>{moodEmoji}</div>
      )}

      {/* Speech/action bubble */}
      {showBubble && animText && (
        <div style={{
          ...st.bubble,
          bottom: side === 'player' ? '100%' : undefined,
          top: side === 'opponent' ? '100%' : undefined,
        }}>
          <div style={st.bubbleText}>{animText}</div>
        </div>
      )}

      {/* Pet name tooltip on hover */}
      <div style={st.petName}>{pet.name}</div>

      {/* Evolution indicator for legendary pets */}
      {isLegendary && pet.evolves && (
        <div style={st.evolveIndicator}>
          Lv.{Math.min(Math.floor(experience / 10) + 1, 4)}
        </div>
      )}
    </div>
  );
};

/**
 * Board Pet Selector overlay
 */
interface PetSelectorProps {
  onClose: () => void;
  onSelect: (petId: string) => void;
}

export const PetSelector: React.FC<PetSelectorProps> = ({ onClose, onSelect }) => {
  const [petData] = useState<PetSaveData>(() => loadPetData());

  return (
    <div style={st.selectorOverlay} onClick={onClose}>
      <div style={st.selectorPanel} onClick={e => e.stopPropagation()}>
        <h2 style={st.selectorTitle}>Choose Your Pet</h2>
        <div style={st.petGrid}>
          {ALL_PETS.map(pet => {
            const unlocked = petData.unlockedPets.includes(pet.id);
            const equipped = petData.equippedPetId === pet.id;
            const exp = petData.petExperience[pet.id] || 0;
            const emoji = getPetEvolutionEmoji(pet, exp);

            return (
              <button
                key={pet.id}
                style={{
                  ...st.petCard,
                  opacity: unlocked ? 1 : 0.4,
                  borderColor: equipped ? '#ffd700' : unlocked ? '#4a4a6a' : '#2a2a3a',
                  cursor: unlocked ? 'pointer' : 'default',
                }}
                onClick={() => unlocked && onSelect(pet.id)}
                disabled={!unlocked}
              >
                <div style={{ fontSize: 28 }}>{emoji}</div>
                <div style={{ color: equipped ? '#ffd700' : '#ccc', fontWeight: 'bold', fontSize: 12 }}>
                  {pet.name}
                </div>
                <div style={{
                  color: pet.rarity === PetRarity.LEGENDARY ? '#ffd700'
                    : pet.rarity === PetRarity.EPIC ? '#a855f7'
                    : pet.rarity === PetRarity.RARE ? '#3b82f6'
                    : '#888',
                  fontSize: 9,
                  textTransform: 'uppercase',
                }}>
                  {pet.rarity}
                </div>
                {!unlocked && (
                  <div style={{ color: '#666', fontSize: 9, marginTop: 2 }}>
                    {pet.unlockCondition}
                  </div>
                )}
                {equipped && <div style={{ color: '#ffd700', fontSize: 9 }}>EQUIPPED</div>}
              </button>
            );
          })}
        </div>
        <button style={st.closeBtn} onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

/**
 * Fire a pet event (call from game logic)
 */
export function firePetEvent(event: PetGameEvent): void {
  window.dispatchEvent(new CustomEvent('pet-event', { detail: { event } }));
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getMoodEmoji(mood: PetMood): string {
  switch (mood) {
    case PetMood.HAPPY: return '\uD83D\uDE0A';
    case PetMood.EXCITED: return '\uD83E\uDD29';
    case PetMood.SCARED: return '\uD83D\uDE28';
    case PetMood.CHEERING: return '\uD83C\uDF89';
    case PetMood.CELEBRATING: return '\uD83C\uDF8A';
    case PetMood.MOURNING: return '\uD83D\uDE22';
    case PetMood.SLEEPING: return '\uD83D\uDCA4';
    default: return '';
  }
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const st: Record<string, React.CSSProperties> = {
  petContainer: {
    position: 'absolute',
    zIndex: 50,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer',
    userSelect: 'none',
  },
  petEmoji: {
    fontSize: 36,
    lineHeight: 1,
  },
  moodBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    fontSize: 14,
    animation: 'petMoodPop 0.3s ease-out',
  },
  bubble: {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(0,0,0,0.85)',
    borderRadius: 8,
    padding: '4px 10px',
    whiteSpace: 'nowrap',
    marginBottom: 8,
    marginTop: 8,
    border: '1px solid rgba(255,255,255,0.1)',
  },
  bubbleText: {
    color: '#ccc',
    fontSize: 10,
    fontStyle: 'italic',
  },
  petName: {
    color: '#888',
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
  },
  evolveIndicator: {
    color: '#ffd700',
    fontSize: 8,
    fontWeight: 'bold',
    background: 'rgba(255,215,0,0.15)',
    borderRadius: 4,
    padding: '1px 4px',
    marginTop: 1,
  },
  // Pet Selector
  selectorOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  selectorPanel: {
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    borderRadius: 16,
    border: '1px solid rgba(255,215,0,0.2)',
    padding: 24,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80vh',
    overflow: 'auto',
    color: '#fff',
  },
  selectorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffd700',
    textAlign: 'center',
    margin: '0 0 16px',
  },
  petGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
    gap: 8,
  },
  petCard: {
    padding: 10,
    borderRadius: 8,
    border: '2px solid #4a4a6a',
    background: 'rgba(0,0,0,0.3)',
    textAlign: 'center',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  closeBtn: {
    display: 'block',
    width: '100%',
    marginTop: 16,
    background: 'linear-gradient(135deg, #ffd700 0%, #ff8c00 100%)',
    color: '#000',
    border: 'none',
    padding: '12px 0',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};
