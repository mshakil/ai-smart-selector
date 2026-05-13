import { glob } from 'glob';
import type { SmartLocatorProjectConfig } from '../config/project-config';

const DEFAULT_POM_PATTERNS = [
  '**/pages/**/*.{ts,js,tsx}',
  '**/page-objects/**/*.{ts,js,tsx}',
  '**/pageobjects/**/*.{ts,js,tsx}',
  '**/pom/**/*.{ts,js,tsx}',
  '**/*Page.{ts,js}',
  '**/*page.{ts,js}',
  '**/*POM.{ts,js}',
  '**/*PageObject.{ts,js}',
];

const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.git/**',
  '**/.turbo/**',
  '**/*.spec.{ts,js}',
  '**/*.test.{ts,js}',
  '**/*.d.ts',
];

export async function findPOMFiles(
  rootDir: string,
  config?: SmartLocatorProjectConfig,
): Promise<string[]> {
  const patterns = [...DEFAULT_POM_PATTERNS, ...(config?.includePatterns ?? [])];
  const ignore = [...DEFAULT_IGNORE, ...(config?.excludePatterns ?? [])];

  const seen = new Set<string>();
  for (const pattern of patterns) {
    const files = await glob(pattern, { cwd: rootDir, absolute: true, ignore });
    for (const f of files) seen.add(f);
  }
  return [...seen];
}
