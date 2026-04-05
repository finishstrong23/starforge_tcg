/**
 * STARFORGE TCG - Dungeon Run Themed Backgrounds
 *
 * Each tier/act gets a distinct atmosphere:
 * - Tier 1: Abandoned Outpost (dim blue, debris particles)
 * - Tier 2: Corrupted Depths (deep purple, energy tendrils)
 * - Tier 3: The Starforge Core (intense red-gold, molten glow)
 * - Victory: Ascension (radiant gold burst)
 * - Defeat: Void Collapse (dark implosion)
 */

import React from 'react';

export type DungeonTheme = 'outpost' | 'depths' | 'core' | 'victory' | 'defeat' | 'select';

interface DungeonBackgroundProps {
  theme: DungeonTheme;
}

const THEME_CONFIGS: Record<DungeonTheme, {
  base: string;
  gradient: string;
  particles: string;
  accent: string;
  animation: string;
  animationName: string;
}> = {
  select: {
    base: '#040410',
    gradient: 'radial-gradient(ellipse at 50% 30%, rgba(20, 20, 60, 0.8) 0%, rgba(4, 4, 16, 1) 80%)',
    particles: `radial-gradient(1px 1px at 15% 25%, rgba(100,150,255,0.4) 0%, transparent 100%),
      radial-gradient(1px 1px at 40% 60%, rgba(100,150,255,0.3) 0%, transparent 100%),
      radial-gradient(1.5px 1.5px at 65% 35%, rgba(150,180,255,0.5) 0%, transparent 100%),
      radial-gradient(1px 1px at 80% 75%, rgba(100,150,255,0.3) 0%, transparent 100%)`,
    accent: 'rgba(100, 150, 255, 0.1)',
    animation: '0%, 100% { opacity: 0.3; } 50% { opacity: 0.6; }',
    animationName: 'dungeonTwinkle',
  },
  outpost: {
    base: '#060812',
    gradient: 'radial-gradient(ellipse at 50% 60%, rgba(20, 40, 80, 0.6) 0%, rgba(6, 8, 18, 0.95) 70%)',
    particles: `radial-gradient(2px 2px at 10% 30%, rgba(80,120,200,0.5) 0%, transparent 100%),
      radial-gradient(1.5px 1.5px at 30% 70%, rgba(60,100,180,0.4) 0%, transparent 100%),
      radial-gradient(2px 2px at 50% 20%, rgba(100,140,220,0.3) 0%, transparent 100%),
      radial-gradient(1px 1px at 70% 50%, rgba(80,120,200,0.4) 0%, transparent 100%),
      radial-gradient(3px 3px at 85% 80%, rgba(60,100,180,0.3) 0%, transparent 100%),
      radial-gradient(1.5px 1.5px at 20% 90%, rgba(100,140,220,0.5) 0%, transparent 100%)`,
    accent: 'rgba(80, 120, 200, 0.08)',
    animation: '0%, 100% { opacity: 0.2; transform: translateY(0px); } 50% { opacity: 0.5; transform: translateY(-2px); }',
    animationName: 'outpostDrift',
  },
  depths: {
    base: '#0a0414',
    gradient: 'radial-gradient(ellipse at 40% 50%, rgba(60, 20, 100, 0.5) 0%, rgba(10, 4, 20, 0.95) 65%)',
    particles: `radial-gradient(2px 2px at 15% 40%, rgba(160,80,255,0.5) 0%, transparent 100%),
      radial-gradient(1.5px 1.5px at 35% 25%, rgba(120,60,200,0.4) 0%, transparent 100%),
      radial-gradient(3px 3px at 60% 65%, rgba(180,100,255,0.3) 0%, transparent 100%),
      radial-gradient(2px 2px at 80% 40%, rgba(140,70,220,0.4) 0%, transparent 100%),
      radial-gradient(1.5px 1.5px at 45% 85%, rgba(160,80,255,0.5) 0%, transparent 100%),
      radial-gradient(2px 2px at 90% 15%, rgba(120,60,200,0.3) 0%, transparent 100%)`,
    accent: 'rgba(140, 60, 220, 0.1)',
    animation: '0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.02); }',
    animationName: 'depthsPulse',
  },
  core: {
    base: '#100404',
    gradient: 'radial-gradient(ellipse at 50% 50%, rgba(120, 40, 10, 0.4) 0%, rgba(16, 4, 4, 0.95) 60%)',
    particles: `radial-gradient(2px 2px at 20% 35%, rgba(255,150,50,0.5) 0%, transparent 100%),
      radial-gradient(3px 3px at 45% 55%, rgba(255,100,30,0.4) 0%, transparent 100%),
      radial-gradient(2px 2px at 65% 25%, rgba(255,200,80,0.3) 0%, transparent 100%),
      radial-gradient(1.5px 1.5px at 80% 70%, rgba(255,150,50,0.5) 0%, transparent 100%),
      radial-gradient(2.5px 2.5px at 30% 80%, rgba(255,100,30,0.4) 0%, transparent 100%),
      radial-gradient(2px 2px at 90% 45%, rgba(255,200,80,0.5) 0%, transparent 100%)`,
    accent: 'rgba(255, 100, 30, 0.1)',
    animation: '0%, 100% { opacity: 0.4; transform: scale(1); } 30% { opacity: 0.8; transform: scale(1.01); } 70% { opacity: 0.5; transform: scale(0.99); }',
    animationName: 'coreFlicker',
  },
  victory: {
    base: '#0a0800',
    gradient: 'radial-gradient(ellipse at 50% 40%, rgba(255, 215, 0, 0.25) 0%, rgba(10, 8, 0, 0.95) 70%)',
    particles: `radial-gradient(2px 2px at 25% 30%, rgba(255,215,0,0.6) 0%, transparent 100%),
      radial-gradient(2.5px 2.5px at 50% 50%, rgba(255,230,100,0.5) 0%, transparent 100%),
      radial-gradient(2px 2px at 75% 35%, rgba(255,200,50,0.4) 0%, transparent 100%),
      radial-gradient(1.5px 1.5px at 40% 70%, rgba(255,215,0,0.5) 0%, transparent 100%),
      radial-gradient(3px 3px at 60% 80%, rgba(255,230,100,0.3) 0%, transparent 100%),
      radial-gradient(2px 2px at 85% 60%, rgba(255,200,50,0.6) 0%, transparent 100%)`,
    accent: 'rgba(255, 215, 0, 0.15)',
    animation: '0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.03); }',
    animationName: 'victoryGlow',
  },
  defeat: {
    base: '#040208',
    gradient: 'radial-gradient(ellipse at 50% 50%, rgba(40, 10, 60, 0.5) 0%, rgba(4, 2, 8, 1) 60%)',
    particles: `radial-gradient(1.5px 1.5px at 30% 40%, rgba(100,30,50,0.4) 0%, transparent 100%),
      radial-gradient(1px 1px at 55% 60%, rgba(80,20,40,0.3) 0%, transparent 100%),
      radial-gradient(2px 2px at 70% 30%, rgba(60,15,30,0.3) 0%, transparent 100%),
      radial-gradient(1px 1px at 45% 75%, rgba(100,30,50,0.2) 0%, transparent 100%)`,
    accent: 'rgba(100, 30, 50, 0.08)',
    animation: '0%, 100% { opacity: 0.3; } 50% { opacity: 0.15; }',
    animationName: 'defeatFade',
  },
};

export const DungeonBackground: React.FC<DungeonBackgroundProps> = ({ theme }) => {
  const config = THEME_CONFIGS[theme];

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
      background: config.base,
    }}>
      {/* Base gradient */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: config.gradient,
      }} />
      {/* Ambient glow */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: config.accent,
      }} />
      {/* Particles / stars */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: config.particles,
        animation: `${config.animationName} 6s ease-in-out infinite`,
      }} />
      {/* Vignette */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.6) 100%)',
      }} />
      <style>{`
        @keyframes ${config.animationName} {
          ${config.animation}
        }
      `}</style>
    </div>
  );
};

/** Map boss tier to dungeon theme */
export function tierToTheme(tier: number): DungeonTheme {
  if (tier <= 1) return 'outpost';
  if (tier <= 2) return 'depths';
  return 'core';
}
