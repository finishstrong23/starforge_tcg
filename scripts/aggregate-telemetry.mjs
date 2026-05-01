#!/usr/bin/env node
/**
 * STARFORGE — Telemetry aggregator.
 *
 * Reads a JSON file containing telemetry events and prints a summary:
 *   - session count + per-session run count
 *   - faction-pick distribution
 *   - win rate per faction × ascension
 *   - drop-off funnel (faction → run_start → first_combat → first_reward → boss → win)
 *   - top causes of death (enemy + turn at death)
 *   - most-picked / least-picked cards per faction
 *   - average run length
 *
 * Usage:
 *   node scripts/aggregate-telemetry.mjs path/to/events.json
 *
 * The input format must be either:
 *   (A) An array of telemetry events as written by exportAsJSON() in
 *       src/dungeon/engine/telemetry.ts.  This is what the in-game
 *       debug panel produces when a player clicks "Copy JSON".
 *   (B) Newline-delimited JSON, one event per line — what you'd get
 *       from piping Vercel function logs through jq.
 *
 * Both formats accepted automatically.
 */

import fs from 'node:fs';
import path from 'node:path';

const file = process.argv[2];
if (!file) {
  console.error('usage: aggregate-telemetry.mjs <events.json>');
  process.exit(1);
}

const raw = fs.readFileSync(path.resolve(file), 'utf8').trim();

function parseEvents(text) {
  if (!text) return [];
  // (A) JSON array
  if (text.startsWith('[')) return JSON.parse(text);
  // (B) NDJSON — one event per line
  const lines = text.split('\n').filter((l) => l.trim().length > 0);
  return lines.map((l, i) => {
    try { return JSON.parse(l); } catch (e) {
      throw new Error(`Failed to parse line ${i + 1}: ${e.message}`);
    }
  });
}

const events = parseEvents(raw);
console.log(`\nLoaded ${events.length} events from ${path.basename(file)}.\n`);

// Group events by session
const bySession = new Map();
for (const e of events) {
  const sid = e.sessionId ?? e.sid ?? 'unknown';
  if (!bySession.has(sid)) bySession.set(sid, []);
  bySession.get(sid).push(e);
}

// Sort each session's events by timestamp
for (const arr of bySession.values()) {
  arr.sort((a, b) => (a.ts ?? 0) - (b.ts ?? 0));
}

// ─── 1. Session overview ──────────────────────────────────────────────────
const sessionsCount = bySession.size;
const runStartCount = events.filter((e) => e.type === 'run_start').length;
const runEndCount   = events.filter((e) => e.type === 'run_end').length;
const completionRate = runStartCount > 0 ? (runEndCount / runStartCount) : 0;

console.log('── Sessions ──');
console.log(`  Total sessions:        ${sessionsCount}`);
console.log(`  Total runs started:    ${runStartCount}`);
console.log(`  Total runs ended:      ${runEndCount}`);
console.log(`  Run completion rate:   ${(completionRate * 100).toFixed(1)} %`);
console.log(`  Avg runs per session:  ${(runStartCount / Math.max(1, sessionsCount)).toFixed(2)}`);
console.log();

// ─── 2. Faction-pick distribution ─────────────────────────────────────────
const factionPicks = {};
for (const e of events) {
  if (e.type !== 'faction_picked') continue;
  const f = e.payload?.faction;
  if (f) factionPicks[f] = (factionPicks[f] ?? 0) + 1;
}

console.log('── Faction picks ──');
const totalPicks = Object.values(factionPicks).reduce((a, b) => a + b, 0);
for (const [f, n] of Object.entries(factionPicks).sort((a, b) => b[1] - a[1])) {
  const pct = totalPicks > 0 ? ((n / totalPicks) * 100).toFixed(1) : '0';
  console.log(`  ${f.padEnd(14)} ${String(n).padStart(4)}   (${pct}%)`);
}
console.log();

// ─── 3. Win rate per faction × ascension ──────────────────────────────────
const runEnds = events.filter((e) => e.type === 'run_end');
const winRate = {};
for (const e of runEnds) {
  const f = e.payload?.faction ?? 'Unknown';
  const a = e.payload?.ascensionLevel ?? 0;
  const won = !!e.payload?.victory;
  const key = `${f} A${a}`;
  if (!winRate[key]) winRate[key] = { wins: 0, total: 0 };
  winRate[key].total += 1;
  if (won) winRate[key].wins += 1;
}

console.log('── Win rate (faction × ascension) ──');
const rows = Object.entries(winRate).sort((a, b) => b[1].total - a[1].total);
for (const [key, { wins, total }] of rows) {
  if (total < 1) continue;
  const pct = (wins / total * 100).toFixed(1);
  console.log(`  ${key.padEnd(20)} ${String(wins).padStart(3)} / ${String(total).padStart(3)}   (${pct}%)`);
}
if (rows.length === 0) console.log('  (no completed runs)');
console.log();

// ─── 4. Funnel ────────────────────────────────────────────────────────────
const sessionFunnels = {
  picked:        0,
  startedRun:    0,
  hitFirstCombat: 0,
  beatFirstCombat: 0,
  hitFirstElite: 0,
  beatBoss:      0,
};

for (const arr of bySession.values()) {
  const types = arr.map((e) => e.type);
  if (types.includes('faction_picked'))  sessionFunnels.picked++;
  if (types.includes('run_start'))       sessionFunnels.startedRun++;
  // hit first combat: at least one combat_start
  if (arr.some((e) => e.type === 'combat_start'))
    sessionFunnels.hitFirstCombat++;
  // beat first combat: at least one combat_end with victory:true
  if (arr.some((e) => e.type === 'combat_end' && e.payload?.victory === true))
    sessionFunnels.beatFirstCombat++;
  // first elite: combat_start with nodeType:'elite'
  if (arr.some((e) => e.type === 'combat_start' && e.payload?.nodeType === 'elite'))
    sessionFunnels.hitFirstElite++;
  // beat a boss: combat_end victory after a boss combat_start
  if (arr.some((e) => e.type === 'run_end' && e.payload?.victory === true))
    sessionFunnels.beatBoss++;
}

console.log('── Funnel (% of sessions) ──');
const fmtFunnel = (n) => {
  if (sessionsCount === 0) return '0.0';
  return ((n / sessionsCount) * 100).toFixed(1);
};
console.log(`  Faction picked:          ${String(sessionFunnels.picked).padStart(4)}   (${fmtFunnel(sessionFunnels.picked)}%)`);
console.log(`  Started a run:           ${String(sessionFunnels.startedRun).padStart(4)}   (${fmtFunnel(sessionFunnels.startedRun)}%)`);
console.log(`  Reached first combat:    ${String(sessionFunnels.hitFirstCombat).padStart(4)}   (${fmtFunnel(sessionFunnels.hitFirstCombat)}%)`);
console.log(`  Won first combat:        ${String(sessionFunnels.beatFirstCombat).padStart(4)}   (${fmtFunnel(sessionFunnels.beatFirstCombat)}%)`);
console.log(`  Reached first elite:     ${String(sessionFunnels.hitFirstElite).padStart(4)}   (${fmtFunnel(sessionFunnels.hitFirstElite)}%)`);
console.log(`  Won a run (any boss):    ${String(sessionFunnels.beatBoss).padStart(4)}   (${fmtFunnel(sessionFunnels.beatBoss)}%)`);
console.log();

// ─── 5. Top death causes ──────────────────────────────────────────────────
const deathByEnemy = {};
for (const e of events) {
  if (e.type !== 'combat_end') continue;
  if (e.payload?.victory !== false) continue;
  const enemy = e.payload?.enemyName ?? 'Unknown';
  deathByEnemy[enemy] = (deathByEnemy[enemy] ?? 0) + 1;
}

console.log('── Top causes of death (top 10) ──');
const deathRows = Object.entries(deathByEnemy).sort((a, b) => b[1] - a[1]).slice(0, 10);
if (deathRows.length === 0) console.log('  (none)');
for (const [enemy, n] of deathRows) {
  console.log(`  ${enemy.padEnd(28)} ${String(n).padStart(3)}`);
}
console.log();

// ─── 6. Card-pick frequency ───────────────────────────────────────────────
const cardPicks = {};
for (const e of events) {
  if (e.type !== 'card_picked') continue;
  const id = e.payload?.cardId;
  const name = e.payload?.cardName ?? '?';
  const tier = e.payload?.complexityTier ?? '?';
  if (!id) continue;
  const key = `${id} ${name} (T${tier})`;
  cardPicks[key] = (cardPicks[key] ?? 0) + 1;
}

const cardRows = Object.entries(cardPicks).sort((a, b) => b[1] - a[1]);
console.log(`── Most-picked cards (top 15) ──`);
for (const [k, n] of cardRows.slice(0, 15)) {
  console.log(`  ${k.padEnd(44)} ${String(n).padStart(3)}`);
}
console.log();

if (cardRows.length > 0) {
  console.log('── Least-picked cards (bottom 10) ──');
  for (const [k, n] of cardRows.slice(-10).reverse()) {
    console.log(`  ${k.padEnd(44)} ${String(n).padStart(3)}`);
  }
  console.log();
}

// ─── 7. Run length ────────────────────────────────────────────────────────
const totalCombatsAtEnd = runEnds
  .map((e) => e.payload?.totalCombats ?? 0)
  .filter((n) => typeof n === 'number');
if (totalCombatsAtEnd.length > 0) {
  const avg  = totalCombatsAtEnd.reduce((a, b) => a + b, 0) / totalCombatsAtEnd.length;
  const min  = Math.min(...totalCombatsAtEnd);
  const max  = Math.max(...totalCombatsAtEnd);
  console.log('── Run length (combats per run) ──');
  console.log(`  avg ${avg.toFixed(1)} · min ${min} · max ${max}\n`);
}

console.log('Done.');
