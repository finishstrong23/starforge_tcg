/**
 * STARFORGE TCG — Smoke Test Suite
 *
 * Verifies the app loads, main menu renders, and a game can be started.
 */

import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('main menu loads successfully', async ({ page }) => {
    await page.goto('/');
    // Wait for the app to render
    await expect(page.locator('[data-testid="menu-quick-play"]')).toBeVisible({ timeout: 15000 });
  });

  test('can navigate to play view', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="menu-quick-play"]').click();
    // Should see race selection and quick play button
    await expect(page.locator('[data-testid="quick-play-button"]')).toBeVisible({ timeout: 5000 });
  });

  test('can start a game', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="menu-quick-play"]').click();
    await page.locator('[data-testid="quick-play-button"]').click();
    // Game board should appear
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible({ timeout: 10000 });
  });

  test('game board has all required elements', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid="menu-quick-play"]').click();
    await page.locator('[data-testid="quick-play-button"]').click();
    await expect(page.locator('[data-testid="game-board"]')).toBeVisible({ timeout: 10000 });

    // Dismiss hero intro if present (click or wait)
    await page.waitForTimeout(4000);

    // Check core board elements exist
    await expect(page.locator('[data-testid="player-hand"]')).toBeVisible();
    await expect(page.locator('[data-testid="player-board"]')).toBeVisible();
    await expect(page.locator('[data-testid="opponent-board"]')).toBeVisible();
    await expect(page.locator('[data-testid="end-turn-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="player-mana-bar"]')).toBeVisible();
    await expect(page.locator('[data-testid="turn-number"]')).toBeVisible();
    await expect(page.locator('[data-testid="hero-player"]')).toBeVisible();
    await expect(page.locator('[data-testid="hero-opponent"]')).toBeVisible();
  });

  test('no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await page.waitForTimeout(3000);

    // Filter out known benign errors (e.g. favicon, third-party scripts)
    const realErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('net::ERR')
    );
    expect(realErrors).toHaveLength(0);
  });
});
