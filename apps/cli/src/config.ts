import { readFileSync, writeFileSync, mkdirSync, chmodSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

export type AIProviderName = 'openai' | 'claude' | 'none';

export interface SmartLocatorConfig {
  provider: AIProviderName;
  openaiKey?: string;
  claudeKey?: string;
}

const CONFIG_DIR = join(homedir(), '.smartlocator');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

const DEFAULTS: SmartLocatorConfig = { provider: 'none' };

export function loadConfig(): SmartLocatorConfig {
  let fileConfig: Partial<SmartLocatorConfig> = {};
  try {
    fileConfig = JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as Partial<SmartLocatorConfig>;
  } catch { /* no file yet */ }

  const config: SmartLocatorConfig = { ...DEFAULTS, ...fileConfig };

  // Env vars override the file (useful in CI or for ephemeral credentials).
  const envOpenAI = process.env['SMARTLOCATOR_OPENAI_KEY'];
  const envClaude = process.env['SMARTLOCATOR_CLAUDE_KEY'];

  if (envOpenAI) {
    config.openaiKey = envOpenAI;
    config.provider = 'openai';
  }
  if (envClaude) {
    config.claudeKey = envClaude;
    if (!envOpenAI) config.provider = 'claude';
  }

  return config;
}

export function saveConfig(patch: Partial<SmartLocatorConfig>): SmartLocatorConfig {
  const current = loadConfig();
  const next: SmartLocatorConfig = { ...current, ...patch };
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), 'utf8');
  try { chmodSync(CONFIG_PATH, 0o600); } catch { /* no-op on Windows */ }
  return next;
}

export function getActiveApiKey(config: SmartLocatorConfig): string | undefined {
  if (config.provider === 'openai') return config.openaiKey;
  if (config.provider === 'claude') return config.claudeKey;
  return undefined;
}

export function maskKey(key: string): string {
  if (key.length <= 8) return '***';
  return `${key.slice(0, 6)}...${key.slice(-4)}`;
}
