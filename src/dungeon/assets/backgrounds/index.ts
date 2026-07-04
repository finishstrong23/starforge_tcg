// Dungeon-mode combat backgrounds.
// ---------------------------------------------------------------------------
// The Pyroclast MVP uses original polished cartoon stage backgrounds: bright,
// readable, artful raster scenes with enough quiet space for combat UI. Do not
// auto-load unrelated uploaded scene art here; each background should be added
// deliberately after in-game review.

export const BACKGROUNDS: string[] = [
  `${import.meta.env.BASE_URL}art/dungeon/backgrounds/combat_pyroclast_arena.png`,
];

/** FNV-1a-ish string hash -> unsigned 32-bit. Used to seed background picks. */
function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/**
 * Pick a stable polished cartoon stage background URL.
 * - Pass a seed such as enemy ID or node ID so the background stays stable.
 * - Without a seed, picks uniformly at random each call.
 */
export function pickRandomBackground(seed?: string): string | null {
  if (BACKGROUNDS.length === 0) return null;
  if (seed === undefined) {
    return BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
  }
  return BACKGROUNDS[hashString(seed) % BACKGROUNDS.length];
}
