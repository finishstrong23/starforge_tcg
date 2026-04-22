import React, { useMemo, useState } from 'react';
import { DungeonRunProvider } from '../context/DungeonRunContext';
import {
  STARTER_DECKS,
  CARD_BY_ID,
  type FactionId,
  type StarterDeck,
  type Card,
} from '../../roguelite';

interface DungeonRootProps {
  onBack: () => void;
}

// Faction presentation (name, mechanic summary, accent color, glyph).
// Lives in the UI layer because it's display metadata, not game data.
const FACTIONS: Array<{
  id: FactionId;
  glyph: string;
  accent: string;
  tagline: string;
  mechanic: string;
  mechanicSummary: string;
  difficulty: string;
}> = [
  {
    id: 'Pyroclast',
    glyph: '🔥',
    accent: '#ff5a2e',
    tagline: 'Volcanic-born war-creatures.',
    mechanic: 'Heat',
    mechanicSummary:
      'Stockpile Heat (0–12) to unleash scaling finishers. Overheat at 10+ for risk/reward pressure.',
    difficulty: 'Low floor · High ceiling',
  },
  {
    id: 'Luminar',
    glyph: '☀',
    accent: '#f5d67a',
    tagline: 'Star-priests, celestial channelers.',
    mechanic: 'Lumens / Channel',
    mechanicSummary:
      'Channel cards gain Lumens while held. Release for scaling effect — patience is worship.',
    difficulty: 'High ceiling · Deferred payoff',
  },
  {
    id: 'Cogsmiths',
    glyph: '⚙',
    accent: '#4aa8e0',
    tagline: 'Artificer engineers. Modular warbands.',
    mechanic: 'Augments',
    mechanicSummary:
      'Attach Augments to cards permanently. Deck-level deckbuilding inside the deckbuilder.',
    difficulty: 'Late-bloomer · Run-scaling',
  },
  {
    id: 'WarpRiders',
    glyph: '✦',
    accent: '#c27dff',
    tagline: 'Dimensional raiders. Riders of the rift.',
    mechanic: 'Flux',
    mechanicSummary:
      'Cards have A/B/C states that re-roll every turn. Lock, Reroll, and Rift the chaos into your weapon.',
    difficulty: 'High variance · Skill-capped',
  },
];

const s = {
  root: {
    width: '100%',
    minHeight: '100vh',
    background: 'radial-gradient(ellipse at top, #141424 0%, #0a0a16 55%, #060610 100%)',
    color: '#f2f2f6',
    fontFamily: 'var(--font-family, system-ui, sans-serif)',
    padding: '2.5rem 2rem 3rem',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  } as React.CSSProperties,
  headerRow: {
    width: '100%',
    maxWidth: '1200px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
  },
  titleBlock: { display: 'flex', flexDirection: 'column', gap: '0.35rem' } as React.CSSProperties,
  title: {
    fontSize: '2.2rem',
    letterSpacing: '0.18em',
    margin: 0,
    fontWeight: 600,
  },
  subtitle: {
    opacity: 0.55,
    letterSpacing: '0.08em',
    fontSize: '0.85rem',
    margin: 0,
    textTransform: 'uppercase',
  },
  backBtn: {
    padding: '0.55rem 1.1rem',
    background: 'transparent',
    border: '1px solid #3a3a52',
    color: '#d0d0d8',
    cursor: 'pointer',
    letterSpacing: '0.12em',
    fontSize: '0.8rem',
    borderRadius: '3px',
  },
  sectionLabel: {
    width: '100%',
    maxWidth: '1200px',
    fontSize: '0.75rem',
    letterSpacing: '0.25em',
    opacity: 0.4,
    textTransform: 'uppercase',
    marginBottom: '0.75rem',
  },
  grid: {
    width: '100%',
    maxWidth: '1200px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  card: (accent: string, selected: boolean): React.CSSProperties => ({
    background: selected
      ? `linear-gradient(135deg, ${accent}22, #141428 70%)`
      : 'linear-gradient(135deg, #12121e, #0b0b14)',
    border: selected ? `1px solid ${accent}` : '1px solid #222236',
    borderRadius: '6px',
    padding: '1.25rem 1.25rem 1.1rem',
    cursor: 'pointer',
    transition: 'border-color 120ms ease, transform 120ms ease',
    transform: selected ? 'translateY(-2px)' : 'none',
    boxShadow: selected ? `0 0 0 1px ${accent}33, 0 14px 40px -20px ${accent}88` : 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
  }),
  cardHeader: { display: 'flex', alignItems: 'center', gap: '0.7rem' },
  cardGlyph: (accent: string): React.CSSProperties => ({
    fontSize: '1.6rem',
    color: accent,
    width: '2rem',
    textAlign: 'center',
  }),
  cardName: { fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.05em' },
  cardTag: { fontSize: '0.8rem', opacity: 0.65 },
  cardMechanicLabel: (accent: string): React.CSSProperties => ({
    fontSize: '0.7rem',
    letterSpacing: '0.18em',
    color: accent,
    textTransform: 'uppercase',
    marginTop: '0.25rem',
  }),
  cardMechanicBody: { fontSize: '0.82rem', opacity: 0.82, lineHeight: 1.4 },
  cardFooter: {
    marginTop: '0.4rem',
    paddingTop: '0.55rem',
    borderTop: '1px solid #1e1e30',
    fontSize: '0.72rem',
    opacity: 0.55,
    letterSpacing: '0.05em',
  },
  detailPanel: {
    width: '100%',
    maxWidth: '1200px',
    background: 'linear-gradient(135deg, #12121e, #08080f)',
    border: '1px solid #222236',
    borderRadius: '6px',
    padding: '1.5rem',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem',
  },
  detailCol: { display: 'flex', flexDirection: 'column', gap: '0.75rem' } as React.CSSProperties,
  detailHeader: (accent: string): React.CSSProperties => ({
    fontSize: '0.7rem',
    letterSpacing: '0.25em',
    color: accent,
    textTransform: 'uppercase',
  }),
  characterName: { fontSize: '1.4rem', fontWeight: 600, margin: 0 },
  mechanicProse: {
    fontSize: '0.92rem',
    lineHeight: 1.6,
    opacity: 0.85,
    margin: 0,
  },
  deckList: { display: 'flex', flexDirection: 'column', gap: '0.35rem' } as React.CSSProperties,
  deckRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.5rem',
    fontSize: '0.88rem',
    padding: '0.35rem 0.55rem',
    background: '#0b0b14',
    border: '1px solid #1c1c2d',
    borderRadius: '3px',
  },
  deckCount: { fontWeight: 700, opacity: 0.7, minWidth: '1.75rem' },
  deckName: { flex: 1 },
  deckCost: { opacity: 0.55, fontSize: '0.78rem' },
  deckEffect: {
    fontSize: '0.78rem',
    opacity: 0.5,
    fontStyle: 'italic',
    marginTop: '0.1rem',
    paddingLeft: '2.25rem',
  },
  startRow: {
    width: '100%',
    maxWidth: '1200px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '1.5rem',
  },
  beginBtn: (accent: string, disabled: boolean): React.CSSProperties => ({
    padding: '0.85rem 2.2rem',
    background: disabled ? 'transparent' : `linear-gradient(180deg, ${accent}, ${accent}cc)`,
    color: disabled ? '#6a6a80' : '#0a0a16',
    border: disabled ? '1px solid #2a2a40' : `1px solid ${accent}`,
    cursor: disabled ? 'not-allowed' : 'pointer',
    letterSpacing: '0.18em',
    fontSize: '0.9rem',
    fontWeight: 700,
    borderRadius: '3px',
    textTransform: 'uppercase',
  }),
  phaseNote: {
    fontSize: '0.72rem',
    opacity: 0.5,
    letterSpacing: '0.1em',
    maxWidth: '460px',
    textAlign: 'right',
  } as React.CSSProperties,
};

// ─── Detail panel for the selected faction ──────────────────────────────────

const DeckRow: React.FC<{ count: number; card: Card }> = ({ count, card }) => (
  <div>
    <div style={s.deckRow}>
      <span style={s.deckCount}>×{count}</span>
      <span style={s.deckName}>{card.name}</span>
      <span style={s.deckCost}>
        {card.type} · Cost {card.cost}
      </span>
    </div>
    <div style={s.deckEffect}>{card.description}</div>
  </div>
);

const FactionDetail: React.FC<{
  faction: (typeof FACTIONS)[number];
  deck: StarterDeck;
}> = ({ faction, deck }) => {
  const rows = useMemo(
    () =>
      deck.cards
        .map((sdc) => ({ count: sdc.count, card: CARD_BY_ID.get(sdc.cardId) }))
        .filter((r): r is { count: number; card: Card } => !!r.card),
    [deck],
  );

  return (
    <div style={s.detailPanel}>
      <div style={s.detailCol}>
        <div style={s.detailHeader(faction.accent)}>Character</div>
        <h2 style={s.characterName}>{deck.characterName}</h2>
        <p style={s.mechanicProse}>
          <strong style={{ color: faction.accent, letterSpacing: '0.1em' }}>
            {faction.mechanic.toUpperCase()}
          </strong>
          {' — '}
          {faction.mechanicSummary}
        </p>
        <div style={{ ...s.cardFooter, marginTop: '0.5rem', borderTop: 'none', paddingTop: 0 }}>
          {faction.difficulty}
        </div>
      </div>
      <div style={s.detailCol}>
        <div style={s.detailHeader(faction.accent)}>Starter Deck · 10 cards</div>
        <div style={s.deckList}>
          {rows.map((r) => (
            <DeckRow key={r.card.id} count={r.count} card={r.card} />
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Root ───────────────────────────────────────────────────────────────────

export const DungeonRoot: React.FC<DungeonRootProps> = ({ onBack }) => {
  const [selectedId, setSelectedId] = useState<FactionId>('Pyroclast');
  const selected = FACTIONS.find((f) => f.id === selectedId)!;
  const selectedDeck = STARTER_DECKS[selectedId];

  return (
    <DungeonRunProvider>
      <div style={s.root}>
        <div style={s.headerRow}>
          <div style={s.titleBlock}>
            <h1 style={s.title}>DUNGEON RUN</h1>
            <p style={s.subtitle}>3 acts · 12 steps each · one survives</p>
          </div>
          <button type="button" onClick={onBack} style={s.backBtn}>
            BACK
          </button>
        </div>

        <div style={s.sectionLabel}>Choose your class</div>

        <div style={s.grid}>
          {FACTIONS.map((f) => {
            const deck = STARTER_DECKS[f.id];
            const isSelected = f.id === selectedId;
            return (
              <div
                key={f.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedId(f.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') setSelectedId(f.id);
                }}
                style={s.card(f.accent, isSelected)}
              >
                <div style={s.cardHeader}>
                  <div style={s.cardGlyph(f.accent)}>{f.glyph}</div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={s.cardName}>{f.id === 'WarpRiders' ? 'Warp Riders' : f.id}</span>
                    <span style={s.cardTag}>{f.tagline}</span>
                  </div>
                </div>
                <div style={s.cardMechanicLabel(f.accent)}>{f.mechanic}</div>
                <div style={s.cardMechanicBody}>{f.mechanicSummary}</div>
                <div style={s.cardFooter}>{deck.characterName}</div>
              </div>
            );
          })}
        </div>

        <FactionDetail faction={selected} deck={selectedDeck} />

        <div style={s.startRow}>
          <p style={s.phaseNote}>
            Card content complete (324 cards). Combat engine + 36-node map
            land in the next build phase.
          </p>
          <button
            type="button"
            disabled
            style={s.beginBtn(selected.accent, true)}
            title="Combat engine arriving in the next phase"
          >
            Begin Run
          </button>
        </div>
      </div>
    </DungeonRunProvider>
  );
};
