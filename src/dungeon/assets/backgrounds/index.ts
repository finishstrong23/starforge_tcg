// Dungeon-mode combat backgrounds.
// ---------------------------------------------------------------------------
// Drop .jpg / .webp files into this directory and they're auto-bundled by
// Vite's import.meta.glob and selected at random per combat. Keep large PNGs as
// source art only; shipping compressed backgrounds keeps mobile loads healthy.
//
// Recommended naming (helps future debugging — not enforced):
//   bg-<theme>-<short>.<ext>
//   e.g.  bg-starship-deck.jpg
//         bg-jungle-ruins.jpg
//         bg-forge-lava.jpg
//         bg-void-purple.jpg
//         bg-temple-fire.jpg

const modules = import.meta.glob<string>('./*.{jpg,jpeg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const BACKGROUNDS: string[] = Object.values(modules);

/** FNV-1a-ish string hash → unsigned 32-bit. Used to seed background picks. */
function hashString(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/**
 * Pick a random background URL.
 * - Pass a `seed` (e.g. enemy ID, node ID) for a stable result across renders
 *   so the background doesn't flicker between updates of the same scene.
 * - Without a seed, picks uniformly at random each call.
 * - Returns `null` if the directory is empty (caller should fall back).
 */
export function pickRandomBackground(seed?: string): string | null {
  if (BACKGROUNDS.length === 0) return null;
  if (seed === undefined) {
    return BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
  }
  return BACKGROUNDS[hashString(seed) % BACKGROUNDS.length];
}
