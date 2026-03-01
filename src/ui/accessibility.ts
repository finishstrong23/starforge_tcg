/**
 * STARFORGE TCG - Accessibility Utilities
 *
 * Provides colorblind-friendly palettes, reduced motion helpers,
 * text scaling, high contrast mode, and keyboard navigation support.
 */

import type { ColorblindMode, TextSize } from './components/Settings';
import { loadSettings } from './components/Settings';

// Colorblind-safe color palettes
const COLOR_PALETTES: Record<ColorblindMode, Record<string, string>> = {
  none: {
    health: '#44cc66',
    damage: '#ff4444',
    mana: '#4488ff',
    gold: '#ffaa00',
    rare: '#4488ff',
    epic: '#aa44ff',
    legendary: '#ffaa00',
    barrier: '#ffaa00',
    friendly: '#00cc66',
    enemy: '#ff4444',
    neutral: '#888899',
  },
  deuteranopia: {
    health: '#0072B2',
    damage: '#D55E00',
    mana: '#0072B2',
    gold: '#E69F00',
    rare: '#0072B2',
    epic: '#CC79A7',
    legendary: '#E69F00',
    barrier: '#E69F00',
    friendly: '#0072B2',
    enemy: '#D55E00',
    neutral: '#888899',
  },
  protanopia: {
    health: '#0072B2',
    damage: '#E69F00',
    mana: '#0072B2',
    gold: '#F0E442',
    rare: '#0072B2',
    epic: '#CC79A7',
    legendary: '#F0E442',
    barrier: '#F0E442',
    friendly: '#0072B2',
    enemy: '#E69F00',
    neutral: '#888899',
  },
  tritanopia: {
    health: '#009E73',
    damage: '#D55E00',
    mana: '#56B4E9',
    gold: '#E69F00',
    rare: '#56B4E9',
    epic: '#D55E00',
    legendary: '#E69F00',
    barrier: '#E69F00',
    friendly: '#009E73',
    enemy: '#D55E00',
    neutral: '#888899',
  },
};

export function getAccessibleColor(key: string): string {
  const settings = loadSettings();
  const palette = COLOR_PALETTES[settings.colorblindMode] || COLOR_PALETTES.none;
  return palette[key] || COLOR_PALETTES.none[key] || '#ffffff';
}

export function getTextScale(): number {
  const settings = loadSettings();
  const scales: Record<TextSize, number> = {
    small: 0.85,
    medium: 1.0,
    large: 1.2,
  };
  return scales[settings.textSize] || 1.0;
}

export function isReducedMotion(): boolean {
  const settings = loadSettings();
  if (settings.reducedMotion) return true;

  // Also respect OS-level preference
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return false;
}

export function getAnimationDuration(baseMs: number): number {
  if (isReducedMotion()) return 0;
  const settings = loadSettings();
  const multiplier: Record<string, number> = {
    fast: 0.5,
    normal: 1.0,
    slow: 1.5,
  };
  return baseMs * (multiplier[settings.animationSpeed] || 1.0);
}

export function isHighContrast(): boolean {
  return loadSettings().highContrast;
}

export function isKeyboardNavEnabled(): boolean {
  return loadSettings().keyboardNavigation;
}

export function useScreenReaderHints(): boolean {
  return loadSettings().screenReaderHints;
}

// Apply CSS filter for colorblind simulation (for development/testing)
export function getColorblindFilter(): string {
  const settings = loadSettings();
  // These are CSS filter approximations for testing
  switch (settings.colorblindMode) {
    case 'deuteranopia': return 'url(#deuteranopia-filter)';
    case 'protanopia': return 'url(#protanopia-filter)';
    case 'tritanopia': return 'url(#tritanopia-filter)';
    default: return 'none';
  }
}

// Generate aria labels for game elements
export function cardAriaLabel(card: {
  name: string;
  attack?: number;
  health?: number;
  manaCost: number;
  keywords?: string[];
}): string {
  const parts = [card.name];
  parts.push(`${card.manaCost} mana`);
  if (card.attack !== undefined) parts.push(`${card.attack} attack`);
  if (card.health !== undefined) parts.push(`${card.health} health`);
  if (card.keywords && card.keywords.length > 0) {
    parts.push(`keywords: ${card.keywords.join(', ')}`);
  }
  return parts.join(', ');
}

export function boardAriaLabel(playerBoard: number, opponentBoard: number, playerHealth: number, opponentHealth: number): string {
  return `Your board has ${playerBoard} minion${playerBoard !== 1 ? 's' : ''}. ` +
    `Enemy board has ${opponentBoard} minion${opponentBoard !== 1 ? 's' : ''}. ` +
    `Your health: ${playerHealth}. Enemy health: ${opponentHealth}.`;
}

// Keyboard shortcuts for game navigation
export const KEYBOARD_SHORTCUTS = {
  PLAY_CARD: (index: number) => `${index + 1}`, // 1-9 to select hand cards
  END_TURN: 'e',
  HERO_POWER: 'h',
  CANCEL: 'Escape',
  NEXT_TARGET: 'Tab',
  PREV_TARGET: 'Shift+Tab',
  CONFIRM: 'Enter',
  MENU: 'm',
  GLOSSARY: 'g',
  COMBAT_LOG: 'l',
} as const;

export function formatShortcut(shortcut: string): string {
  return shortcut
    .replace('Shift+', 'Shift + ')
    .replace('Control+', 'Ctrl + ')
    .replace('Escape', 'Esc');
}
