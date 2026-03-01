/**
 * STARFORGE TCG - Keyword Glossary
 *
 * In-game reference for all 21 keywords. Accessible from tutorial,
 * main menu, and during gameplay. Organized by category with
 * search and filter functionality.
 */

import React, { useState, useMemo } from 'react';

interface KeywordEntry {
  name: string;
  category: 'combat' | 'trigger' | 'original';
  description: string;
  example: string;
  color: string;
}

const KEYWORDS: KeywordEntry[] = [
  // Combat Keywords
  { name: 'GUARDIAN', category: 'combat', description: 'Enemies must attack this minion before attacking others.', example: 'A 2/6 Guardian protects your weaker minions.', color: '#4488ff' },
  { name: 'BARRIER', category: 'combat', description: 'Absorbs the first instance of damage taken, then breaks.', example: 'A 3/3 with Barrier survives its first hit unscathed.', color: '#ffaa00' },
  { name: 'SWIFT', category: 'combat', description: 'Can attack enemy minions immediately when played (not heroes).', example: 'Play a 4/2 Swift to trade into an enemy minion right away.', color: '#00cc88' },
  { name: 'BLITZ', category: 'combat', description: 'Can attack anything immediately when played, including the enemy hero.', example: 'A 6/4 Blitz can go face the turn it\'s played.', color: '#ff4444' },
  { name: 'CLOAK', category: 'combat', description: 'Cannot be attacked or targeted until this minion attacks.', example: 'A cloaked assassin can safely wait for the perfect moment.', color: '#8844ff' },
  { name: 'DOUBLE STRIKE', category: 'combat', description: 'Can attack twice per turn.', example: 'A 3/5 Double Strike deals 6 total damage per turn.', color: '#ff8800' },
  { name: 'DRAIN', category: 'combat', description: 'Damage dealt by this minion heals your hero.', example: 'A 4/3 Drain that hits face heals you for 4.', color: '#44ff88' },
  { name: 'LETHAL', category: 'combat', description: 'Destroys any minion it deals damage to, regardless of health.', example: 'A 1/1 Lethal can kill a 10/10.', color: '#ff0066' },

  // Trigger Keywords
  { name: 'DEPLOY', category: 'trigger', description: 'Triggers an effect when played from your hand.', example: 'Deploy: Deal 2 damage to a random enemy.', color: '#44aaff' },
  { name: 'LAST WORDS', category: 'trigger', description: 'Triggers an effect when this minion is destroyed.', example: 'Last Words: Summon two 1/1 tokens.', color: '#aa44ff' },

  // Original Keywords
  { name: 'SALVAGE', category: 'original', description: 'Last Words: Draw a card when this minion dies.', example: 'Trade your Salvage minion for a card draw.', color: '#88ccff' },
  { name: 'UPGRADE', category: 'original', description: 'Pay X extra mana when playing for a bonus effect.', example: 'Upgrade(3): Gain +3/+3 if you pay 3 extra mana.', color: '#ffcc00' },
  { name: 'ILLUMINATE', category: 'original', description: 'Triggers a bonus effect whenever you heal any target.', example: 'Illuminate: Deal 1 damage to a random enemy when you heal.', color: '#ffffff' },
  { name: 'IMMOLATE', category: 'original', description: 'Deals X damage to all enemies when this minion dies.', example: 'Immolate(3): Deals 3 AoE damage on death.', color: '#ff6600' },
  { name: 'BANISH', category: 'original', description: 'Removes a card from the game entirely (exile).', example: 'Banish the enemy\'s key combo piece permanently.', color: '#cc00ff' },
  { name: 'ADAPT', category: 'original', description: 'Choose 1 of 3 random bonuses when played.', example: 'Adapt might offer +3 Attack, Barrier, or Lethal.', color: '#00ffcc' },
  { name: 'RESONATE', category: 'original', description: 'Triggers an effect whenever you cast a spell.', example: 'Resonate: Gain +1 Attack each time you cast a spell.', color: '#ff44aa' },
  { name: 'PHASE', category: 'original', description: 'Cannot be targeted by spells or Hero Powers.', example: 'A Phased minion can only be removed through combat.', color: '#6644ff' },
  { name: 'SWARM', category: 'original', description: 'Gets +1/+1 for each other friendly minion on the board.', example: 'With 3 allies, a base 1/1 Swarm becomes 4/4.', color: '#88ff44' },
  { name: 'SCRY', category: 'original', description: 'Look at the top X cards of your deck and rearrange them.', example: 'Scry(3): See your next 3 draws and reorder them.', color: '#44ffff' },
  { name: 'ECHO', category: 'original', description: 'Can be played twice in one turn.', example: 'Play a 2-mana Echo minion twice for 4 mana total.', color: '#aaffaa' },
];

const CATEGORIES = [
  { id: 'all', label: 'All Keywords' },
  { id: 'combat', label: 'Combat' },
  { id: 'trigger', label: 'Triggers' },
  { id: 'original', label: 'Original' },
];

interface KeywordGlossaryProps {
  onClose: () => void;
}

export const KeywordGlossary: React.FC<KeywordGlossaryProps> = ({ onClose }) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [selectedKeyword, setSelectedKeyword] = useState<KeywordEntry | null>(null);

  const filtered = useMemo(() => {
    return KEYWORDS.filter(k => {
      if (category !== 'all' && k.category !== category) return false;
      if (search && !k.name.toLowerCase().includes(search.toLowerCase()) &&
          !k.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search, category]);

  return (
    <div style={glossaryStyles.overlay}>
      <div style={glossaryStyles.container}>
        {/* Header */}
        <div style={glossaryStyles.header}>
          <h2 style={glossaryStyles.title}>Keyword Glossary</h2>
          <button style={glossaryStyles.closeBtn} onClick={onClose}>X</button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search keywords..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={glossaryStyles.searchInput}
          autoFocus
        />

        {/* Category tabs */}
        <div style={glossaryStyles.tabs}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              style={{
                ...glossaryStyles.tab,
                ...(category === cat.id ? glossaryStyles.tabActive : {}),
              }}
              onClick={() => setCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Keyword list */}
        <div style={glossaryStyles.list}>
          {filtered.map(kw => (
            <div
              key={kw.name}
              style={{
                ...glossaryStyles.keywordRow,
                ...(selectedKeyword?.name === kw.name ? glossaryStyles.keywordRowActive : {}),
              }}
              onClick={() => setSelectedKeyword(selectedKeyword?.name === kw.name ? null : kw)}
            >
              <div style={glossaryStyles.keywordHeader}>
                <span style={{ ...glossaryStyles.keywordName, color: kw.color }}>{kw.name}</span>
                <span style={glossaryStyles.categoryBadge}>{kw.category}</span>
              </div>
              <p style={glossaryStyles.keywordDesc}>{kw.description}</p>
              {selectedKeyword?.name === kw.name && (
                <div style={glossaryStyles.exampleBox}>
                  <span style={glossaryStyles.exampleLabel}>Example:</span>
                  <p style={glossaryStyles.exampleText}>{kw.example}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Count */}
        <div style={glossaryStyles.footer}>
          {filtered.length} of {KEYWORDS.length} keywords shown
        </div>
      </div>
    </div>
  );
};

const glossaryStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20000,
  },
  container: {
    width: '90%',
    maxWidth: '600px',
    maxHeight: '80vh',
    background: 'linear-gradient(135deg, #1a1a3a 0%, #0a0a2a 100%)',
    border: '2px solid #333366',
    borderRadius: '16px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    color: '#00ff88',
    fontSize: '22px',
    margin: 0,
    textShadow: '0 0 10px rgba(0, 255, 136, 0.3)',
  },
  closeBtn: {
    background: '#333355',
    border: '1px solid #555577',
    borderRadius: '8px',
    color: '#aaa',
    fontSize: '16px',
    width: '36px',
    height: '36px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInput: {
    width: '100%',
    padding: '10px 14px',
    background: '#0a0a1a',
    border: '1px solid #333366',
    borderRadius: '8px',
    color: '#ccccdd',
    fontSize: '14px',
    outline: 'none',
    marginBottom: '12px',
    boxSizing: 'border-box',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  tab: {
    padding: '6px 14px',
    background: '#1a1a2e',
    border: '1px solid #333355',
    borderRadius: '6px',
    color: '#888899',
    fontSize: '12px',
    cursor: 'pointer',
  },
  tabActive: {
    background: '#333366',
    color: '#00ff88',
    borderColor: '#00ff88',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  keywordRow: {
    padding: '10px 14px',
    background: '#111128',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.15s',
    border: '1px solid transparent',
  },
  keywordRowActive: {
    background: '#1a1a40',
    borderColor: '#333366',
  },
  keywordHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  keywordName: {
    fontWeight: 'bold',
    fontSize: '15px',
    letterSpacing: '1px',
  },
  categoryBadge: {
    fontSize: '10px',
    color: '#666688',
    background: '#1a1a2e',
    padding: '2px 8px',
    borderRadius: '4px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  keywordDesc: {
    color: '#aaaacc',
    fontSize: '13px',
    margin: 0,
    lineHeight: '1.5',
  },
  exampleBox: {
    marginTop: '8px',
    padding: '8px 12px',
    background: '#0a0a1a',
    borderRadius: '6px',
    borderLeft: '3px solid #333366',
  },
  exampleLabel: {
    fontSize: '10px',
    color: '#666688',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  exampleText: {
    color: '#88aacc',
    fontSize: '13px',
    margin: '4px 0 0',
    fontStyle: 'italic',
  },
  footer: {
    textAlign: 'center',
    fontSize: '11px',
    color: '#444466',
    marginTop: '12px',
  },
};
