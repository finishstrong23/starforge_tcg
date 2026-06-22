export const HEAT_CAP = 10;

export interface HeatGainResult {
  next: number;
  gained: number;
  wasted: number;
}

export function addHeat(current: number, amount: number, cap: number = HEAT_CAP): HeatGainResult {
  const raw = current + amount;
  const next = Math.max(0, Math.min(cap, raw));
  return {
    next,
    gained: Math.max(0, next - current),
    wasted: Math.max(0, raw - cap),
  };
}
