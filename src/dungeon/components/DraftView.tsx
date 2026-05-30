import React from 'react';
import { useDungeonRun } from '../context/DungeonRunContext';
import { CardComponent } from './CardComponent';
import { createCardInstance } from '../engine/draft';

const ROUND_LABEL = ['First pick', 'Second pick', 'Third pick'];

export const DraftView: React.FC = () => {
  const { draftRound, draftOptions, draftPicks, draftFaction, pickDraftCard } = useDungeonRun();

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
      gap: 18,
      padding: '3.25rem 0.5rem 6.5rem',
      minHeight: '100%',
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
    label: {
      fontSize: '0.7rem',
      letterSpacing: '0.25em',
      opacity: 0.4,
      textTransform: 'uppercase',
      alignSelf: 'flex-start',
    },
    cardGrid: {
      display: 'flex',
      gap: 18,
      flexWrap: 'wrap',
      justifyContent: 'center',
      maxWidth: 850,
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
      gap: 10,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    picksLabel: {
      fontSize: '0.65rem',
      opacity: 0.35,
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      textAlign: 'center',
    },
  };

  if (draftOptions.length === 0) {
    return (
      <div style={s.root}>
        <div style={s.title}>Preparing draft…</div>
      </div>
    );
  }

  return (
    <div style={s.root}>
      <div style={s.header}>
        <h2 style={s.title}>Draft Your Deck</h2>
        <div style={s.subtitle}>
          {draftFaction ? `${draftFaction} · ` : ''}
          {ROUND_LABEL[draftRound - 1] ?? `Round ${draftRound}`}
        </div>
      </div>

      {/* Progress pips */}
      <div style={s.progressRow}>
        {[1, 2, 3].map((r) => (
          <div key={r} style={pipStyle(r === draftRound, r < draftRound)}>
            {r < draftRound ? '✓' : r}
          </div>
        ))}
      </div>

      {/* Card options */}
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
              <div style={s.faction}>{def.faction} · {def.rarity}</div>
            </div>
          );
        })}
      </div>

      {/* Previous picks */}
      {draftPicks.length > 0 && (
        <>
          <div style={s.picksLabel}>Picked so far</div>
          <div style={s.picksRow}>
            {draftPicks.map((c) => (
              <CardComponent key={c.instanceId} card={c} compact />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
