/**
 * Bumps the version across all publishable packages and the CLI entry point.
 *
 * Usage:
 *   node scripts/bump-version.mjs <new-version>
 *   node scripts/bump-version.mjs 0.2.0
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const newVersion = process.argv[2];

if (!newVersion || !/^\d+\.\d+\.\d+(-[\w.]+)?$/.test(newVersion)) {
  console.error('\n  Usage: node scripts/bump-version.mjs <semver>\n  Example: node scripts/bump-version.mjs 0.2.0\n');
  process.exit(1);
}

// All package.json files that carry a publishable version.
const PACKAGE_JSON_PATHS = [
  'packages/shared/package.json',
  'packages/framework-adapters/package.json',
  'packages/ai-core/package.json',
  'packages/engine/package.json',
  'apps/cli/package.json',
];

// CLI entry point — keep .version() in sync.
const CLI_ENTRY = 'apps/cli/src/index.ts';

// ── helpers ───────────────────────────────────────────────────────────────────

function bumpPackageJson(relPath) {
  const abs = resolve(root, relPath);
  const json = JSON.parse(readFileSync(abs, 'utf8'));
  const old = json.version;
  json.version = newVersion;
  writeFileSync(abs, JSON.stringify(json, null, 2) + '\n', 'utf8');
  console.log(`  ${relPath.padEnd(48)} ${old} → ${newVersion}`);
}

function bumpCliEntry(relPath) {
  const abs = resolve(root, relPath);
  const src = readFileSync(abs, 'utf8');
  const updated = src.replace(
    /\.version\(['"][\d.]+['"]\)/,
    `.version('${newVersion}')`,
  );
  if (updated === src) {
    console.warn(`  ⚠  No .version() call found in ${relPath} — skipped`);
    return;
  }
  writeFileSync(abs, updated, 'utf8');
  console.log(`  ${relPath.padEnd(48)} .version() updated`);
}

// ── run ───────────────────────────────────────────────────────────────────────

console.log(`\n  Bumping all packages to ${newVersion}\n`);

for (const p of PACKAGE_JSON_PATHS) bumpPackageJson(p);
bumpCliEntry(CLI_ENTRY);

console.log(`\n  Done. Review the changes, then commit:\n`);
console.log(`    git add -A`);
console.log(`    git commit -m "chore: bump version to ${newVersion}"`);
console.log(`    git tag v${newVersion}\n`);
