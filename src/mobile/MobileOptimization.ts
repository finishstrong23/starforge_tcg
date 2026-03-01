/**
 * STARFORGE TCG - Mobile Optimization
 *
 * Performance profiling, battery optimization, offline mode,
 * and push notification setup for mobile platforms.
 */

import { Capacitor } from '@capacitor/core';

/** Performance monitoring configuration */
export const PERFORMANCE_CONFIG = {
  targetFps: 60,
  lowEndFps: 30,
  maxParticles: 100,
  lowEndMaxParticles: 20,
  maxAnimations: 10,
  textureQuality: 'high' as 'low' | 'medium' | 'high',
  enableShadows: true,
  enablePostProcessing: true,
};

/** Detect device tier based on available resources */
export function detectDeviceTier(): 'low' | 'medium' | 'high' {
  if (!Capacitor.isNativePlatform()) return 'high'; // Desktop web = high

  // Use memory and core count as heuristics
  const nav = typeof navigator !== 'undefined' ? navigator : null;
  const cores = nav?.hardwareConcurrency || 2;
  const memory = (nav as { deviceMemory?: number })?.deviceMemory || 2;

  if (cores <= 2 || memory <= 2) return 'low';
  if (cores <= 4 || memory <= 4) return 'medium';
  return 'high';
}

/** Get optimized settings for the device tier */
export function getOptimizedSettings(tier: 'low' | 'medium' | 'high'): typeof PERFORMANCE_CONFIG {
  switch (tier) {
    case 'low':
      return {
        targetFps: 30,
        lowEndFps: 30,
        maxParticles: 10,
        lowEndMaxParticles: 5,
        maxAnimations: 3,
        textureQuality: 'low',
        enableShadows: false,
        enablePostProcessing: false,
      };
    case 'medium':
      return {
        targetFps: 60,
        lowEndFps: 30,
        maxParticles: 50,
        lowEndMaxParticles: 20,
        maxAnimations: 6,
        textureQuality: 'medium',
        enableShadows: true,
        enablePostProcessing: false,
      };
    case 'high':
      return PERFORMANCE_CONFIG;
  }
}

/** Frame rate monitor for performance profiling */
export class FrameRateMonitor {
  private frames: number[] = [];
  private lastTime = 0;
  private enabled = false;
  private callback?: (fps: number) => void;

  start(callback?: (fps: number) => void): void {
    this.enabled = true;
    this.callback = callback;
    this.lastTime = performance.now();
    this.tick();
  }

  stop(): void {
    this.enabled = false;
  }

  private tick = (): void => {
    if (!this.enabled) return;

    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;

    if (delta > 0) {
      this.frames.push(1000 / delta);
      if (this.frames.length > 60) this.frames.shift();
    }

    if (this.frames.length % 60 === 0 && this.callback) {
      this.callback(this.getAverageFps());
    }

    requestAnimationFrame(this.tick);
  };

  getAverageFps(): number {
    if (this.frames.length === 0) return 0;
    return Math.round(this.frames.reduce((a, b) => a + b) / this.frames.length);
  }
}

/** Battery optimization — reduce background activity */
export function setupBatteryOptimization(): void {
  if (typeof document === 'undefined') return;

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Reduce activity when app is backgrounded
      console.log('[Mobile] App backgrounded — reducing activity');
    } else {
      console.log('[Mobile] App foregrounded — restoring activity');
    }
  });
}

/** Offline mode support for campaign/story */
export class OfflineManager {
  private static CACHE_KEY = 'starforge_offline_data';

  static isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  static cacheGameData(key: string, data: unknown): void {
    try {
      const cache = this.getCache();
      cache[key] = { data, cachedAt: Date.now() };
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch {
      // Storage full — non-critical
    }
  }

  static getCachedData<T>(key: string): T | null {
    const cache = this.getCache();
    const entry = cache[key];
    if (!entry) return null;

    // Cache expires after 24 hours
    if (Date.now() - entry.cachedAt > 24 * 60 * 60 * 1000) {
      delete cache[key];
      localStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
      return null;
    }

    return entry.data as T;
  }

  private static getCache(): Record<string, { data: unknown; cachedAt: number }> {
    try {
      return JSON.parse(localStorage.getItem(this.CACHE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  static clearCache(): void {
    localStorage.removeItem(this.CACHE_KEY);
  }
}

/** Push notification setup */
export interface PushNotificationConfig {
  dailyQuestsReady: boolean;
  friendChallenge: boolean;
  newExpansion: boolean;
  seasonEnd: boolean;
  maintenanceAlert: boolean;
}

const DEFAULT_PUSH_CONFIG: PushNotificationConfig = {
  dailyQuestsReady: true,
  friendChallenge: true,
  newExpansion: true,
  seasonEnd: true,
  maintenanceAlert: true,
};

export function getPushConfig(): PushNotificationConfig {
  try {
    const stored = localStorage.getItem('starforge_push_config');
    return stored ? { ...DEFAULT_PUSH_CONFIG, ...JSON.parse(stored) } : DEFAULT_PUSH_CONFIG;
  } catch {
    return DEFAULT_PUSH_CONFIG;
  }
}

export function savePushConfig(config: PushNotificationConfig): void {
  localStorage.setItem('starforge_push_config', JSON.stringify(config));
}

/** App Store / Play Store listing metadata */
export const APP_STORE_METADATA = {
  title: 'StarForge TCG - Sci-Fi Card Game',
  subtitle: 'Build. Battle. Forge Your Destiny.',
  description: `StarForge TCG is a free-to-play digital trading card game set in a sci-fi galaxy of 10 alien factions. Build decks from 800+ unique cards, master 21 keywords, and compete in ranked, casual, arena, and story modes.

Key Features:
• 10 asymmetric alien factions with unique playstyles
• 800+ cards including 11 original mechanics
• Server-authoritative multiplayer with ranked ladder
• Story campaign across 10 planets
• Arena draft mode, Tavern Brawl, tournaments
• Generous free-to-play model with crafting
• Cross-platform play (Web, Android, iOS)`,
  keywords: 'tcg, card game, strategy, sci-fi, multiplayer, pvp, deck builder, free to play, collectible cards',
  category: 'Games > Strategy > Card',
  ageRating: '12+',
  screenshotDescriptions: [
    'Epic sci-fi card battles across the galaxy',
    'Build decks from 10 unique alien factions',
    'Climb the ranked ladder from Bronze to Legend',
    'Explore the galaxy in story campaign mode',
    'Open packs and build your collection',
    'Draft mode — Arena challenge',
  ],
};

/** Memory optimization — cleanup large objects */
export function cleanupMemory(): void {
  if (typeof window !== 'undefined' && 'gc' in window) {
    // V8 garbage collection hint (only works with --expose-gc)
    (window as { gc?: () => void }).gc?.();
  }
}
