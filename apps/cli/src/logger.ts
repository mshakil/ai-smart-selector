import { appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

type LogLevel = 'debug' | 'info' | 'error';

const LOG_DIR = join(homedir(), '.smartlocator');
const LOG_FILE = join(LOG_DIR, 'logs.log');

let fileReady = false;

function ensureLogDir() {
  if (fileReady) return;
  try {
    mkdirSync(LOG_DIR, { recursive: true });
    fileReady = true;
  } catch {
    // non-fatal — logging continues to console only
  }
}

function write(level: LogLevel, message: string) {
  const ts = new Date().toISOString();
  const line = `${ts} [${level.toUpperCase()}] ${message}\n`;

  ensureLogDir();
  if (fileReady) {
    try { appendFileSync(LOG_FILE, line, 'utf8'); } catch { /* ignore */ }
  }
}

export const log = {
  debug(message: string): void {
    if (process.env['SMARTLOCATOR_DEBUG']) {
      console.debug(`  [debug] ${message}`);
      write('debug', message);
    }
  },
  info(message: string): void {
    console.log(`  ${message}`);
    write('info', message);
  },
  error(message: string): void {
    console.error(`  [error] ${message}`);
    write('error', message);
  },
};
