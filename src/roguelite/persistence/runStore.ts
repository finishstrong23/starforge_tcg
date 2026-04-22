import type { RunState } from '../types';
import type { StorageAdapter } from './adapter';
import { RUNS_DB_NAME, RUNS_STORE } from './schema';

// Typed wrapper around the StorageAdapter for RunState. Kept
// deliberately small — business logic (lifecycle, transitions) lives
// in engine/run.ts. This file just moves bytes.

export class RunStore {
  constructor(private readonly adapter: StorageAdapter) {}

  /** Fetch a run by runId. Returns undefined if the run does not exist. */
  async get(runId: string): Promise<RunState | undefined> {
    return this.adapter.get<RunState>(RUNS_DB_NAME, RUNS_STORE, runId);
  }

  /** List all runs in the store, most-recent save first. */
  async listAll(): Promise<RunState[]> {
    const runs = await this.adapter.list<RunState>(RUNS_DB_NAME, RUNS_STORE);
    return runs.sort((a, b) => b.lastSavedAt - a.lastSavedAt);
  }

  /** Returns the most-recent run or undefined if there are none.
   *  `character_select` runs are excluded — a resumable run must have
   *  progressed past the initial selection screen. */
  async getActive(): Promise<RunState | undefined> {
    const all = await this.listAll();
    return all.find((r) => r.phase !== 'character_select' && r.phase !== 'run_end_win' && r.phase !== 'run_end_loss');
  }

  /** Write a run, stamping lastSavedAt. Called after every discrete
   *  player action per constraint #3. */
  async save(run: RunState): Promise<RunState> {
    const stamped = { ...run, lastSavedAt: Date.now() };
    // RUNS_STORE has `keyPath: 'runId'` so we don't pass an explicit key.
    await this.adapter.put(RUNS_DB_NAME, RUNS_STORE, stamped);
    return stamped;
  }

  /** Delete a run — called on abandon or after the final-state entry is
   *  persisted to MetaProgression.recentRuns. */
  async delete(runId: string): Promise<void> {
    await this.adapter.delete(RUNS_DB_NAME, RUNS_STORE, runId);
  }

  /** Nuclear option — drop the entire runs DB. For tests and user
   *  "reset progress" flows. Does not touch MetaProgression. */
  async clear(): Promise<void> {
    await this.adapter.clear(RUNS_DB_NAME);
  }
}
