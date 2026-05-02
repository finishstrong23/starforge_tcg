import React, { useState, useEffect, useRef } from 'react';
import type { RunStats, RunCard, DungeonRelic, DungeonFaction } from '../types';
import { FACTION_COLORS } from '../types';

interface RunSummaryProps {
  victory: boolean;
  stats: RunStats;
  deck: RunCard[];
  relics: DungeonRelic[];
  act: number;
  faction: DungeonFaction | null;
  gold: number;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

// --- Animated count-up hook ---
function useCountUp(target: number, durationMs = 600): number {
  const [value, setValue] = useState(0);
  const startTime = useRef(0);
  const rafId = useRef(0);

  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    startTime.current = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime.current;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) rafId.current = requestAnimationFrame(animate);
    };
    rafId.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId.current);
  }, [target, durationMs]);

  return value;
}

// --- Keyframe injection ---
const RECAP_KEYFRAMES = `
@keyframes recapFadeIn { 0% { opacity: 0; transform: translateY(16px); } 100% { opacity: 1; transform: translateY(0); } }
@keyframes recapEmber { 0% { opacity: 0; transform: translateY(0) scale(0.5); } 20% { opacity: 0.8; } 100% { opacity: 0; transform: translateY(-120px) scale(0.2); } }
@keyframes recapPulseGlow { 0%, 100% { box-shadow: 0 0 20px rgba(255,215,0,0.3); } 50% { box-shadow: 0 0 40px rgba(255,215,0,0.6); } }
@keyframes recapSlideUp { 0% { opacity: 0; transform: translateY(30px); } 100% { opacity: 1; transform: translateY(0); } }
`;
let recapStylesInjected = false;
function injectRecapStyles() {
  if (recapStylesInjected) return;
  recapStylesInjected = true;
  const s = document.createElement('style');
  s.textContent = RECAP_KEYFRAMES;
  document.head.appendChild(s);
}

export function RunSummary({ victory, stats, deck, relics, act, faction, gold, onPlayAgain, onMainMenu }: RunSummaryProps) {
  useEffect(() => { injectRecapStyles(); }, []);

  const animDmgDealt = useCountUp(stats.damageDealt);
  const animDmgTaken = useCountUp(stats.damageTaken);
  const animGold = useCountUp(stats.goldEarned);
  const animEnemies = useCountUp(stats.enemiesKilled, 400);
  const animTurns = useCountUp(stats.turnsPlayed, 400);

  const runDuration = Math.max(0, Math.round((Date.now() - stats.runStartTime) / 60000));
  const runMinutes = runDuration > 0 ? `${runDuration} min` : '<1 min';

  const sortedDeck = [...deck].sort((a, b) =>
    (stats.cardPlayCounts[b.name] ?? 0) - (stats.cardPlayCounts[a.name] ?? 0)
  );

  const mostPlayedEntry = Object.entries(stats.cardPlayCounts).sort((a, b) => b[1] - a[1])[0];
  const mostPlayed = mostPlayedEntry ? { name: mostPlayedEntry[0], count: mostPlayedEntry[1] } : null;

  const killing = stats.lastDamageSource;
  const factionColor = faction ? FACTION_COLORS[faction].primary : '#888';

  const bgGradient = victory
    ? 'radial-gradient(ellipse at center, rgba(40,35,10,0.95) 0%, rgba(0,0,0,0.97) 70%)'
    : 'radial-gradient(ellipse at center, rgba(40,10,10,0.95) 0%, rgba(0,0,0,0.97) 70%)';

  return (
    <div style={{ ...s.overlay, background: bgGradient }}>
      {/* Ember particles (death only) */}
      {!victory && (
        <div style={s.embers}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: 4 + Math.random() * 4,
              height: 4 + Math.random() * 4,
              borderRadius: '50%',
              background: `rgba(${200 + Math.random() * 55}, ${60 + Math.random() * 40}, 20, 0.7)`,
              left: `${10 + Math.random() * 80}%`,
              bottom: `${Math.random() * 30}%`,
              animation: `recapEmber ${3 + Math.random() * 4}s ease-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }} />
          ))}
        </div>
      )}

      <div style={s.scrollContainer}>
        {/* === Section 1: The Death / Victory headline === */}
        <div style={{ ...s.section, animation: 'recapFadeIn 1s ease' }}>
          <div style={{
            ...s.headline,
            color: victory ? '#ffd700' : '#ef4444',
            textShadow: victory
              ? '0 0 50px rgba(255,215,0,0.5)'
              : '0 0 50px rgba(239,68,68,0.5)',
          }}>
            {victory ? 'VICTORY' : 'DEFEATED'}
          </div>

          {!victory && killing && (
            <div style={s.killingBlow}>
              <div style={s.killingEnemy}>{killing.enemyName}</div>
              <div style={s.killingDetail}>
                {killing.attackName} dealt <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{killing.damage}</span> damage
              </div>
              <div style={s.killingHp}>
                You had <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{killing.heroHpBefore}</span> HP
              </div>
            </div>
          )}

          {!victory && !killing && (
            <div style={s.killingBlow}>
              <div style={s.killingDetail}>Fallen on Act {act}</div>
            </div>
          )}

          {victory && (
            <div style={s.killingBlow}>
              <div style={s.killingEnemy}>The Star Core is shattered</div>
              <div style={s.killingDetail}>All 3 Acts cleared in {runMinutes}</div>
            </div>
          )}
        </div>

        {/* === Section 2: Run Stats === */}
        <div style={{ ...s.section, animation: 'recapSlideUp 0.8s ease 0.3s both' }}>
          <div style={s.sectionTitle}>RUN STATISTICS</div>
          <div style={s.statsGrid}>
            <StatCell label="Acts Cleared" value={`${Math.max(0, act - (victory ? 0 : 1))} of 3`} />
            <StatCell label="Rooms Cleared" value={`${stats.roomsCleared}`} />
            <StatCell label="Turns Played" value={`${animTurns}`} />
            <StatCell label="Enemies Slain" value={`${animEnemies}`} />
            <StatCell label="Damage Dealt" value={`${animDmgDealt}`} highlight="#4ade80" />
            <StatCell label="Damage Taken" value={`${animDmgTaken}`} highlight="#ef4444" />
            <StatCell
              label="Biggest Hit Dealt"
              value={stats.biggestHitDealt.damage > 0
                ? `${stats.biggestHitDealt.damage} (${stats.biggestHitDealt.cardName})`
                : '—'}
            />
            <StatCell
              label="Biggest Hit Taken"
              value={stats.biggestHitTaken.damage > 0
                ? `${stats.biggestHitTaken.damage} (${stats.biggestHitTaken.enemyName})`
                : '—'}
            />
            <StatCell
              label="Most Played Card"
              value={mostPlayed ? `${mostPlayed.name} (${mostPlayed.count}x)` : '—'}
            />
            <StatCell label="Cards in Deck" value={`${deck.length}`} />
            <StatCell label="Gold Earned" value={`${animGold}`} highlight="#ffd700" />
            <StatCell label="Time Played" value={runMinutes} />
          </div>
        </div>

        {/* === Section 3: Relics === */}
        {relics.length > 0 && (
          <div style={{ ...s.section, animation: 'recapSlideUp 0.8s ease 0.5s both' }}>
            <div style={s.sectionTitle}>RELICS CARRIED ({relics.length})</div>
            <div style={s.relicRow}>
              {relics.map(r => (
                <div key={r.id} style={s.relicChip} title={r.description}>
                  <span style={s.relicDot}>{r.name[0]}</span>
                  <span style={s.relicLabel}>{r.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* === Section 4: Final Deck === */}
        <div style={{ ...s.section, animation: 'recapSlideUp 0.8s ease 0.7s both' }}>
          <div style={s.sectionTitle}>FINAL DECK ({deck.length} CARDS)</div>
          <div style={s.deckGrid}>
            {sortedDeck.map(card => {
              const plays = stats.cardPlayCounts[card.name] ?? 0;
              return (
                <div key={card.instanceId} style={s.deckCard} title={`${card.cardText}\nPlayed ${plays} time${plays !== 1 ? 's' : ''} this run`}>
                  <span style={{
                    ...s.costDot,
                    backgroundColor: card.upgraded ? '#b8860b' : '#1e40af',
                  }}>
                    {card.upgraded && card.upgradedCost !== undefined ? card.upgradedCost : card.cost}
                  </span>
                  <span style={{
                    ...s.deckCardName,
                    color: card.upgraded ? '#ffd700' : '#ddd',
                  }}>
                    {card.name}{card.upgraded ? '+' : ''}
                  </span>
                  <span style={s.playCount}>
                    {plays > 0 ? `${plays}x` : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* === Section 5: Buttons === */}
        <div style={{ ...s.buttonSection, animation: 'recapSlideUp 0.8s ease 0.9s both' }}>
          <button
            onClick={onPlayAgain}
            style={{
              ...s.primaryButton,
              background: victory
                ? 'linear-gradient(135deg, #ffd700, #b8860b)'
                : `linear-gradient(135deg, ${factionColor}, ${factionColor}99)`,
              animation: 'recapPulseGlow 2s ease-in-out infinite',
            }}
          >
            {victory ? 'NEXT ASCENSION' : 'RUN IT BACK'}
          </button>
          <button onClick={onMainMenu} style={s.secondaryButton}>
            MAIN MENU
          </button>
        </div>

        {/* === Section 6: XP tease (placeholder) === */}
        <div style={{ ...s.section, animation: 'recapSlideUp 0.8s ease 1.1s both' }}>
          <div style={s.xpBar}>
            <span style={s.xpText}>
              +{stats.roomsCleared * 10 + stats.enemiesKilled * 5} XP earned
            </span>
            {faction && (
              <span style={{ ...s.xpFaction, color: factionColor }}>
                {faction} Mastery
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCell({ label, value, highlight }: { label: string; value: string; highlight?: string }) {
  return (
    <div style={s.statCell}>
      <div style={s.statLabel}>{label}</div>
      <div style={{ ...s.statValue, color: highlight ?? '#fff' }}>{value}</div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    zIndex: 1000,
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    color: '#fff',
  },
  embers: {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 1001,
    overflow: 'hidden',
  },
  scrollContainer: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '100vh',
    overflowY: 'auto',
    padding: '40px 24px 60px',
    zIndex: 1002,
  },
  section: {
    marginBottom: 28,
  },
  headline: {
    fontSize: 52,
    fontWeight: 'bold',
    letterSpacing: 6,
    textAlign: 'center',
    marginBottom: 12,
  },
  killingBlow: {
    textAlign: 'center',
    marginBottom: 8,
  },
  killingEnemy: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ccc',
    marginBottom: 4,
  },
  killingDetail: {
    fontSize: 16,
    color: '#999',
    lineHeight: 1.5,
  },
  killingHp: {
    fontSize: 15,
    color: '#888',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase' as const,
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 12,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 2,
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  statCell: {
    padding: '10px 14px',
    background: 'rgba(255,255,255,0.02)',
  },
  statLabel: {
    fontSize: 11,
    color: '#777',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  relicRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  relicChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: 'rgba(255,215,0,0.08)',
    border: '1px solid rgba(255,215,0,0.25)',
    borderRadius: 8,
    padding: '5px 12px',
    cursor: 'help',
  },
  relicDot: {
    width: 22,
    height: 22,
    borderRadius: '50%',
    background: 'rgba(255,215,0,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#ffd700',
    flexShrink: 0,
  },
  relicLabel: {
    fontSize: 13,
    color: '#ddd',
  },
  deckGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 3,
    maxHeight: 240,
    overflow: 'auto',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(0,0,0,0.3)',
    padding: 4,
  },
  deckCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 8px',
    borderRadius: 5,
    background: 'rgba(255,255,255,0.03)',
    cursor: 'help',
  },
  costDot: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
    flexShrink: 0,
  },
  deckCardName: {
    flex: 1,
    fontSize: 12,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  playCount: {
    fontSize: 11,
    color: '#888',
    fontFamily: 'monospace',
    flexShrink: 0,
  },
  buttonSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    padding: '16px 56px',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    border: 'none',
    borderRadius: 14,
    cursor: 'pointer',
    letterSpacing: 3,
    textTransform: 'uppercase' as const,
  },
  secondaryButton: {
    padding: '10px 32px',
    fontSize: 14,
    fontWeight: 'bold',
    background: 'rgba(255,255,255,0.08)',
    color: '#888',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: 10,
    cursor: 'pointer',
    letterSpacing: 1,
  },
  xpBar: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: '12px 20px',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    textAlign: 'center',
  },
  xpText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#ffd700',
  },
  xpFaction: {
    fontSize: 13,
  },
};
