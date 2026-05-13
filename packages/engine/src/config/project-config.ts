import { existsSync } from 'fs';
import { join } from 'path';

export interface SmartLocatorProjectConfig {
  /** Extra glob patterns to include when scanning for POM files. */
  includePatterns?: string[];
  /** Additional glob patterns to exclude during POM scanning. */
  excludePatterns?: string[];
  /**
   * Custom attribute priority overrides.
   * Keys are attribute names; values are the score to add (positive) or subtract (negative).
   * Example: { 'data-automation-id': 95 } elevates a proprietary attribute above data-testid.
   */
  attributeScores?: Record<string, number>;
}

const CONFIG_FILENAMES = [
  'smartlocator.config.ts',
  'smartlocator.config.js',
  'smartlocator.config.mjs',
  'smartlocator.config.cjs',
];

export async function loadProjectConfig(rootDir: string): Promise<SmartLocatorProjectConfig> {
  for (const filename of CONFIG_FILENAMES) {
    const configPath = join(rootDir, filename);
    if (!existsSync(configPath)) continue;

    try {
      // Use dynamic import — works for ESM and CJS; tsx/tsup handles TS at runtime.
      const mod = await import(configPath) as { default?: SmartLocatorProjectConfig } | SmartLocatorProjectConfig;
      const config = (mod as { default?: SmartLocatorProjectConfig }).default ?? (mod as SmartLocatorProjectConfig);
      return config ?? {};
    } catch {
      // Config file present but couldn't be loaded — warn but don't crash.
      console.warn(`[smartlocator] Failed to load config from ${configPath}`);
    }
  }

  return {};
}
