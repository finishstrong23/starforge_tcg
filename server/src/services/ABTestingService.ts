/**
 * STARFORGE TCG - A/B Testing Framework
 *
 * Server-side A/B testing for tuning rewards, progression, economy, and UX.
 * Uses deterministic hashing so a player always gets the same variant.
 */

import { config } from '../config/env';
import { query } from '../config/database';

export interface Experiment {
  id: string;
  name: string;
  description: string;
  variants: ExperimentVariant[];
  status: 'draft' | 'active' | 'paused' | 'completed';
  startDate: Date | null;
  endDate: Date | null;
  targetPercent: number; // % of players included (0-100)
}

export interface ExperimentVariant {
  id: string;
  name: string;
  weight: number; // Relative weight (e.g., 50/50 or 33/33/34)
  config: Record<string, unknown>;
}

export interface PlayerAssignment {
  experimentId: string;
  variantId: string;
  variantName: string;
  config: Record<string, unknown>;
}

// Built-in experiments with defaults
const DEFAULT_EXPERIMENTS: Experiment[] = [
  {
    id: 'quest_rewards_v1',
    name: 'Quest Gold Rewards',
    description: 'Test higher vs standard quest gold rewards for retention',
    variants: [
      { id: 'control', name: 'Standard', weight: 50, config: { goldMultiplier: 1.0 } },
      { id: 'generous', name: 'Generous', weight: 50, config: { goldMultiplier: 1.5 } },
    ],
    status: 'active',
    startDate: new Date('2026-01-01'),
    endDate: null,
    targetPercent: 100,
  },
  {
    id: 'pack_pity_timer_v1',
    name: 'Pack Pity Timer',
    description: 'Test different pity timer thresholds for legendary pulls',
    variants: [
      { id: 'control', name: '40 Packs', weight: 34, config: { pityThreshold: 40 } },
      { id: 'generous', name: '30 Packs', weight: 33, config: { pityThreshold: 30 } },
      { id: 'tight', name: '50 Packs', weight: 33, config: { pityThreshold: 50 } },
    ],
    status: 'active',
    startDate: new Date('2026-01-01'),
    endDate: null,
    targetPercent: 100,
  },
  {
    id: 'first_week_gifts_v1',
    name: 'First Week Gifts',
    description: 'Test different first-week gift schedules for new player retention',
    variants: [
      { id: 'control', name: 'Standard', weight: 50, config: { bonusPacks: 3, bonusGold: 500 } },
      { id: 'generous', name: 'Double', weight: 50, config: { bonusPacks: 6, bonusGold: 1000 } },
    ],
    status: 'active',
    startDate: new Date('2026-01-01'),
    endDate: null,
    targetPercent: 50,
  },
  {
    id: 'matchmaking_range_v1',
    name: 'Matchmaking MMR Range',
    description: 'Test faster vs tighter matchmaking',
    variants: [
      { id: 'control', name: 'Standard', weight: 50, config: { initialRange: 100, expandPerSecond: 20 } },
      { id: 'fast', name: 'Fast Match', weight: 50, config: { initialRange: 200, expandPerSecond: 40 } },
    ],
    status: 'draft',
    startDate: null,
    endDate: null,
    targetPercent: 100,
  },
];

/**
 * Deterministic hash of (playerId + experimentId + seed) to a number 0-99.
 */
function hashAssignment(playerId: string, experimentId: string): number {
  const str = `${config.abTesting.seed}:${experimentId}:${playerId}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) % 100;
}

/**
 * Get the variant assigned to a player for a given experiment.
 * Returns null if player is not in the experiment.
 */
export function getAssignment(playerId: string, experimentId: string): PlayerAssignment | null {
  if (!config.abTesting.enabled) return null;

  const experiment = DEFAULT_EXPERIMENTS.find(e => e.id === experimentId);
  if (!experiment || experiment.status !== 'active') return null;

  // Check if player is in the target group
  const inclusionHash = hashAssignment(playerId, `${experimentId}_inclusion`);
  if (inclusionHash >= experiment.targetPercent) return null;

  // Determine which variant
  const variantHash = hashAssignment(playerId, experimentId);
  const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
  const threshold = (variantHash / 100) * totalWeight;

  let cumulative = 0;
  for (const variant of experiment.variants) {
    cumulative += variant.weight;
    if (threshold < cumulative) {
      return {
        experimentId,
        variantId: variant.id,
        variantName: variant.name,
        config: variant.config,
      };
    }
  }

  // Fallback to first variant
  const first = experiment.variants[0];
  return {
    experimentId,
    variantId: first.id,
    variantName: first.name,
    config: first.config,
  };
}

/**
 * Get all active assignments for a player.
 */
export function getAllAssignments(playerId: string): PlayerAssignment[] {
  if (!config.abTesting.enabled) return [];

  const assignments: PlayerAssignment[] = [];
  for (const experiment of DEFAULT_EXPERIMENTS) {
    const assignment = getAssignment(playerId, experiment.id);
    if (assignment) assignments.push(assignment);
  }
  return assignments;
}

/**
 * Get a config value from an experiment, falling back to default.
 */
export function getExperimentValue<T>(playerId: string, experimentId: string, key: string, defaultValue: T): T {
  const assignment = getAssignment(playerId, experimentId);
  if (!assignment) return defaultValue;
  return (assignment.config[key] as T) ?? defaultValue;
}

/**
 * Record an event for A/B test analysis.
 */
export async function recordEvent(
  playerId: string,
  experimentId: string,
  eventType: string,
  eventData?: Record<string, unknown>,
): Promise<void> {
  const assignment = getAssignment(playerId, experimentId);
  if (!assignment) return;

  try {
    await query(
      `INSERT INTO ab_test_events (player_id, experiment_id, variant_id, event_type, event_data, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [playerId, experimentId, assignment.variantId, eventType, JSON.stringify(eventData || {})]
    );
  } catch {
    // Non-critical — don't fail the request
  }
}

/**
 * Get experiment results/metrics.
 */
export async function getExperimentResults(experimentId: string): Promise<{
  experiment: Experiment | undefined;
  variantMetrics: Array<{
    variantId: string;
    variantName: string;
    playerCount: number;
    events: Record<string, number>;
  }>;
}> {
  const experiment = DEFAULT_EXPERIMENTS.find(e => e.id === experimentId);

  try {
    const result = await query(
      `SELECT variant_id, event_type, COUNT(*) as event_count, COUNT(DISTINCT player_id) as player_count
       FROM ab_test_events
       WHERE experiment_id = $1
       GROUP BY variant_id, event_type`,
      [experimentId]
    );

    const variantMap = new Map<string, { playerCount: number; events: Record<string, number> }>();

    for (const row of result.rows) {
      if (!variantMap.has(row.variant_id)) {
        variantMap.set(row.variant_id, { playerCount: 0, events: {} });
      }
      const entry = variantMap.get(row.variant_id)!;
      entry.events[row.event_type] = parseInt(row.event_count);
      entry.playerCount = Math.max(entry.playerCount, parseInt(row.player_count));
    }

    const variantMetrics = Array.from(variantMap.entries()).map(([variantId, data]) => {
      const variant = experiment?.variants.find(v => v.id === variantId);
      return {
        variantId,
        variantName: variant?.name || variantId,
        ...data,
      };
    });

    return { experiment, variantMetrics };
  } catch {
    return { experiment, variantMetrics: [] };
  }
}

/**
 * List all experiments.
 */
export function listExperiments(): Experiment[] {
  return DEFAULT_EXPERIMENTS;
}
