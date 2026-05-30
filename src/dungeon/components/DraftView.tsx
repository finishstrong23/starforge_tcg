import React from 'react';
import type { CardInstance } from '../types';
import { useDungeonRun } from '../context/DungeonRunContext';
import { CardComponent } from './CardComponent';
import { createCardInstance } from '../engine/draft';
import { getCardText } from '../engine/cardStats';

const ROUND_LABEL = ['First pick', 'Second pick', 'Third pick'];

export const DraftView: React.FC = () => {
  const { runState, draftRound, draftOptions, draftPicks, draftFaction, pickDraftCard } = useDungeonRun();

  const deckPreview = React.useMemo(() => {
    const grouped = new Map<string, { count: number; card: CardInstance }>();
    for (const card of [...(runState?.deck ?? []), ...draftPicks]) {
      const key = `${card.id}:${card.upgraded ? 'upgraded' : 'base'}`;
      const existing = grouped.get(key);
      if (existing) existing.count += 1;
      else grouped.set(key, { count: 1, card });
    }
    return [...grouped.values()].sort((a, b) => a.card.cost - b.card.cost || a.card.name.localeCompare(b.card.name));
  }, [runState?.deck, draftPicks]);

  const pipStyle = (active: boolean, done: boolean): React.CSSProperties => ({
    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center',
    justifyContent: 'center', fontSize: 11, fontWeight: 700,
    background: done ? '#22cc6644' : active ? '#3b8fff44' : '#1a1a2e',
    border: done ? '1.5px solid #22cc66' : active ? '1.5px solid #3b8fff' : '1.5px solid #2a2a3a',
    color: done ? '#22cc66' : active ? '#3b8fff' : '#555',
  });

  const s: Record<string, React.CSSProperties> = {
    root: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 12,
      padding: '3rem 1rem 4.75rem',
      minHeight: '100vh',
      boxSizing: 'border-box',
      background: 'radial-gradient(ellipse at top, #10101e 0%, #060610 100%)',
      color: '#f0f0f8',
    },
    header: { textAlign: 'center' },
    title: {
      fontSize: '1.4rem',
      fontWeight: 700,
      letterSpacing: '0.18em',
      margin: 0,
      textTransform: 'uppercase',
    },
    subtitle: {
      fontSize: '0.75rem',
      letterSpacing: '0.2em',
      opacity: 0.45,
      textTransform: 'uppercase',
      marginTop: 4,
    },
    progressRow: {
      display: 'flex',
      gap: 10,
    },
    content: {
      width: '100%',
      maxWidth: 1260,
      display: 'flex',
      gap: 20,
      alignItems: 'flex-start',
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    choices: {
      flex: '1 1 680px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      gap: 12,
      maxWidth: 780,
    },
    label: {
      fontSize: '0.7rem',
      letterSpacing: '0.25em',
      opacity: 0.4,
      textTransform: 'uppercase',
    },
    cardGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 158px))',
      gap: 14,
      justifyContent: 'center',
    },
    cardWrapper: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      cursor: 'pointer',
    },
    faction: {
      fontSize: '0.72rem',
      opacity: 0.65,
      letterSpacing: '0.15em',
    },
    picksRow: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
      alignItems: 'stretch',
    },
    picksLabel: {
      fontSize: '0.65rem',
      opacity: 0.35,
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
    },
    deckPanel: {
      flex: '0 1 360px',
      maxWidth: 420,
      minWidth: 300,
      maxHeight: 'calc(100vh - 150px)',
      overflowY: 'auto',
      padding: '14px 16px',
      border: '1px solid #24243a',
      borderRadius: 6,
      background: 'linear-gradient(180deg, rgba(18,18,32,0.88), rgba(8,8,16,0.88))',
      boxShadow: '0 18px 44px rgba(0,0,0,0.28)',
    },
    panelTitle: {
      fontSize: 10,
      letterSpacing: '0.22em',
      textTransform: 'uppercase',
      color: '#8fd5ff',
      marginBottom: 8,
      fontWeight: 800,
    },
    panelHint: {
      fontSize: 11,
      lineHeight: 1.45,
      color: '#9aa0b8',
      marginBottom: 12,
    },
    pickedCard: {
      padding: '8px 9px',
      border: '1px solid #2d5f8a',
      borderRadius: 4,
      background: 'rgba(35, 80, 120, 0.18)',
      minWidth: 150,
      flex: '1 1 150px',
    },
    pickedName: {
      fontSize: 12,
      fontWeight: 800,
      color: '#ffffff',
      marginBottom: 3,
    },
    pickedText: {
      fontSize: 10,
      lineHeight: 1.35,
      color: '#cbd3e6',
    },
    deckRow: {
      display: 'grid',
      gridTemplateColumns: '28px 1fr auto',
      gap: 8,
      alignItems: 'baseline',
      padding: '6px 0',
      borderTop: '1px solid rgba(255,255,255,0.07)',
      fontSize: 11,
    },
    deckCount: {
      color: '#aeb7cc',
      fontWeight: 800,
    },
    deckName: {
      color: '#f0f3ff',
      fontWeight: 700,
    },
    deckMeta: {
      color: '#7f879b',
      fontSize: 10,
    },
  };

  if (draftOptions.length === 0) {
    return (
      <div style={s.root}>
        <div style={s.title}>Preparing draft...</div>
      </div>
    );
  }

  return (
    <div style={s.root}>
      <div style={s.header}>
        <h2 style={s.title}>Draft Your Deck</h2>
        <div style={s.subtitle}>
          {draftFaction ? `${draftFaction} - ` : ''}
          {ROUND_LABEL[draftRound - 1] ?? `Round ${draftRound}`}
        </div>
      </div>

      <div style={s.progressRow}>
        {[1, 2, 3].map((r) => (
          <div key={r} style={pipStyle(r === draftRound, r < draftRound)}>
            {r < draftRound ? 'OK' : r}
          </div>
        ))}
      </div>

      <div style={s.content}>
        <div style={s.choices}>
          <div style={s.label}>Pick one card</div>
          <div style={s.cardGrid}>
            {draftOptions.map((def) => {
              const instance = createCardInstance(def);
              return (
                <div
                  key={def.id}
                  style={s.cardWrapper}
                  onClick={() => pickDraftCard(def)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') pickDraftCard(def); }}
                >
                  <CardComponent card={instance} selectable size="draft" />
                  <div style={s.faction}>{def.faction} - {def.rarity}</div>
                </div>
              );
            })}
          </div>

          <div style={s.picksLabel}>Picked this draft</div>
          <div style={s.picksRow}>
            {draftPicks.length === 0 ? (
              <div style={s.panelHint}>Your three picks will appear here before the run begins.</div>
            ) : draftPicks.map((card) => (
              <div key={card.instanceId} style={s.pickedCard}>
                <div style={s.pickedName}>{card.name}</div>
                <div style={s.pickedText}>{getCardText(card)}</div>
              </div>
            ))}
          </div>
        </div>

        <aside style={s.deckPanel} aria-label="Current draft deck">
          <div style={s.panelTitle}>Your deck - {(runState?.deck.length ?? 0) + draftPicks.length} cards</div>
          <div style={s.panelHint}>
            You start with the faction starter deck. Your 3 draft picks are added to it before Act 1.
          </div>
          {deckPreview.map(({ count, card }) => (
            <div key={`${card.id}-${card.upgraded ? 'upgraded' : 'base'}`} style={s.deckRow}>
              <span style={s.deckCount}>x{count}</span>
              <span style={s.deckName}>{card.name}{card.upgraded ? '+' : ''}</span>
              <span style={s.deckMeta}>{card.type} - {card.cost}</span>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
};
