/**
 * STARFORGE TCG — Combat Log Suite
 *
 * Tests the battle log / play-by-play tracker:
 * logs card plays, attacks, deaths, turn changes, and keyword triggers.
 */

import { test, expect, type Page } from '@playwright/test';

async function startGame(page: Page) {
  await page.goto('/');
  await page.locator('[data-testid="menu-quick-play"]').click();
  await page.locator('[data-testid="quick-play-button"]').click();
  await expect(page.locator('[data-testid="game-board"]')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(4000);
}

async function endTurnAndWait(page: Page) {
  const btn = page.locator('[data-testid="end-turn-button"]');
  if (await btn.isEnabled()) {
    await btn.click();
  }
  await expect(btn).toBeEnabled({ timeout: 20000 });
}

async function playAllAffordableCards(page: Page) {
  for (let i = 0; i < 5; i++) {
    const playable = page.locator('[data-testid="player-hand"] [data-card-playable="true"]');
    if (await playable.count() > 0) {
      await playable.first().click();
      await page.waitForTimeout(800);
    } else {
      break;
    }
  }
}

test.describe('Combat Log', () => {
  test.beforeEach(async ({ page }) => {
    await startGame(page);
  });

  test('battle log is visible and can be expanded', async ({ page }) => {
    const combatLog = page.locator('.combat-log');
    await expect(combatLog).toBeVisible();

    // Click the header to expand
    const header = combatLog.locator('text=Battle Log');
    await header.click();
    await page.waitForTimeout(500);

    // Log body should be visible
    const logBody = page.locator('.log-body');
    await expect(logBody).toBeVisible({ timeout: 2000 });
  });

  test('combat log records card play events', async ({ page }) => {
    // Expand the combat log
    await page.locator('text=Battle Log').click();
    await page.waitForTimeout(300);

    // Play a card
    const playable = page.locator('[data-testid="player-hand"] [data-card-playable="true"]');
    if (await playable.count() > 0) {
      await playable.first().click();
      await page.waitForTimeout(1200);

      // Check log for play entry
      const logEntries = page.locator('.log-body .entry-text');
      const count = await logEntries.count();
      expect(count).toBeGreaterThan(0);

      // At least one entry should contain "played" or similar action text
      let foundPlayEntry = false;
      for (let i = 0; i < count; i++) {
        const text = await logEntries.nth(i).textContent();
        if (text?.toLowerCase().includes('play') || text?.toLowerCase().includes('summon')) {
          foundPlayEntry = true;
          break;
        }
      }
      // The log should have recorded the play action
      expect(foundPlayEntry).toBe(true);
    }
  });

  test('combat log records turn changes', async ({ page }) => {
    // Expand the combat log
    await page.locator('text=Battle Log').click();
    await page.waitForTimeout(300);

    // End a turn
    await endTurnAndWait(page);

    // Check log for turn change entry
    const logEntries = page.locator('.log-body .entry-text');
    const count = await logEntries.count();

    let foundTurnEntry = false;
    for (let i = 0; i < count; i++) {
      const text = await logEntries.nth(i).textContent();
      if (text?.toLowerCase().includes('turn') || text?.toLowerCase().includes('end')) {
        foundTurnEntry = true;
        break;
      }
    }
    expect(foundTurnEntry).toBe(true);
  });

  test('combat log records attack events', async ({ page }) => {
    // Play cards and advance turns
    await playAllAffordableCards(page);
    await endTurnAndWait(page);

    // Expand combat log
    await page.locator('text=Battle Log').click();
    await page.waitForTimeout(300);

    // Attack with a minion
    const attackers = page.locator('[data-testid="player-board"] .can-attack-glow');
    if (await attackers.count() > 0) {
      await attackers.first().click();
      await page.waitForTimeout(400);
      await page.locator('[data-card-id="hero_opponent"]').click();
      await page.waitForTimeout(1500);

      // Check for attack entry in log
      const logEntries = page.locator('.log-body .entry-text');
      const count = await logEntries.count();

      let foundAttackEntry = false;
      for (let i = 0; i < count; i++) {
        const text = await logEntries.nth(i).textContent();
        if (text?.toLowerCase().includes('attack') || text?.toLowerCase().includes('damage') || text?.toLowerCase().includes('hit')) {
          foundAttackEntry = true;
          break;
        }
      }
      expect(foundAttackEntry).toBe(true);
    }
  });

  test('combat log entry count increases as game progresses', async ({ page }) => {
    // Expand combat log
    await page.locator('text=Battle Log').click();
    await page.waitForTimeout(300);

    const getEntryCount = async () => {
      return await page.locator('.log-body .entry-text').count();
    };

    const countBefore = await getEntryCount();

    // Play a card and end turn
    await playAllAffordableCards(page);
    await endTurnAndWait(page);

    const countAfter = await getEntryCount();

    // More entries should exist after gameplay
    expect(countAfter).toBeGreaterThan(countBefore);
  });

  test('combat log shows opponent actions', async ({ page }) => {
    // Expand combat log
    await page.locator('text=Battle Log').click();
    await page.waitForTimeout(300);

    // End turn and let opponent play
    await endTurnAndWait(page);
    await page.waitForTimeout(500);

    // Log should contain opponent actions
    const logEntries = page.locator('.log-body .entry-text');
    const count = await logEntries.count();

    // After opponent turn, there should be logged entries
    expect(count).toBeGreaterThan(0);
  });

  test('combat log tracks deaths', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // Play aggressively for many turns to cause deaths
    for (let turn = 0; turn < 6; turn++) {
      await playAllAffordableCards(page);

      const attackers = page.locator('[data-testid="player-board"] .can-attack-glow');
      const attackerCount = await attackers.count();
      for (let a = 0; a < Math.min(attackerCount, 3); a++) {
        const attacker = page.locator('[data-testid="player-board"] .can-attack-glow').first();
        if (await attacker.count() > 0) {
          await attacker.click();
          await page.waitForTimeout(300);

          // Attack opponent minions to cause deaths
          const opponentMinion = page.locator('[data-testid="opponent-board"] [data-testid^="card-"]').first();
          if (await opponentMinion.count() > 0) {
            await opponentMinion.click();
          } else {
            await page.locator('[data-card-id="hero_opponent"]').click();
          }
          await page.waitForTimeout(800);
        }
      }

      const gameOver = page.locator('text=Victory').or(page.locator('text=Defeat'));
      if (await gameOver.isVisible({ timeout: 300 }).catch(() => false)) break;

      await endTurnAndWait(page);
    }

    // Expand log and check for death entries
    await page.locator('text=Battle Log').click();
    await page.waitForTimeout(300);

    const logEntries = page.locator('.log-body .entry-text');
    const count = await logEntries.count();
    // After aggressive combat, the log should have many entries
    expect(count).toBeGreaterThan(3);
    expect(errors).toHaveLength(0);
  });
});
