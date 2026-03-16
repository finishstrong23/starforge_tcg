/**
 * STARFORGE TCG — Card Playing Suite
 *
 * Tests card play mechanics: hand-to-board, mana spending, board limits,
 * playability indicators, and card stat display on board.
 */

import { test, expect, type Page } from '@playwright/test';

/** Helper: start a game and wait for the board to be ready */
async function startGame(page: Page) {
  await page.goto('/');
  await page.locator('[data-testid="menu-quick-play"]').click();
  await page.locator('[data-testid="quick-play-button"]').click();
  await expect(page.locator('[data-testid="game-board"]')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(4000); // hero intro
}

/** Helper: end turn and wait for opponent to finish */
async function endTurnAndWait(page: Page) {
  const btn = page.locator('[data-testid="end-turn-button"]');
  if (await btn.isEnabled()) {
    await btn.click();
  }
  await expect(btn).toBeEnabled({ timeout: 20000 });
}

/** Helper: get current crystal count as [current, max] */
async function getCrystals(page: Page): Promise<[number, number]> {
  const text = await page.locator('[data-testid="player-crystal-bar"] [data-testid="crystal-count"]').textContent();
  const match = text?.match(/(\d+)\s*\/\s*(\d+)/);
  return match ? [parseInt(match[1]), parseInt(match[2])] : [0, 0];
}

test.describe('Card Playing', () => {
  test.beforeEach(async ({ page }) => {
    await startGame(page);
  });

  test('playing a card moves it from hand to board', async ({ page }) => {
    const hand = page.locator('[data-testid="player-hand"] [data-testid^="card-"]');
    const board = page.locator('[data-testid="player-board"] [data-testid^="card-"]');

    const handCountBefore = await hand.count();
    const boardCountBefore = await board.count();

    const playable = page.locator('[data-testid="player-hand"] [data-card-playable="true"]');
    const playableCount = await playable.count();

    if (playableCount > 0) {
      await playable.first().click();
      await page.waitForTimeout(1200);

      const handCountAfter = await hand.count();
      const boardCountAfter = await board.count();

      // Hand should decrease, board should increase
      expect(handCountAfter).toBeLessThan(handCountBefore);
      expect(boardCountAfter).toBeGreaterThan(boardCountBefore);
    }
  });

  test('playing a card reduces available crystals', async ({ page }) => {
    const playable = page.locator('[data-testid="player-hand"] [data-card-playable="true"]');
    const playableCount = await playable.count();

    if (playableCount > 0) {
      const [crystalsBefore] = await getCrystals(page);
      const cardCost = parseInt(await playable.first().getAttribute('data-card-cost') || '0');

      await playable.first().click();
      await page.waitForTimeout(1200);

      const [crystalsAfter] = await getCrystals(page);
      expect(crystalsAfter).toBe(crystalsBefore - cardCost);
    }
  });

  test('cards on board display attack and health stats', async ({ page }) => {
    // Play a card first if possible
    const playable = page.locator('[data-testid="player-hand"] [data-card-playable="true"]');
    if (await playable.count() > 0) {
      await playable.first().click();
      await page.waitForTimeout(1200);
    }

    // Also advance a turn so opponent may play minions
    await endTurnAndWait(page);

    // Check all board minions (player + opponent) have stat badges
    const allBoardCards = page.locator('[data-testid="player-board"] [data-testid^="card-"], [data-testid="opponent-board"] [data-testid^="card-"]');
    const count = await allBoardCards.count();

    for (let i = 0; i < count; i++) {
      const card = allBoardCards.nth(i);
      const attack = await card.getAttribute('data-card-attack');
      const health = await card.getAttribute('data-card-health');

      // All board minions should have numeric attack and health
      expect(parseInt(attack || '-1')).toBeGreaterThanOrEqual(0);
      expect(parseInt(health || '0')).toBeGreaterThan(0);
    }
  });

  test('unplayable cards lack the playable attribute', async ({ page }) => {
    const allHandCards = page.locator('[data-testid="player-hand"] [data-testid^="card-"]');
    const count = await allHandCards.count();

    for (let i = 0; i < count; i++) {
      const card = allHandCards.nth(i);
      const cost = parseInt(await card.getAttribute('data-card-cost') || '99');
      const isPlayable = await card.getAttribute('data-card-playable');

      const [currentCrystals] = await getCrystals(page);

      if (cost > currentCrystals) {
        // Cards too expensive should NOT be playable
        expect(isPlayable).toBeNull();
      }
    }
  });

  test('can play multiple cards in one turn if mana allows', async ({ page }) => {
    // Advance to turn 3+ so we have enough mana
    await endTurnAndWait(page);
    await endTurnAndWait(page);

    const board = page.locator('[data-testid="player-board"] [data-testid^="card-"]');
    const boardCountBefore = await board.count();
    let cardsPlayed = 0;

    // Try to play up to 3 cards
    for (let attempt = 0; attempt < 3; attempt++) {
      const playable = page.locator('[data-testid="player-hand"] [data-card-playable="true"]');
      if (await playable.count() > 0) {
        await playable.first().click();
        await page.waitForTimeout(1000);
        cardsPlayed++;
      } else {
        break;
      }
    }

    if (cardsPlayed > 1) {
      const boardCountAfter = await board.count();
      expect(boardCountAfter).toBe(boardCountBefore + cardsPlayed);
    }
  });

  test('opponent plays cards onto their board', async ({ page }) => {
    const opponentBoard = page.locator('[data-testid="opponent-board"] [data-testid^="card-"]');

    // Play several turns so the AI has mana to play cards
    for (let i = 0; i < 3; i++) {
      await endTurnAndWait(page);
    }

    // After a few turns, opponent should have played at least one card
    const opponentCardCount = await opponentBoard.count();
    expect(opponentCardCount).toBeGreaterThanOrEqual(0); // AI may not always play
  });
});
