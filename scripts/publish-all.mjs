/**
 * Publishes all SmartLocator packages to npm in dependency order.
 *
 * Usage:
 *   node scripts/publish-all.mjs              # full publish
 *   node scripts/publish-all.mjs --dry-run    # simulate without publishing
 *   node scripts/publish-all.mjs --skip-build # publish using existing dist/
 *   node scripts/publish-all.mjs --otp 123456 # pass npm OTP for 2FA
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const args = process.argv.slice(2);
const DRY_RUN    = args.includes('--dry-run');
const SKIP_BUILD = args.includes('--skip-build');
const otpIdx     = args.indexOf('--otp');
const otpEqualsArg = args.find(a => a.startsWith('--otp='));
const OTP        = otpEqualsArg
  ? otpEqualsArg.slice('--otp='.length)
  : otpIdx !== -1 ? args[otpIdx + 1] : null;

// Publish in strict dependency order.
const PACKAGES = [
  { name: '@smartlocator/shared',            dir: 'packages/shared' },
  { name: '@smartlocator/framework-adapters', dir: 'packages/framework-adapters' },
  { name: '@smartlocator/ai-core',            dir: 'packages/ai-core' },
  { name: '@smartlocator/engine',             dir: 'packages/engine' },
  { name: 'smartlocator',                     dir: 'apps/cli', cliPackage: true },
];

// ── helpers ───────────────────────────────────────────────────────────────────

function run(cmd, cwd = root) {
  console.log(`  $ ${cmd}`);
  if (!DRY_RUN) execSync(cmd, { cwd, stdio: 'inherit' });
}

function pkgVersion(dir) {
  const json = JSON.parse(readFileSync(resolve(root, dir, 'package.json'), 'utf8'));
  return json.version;
}

function separator(label) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${label}`);
  console.log('─'.repeat(50));
}

// ── preflight ─────────────────────────────────────────────────────────────────

separator(DRY_RUN ? 'DRY RUN — no packages will be published' : 'SmartLocator — publish all packages');

// Check npm auth (skip in dry-run or when NODE_AUTH_TOKEN is set by CI).
if (!DRY_RUN) {
  if (process.env.NODE_AUTH_TOKEN) {
    console.log('  Auth     : NODE_AUTH_TOKEN (CI)');
  } else {
    try {
      const who = execSync('npm whoami', { stdio: 'pipe' }).toString().trim();
      console.log(`  Auth     : ${who} (npm login)`);
    } catch {
      console.error('\n  ✗ Not logged in to npm. Run: npm login\n');
      process.exit(1);
    }
  }
}

const version = pkgVersion('apps/cli');
console.log(`\n  Version : ${version}`);
console.log(`  Dry run : ${DRY_RUN}`);
console.log(`  OTP     : ${OTP ?? 'none'}`);

// ── build ─────────────────────────────────────────────────────────────────────

if (!SKIP_BUILD) {
  separator('Building all packages');
  run('pnpm run build');                          // turbo: shared → adapters → ai-core → engine → cli + extension

  separator('Bundling extension into CLI package');
  run('node scripts/copy-extension.mjs', resolve(root, 'apps/cli'));
}

// ── publish ───────────────────────────────────────────────────────────────────

const publishFlags = [
  '--access public',
  '--no-git-checks',
  '--ignore-scripts',            // build already done above
  DRY_RUN ? '--dry-run' : '',
  OTP      ? `--otp=${OTP}` : '',
].filter(Boolean).join(' ');

for (const pkg of PACKAGES) {
  const pkgDir = resolve(root, pkg.dir);
  const ver = pkgVersion(pkg.dir);
  separator(`Publishing ${pkg.name}@${ver}`);
  run(`pnpm publish ${publishFlags}`, pkgDir);
}

// ── done ──────────────────────────────────────────────────────────────────────

separator(DRY_RUN ? 'Dry run complete — nothing was published' : 'All packages published');
console.log();
if (!DRY_RUN) {
  console.log('  Install:  npm install -g smartlocator');
  console.log('  Docs:     https://github.com/mshakil/ai-smart-selector#readme\n');
}
