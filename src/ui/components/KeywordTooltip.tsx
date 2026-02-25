/**
 * STARFORGE TCG - Keyword Tooltip
 *
 * Displays keyword descriptions on hover
 */

import React from 'react';

// Keyword descriptions for tooltips
export const KEYWORD_DESCRIPTIONS: Record<string, { name: string; description: string }> = {
  // Combat Keywords
  GUARDIAN: { name: 'Guardian', description: 'Enemies must attack this minion first.' },
  BARRIER: { name: 'Barrier', description: 'Ignores the first damage received.' },
  SWIFT: { name: 'Swift', description: 'Can attack enemy minions immediately when played.' },
  BLITZ: { name: 'Blitz', description: 'Can attack anything immediately when played.' },
  CLOAK: { name: 'Cloak', description: "Can't be attacked or targeted until it attacks." },
  DOUBLE_STRIKE: { name: 'Double Strike', description: 'Can attack twice per turn.' },
  DRAIN: { name: 'Drain', description: 'Damage dealt by this minion heals your hero.' },
  LETHAL: { name: 'Lethal', description: 'Destroys any minion this damages.' },

  // Trigger Keywords
  DEPLOY: { name: 'Deploy', description: 'Effect triggers when played from hand.' },
  LAST_RITES: { name: 'Last Rites', description: 'Effect triggers when destroyed.' },

  // Original Keywords
  SALVAGE: { name: 'Salvage', description: 'Last Words: Draw a card.' },
  UPGRADE: { name: 'Upgrade', description: 'Pay extra Crystals when playing for a bonus effect.' },
  ILLUMINATE: { name: 'Illuminate', description: 'Triggers a bonus effect when you heal any target.' },
  IMMOLATE: { name: 'Immolate', description: 'Deals damage to all enemies when this dies.' },
  BANISH: { name: 'Banish', description: 'Removes a card from the game permanently.' },
  ADAPT: { name: 'Adapt', description: 'Choose 1 of 3 random bonuses.' },
  RESONATE: { name: 'Resonate', description: 'Triggers when you cast a spell.' },
  PHASE: { name: 'Phase', description: "Can't be targeted by spells or Hero Powers." },
  SWARM: { name: 'Swarm', description: 'Gets +1/+1 for each other friendly minion.' },
  SCRY: { name: 'Scry', description: 'Look at the top cards of your deck and rearrange them.' },
  ECHO: { name: 'Echo', description: 'Can be played twice in one turn.' },
  STARFORGE: { name: 'Starforge', description: 'This card transforms into a more powerful version when conditions are met.' },
};

interface KeywordTooltipProps {
  keyword: string;
  children: React.ReactNode;
}

export const KeywordTooltip: React.FC<KeywordTooltipProps> = ({ keyword, children }) => {
  const info = KEYWORD_DESCRIPTIONS[keyword];

  if (!info) {
    return <>{children}</>;
  }

  return (
    <span className="keyword-tooltip-wrapper" style={styles.wrapper}>
      {children}
      <span className="keyword-tooltip" style={styles.tooltip}>
        <strong style={styles.name}>{info.name}</strong>
        <span style={styles.description}>{info.description}</span>
      </span>
    </span>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  wrapper: {
    position: 'relative',
    display: 'inline-block',
    cursor: 'help',
  },
  tooltip: {
    position: 'absolute',
    bottom: '100%',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    border: '1px solid #ffcc00',
    borderRadius: '8px',
    padding: '8px 12px',
    minWidth: '180px',
    maxWidth: '250px',
    zIndex: 1000,
    opacity: 0,
    visibility: 'hidden',
    transition: 'opacity 0.2s, visibility 0.2s',
    pointerEvents: 'none',
    textAlign: 'center',
    marginBottom: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
  },
  name: {
    display: 'block',
    color: '#ffcc00',
    fontSize: '14px',
    marginBottom: '4px',
  },
  description: {
    display: 'block',
    color: '#ffffff',
    fontSize: '12px',
    lineHeight: '1.4',
  },
};

// CSS for hover effect (add to global.css)
export const tooltipHoverCSS = `
.keyword-tooltip-wrapper:hover .keyword-tooltip {
  opacity: 1 !important;
  visibility: visible !important;
}
`;
