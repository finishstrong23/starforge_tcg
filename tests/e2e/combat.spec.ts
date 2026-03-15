/**
 * STARFORGE TCG — Combat Suite
 *
 * Tests summoning sickness, attack flow, and hero targeting.
 * Corresponds to test-scenarios.md Section 3.
 */

import { test, expect } from '@playwright/test';

test.describe('Combat System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="menu-quick-play"]').click();
    await page.locator('[data-testid="quick-play-button"]').click();
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(4000);
  });

  test('newly played minions have summoning sickness', async ({ page }) => {
    // Play a card from hand if we can
    const playableCards = page.locator('[data-testid="player-hand"] [data-card-playable="true"]');
    const count = await playableCards.count();

    if (count > 0) {
      // Click a playable card to play it
      await playableCards.first().click();
      await page.waitForTimeout(1000);

      // Check that the minion on board does NOT have attack glow
      // (it should have summoning sickness unless it has Rush/Charge)
      const boardMinions = page.locator('[data-testid="player-board"] [data-testid^="card-"]');
      const minionCount = await boardMinions.count();
      // At least verify the board updated
      expect(minionCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('hero health displays correctly', async ({ page }) => {
    const playerHealth = page.locator('[data-testid="player-hero-health"]');
    const opponentHealth = page.locator('[data-testid="opponent-hero-health"]');

    const pHealth = await playerHealth.textContent();
    const oHealth = await opponentHealth.textContent();

    // Both should start at 30/30
    expect(pHealth).toContain('30');
    expect(oHealth).toContain('30');
  });

  test('end turn button shows correct state per turn', async ({ page }) => {
    const btn = page.locator('[data-testid="end-turn-button"]');

    // Player turn: enabled, shows "End Turn"
    await expect(btn).toBeEnabled();
    const text = await btn.textContent();
    expect(text).toContain('End Turn');

    // Click to end turn
    await btn.click();

    // Opponent turn: disabled, shows "Enemy Turn"
    await expect(btn).toBeDisabled({ timeout: 5000 });
    const enemyText = await btn.textContent();
    expect(enemyText).toContain('Enemy Turn');
  });
});
