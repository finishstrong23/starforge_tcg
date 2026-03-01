/**
 * STARFORGE TCG - Capacitor Platform Integration
 *
 * Initializes native mobile plugins and provides platform-aware utilities.
 * All calls are safe on web — they silently no-op when not running in a native shell.
 */

import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

/** True when running inside a native Capacitor shell (Android/iOS) */
export const isNative = Capacitor.isNativePlatform();

/** The current platform: 'android' | 'ios' | 'web' */
export const platform = Capacitor.getPlatform();

/**
 * Initialize native plugins on app startup.
 * Safe to call on web — each plugin check is guarded.
 */
export function initCapacitor(): void {
  if (!isNative) return;

  // Dark status bar to match our space theme
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  StatusBar.setBackgroundColor({ color: '#1a1a2e' }).catch(() => {});

  // Hide splash screen once the app is rendered
  SplashScreen.hide().catch(() => {});

  // Listen for keyboard events to adjust layout
  Keyboard.addListener('keyboardWillShow', (info) => {
    document.documentElement.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
  }).catch(() => {});

  Keyboard.addListener('keyboardWillHide', () => {
    document.documentElement.style.setProperty('--keyboard-height', '0px');
  }).catch(() => {});
}

/**
 * Trigger a light haptic tap — use for card plays, attacks, button presses.
 */
export function hapticTap(): void {
  if (!isNative) return;
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
}

/**
 * Trigger a medium haptic impact — use for damage, card destruction.
 */
export function hapticImpact(): void {
  if (!isNative) return;
  Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
}

/**
 * Trigger a heavy haptic impact — use for game over, hero death.
 */
export function hapticHeavy(): void {
  if (!isNative) return;
  Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
}
