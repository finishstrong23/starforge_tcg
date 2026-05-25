import { spawnSync } from 'node:child_process';

const result = spawnSync(
  process.execPath,
  ['node_modules/jest/bin/jest.js', '--runInBand', 'tests/roguelite/balanceLab.test.ts', '--silent=false'],
  {
    cwd: process.cwd(),
    env: { ...process.env, BALANCE_REPORT: '1' },
    stdio: 'inherit',
    shell: false,
  },
);

process.exit(result.status ?? 1);
