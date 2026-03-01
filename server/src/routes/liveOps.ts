/**
 * STARFORGE TCG - Live Operations Routes
 *
 * Live ops cadence management, server announcements, maintenance windows.
 */

import { Router, Request, Response } from 'express';

const router = Router();

interface Announcement {
  id: string;
  title: string;
  body: string;
  type: 'info' | 'update' | 'event' | 'maintenance' | 'emergency';
  priority: number;
  imageUrl?: string;
  linkUrl?: string;
  startDate: Date;
  endDate: Date;
}

interface MaintenanceWindow {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  isEmergency: boolean;
}

const announcements: Announcement[] = [
  {
    id: 'launch_1', title: 'Welcome to StarForge TCG!',
    body: 'The galaxy is yours to conquer. Complete the tutorial to earn your first free packs!',
    type: 'info', priority: 1,
    startDate: new Date('2026-03-01'), endDate: new Date('2026-04-01'),
  },
  {
    id: 'event_launch', title: 'Launch Celebration Event',
    body: 'Double XP, bonus daily rewards, and a free Legendary card for your first win!',
    type: 'event', priority: 2,
    startDate: new Date('2026-03-01'), endDate: new Date('2026-03-14'),
  },
];

const maintenanceWindows: MaintenanceWindow[] = [];

/** GET /api/live-ops/announcements — Get active announcements */
router.get('/announcements', (_req: Request, res: Response) => {
  const now = new Date();
  const active = announcements.filter(a => now >= a.startDate && now <= a.endDate);
  active.sort((a, b) => b.priority - a.priority);
  res.json({ announcements: active });
});

/** GET /api/live-ops/maintenance — Get scheduled maintenance */
router.get('/maintenance', (_req: Request, res: Response) => {
  const now = new Date();
  const upcoming = maintenanceWindows.filter(m => m.endTime > now);
  res.json({ windows: upcoming });
});

/** GET /api/live-ops/status — Server status */
router.get('/status', (_req: Request, res: Response) => {
  const now = new Date();
  const activeMaintenance = maintenanceWindows.find(m => now >= m.startTime && now <= m.endTime);

  res.json({
    status: activeMaintenance ? 'maintenance' : 'online',
    maintenance: activeMaintenance || null,
    serverTime: now.toISOString(),
    currentSeason: 'Season 1',
    seasonEndsAt: new Date('2026-04-01').toISOString(),
    nextPatchDate: new Date('2026-03-15').toISOString(),
    gameVersion: '1.0.0',
    minClientVersion: '1.0.0',
  });
});

/** GET /api/live-ops/schedule — Live ops cadence */
router.get('/schedule', (_req: Request, res: Response) => {
  res.json({
    cadence: {
      weekly: 'Tavern Brawl rotation, minor bug fixes',
      biWeekly: 'Balance micro-patch (stat adjustments)',
      monthly: 'Battle Pass season, ranked season reset, major balance patch',
      quarterly: 'New expansion (100+ cards), new keyword, new game mode',
    },
    upcoming: [
      { type: 'weekly', event: 'Tavern Brawl: Total Chaos', date: '2026-03-03' },
      { type: 'biWeekly', event: 'Balance Patch 1.1', date: '2026-03-15' },
      { type: 'monthly', event: 'Season 2 Start', date: '2026-04-01' },
      { type: 'quarterly', event: 'Expansion: Shattered Stars', date: '2026-05-01' },
    ],
  });
});

/** GET /api/live-ops/motd — Message of the day */
router.get('/motd', (_req: Request, res: Response) => {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const messages = [
    'May the stars align in your favor!',
    'A new challenger approaches...',
    'The void whispers secrets to those who listen.',
    'Forge your destiny among the stars.',
    'Every great commander started as a recruit.',
    'The Hivemind grows stronger with each battle.',
    'Light the way with the Luminar\'s blessing.',
  ];
  res.json({ message: messages[dayOfYear % messages.length] });
});

export default router;
