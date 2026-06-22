import React, { useMemo, useState } from 'react';
import { DungeonRunProvider, useDungeonRun } from '../context/DungeonRunContext';
import type { AscensionLevel, Faction } from '../types';
import { describeAscension, getMaxUnlockedAscension, recordWin as recordAscensionWin } from '../engine/ascension';
import { deriveDungeonBadges, getBadgeDefinition } from '../engine/metaProgression';
import {
  DUNGEON_FEEDBACK_EXCLUDED_FIELDS,
  DUNGEON_FEEDBACK_INCLUDED_FIELDS,
  exportDungeonFeedbackJSON,
} from '../engine/feedbackExport';
import {
  STARTER_DECKS,
  CARD_BY_ID,
  type FactionId,
  type StarterDeck,
  type Card,
} from '../../roguelite';
import { DraftView } from './DraftView';
import { BlessingView } from './BlessingView';
import { MapView } from './MapView';
import { CombatView } from './CombatView';
import { RewardView } from './RewardView';
import { RestSiteView } from './RestSiteView';
import { ShopView } from './ShopView';
import { EventView } from './EventView';
import { RelicBar } from './RelicBar';
import { DeckViewer } from './DeckViewer';
import { getDungeonSceneArt, getFactionTokenArt } from '../assets/basicTokenArt';
import { uiArt } from '../assets/artRegistry';
import { TokenArt } from './TokenArt';
import { MVP_FACTION, MVP_MODE, isMvpFaction } from '../config/mvp';

interface DungeonRootProps {
  onBack: () => void;
}

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
    glyph: 'PY',
    accent: '#ff5a2e',
    tagline: 'Volcanic-born war-creatures.',
    mechanic: 'Heat',
    mechanicSummary:
      'Build Heat, then Vent it often for damage, Block, Ignite, and tempo. Heat caps at 10; extra Heat is wasted.',
    difficulty: 'Low floor - High ceiling',
  },
  {
    id: 'Luminar',
    glyph: 'LU',
    accent: '#f5d67a',
    tagline: 'Star-priests, celestial channelers.',
    mechanic: 'Lumens / Channel',
    mechanicSummary:
      'Channel cards gain Lumens while held. Release for scaling effect - patience is worship.',
    difficulty: 'High ceiling - Deferred payoff',
  },
  {
    id: 'Cogsmiths',
    glyph: 'CO',
    accent: '#4aa8e0',
    tagline: 'Artificer engineers. Modular warbands.',
    mechanic: 'Augments',
    mechanicSummary:
      'Attach Augments to cards permanently. Deck-level deckbuilding inside the deckbuilder.',
    difficulty: 'Late-bloomer - Run-scaling',
  },
  {
    id: 'WarpRiders',
    glyph: 'WR',
    accent: '#c27dff',
    tagline: 'Dimensional raiders. Riders of the rift.',
    mechanic: 'Flux',
    mechanicSummary:
      'Cards have A/B/C states that re-roll every turn. Lock, Reroll, and Rift the chaos into your weapon.',
    difficulty: 'High variance - Skill-capped',
  },
];

const VISIBLE_FACTIONS = FACTIONS.filter((f) => isMvpFaction(f.id as Faction));

// ─── Style helpers (functions extracted so they aren't inside Record<string, CSSProperties>) ──

const selCardStyle = (accent: string, selected: boolean): React.CSSProperties => ({
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
});

const factionArtFrameStyle = (accent: string): React.CSSProperties => ({
  width: '100%',
  aspectRatio: '16 / 10',
  borderRadius: 6,
  border: `1px solid ${accent}55`,
  background: '#f4ecd8',
  overflow: 'hidden',
  marginBottom: '0.9rem',
  boxShadow: `0 8px 20px ${accent}18`,
});

const cardGlyphStyle = (accent: string): React.CSSProperties => ({
  fontSize: '1.6rem',
  color: accent,
  width: '2rem',
  textAlign: 'center',
});

const cardMechanicLabelStyle = (accent: string): React.CSSProperties => ({
  fontSize: '0.7rem',
  letterSpacing: '0.18em',
  color: accent,
  textTransform: 'uppercase',
  marginTop: '0.25rem',
});

const detailHeaderStyle = (accent: string): React.CSSProperties => ({
  fontSize: '0.7rem',
  letterSpacing: '0.25em',
  color: accent,
  textTransform: 'uppercase',
});

const beginBtnStyle = (accent: string, disabled: boolean): React.CSSProperties => ({
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
});

const s: Record<string, React.CSSProperties> = {
  root: {
    width: '100%',
    minHeight: '100vh',
    backgroundImage: [
      'linear-gradient(180deg, rgba(7,7,18,0.74), rgba(7,7,18,0.92))',
      `url("${getDungeonSceneArt('combat')}")`,
    ].join(', '),
    backgroundSize: 'cover, cover',
    backgroundPosition: 'center, center',
    backgroundRepeat: 'no-repeat',
    color: '#f2f2f6',
    fontFamily: 'var(--font-family, system-ui, sans-serif)',
    padding: '1.5rem 2rem 6.5rem',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  headerRow: {
    width: '100%',
    maxWidth: '1200px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '2rem',
  },
  titleBlock: { display: 'flex', flexDirection: 'column', gap: '0.35rem' },
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
  cardHeader: { display: 'flex', alignItems: 'center', gap: '0.7rem' },
  factionArt: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  cardName: { fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.05em' },
  cardTag: { fontSize: '0.8rem', opacity: 0.65 },
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
  detailCol: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  detailHeroArt: {
    width: '100%',
    maxHeight: 210,
    objectFit: 'cover',
    borderRadius: 6,
    border: '1px solid #222236',
    background: '#f4ecd8',
  },
  characterName: { fontSize: '1.4rem', fontWeight: 600, margin: 0 },
  mechanicProse: {
    fontSize: '0.92rem',
    lineHeight: 1.6,
    opacity: 0.85,
    margin: 0,
  },
  deckList: { display: 'flex', flexDirection: 'column', gap: '0.35rem' },
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
    position: 'fixed',
    right: 24,
    bottom: 18,
    zIndex: 130,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: '10px',
    background: 'rgba(6, 6, 16, 0.72)',
    border: '1px solid #24243a',
    borderRadius: 8,
    backdropFilter: 'blur(10px)',
    boxShadow: '0 12px 36px rgba(0,0,0,0.45)',
  },
  // Run overlay elements
  runWrap: {
    position: 'relative',
    width: '100%',
    minHeight: '100vh',
    fontFamily: 'var(--font-family, system-ui, sans-serif)',
  },
  deckBtn: {
    padding: '6px 14px',
    background: '#0e0e1e',
    border: '1px solid #2a2a3a',
    color: '#aaa',
    borderRadius: 4,
    fontSize: 10,
    cursor: 'pointer',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  abandonBtn: {
    position: 'fixed',
    top: 12,
    left: 12,
    zIndex: 120,
    padding: '5px 12px',
    background: 'transparent',
    border: '1px solid #3a1a1a',
    color: '#aa5555',
    borderRadius: 4,
    fontSize: 9,
    cursor: 'pointer',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  runOverlayStack: {
    position: 'fixed',
    right: 12,
    bottom: 10,
    zIndex: 120,
    display: 'flex',
    gap: 8,
    alignItems: 'center',
  },
  // Run end screen
  endRoot: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    minHeight: '100vh',
    backgroundColor: '#060610',
    color: '#f0f0f8',
    padding: '2rem 1rem',
    fontFamily: 'var(--font-family, system-ui, sans-serif)',
  },
  endTitle: {
    fontSize: '2.5rem',
    fontWeight: 700,
    letterSpacing: '0.25em',
    textTransform: 'uppercase',
    margin: 0,
    textAlign: 'center',
  },
  endStats: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    alignItems: 'center',
    opacity: 0.75,
    fontSize: 13,
    letterSpacing: '0.1em',
  },
  endBtn: {
    padding: '10px 28px',
    background: 'linear-gradient(180deg, #3b8fff, #1a5fcc)',
    color: '#fff',
    border: '1px solid #3b8fff',
    borderRadius: 4,
    fontWeight: 700,
    fontSize: 11,
    letterSpacing: '0.15em',
    cursor: 'pointer',
    textTransform: 'uppercase',
    marginTop: 8,
  },
};

// ─── Faction select sub-components ──────────────────────────────────────────

const DeckRow: React.FC<{ count: number; card: Card }> = ({ count, card }) => (
  <div>
    <div style={s.deckRow}>
      <span style={s.deckCount}>x{count}</span>
      <span style={s.deckName}>{card.name}</span>
      <span style={s.deckCost}>
        {card.type} - Cost {card.cost}
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
        <img
          src={getFactionTokenArt(faction.id as Faction)}
          alt=""
          aria-hidden="true"
          style={s.detailHeroArt}
        />
        <div style={detailHeaderStyle(faction.accent)}>Character</div>
        <h2 style={s.characterName}>{deck.characterName}</h2>
        <p style={s.mechanicProse}>
          <strong style={{ color: faction.accent, letterSpacing: '0.1em' }}>
            {faction.mechanic.toUpperCase()}
          </strong>
          {' - '}
          {faction.mechanicSummary}
        </p>
        <div style={{ ...s.cardFooter, marginTop: '0.5rem', borderTop: 'none', paddingTop: 0 }}>
          {faction.difficulty}
        </div>
      </div>
      <div style={s.detailCol}>
        <div style={detailHeaderStyle(faction.accent)}>Starter Deck - 10 cards</div>
        <div style={s.deckList}>
          {rows.map((r) => (
            <DeckRow key={r.card.id} count={r.count} card={r.card} />
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Run-end screen ──────────────────────────────────────────────────────────

const RunEndScreen: React.FC<{ won: boolean; onBack: () => void }> = ({ won, onBack }) => {
  const { runState, draftFaction } = useDungeonRun();
  const stats = runState?.runStats;
  const act = runState?.currentAct ?? 1;
  const ascension = runState?.ascensionLevel ?? 0;
  const badges = runState ? deriveDungeonBadges(runState, won).map(getBadgeDefinition) : [];
  const [feedbackCopied, setFeedbackCopied] = React.useState(false);

  // On a winning run, persist the ascension unlock once and remember which
  // level (if any) was newly unlocked so we can show a banner.
  const [newlyUnlocked, setNewlyUnlocked] = React.useState<AscensionLevel | null>(null);
  React.useEffect(() => {
    if (won && draftFaction) {
      const newLevel = recordAscensionWin(draftFaction, ascension);
      setNewlyUnlocked(newLevel);
    }
  }, []);

  const handleCopyFeedback = async () => {
    const json = exportDungeonFeedbackJSON(runState, draftFaction);
    try {
      await navigator.clipboard.writeText(json);
      setFeedbackCopied(true);
    } catch {
      window.prompt('Copy this feedback JSON:', json);
    }
  };

  return (
    <div
      style={{
        ...s.endRoot,
        backgroundImage: [
          'linear-gradient(180deg, rgba(7,7,18,0.62), rgba(7,7,18,0.92))',
          `url("${getDungeonSceneArt(won ? 'victory' : 'defeat')}")`,
        ].join(', '),
        backgroundSize: 'cover, cover',
        backgroundPosition: 'center, center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <h1 style={{ ...s.endTitle, color: won ? '#22cc66' : '#cc3333' }}>
        {won ? 'Victory' : 'Defeated'}
      </h1>
      <div style={{ ...s.endTitle, fontSize: '1rem', opacity: 0.5, letterSpacing: '0.2em' }}>
        {won ? `${draftFaction ?? ''} - A${ascension} cleared` : `Fell in Act ${act}`}
      </div>
      <div style={s.endStats}>
        <div>Faction: <strong>{draftFaction ?? '-'}</strong></div>
        <div>Ascension: <strong>A{ascension}</strong></div>
        <div>Combats won: {stats?.totalCombats ?? 0}</div>
        <div>Elites defeated: {stats?.elitesDefeated ?? 0}</div>
        <div>Bosses defeated: {stats?.bossesDefeated ?? 0}</div>
        <div>Cards played: {stats?.cardsPlayed ?? 0}</div>
        <div>Gold remaining: {runState?.gold ?? 0}g</div>
        <div>Relics collected: {runState?.relics.length ?? 0}</div>
        <div>Deck size: {runState?.deck.length ?? 0} cards</div>
        <div>HP at end: {runState?.currentHealth ?? 0}/{runState?.maxHealth ?? 0}</div>
      </div>

      {won && newlyUnlocked !== null && (
        <div
          style={{
            marginTop: 12,
            padding: '10px 18px',
            background: 'rgba(255,210,74,0.14)',
            border: '1px solid #ffd24a',
            color: '#ffe18a',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            boxShadow: '0 0 16px rgba(255,210,74,0.3)',
          }}
        >
          Ascension {newlyUnlocked} unlocked for {draftFaction}
        </div>
      )}

      {badges.length > 0 && (
        <div
          style={{
            marginTop: 14,
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 8,
            maxWidth: 620,
          }}
        >
          {badges.map((badge) => (
            <div
              key={badge.id}
              title={badge.description}
              style={{
                padding: '7px 10px',
                borderRadius: 6,
                border: '1px solid #2dd4bf66',
                background: 'rgba(45,212,191,0.10)',
                color: '#a9fff4',
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {badge.name}
            </div>
          ))}
        </div>
      )}

      <button type="button" style={s.endBtn} onClick={onBack}>
        Start New Run
      </button>
      <div
        style={{
          maxWidth: 560,
          marginTop: 16,
          color: '#8aa0b8',
          fontSize: 11,
          lineHeight: 1.45,
          textAlign: 'center',
        }}
      >
        Feedback copy includes {DUNGEON_FEEDBACK_INCLUDED_FIELDS.join(', ')}. It does not include {DUNGEON_FEEDBACK_EXCLUDED_FIELDS.join(', ')}.
      </div>
      <button
        type="button"
        style={{ ...s.endBtn, marginTop: 10, background: '#101a24', color: '#8fd5ff', borderColor: '#2b6f99' }}
        onClick={handleCopyFeedback}
      >
        {feedbackCopied ? 'Feedback Copied' : 'Copy Feedback'}
      </button>
    </div>
  );
};

// ─── Ascension picker ────────────────────────────────────────────────────────
const AscensionPicker: React.FC<{
  level: AscensionLevel;
  maxUnlocked: AscensionLevel;
  accent: string;
  onChange: (level: AscensionLevel) => void;
}> = ({ level, maxUnlocked, accent, onChange }) => {
  const lines = describeAscension(level);

  const stepBtn = (n: AscensionLevel, locked: boolean): React.CSSProperties => ({
    minWidth: 30,
    padding: '4px 6px',
    background: n === level ? accent : '#0a0a14',
    color:      n === level ? '#000'  : locked ? '#444' : '#ccc',
    border: `1px solid ${locked ? '#222' : accent}`,
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '0.06em',
    cursor: locked ? 'not-allowed' : 'pointer',
    opacity: locked ? 0.45 : 1,
  });

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 560,
        padding: '12px 14px',
        background: 'rgba(10,10,22,0.6)',
        border: '1px solid #2a2a4a',
        borderRadius: 8,
        marginTop: 16,
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: '0.25em',
          color: '#aaa',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        Ascension - {maxUnlocked === 0 ? 'no unlocks yet' : `unlocked through A${maxUnlocked}`}
      </div>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
        {Array.from({ length: 11 }, (_, i) => i as AscensionLevel).map((n) => {
          const locked = n > maxUnlocked;
          return (
            <button
              key={n}
              type="button"
              disabled={locked}
              onClick={() => !locked && onChange(n)}
              aria-label={locked
                ? `Ascension ${n} (locked - beat A${maxUnlocked} to unlock)`
                : `Choose Ascension ${n}${n === level ? ' (selected)' : ''}`}
              aria-pressed={n === level}
              style={stepBtn(n, locked)}
            >
              {n === 0 ? 'A0' : `A${n}`}
            </button>
          );
        })}
      </div>

      {lines.length === 0 ? (
        <div style={{ fontSize: 11, color: '#aaa', fontStyle: 'italic' }}>
          Standard difficulty - no modifiers.
        </div>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 16, color: '#ddd' }}>
          {lines.map((line) => (
            <li key={line} style={{ fontSize: 11, lineHeight: 1.5, marginBottom: 1 }}>
              {line}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ─── Inner component (reads context, routes by phase) ────────────────────────

const DungeonRootInner: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { runState, startNewRun, endRun } = useDungeonRun();
  const [selectedId, setSelectedId] = useState<FactionId>(MVP_FACTION as FactionId);
  // Ascension selection. Default to the highest level the player has unlocked
  // for the chosen faction. Reset whenever the faction picker changes.
  const maxUnlocked = getMaxUnlockedAscension(selectedId as Faction);
  const [ascensionLevel, setAscensionLevel] = useState<AscensionLevel>(maxUnlocked);
  // Keep the slider in sync when the faction changes.
  React.useEffect(() => {
    setAscensionLevel(getMaxUnlockedAscension(selectedId as Faction));
  }, [selectedId]);
  const [deckOpen, setDeckOpen] = useState(false);

  // ── Faction selection (pre-run) ──
  if (!runState) {
    const selected = VISIBLE_FACTIONS.find((f) => f.id === selectedId) ?? VISIBLE_FACTIONS[0];
    const selectedDeck = STARTER_DECKS[selected.id];

    return (
      <div style={s.root}>
        <div style={s.headerRow}>
          <div style={s.titleBlock}>
            <h1 style={s.title}>DUNGEON RUN</h1>
            <p style={s.subtitle}>{MVP_MODE.setupSubtitle}</p>
          </div>
          <button type="button" onClick={onBack} style={s.backBtn}>
            BACK
          </button>
        </div>

        <div style={s.sectionLabel}>{MVP_MODE.title}</div>

        <div
          style={
            VISIBLE_FACTIONS.length === 1
              ? { ...s.grid, gridTemplateColumns: 'minmax(280px, 420px)', justifyContent: 'flex-start' }
              : s.grid
          }
        >
          {VISIBLE_FACTIONS.map((f) => {
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
                style={selCardStyle(f.accent, isSelected)}
              >
                <div style={factionArtFrameStyle(f.accent)}>
                  <img
                    src={getFactionTokenArt(f.id as Faction)}
                    alt=""
                    aria-hidden="true"
                    style={s.factionArt}
                    loading="lazy"
                  />
                </div>
                <div style={s.cardHeader}>
                  <div style={cardGlyphStyle(f.accent)}>{f.glyph}</div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={s.cardName}>{f.id === 'WarpRiders' ? 'Warp Riders' : f.id}</span>
                    <span style={s.cardTag}>{f.tagline}</span>
                  </div>
                </div>
                <div style={cardMechanicLabelStyle(f.accent)}>{f.mechanic}</div>
                <div style={s.cardMechanicBody}>{f.mechanicSummary}</div>
                <div style={s.cardFooter}>{deck.characterName}</div>
              </div>
            );
          })}
        </div>

        <FactionDetail faction={selected} deck={selectedDeck} />

        <AscensionPicker
          level={ascensionLevel}
          maxUnlocked={maxUnlocked}
          accent={selected.accent}
          onChange={setAscensionLevel}
        />

        <div style={s.startRow}>
          <button
            type="button"
            style={beginBtnStyle(selected.accent, false)}
            onClick={() => startNewRun(selected.id as Faction, undefined, ascensionLevel)}
          >
            Begin Run - A{ascensionLevel}
          </button>
        </div>
      </div>
    );
  }

  // ── Phase routing ──
  const phase = runState.phase;

  if (phase === 'run_end_win' || phase === 'run_end_loss') {
    return <RunEndScreen won={phase === 'run_end_win'} onBack={onBack} />;
  }

  let mainView: React.ReactNode;
  switch (phase) {
    case 'draft':      mainView = <DraftView />; break;
    case 'blessing':   mainView = <BlessingView />; break;
    case 'map':        mainView = <MapView />; break;
    case 'combat':
    case 'elite_combat':
    case 'boss_combat': mainView = <CombatView />; break;
    case 'event':      mainView = <EventView />; break;
    case 'reward':     mainView = <RewardView />; break;
    case 'rest':       mainView = <RestSiteView />; break;
    case 'shop':       mainView = <ShopView />; break;
    default:           mainView = <MapView />;
  }

  return (
    <div style={s.runWrap}>
      {mainView}

      {/* Persistent run overlays. The combat view has its own corner-positioned
          relic column, so suppress the bottom RelicBar during any combat phase
          to avoid double-display. */}
      {phase !== 'combat' && phase !== 'elite_combat' && phase !== 'boss_combat' && <RelicBar />}

      {/* View Deck and Abandon overlays clash with the new combat-view corner
          panels (player card top-left, right HUD bottom-right). Hide them
          during combat — the relic column already shows draw count, and
          abandon happens naturally between encounters. */}
      {phase !== 'combat' && phase !== 'elite_combat' && phase !== 'boss_combat' && (
        <>
          {phase !== 'draft' && (
            <div style={s.runOverlayStack}>
              <button
                type="button"
                style={s.deckBtn}
                onClick={() => setDeckOpen((o) => !o)}
              >
                <TokenArt
                  src={uiArt.cardBack}
                  fallback="DK"
                  alt=""
                  style={{ width: 16, height: 16 }}
                  fallbackStyle={{ fontSize: 9, lineHeight: 1 }}
                />
                View Deck ({runState.deck.length})
              </button>
            </div>
          )}

          <button
            type="button"
            style={s.abandonBtn}
            onClick={() => {
              if (window.confirm('Abandon this run?')) endRun(false);
            }}
          >
            Abandon
          </button>
        </>
      )}

      {deckOpen && <DeckViewer onClose={() => setDeckOpen(false)} />}
    </div>
  );
};

// ─── Public root (provides context) ─────────────────────────────────────────

export const DungeonRoot: React.FC<DungeonRootProps> = ({ onBack }) => (
  <DungeonRunProvider>
    <DungeonRootInner onBack={onBack} />
  </DungeonRunProvider>
);
