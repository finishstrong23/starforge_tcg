/**
 * STARFORGE TCG - Balance Test Runner
 * Run with: node balance-test.mjs
 */

import { createRequire } from 'module';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('Building project first...');
try {
  execSync('npm run build', { cwd: __dirname, stdio: 'inherit' });
} catch (e) {
  console.error('Build failed!');
  process.exit(1);
}

console.log('\nBuild successful. Running balance test...\n');

// Import from built output
const { runBalanceTest } = await import('./dist/ai/AIBattleSimulator.js').catch(async () => {
  // Try alternate path
  return await import('./dist/index.js');
});

await runBalanceTest(10, true);
