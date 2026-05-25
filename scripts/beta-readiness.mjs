#!/usr/bin/env node

import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const fixtureDir = resolve('tests/fixtures/dungeon-saves');
const saveFixtures = readdirSync(fixtureDir).filter((name) => name.endsWith('.json'));

if (saveFixtures.length === 0) {
  console.error(`No dungeon save fixtures found in ${fixtureDir}.`);
  process.exit(1);
}

const steps = [
  ['TypeScript build', 'npm run build'],
  ['ESLint', 'npm run lint'],
  [
    'Phase 8 save and telemetry smoke',
    'npm test -- --runInBand tests/roguelite/phase8ProductionReadiness.test.ts tests/roguelite/telemetrySettings.test.ts',
  ],
  ['Vite production build', 'npm run build:ui'],
  ['Performance budget', 'npm run performance:budget'],
];

console.log(`Checking ${saveFixtures.length} dungeon save fixture(s).`);

for (const [label, commandLine] of steps) {
  console.log(`\n> ${label}`);
  const result = spawnSync(commandLine, {
    stdio: 'inherit',
    shell: true,
  });

  if (result.error || result.status !== 0) {
    if (result.error) {
      console.error(result.error.message);
    }
    console.error(`\nBeta readiness failed during: ${label}`);
    process.exit(result.status ?? 1);
  }
}

console.log('\nBeta readiness checks passed.');
console.log('Manual release gate still required: browser smoke the Privacy panel opt-out before publishing.');
