import React, { useState } from 'react';
import { useDungeonRun } from '../context/DungeonRunContext';
import { CardComponent } from './CardComponent';
import { getDungeonSceneArt } from '../assets/basicTokenArt';

type RestChoice = 'none' | 'upgrading';

export const RestSiteView: React.FC = () => {
  const { runState, healPlayer, upgradeCard, returnToMap } = useDungeonRun();
  const [mode, setMode] = useState<RestChoice>('none');
  const [done, setDone] = useState(false);

  const deck = runState?.deck ?? [];
  const maxHp = runState?.maxHealth ?? 72;
  const healAmt = Math.floor(maxHp * 0.3);

  const handleHeal = () => {
    healPlayer(healAmt);
    setDone(true);
  };

  const handleUpgrade = (instanceId: string) => {
    upgradeCard(instanceId);
    setDone(true);
  };

  const optionCardStyle = (active: boolean): React.CSSProperties => ({
    width: 160, padding: '18px 14px', background: active ? '#0a200a' : '#0e0e1e',
    border: active ? '2px solid #22cc66' : '1px solid #2a2a3a', borderRadius: 8,
    cursor: done ? 'default' : 'pointer', opacity: done ? 0.5 : 1,
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
    transition: 'border-color 150ms', boxShadow: active ? '0 0 14px #22cc6633' : 'none',
  });

  const s: Record<string, React.CSSProperties> = {
    root: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 24,
      padding: '2.5rem 1rem',
      minHeight: '100%',
      backgroundImage: [
        'linear-gradient(180deg, rgba(7,7,18,0.14), rgba(7,7,18,0.52))',
        `url("${getDungeonSceneArt('rest')}")`,
      ].join(', '),
      backgroundSize: 'cover, cover',
      backgroundPosition: 'center, center',
      backgroundRepeat: 'no-repeat',
      color: '#f0f0f8',
    },
    title: {
      fontSize: '1.4rem',
      fontWeight: 700,
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      margin: 0,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: '0.75rem',
      opacity: 0.45,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      textAlign: 'center',
    },
    optionRow: {
      display: 'flex',
      gap: 16,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    optionIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#172816',
      border: '1px solid #22cc6688',
      color: '#7dffb2',
      fontSize: 12,
      fontWeight: 900,
      letterSpacing: '0.08em',
    },
    optionTitle: { fontSize: 13, fontWeight: 700, textAlign: 'center' },
    optionDesc: { fontSize: 10, opacity: 0.65, textAlign: 'center', lineHeight: 1.4 },
    cardGrid: {
      display: 'flex',
      gap: 10,
      flexWrap: 'wrap',
      justifyContent: 'center',
      maxWidth: 500,
    },
    continueBtn: {
      padding: '10px 28px',
      background: 'linear-gradient(180deg, #22cc66, #18994d)',
      color: '#050f08',
      border: '1px solid #22cc66',
      borderRadius: 4,
      fontWeight: 700,
      fontSize: 11,
      letterSpacing: '0.15em',
      cursor: 'pointer',
      textTransform: 'uppercase',
    },
    sectionLabel: {
      fontSize: '0.65rem',
      letterSpacing: '0.25em',
      opacity: 0.4,
      textTransform: 'uppercase',
    },
  };

  return (
    <div style={s.root}>
      <div>
        <h2 style={s.title}>Rest Site</h2>
        <div style={s.subtitle}>Recover before the next battle</div>
      </div>

      {!done && (
        <div style={s.optionRow}>
          <div
            style={optionCardStyle(false)}
            role="button"
            tabIndex={0}
            onClick={handleHeal}
            onKeyDown={(e) => { if (e.key === 'Enter') handleHeal(); }}
          >
            <div style={s.optionIcon}>HP</div>
            <div style={s.optionTitle}>Rest</div>
            <div style={s.optionDesc}>
              Heal {healAmt} HP<br />
              <span style={{ opacity: 0.5 }}>({Math.round(healAmt / maxHp * 100)}% max HP)</span>
            </div>
          </div>

          <div
            style={optionCardStyle(mode === 'upgrading')}
            role="button"
            tabIndex={0}
            onClick={() => setMode(mode === 'upgrading' ? 'none' : 'upgrading')}
            onKeyDown={(e) => { if (e.key === 'Enter') setMode('upgrading'); }}
          >
            <div style={{ ...s.optionIcon, background: '#2a2112', borderColor: '#f0b55a88', color: '#f0d28a' }}>UP</div>
            <div style={s.optionTitle}>Smith</div>
            <div style={s.optionDesc}>Upgrade one card in your deck permanently</div>
          </div>
        </div>
      )}

      {/* Upgrade deck picker */}
      {mode === 'upgrading' && !done && (
        <>
          <div style={s.sectionLabel}>Choose a card to upgrade</div>
          <div style={s.cardGrid}>
            {deck
              .filter((c) => !c.upgraded)
              .map((card) => (
                <div
                  key={card.instanceId}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleUpgrade(card.instanceId)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleUpgrade(card.instanceId); }}
                  style={{ cursor: 'pointer' }}
                >
                  <CardComponent card={card} selectable />
                </div>
              ))}
            {deck.filter((c) => !c.upgraded).length === 0 && (
              <div style={{ opacity: 0.5, fontSize: 12 }}>All cards already upgraded.</div>
            )}
          </div>
        </>
      )}

      {done && (
        <div style={{ textAlign: 'center', opacity: 0.7, fontSize: 13 }}>
          Ready to continue.
        </div>
      )}

      {done && (
        <button type="button" style={s.continueBtn} onClick={returnToMap}>
          Continue
        </button>
      )}
    </div>
  );
};
