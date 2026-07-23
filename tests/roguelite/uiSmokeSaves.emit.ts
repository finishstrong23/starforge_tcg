/**
 * Save-fixture emitter for the UI smoke check (scripts/ui-smoke.mjs).
 *
 * NOT part of the normal suite (filename intentionally avoids *.test.ts —
 * jest only picks it up via the explicit --testMatch override the smoke
 * script passes). Builds real run states through the live reducer and
 * writes them as localStorage-ready save snapshots to .tmp/ui-smoke/.
 */

import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { INITIAL, reducer, type ContextState } from '../../src/dungeon/engine/runReducer';
import { createDungeonSaveSnapshot } from '../../src/dungeon/engine/saveCompatibility';

const OUT_DIR = join(__dirname, '..', '..', '.tmp', 'ui-smoke');

function startAtMap(seed: string): ContextState {
  let s = reducer(INITIAL, { type: 'START_RUN', faction: 'Pyroclast', seed });
  while (s.run!.phase === 'draft') s = reducer(s, { type: 'PICK_DRAFT', card: s.draftOptions[0] });
  s = reducer(s, { type: 'APPLY_BLESSING', blessingId: s.run!.blessingOptionIds![0] as never });
  return s;
}

it('emits UI smoke save fixtures', () => {
  mkdirSync(OUT_DIR, { recursive: true });

  // Map phase: fresh Act 1 rail map, no room entered yet.
  const atMap = startAtMap('ui-smoke-map');
  expect(atMap.run!.phase).toBe('map');
  writeFileSync(join(OUT_DIR, 'map.json'), JSON.stringify(createDungeonSaveSnapshot(atMap)));

  // Combat phase: first rail opener entered.
  let atCombat = startAtMap('ui-smoke-combat');
  const opener = atCombat.run!.actMaps[0].nodes.find((n) => n.row === 0)!;
  atCombat = reducer(atCombat, { type: 'TRAVEL_TO_NODE', nodeId: opener.id });
  expect(atCombat.run!.combatState).toBeTruthy();
  writeFileSync(join(OUT_DIR, 'combat.json'), JSON.stringify(createDungeonSaveSnapshot(atCombat)));
});
