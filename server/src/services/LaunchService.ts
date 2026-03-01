/**
 * STARFORGE TCG - Launch & Monitoring Service
 *
 * Global launch infrastructure: platform configs, launch events,
 * monitoring dashboards, emergency hotfix pipeline.
 */

export interface PlatformConfig {
  platform: string;
  status: 'preparing' | 'ready' | 'live' | 'maintenance';
  url: string;
  version: string;
  minVersion: string;
  features: string[];
}

export interface LaunchEvent {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  rewards: LaunchEventReward[];
  isActive: boolean;
}

export interface LaunchEventReward {
  description: string;
  requirement: string;
  type: 'gold' | 'packs' | 'gems' | 'cosmetic' | 'card';
  amount?: number;
  itemId?: string;
}

export interface ServerHealth {
  region: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  activeConnections: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  uptime: number;
}

export interface RetentionMetrics {
  date: string;
  newPlayers: number;
  day1Retention: number;
  day3Retention: number;
  day7Retention: number;
  day30Retention: number;
  avgSessionMinutes: number;
  gamesPerSession: number;
  avgGameMinutes: number;
  conversionRate: number;
  arpdau: number;
}

// Platform configurations
const PLATFORMS: PlatformConfig[] = [
  {
    platform: 'web',
    status: 'live',
    url: 'https://play.starforge-tcg.com',
    version: '1.0.0',
    minVersion: '1.0.0',
    features: ['multiplayer', 'ranked', 'arena', 'campaign', 'shop', 'social'],
  },
  {
    platform: 'android',
    status: 'live',
    url: 'https://play.google.com/store/apps/details?id=com.starforge.tcg',
    version: '1.0.0',
    minVersion: '1.0.0',
    features: ['multiplayer', 'ranked', 'arena', 'campaign', 'shop', 'social', 'push_notifications'],
  },
  {
    platform: 'ios',
    status: 'live',
    url: 'https://apps.apple.com/app/starforge-tcg/id123456789',
    version: '1.0.0',
    minVersion: '1.0.0',
    features: ['multiplayer', 'ranked', 'arena', 'campaign', 'shop', 'social', 'push_notifications'],
  },
  {
    platform: 'steam',
    status: 'preparing',
    url: 'https://store.steampowered.com/app/000000/StarForge_TCG/',
    version: '1.0.0',
    minVersion: '1.0.0',
    features: ['multiplayer', 'ranked', 'arena', 'campaign', 'shop', 'social', 'achievements'],
  },
];

// Launch events
const LAUNCH_EVENTS: LaunchEvent[] = [
  {
    id: 'launch_celebration',
    name: 'Galaxy Launch Celebration',
    description: 'Celebrate the launch with special quests, double XP, and exclusive rewards!',
    startDate: new Date('2026-03-01'),
    endDate: new Date('2026-03-14'),
    rewards: [
      { description: 'Free Legendary Card', requirement: 'Win your first game', type: 'card', itemId: 'launch_legendary' },
      { description: '500 Gold Bonus', requirement: 'Complete 3 games', type: 'gold', amount: 500 },
      { description: '3 Free Packs', requirement: 'Win 5 games', type: 'packs', amount: 3 },
      { description: 'Launch Celebration Card Back', requirement: 'Win 10 games', type: 'cosmetic', itemId: 'cardback_launch' },
      { description: '200 Nebula Gems', requirement: 'Win 20 games', type: 'gems', amount: 200 },
      { description: 'Founders Board Theme', requirement: 'Reach Silver rank', type: 'cosmetic', itemId: 'board_founders' },
    ],
    isActive: true,
  },
  {
    id: 'double_xp_weekend',
    name: 'Double XP Weekend',
    description: 'All XP gains doubled for the weekend!',
    startDate: new Date('2026-03-07'),
    endDate: new Date('2026-03-09'),
    rewards: [
      { description: 'Bonus XP Pack', requirement: 'Play 10 games', type: 'packs', amount: 1 },
    ],
    isActive: true,
  },
];

/**
 * Get all platform configurations.
 */
export function getPlatforms(): PlatformConfig[] {
  return PLATFORMS;
}

/**
 * Get platform config by name.
 */
export function getPlatform(platform: string): PlatformConfig | undefined {
  return PLATFORMS.find(p => p.platform === platform);
}

/**
 * Check if client version is compatible.
 */
export function isVersionCompatible(platform: string, clientVersion: string): {
  compatible: boolean;
  latestVersion: string;
  forceUpdate: boolean;
} {
  const config = PLATFORMS.find(p => p.platform === platform);
  if (!config) return { compatible: true, latestVersion: '1.0.0', forceUpdate: false };

  const clientParts = clientVersion.split('.').map(Number);
  const minParts = config.minVersion.split('.').map(Number);

  let compatible = true;
  for (let i = 0; i < 3; i++) {
    if ((clientParts[i] || 0) < (minParts[i] || 0)) { compatible = false; break; }
    if ((clientParts[i] || 0) > (minParts[i] || 0)) break;
  }

  return {
    compatible,
    latestVersion: config.version,
    forceUpdate: !compatible,
  };
}

/**
 * Get active launch events.
 */
export function getActiveLaunchEvents(): LaunchEvent[] {
  const now = new Date();
  return LAUNCH_EVENTS.filter(e => now >= e.startDate && now <= e.endDate);
}

/**
 * Get all launch events.
 */
export function getAllLaunchEvents(): LaunchEvent[] {
  return LAUNCH_EVENTS;
}

/**
 * Get server health (simulated — in production, this aggregates from all regions).
 */
export function getServerHealth(): ServerHealth[] {
  return [
    { region: 'us-east', status: 'healthy', latencyMs: 25, activeConnections: 1250, errorRate: 0.001, cpuUsage: 0.35, memoryUsage: 0.55, uptime: 99.99 },
    { region: 'us-west', status: 'healthy', latencyMs: 30, activeConnections: 980, errorRate: 0.002, cpuUsage: 0.28, memoryUsage: 0.48, uptime: 99.99 },
    { region: 'eu-west', status: 'healthy', latencyMs: 45, activeConnections: 2100, errorRate: 0.001, cpuUsage: 0.42, memoryUsage: 0.60, uptime: 99.98 },
    { region: 'ap-southeast', status: 'healthy', latencyMs: 60, activeConnections: 750, errorRate: 0.003, cpuUsage: 0.22, memoryUsage: 0.40, uptime: 99.97 },
  ];
}

/**
 * Get retention metrics.
 */
export function getRetentionMetrics(): RetentionMetrics[] {
  // Simulated launch week data
  const baseDate = new Date('2026-03-01');
  const metrics: RetentionMetrics[] = [];

  for (let d = 0; d < 7; d++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + d);

    metrics.push({
      date: date.toISOString().split('T')[0],
      newPlayers: 5000 + Math.floor(Math.random() * 3000),
      day1Retention: 0.42 + Math.random() * 0.08,
      day3Retention: 0.28 + Math.random() * 0.06,
      day7Retention: 0.20 + Math.random() * 0.05,
      day30Retention: 0,
      avgSessionMinutes: 18 + Math.random() * 8,
      gamesPerSession: 2.5 + Math.random() * 1.5,
      avgGameMinutes: 7 + Math.random() * 3,
      conversionRate: 0.03 + Math.random() * 0.02,
      arpdau: 0.15 + Math.random() * 0.10,
    });
  }

  return metrics;
}

/**
 * Get launch day checklist.
 */
export function getLaunchChecklist(): {
  item: string;
  status: 'done' | 'pending' | 'in_progress';
  priority: 'critical' | 'high' | 'medium';
}[] {
  return [
    { item: 'Web deployment live', status: 'done', priority: 'critical' },
    { item: 'Android build on Play Store', status: 'done', priority: 'critical' },
    { item: 'iOS build on App Store', status: 'done', priority: 'critical' },
    { item: 'Server scaling configured', status: 'done', priority: 'critical' },
    { item: 'Database backups verified', status: 'done', priority: 'critical' },
    { item: 'Error tracking active', status: 'done', priority: 'critical' },
    { item: 'Launch event configured', status: 'done', priority: 'high' },
    { item: 'Monitoring dashboards ready', status: 'done', priority: 'high' },
    { item: 'Emergency hotfix pipeline tested', status: 'done', priority: 'high' },
    { item: 'Community Discord server live', status: 'done', priority: 'high' },
    { item: 'Social media posts scheduled', status: 'done', priority: 'medium' },
    { item: 'Press kit distributed', status: 'done', priority: 'medium' },
    { item: 'Content creator access granted', status: 'done', priority: 'medium' },
    { item: 'Steam build submitted', status: 'pending', priority: 'medium' },
  ];
}

/**
 * Marketing materials/links.
 */
export function getMarketingAssets(): {
  type: string;
  url: string;
  description: string;
}[] {
  return [
    { type: 'trailer', url: '/assets/trailer_launch_60s.mp4', description: 'Launch trailer (60 seconds)' },
    { type: 'trailer_short', url: '/assets/trailer_launch_30s.mp4', description: 'Short trailer (30 seconds)' },
    { type: 'key_art', url: '/assets/keyart_4k.png', description: '4K key art' },
    { type: 'logo', url: '/assets/logo_transparent.png', description: 'Logo (transparent)' },
    { type: 'screenshots', url: '/assets/screenshots/', description: '10 gameplay screenshots' },
    { type: 'press_kit', url: '/assets/press_kit.zip', description: 'Complete press kit' },
    { type: 'fact_sheet', url: '/assets/fact_sheet.pdf', description: 'Game fact sheet' },
  ];
}
