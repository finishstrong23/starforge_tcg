/**
 * STARFORGE TCG — Game Flow Suite
 *
 * Tests full game lifecycle: start, play turns, reach end state.
 * Covers edge cases from test-scenarios.md Section 6.
 */

import { test, expect } from '@playwright/test';

test.describe('Game Flow', () => {
  test('can play multiple turns without crash', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="menu-quick-play"]').click();
    await page.locator('[data-testid="quick-play-button"]').click();
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(4000);

    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // Play 5 turns
    for (let turn = 0; turn < 5; turn++) {
      const endTurnBtn = page.locator('[data-testid="end-turn-button"]');

      // Try playing a card if possible
      const playable = page.locator('[data-testid="player-hand"] [data-card-playable="true"]');
      const playableCount = await playable.count();
      if (playableCount > 0) {
        await playable.first().click();
        await page.waitForTimeout(800);
      }

      // End turn
      if (await endTurnBtn.isEnabled()) {
        await endTurnBtn.click();
      }

      // Wait for opponent to finish
      await expect(endTurnBtn).toBeEnabled({ timeout: 20000 });
    }

    // Verify no JS errors occurred during gameplay
    expect(errors).toHaveLength(0);

    // Verify game is still running (board visible)
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible();
  });

  test('turn counter increments correctly', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="menu-quick-play"]').click();
    await page.locator('[data-testid="quick-play-button"]').click();
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(4000);

    // Verify turn 1
    let turnText = await page.locator('[data-testid="turn-number"]').textContent();
    expect(turnText).toContain('1');

    // End turn and wait for turn 2
    await page.locator('[data-testid="end-turn-button"]').click();
    await expect(page.locator('[data-testid="end-turn-button"]')).toBeEnabled({ timeout: 15000 });

    turnText = await page.locator('[data-testid="turn-number"]').textContent();
    // After a full round (player + opponent), turn should be 2 or 3
    const turnNum = parseInt(turnText?.replace(/\D/g, '') || '0');
    expect(turnNum).toBeGreaterThanOrEqual(2);
  });

  test('deck count decreases each turn', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="menu-quick-play"]').click();
    await page.locator('[data-testid="quick-play-button"]').click();
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(4000);

    const deckCountEl = page.locator('[data-testid="player-deck-count"]');
    const initialText = await deckCountEl.textContent();
    const initialCount = parseInt(initialText?.replace(/\D/g, '') || '30');

    // End turn
    await page.locator('[data-testid="end-turn-button"]').click();
    await expect(page.locator('[data-testid="end-turn-button"]')).toBeEnabled({ timeout: 15000 });

    const newText = await deckCountEl.textContent();
    const newCount = parseInt(newText?.replace(/\D/g, '') || '30');

    // Deck should have decreased (drew a card)
    expect(newCount).toBeLessThan(initialCount);
  });
});
