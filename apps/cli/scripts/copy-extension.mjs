import { cpSync, rmSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const src  = join(__dirname, '../../extension/dist');
const dest = join(__dirname, '../extension-dist');

if (!existsSync(src)) {
  console.error(`\n  [copy-extension] Extension dist not found at:\n  ${src}\n  Run: pnpm --filter smartlocator-extension build\n`);
  process.exit(1);
}

if (existsSync(dest)) rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });
writeFileSync(join(dest, 'BUILD'), new Date().toISOString(), 'utf8');

console.log(`  [copy-extension] ${src} → ${dest}`);
