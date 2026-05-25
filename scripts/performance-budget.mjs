#!/usr/bin/env node

import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const distAssetsDir = resolve('dist/assets');

const budgets = {
  mainJsBytes: 600 * 1024,
  cssBytes: 40 * 1024,
  imageBytes: 3 * 1024 * 1024,
  totalImageBytes: 13 * 1024 * 1024,
  targetImageBytes: 500 * 1024,
};

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

let assets;

try {
  assets = readdirSync(distAssetsDir).map((name) => {
    const file = join(distAssetsDir, name);
    return { name, bytes: statSync(file).size };
  });
} catch {
  console.error('dist/assets not found. Run npm run build:ui before checking performance budgets.');
  process.exit(1);
}

const jsAssets = assets.filter((asset) => asset.name.endsWith('.js'));
const cssAssets = assets.filter((asset) => asset.name.endsWith('.css'));
const imageAssets = assets.filter((asset) => /\.(png|jpe?g|webp|gif|avif)$/i.test(asset.name));

const mainJs = jsAssets.find((asset) => asset.name.startsWith('index-'));
const mainCss = cssAssets.find((asset) => asset.name.startsWith('index-'));
const totalImageBytes = imageAssets.reduce((sum, asset) => sum + asset.bytes, 0);

console.log('Performance budget report');

if (!mainJs) {
  fail('Missing index JS bundle.');
} else {
  console.log(`- JS bundle: ${formatBytes(mainJs.bytes)} / ${formatBytes(budgets.mainJsBytes)}`);
  if (mainJs.bytes > budgets.mainJsBytes) {
    fail(`JS bundle exceeds budget: ${mainJs.name}`);
  }
}

if (!mainCss) {
  fail('Missing index CSS bundle.');
} else {
  console.log(`- CSS bundle: ${formatBytes(mainCss.bytes)} / ${formatBytes(budgets.cssBytes)}`);
  if (mainCss.bytes > budgets.cssBytes) {
    fail(`CSS bundle exceeds budget: ${mainCss.name}`);
  }
}

console.log(`- Image total: ${formatBytes(totalImageBytes)} / ${formatBytes(budgets.totalImageBytes)}`);
if (totalImageBytes > budgets.totalImageBytes) {
  fail('Image assets exceed total image budget.');
}

for (const asset of imageAssets) {
  console.log(`  - ${asset.name}: ${formatBytes(asset.bytes)}`);
  if (asset.bytes > budgets.imageBytes) {
    fail(`Image exceeds hard budget: ${asset.name}`);
  }
  if (asset.bytes > budgets.targetImageBytes) {
    console.warn(`    target: optimize below ${formatBytes(budgets.targetImageBytes)} before wide launch.`);
  }
}

if (process.exitCode) {
  console.error('\nPerformance budget failed.');
} else {
  console.log('\nPerformance budget passed.');
}
