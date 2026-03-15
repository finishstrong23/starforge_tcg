/**
 * STARFORGE TCG — Mana System Suite
 *
 * Tests crystal ramp, cost enforcement, and crystal refill mechanics.
 * Corresponds to test-scenarios.md Section 2.
 */

import { test, expect } from '@playwright/test';

test.describe('Mana System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="menu-quick-play"]').click();
    await page.locator('[data-testid="quick-play-button"]').click();
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible({ timeout: 10000 });
    // Wait for hero intro to finish
    await page.waitForTimeout(4000);
  });

  test('Turn 1 starts with 1 crystal', async ({ page }) => {
    const turnText = await page.locator('[data-testid="turn-number"]').textContent();
    expect(turnText).toContain('1');

    // Crystal bar should show 1/1
    const crystalCount = await page.locator('[data-testid="player-crystal-bar"] [data-testid="crystal-count"]').textContent();
    expect(crystalCount).toMatch(/1\/1/);
  });

  test('unplayable cards are not marked as playable', async ({ page }) => {
    // On turn 1 (1 crystal), cards costing more than 1 should not be playable
    const expensiveCards = page.locator('[data-testid="player-hand"] [data-card-playable]');
    const allCards = page.locator('[data-testid="player-hand"] [data-card-cost]');

    const totalCount = await allCards.count();
    if (totalCount > 0) {
      // Check that expensive cards are not marked playable
      for (let i = 0; i < totalCount; i++) {
        const cost = await allCards.nth(i).getAttribute('data-card-cost');
        const playable = await allCards.nth(i).getAttribute('data-card-playable');
        if (parseInt(cost || '0') > 1) {
          expect(playable).toBeNull();
        }
      }
    }
  });

  test('end turn button works', async ({ page }) => {
    const endTurnBtn = page.locator('[data-testid="end-turn-button"]');
    await expect(endTurnBtn).toBeEnabled();
    await endTurnBtn.click();

    // Should show opponent turn state - button becomes disabled
    await expect(endTurnBtn).toBeDisabled({ timeout: 5000 });
  });

  test('crystals increase after a full turn cycle', async ({ page }) => {
    // End player turn
    await page.locator('[data-testid="end-turn-button"]').click();

    // Wait for opponent turn to complete and player turn to start again
    await expect(page.locator('[data-testid="end-turn-button"]')).toBeEnabled({ timeout: 15000 });

    // Should now be turn 2 with 2/2 crystals
    const crystalCount = await page.locator('[data-testid="player-crystal-bar"] [data-testid="crystal-count"]').textContent();
    expect(crystalCount).toMatch(/2\/2/);
  });
});
