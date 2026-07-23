#!/usr/bin/env node
/**
 * One-command UI smoke check (the readability plan's "Phase 5 visual QA").
 *
 *   npm run qa:ui-smoke            # build + run all checks
 *   npm run qa:ui-smoke -- --skip-build
 *
 * Drives the real production build in headless Chromium and verifies the
 * player-facing states that have regressed before:
 *   1. Setup screen  — Begin Run visible and unobstructed, full faction
 *                      names (no PY/CO/LU/WR), all four factions present.
 *   2. Map screen    — four rail itineraries render, four openers offered,
 *                      boss present.
 *   3. Combat screen — hand centered on the viewport, hover preview
 *                      appears and clears on END TURN.
 *
 * Screenshots land in .tmp/ui-smoke/. Exits non-zero on any failure.
 */

import { spawn, execSync } from 'child_process';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.tmp', 'ui-smoke');
const PORT = 4179;
const VIEW = { width: 1366, height: 768 };

function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const base = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers';
  if (existsSync(base)) {
    for (const dir of readdirSync(base)) {
      if (/^chromium-\d+$/.test(dir)) {
        const exe = join(base, dir, 'chrome-linux', 'chrome');
        if (existsSync(exe)) return exe;
      }
    }
  }
  return undefined; // let playwright-core resolve its own default
}

const failures = [];
function check(label, ok, detail = '') {
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`  [${mark}] ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(label);
}

// ── 1. Fixtures + build ──────────────────────────────────────────────────────
console.log('▸ Emitting save fixtures (live reducer)...');
execSync('npx jest --testMatch "**/uiSmokeSaves.emit.ts" --silent', { cwd: ROOT, stdio: 'inherit' });

if (!process.argv.includes('--skip-build')) {
  console.log('▸ Building production bundle...');
  execSync('npm run build:ui', { cwd: ROOT, stdio: 'ignore' });
}

// ── 2. Serve the build ───────────────────────────────────────────────────────
console.log(`▸ Starting vite preview on :${PORT}...`);
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  cwd: ROOT, stdio: 'ignore', detached: true,
});
const url = `http://localhost:${PORT}/`;
for (let i = 0; i < 40; i++) {
  try { await fetch(url); break; } catch { await new Promise((r) => setTimeout(r, 250)); }
}

const { chromium } = await import('playwright-core');
const browser = await chromium.launch({ executablePath: chromiumPath() });

async function open(save) {
  const page = await browser.newPage({ viewport: VIEW });
  await page.addInitScript((s) => {
    localStorage.setItem('sf:tutorial:dismissed:v1', '1');
    if (s) localStorage.setItem('sf:dungeon:save:v1', s);
    else localStorage.removeItem('sf:dungeon:save:v1');
  }, save ?? '');
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  return page;
}

try {
  // ── Setup screen ────────────────────────────────────────────────────────
  console.log('▸ Setup screen');
  let page = await open(null);
  const begin = page.getByRole('button', { name: /begin run/i });
  check('Begin Run visible', await begin.isVisible().catch(() => false));
  const box = await begin.boundingBox();
  if (box) {
    const onTop = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y);
      return !!el?.closest('button');
    }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
    check('Begin Run unobstructed', onTop);
  }
  const text = await page.evaluate(() => document.body.innerText);
  check('no faction abbreviations', !/\b(PY|CO|LU|WR)\b/.test(text));
  check('all four faction names', ['Pyroclast', 'Luminar', 'Cogsmiths', 'Warp Riders'].every((n) => text.includes(n)));
  await page.screenshot({ path: join(OUT, 'shot-setup.png') });
  await page.close();

  // ── Map screen ──────────────────────────────────────────────────────────
  console.log('▸ Map screen (rails)');
  page = await open(readFileSync(join(OUT, 'map.json'), 'utf8'));
  const labels = await page.evaluate(() =>
    Array.from(document.querySelectorAll('svg text')).map((t) => t.textContent?.trim()),
  );
  check('boss room rendered', labels.some((l) => l?.toUpperCase() === 'BOSS'));
  check('four rail openers', labels.filter((l) => l?.toUpperCase() === 'COMBAT').length >= 4);
  check('full itineraries visible', labels.filter(Boolean).length >= 37, `${labels.filter(Boolean).length} room labels`);
  await page.screenshot({ path: join(OUT, 'shot-map.png') });
  await page.close();

  // ── Combat screen ───────────────────────────────────────────────────────
  console.log('▸ Combat screen');
  page = await open(readFileSync(join(OUT, 'combat.json'), 'utf8'));
  const cards = page.locator('div[style*="scroll-snap-align"]');
  const first = await cards.first().boundingBox();
  const last = await cards.last().boundingBox();
  if (first && last) {
    const center = (first.x + last.x + last.width) / 2;
    check('hand centered', Math.abs(center - VIEW.width / 2) <= 8, `offset ${Math.round(center - VIEW.width / 2)}px`);
  } else {
    check('hand rendered', false);
  }
  await cards.first().hover();
  await page.waitForTimeout(250);
  check('hover preview shows', (await page.getByTestId('hand-card-preview').count()) > 0);
  await page.getByRole('button', { name: /end turn/i }).click();
  await page.waitForTimeout(400);
  check('preview clears on END TURN', (await page.getByTestId('hand-card-preview').count()) === 0);
  await page.screenshot({ path: join(OUT, 'shot-combat.png') });
  await page.close();
} finally {
  await browser.close();
  try { process.kill(-server.pid); } catch { /* already gone */ }
}

console.log(failures.length === 0
  ? `\nUI smoke: all checks passed. Screenshots in .tmp/ui-smoke/`
  : `\nUI smoke: ${failures.length} FAILURE(S): ${failures.join('; ')}`);
process.exit(failures.length === 0 ? 0 : 1);
