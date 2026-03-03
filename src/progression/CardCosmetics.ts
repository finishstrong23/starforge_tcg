/**
 * STARFORGE TCG - Card Cosmetic Tiers (8.1.5)
 *
 * Golden / Prismatic / Astral card upgrade system.
 * - Standard: base card, no animation
 * - Golden: animated card art with subtle motion
 * - Prismatic: holographic rainbow shimmer + animated art
 * - Astral: full cosmic animation, card art is alive
 *
 * Upgrade path: Standard -> Golden -> Prismatic -> Astral
 * Each tier costs progressively more Stardust.
 */

const COSMETICS_KEY = 'starforge_card_cosmetics';
const STARDUST_KEY = 'starforge_stardust';

/**
 * Cosmetic tier levels
 */
export enum CosmeticTier {
  STANDARD = 'STANDARD',
  GOLDEN = 'GOLDEN',
  PRISMATIC = 'PRISMATIC',
  ASTRAL = 'ASTRAL',
}

/**
 * Tier display info
 */
export const TIER_INFO: Record<CosmeticTier, {
  label: string;
  color: string;
  glow: string;
  description: string;
}> = {
  [CosmeticTier.STANDARD]: {
    label: 'Standard',
    color: '#888',
    glow: 'none',
    description: 'Base card with no special effects.',
  },
  [CosmeticTier.GOLDEN]: {
    label: 'Golden',
    color: '#ffd700',
    glow: '0 0 10px rgba(255,215,0,0.4)',
    description: 'Animated card art with subtle motion effects.',
  },
  [CosmeticTier.PRISMATIC]: {
    label: 'Prismatic',
    color: '#c084fc',
    glow: '0 0 15px rgba(192,132,252,0.5)',
    description: 'Holographic rainbow shimmer with animated art.',
  },
  [CosmeticTier.ASTRAL]: {
    label: 'Astral',
    color: '#22d3ee',
    glow: '0 0 20px rgba(34,211,238,0.6)',
    description: 'Full cosmic animation — the card is alive.',
  },
};

/**
 * Stardust cost to upgrade to the next tier, by card rarity
 */
export const UPGRADE_COSTS: Record<string, Record<CosmeticTier, number>> = {
  COMMON:    { STANDARD: 0, GOLDEN: 200,  PRISMATIC: 400,  ASTRAL: 800  },
  RARE:      { STANDARD: 0, GOLDEN: 400,  PRISMATIC: 800,  ASTRAL: 1600 },
  EPIC:      { STANDARD: 0, GOLDEN: 800,  PRISMATIC: 1600, ASTRAL: 3200 },
  LEGENDARY: { STANDARD: 0, GOLDEN: 1600, PRISMATIC: 3200, ASTRAL: 6400 },
};

/**
 * Get the next tier in the upgrade path
 */
export function getNextTier(current: CosmeticTier): CosmeticTier | null {
  switch (current) {
    case CosmeticTier.STANDARD: return CosmeticTier.GOLDEN;
    case CosmeticTier.GOLDEN: return CosmeticTier.PRISMATIC;
    case CosmeticTier.PRISMATIC: return CosmeticTier.ASTRAL;
    case CosmeticTier.ASTRAL: return null;
  }
}

/**
 * Get the upgrade cost from current tier to next
 */
export function getUpgradeCost(rarity: string, currentTier: CosmeticTier): number | null {
  const next = getNextTier(currentTier);
  if (!next) return null;
  return UPGRADE_COSTS[rarity]?.[next] ?? null;
}

/**
 * The stored cosmetics data: cardDefinitionId -> tier
 */
export type CosmeticsMap = Record<string, CosmeticTier>;

// ─── PERSISTENCE ────────────────────────────────────────────────────────────

export function loadCosmetics(): CosmeticsMap {
  try {
    const raw = localStorage.getItem(COSMETICS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveCosmetics(data: CosmeticsMap): void {
  try {
    localStorage.setItem(COSMETICS_KEY, JSON.stringify(data));
  } catch {
    console.warn('Failed to save card cosmetics');
  }
}

export function getCardTier(cardDefId: string): CosmeticTier {
  const data = loadCosmetics();
  return data[cardDefId] || CosmeticTier.STANDARD;
}

export function loadStardust(): number {
  try {
    const raw = localStorage.getItem(STARDUST_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

export function saveStardust(amount: number): void {
  try {
    localStorage.setItem(STARDUST_KEY, String(amount));
  } catch {
    console.warn('Failed to save stardust');
  }
}

/**
 * Attempt to upgrade a card to the next tier.
 * Returns true if successful, false if insufficient stardust or already max.
 */
export function upgradeCard(cardDefId: string, rarity: string): boolean {
  const cosmetics = loadCosmetics();
  const currentTier = cosmetics[cardDefId] || CosmeticTier.STANDARD;
  const cost = getUpgradeCost(rarity, currentTier);

  if (cost === null) return false;

  const stardust = loadStardust();
  if (stardust < cost) return false;

  const nextTier = getNextTier(currentTier);
  if (!nextTier) return false;

  cosmetics[cardDefId] = nextTier;
  saveCosmetics(cosmetics);
  saveStardust(stardust - cost);
  return true;
}

/**
 * Get cosmetics summary for collection display
 */
export function getCosmeticsStats(): {
  total: number;
  golden: number;
  prismatic: number;
  astral: number;
  percentage: number;
} {
  const cosmetics = loadCosmetics();
  const entries = Object.values(cosmetics);
  const golden = entries.filter(t => t === CosmeticTier.GOLDEN).length;
  const prismatic = entries.filter(t => t === CosmeticTier.PRISMATIC).length;
  const astral = entries.filter(t => t === CosmeticTier.ASTRAL).length;
  const total = entries.length;

  return {
    total,
    golden,
    prismatic,
    astral,
    percentage: total > 0 ? Math.round(((golden + prismatic + astral) / total) * 100) : 0,
  };
}

// ─── CSS ANIMATION HELPERS ──────────────────────────────────────────────────

/**
 * Get CSS styles for a card based on its cosmetic tier
 */
export function getCardCosmeticStyles(tier: CosmeticTier): React.CSSProperties {
  switch (tier) {
    case CosmeticTier.GOLDEN:
      return {
        boxShadow: '0 0 12px rgba(255,215,0,0.4), inset 0 0 8px rgba(255,215,0,0.1)',
        borderColor: '#ffd700',
        animation: 'goldenShimmer 3s ease-in-out infinite',
      };
    case CosmeticTier.PRISMATIC:
      return {
        boxShadow: '0 0 18px rgba(192,132,252,0.5), inset 0 0 12px rgba(192,132,252,0.1)',
        borderColor: '#c084fc',
        animation: 'prismaticShift 4s ease-in-out infinite',
      };
    case CosmeticTier.ASTRAL:
      return {
        boxShadow: '0 0 25px rgba(34,211,238,0.6), inset 0 0 15px rgba(34,211,238,0.15)',
        borderColor: '#22d3ee',
        animation: 'astralPulse 2.5s ease-in-out infinite',
      };
    default:
      return {};
  }
}

/**
 * Get the CSS keyframes stylesheet for card cosmetics.
 * Should be injected once into the document.
 */
export function getCardCosmeticKeyframes(): string {
  return `
    @keyframes goldenShimmer {
      0%, 100% { box-shadow: 0 0 12px rgba(255,215,0,0.3), inset 0 0 6px rgba(255,215,0,0.08); }
      50% { box-shadow: 0 0 20px rgba(255,215,0,0.5), inset 0 0 10px rgba(255,215,0,0.15); }
    }

    @keyframes prismaticShift {
      0% { border-color: #c084fc; box-shadow: 0 0 15px rgba(192,132,252,0.4); }
      25% { border-color: #f472b6; box-shadow: 0 0 15px rgba(244,114,182,0.4); }
      50% { border-color: #60a5fa; box-shadow: 0 0 15px rgba(96,165,250,0.4); }
      75% { border-color: #4ade80; box-shadow: 0 0 15px rgba(74,222,128,0.4); }
      100% { border-color: #c084fc; box-shadow: 0 0 15px rgba(192,132,252,0.4); }
    }

    @keyframes astralPulse {
      0%, 100% {
        box-shadow: 0 0 20px rgba(34,211,238,0.5), 0 0 40px rgba(34,211,238,0.2), inset 0 0 12px rgba(34,211,238,0.1);
        transform: scale(1);
      }
      50% {
        box-shadow: 0 0 30px rgba(34,211,238,0.7), 0 0 60px rgba(34,211,238,0.3), inset 0 0 18px rgba(34,211,238,0.15);
        transform: scale(1.02);
      }
    }

    @keyframes astralParticles {
      0% { transform: translateY(0) rotate(0deg); opacity: 0; }
      20% { opacity: 1; }
      80% { opacity: 1; }
      100% { transform: translateY(-30px) rotate(360deg); opacity: 0; }
    }

    .card-tier-golden::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: linear-gradient(135deg, transparent 40%, rgba(255,215,0,0.1) 50%, transparent 60%);
      animation: goldenSweep 3s ease-in-out infinite;
      pointer-events: none;
    }

    @keyframes goldenSweep {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    .card-tier-prismatic::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: linear-gradient(
        135deg,
        rgba(255,0,0,0.05) 0%,
        rgba(255,165,0,0.05) 17%,
        rgba(255,255,0,0.05) 33%,
        rgba(0,255,0,0.05) 50%,
        rgba(0,0,255,0.05) 67%,
        rgba(75,0,130,0.05) 83%,
        rgba(148,0,211,0.05) 100%
      );
      animation: prismaticSweep 4s linear infinite;
      pointer-events: none;
    }

    @keyframes prismaticSweep {
      0% { filter: hue-rotate(0deg); }
      100% { filter: hue-rotate(360deg); }
    }
  `;
}

// Import guard - inject keyframes only once
let injected = false;

export function injectCosmeticStyles(): void {
  if (injected) return;
  injected = true;

  const style = document.createElement('style');
  style.textContent = getCardCosmeticKeyframes();
  document.head.appendChild(style);
}
