import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, cpSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

function bundledExtensionPath(): string {
  // import.meta.url resolves to dist/index.js at runtime — extension-dist/ is one level up.
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, '..', 'extension-dist');
}

function printInstructions(extensionPath: string): void {
  console.log(chalk.cyan('\n  SmartLocator — Chrome Extension\n'));
  console.log(`  Path: ${chalk.white(extensionPath)}\n`);
  console.log(chalk.gray('  Load in Chrome:'));
  console.log(chalk.gray('    1. Open  chrome://extensions'));
  console.log(chalk.gray('    2. Enable Developer mode (top-right toggle)'));
  console.log(chalk.gray('    3. Click  Load unpacked'));
  console.log(chalk.gray('    4. Select the path above\n'));
}

export function installExtensionCommand(): Command {
  return new Command('install-extension')
    .description('Show the bundled Chrome extension path, or copy it to a directory')
    .option('--dest <path>', 'Copy the extension files to this directory')
    .action((opts: { dest?: string }) => {
      const src = bundledExtensionPath();

      if (!existsSync(src)) {
        console.error(chalk.red('\n  Extension not bundled in this installation.'));
        console.error(chalk.gray('  Rebuild with: pnpm run build:all\n'));
        process.exit(1);
      }

      if (opts.dest) {
        const dest = resolve(opts.dest);
        cpSync(src, dest, { recursive: true });
        console.log(chalk.green(`\n  Extension copied → ${dest}`));
        printInstructions(dest);
      } else {
        printInstructions(src);
      }
    });
}
