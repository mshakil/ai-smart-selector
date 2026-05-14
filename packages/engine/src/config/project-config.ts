import { existsSync } from 'fs';
import { join, resolve, isAbsolute } from 'path';

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

function validateConfig(raw: unknown, rootDir: string): SmartLocatorProjectConfig {
  if (!raw || typeof raw !== 'object') return {};
  const obj = raw as Record<string, unknown>;
  const result: SmartLocatorProjectConfig = {};

  if (Array.isArray(obj['includePatterns'])) {
    result.includePatterns = (obj['includePatterns'] as unknown[])
      .filter((p): p is string => typeof p === 'string')
      .filter(p => {
        // Reject patterns that escape the repo root via absolute paths or traversal
        if (isAbsolute(p)) return false;
        const resolved = resolve(rootDir, p.split('*')[0] ?? '');
        return resolved.startsWith(resolve(rootDir));
      });
  }

  if (Array.isArray(obj['excludePatterns'])) {
    result.excludePatterns = (obj['excludePatterns'] as unknown[])
      .filter((p): p is string => typeof p === 'string');
  }

  if (obj['attributeScores'] && typeof obj['attributeScores'] === 'object' && !Array.isArray(obj['attributeScores'])) {
    const scores: Record<string, number> = {};
    for (const [k, v] of Object.entries(obj['attributeScores'] as Record<string, unknown>)) {
      if (typeof v === 'number') scores[k] = v;
    }
    result.attributeScores = scores;
  }

  return result;
}

export async function loadProjectConfig(rootDir: string): Promise<SmartLocatorProjectConfig> {
  for (const filename of CONFIG_FILENAMES) {
    const configPath = join(rootDir, filename);
    if (!existsSync(configPath)) continue;

    try {
      const mod = await import(configPath) as { default?: unknown } | unknown;
      const raw = (mod as { default?: unknown }).default ?? mod;
      return validateConfig(raw, rootDir);
    } catch {
      console.warn(`[smartlocator] Failed to load config from ${configPath}`);
    }
  }

  return {};
}
