import { readFileSync } from 'fs';
import { join } from 'path';

export type Framework = 'playwright' | 'cypress';

export function detectFramework(rootDir: string): Framework | null {
  let pkg: Record<string, Record<string, string>> = {};
  try {
    pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8')) as typeof pkg;
  } catch {
    return null;
  }
  const all = { ...pkg['dependencies'], ...pkg['devDependencies'] };
  if ('@playwright/test' in all || 'playwright' in all) return 'playwright';
  if ('cypress' in all) return 'cypress';
  return null;
}
