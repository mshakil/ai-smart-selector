import chokidar from 'chokidar';
import { detectFramework, type Framework } from './framework-detector';
import { findPOMFiles } from './pom-finder';
import { parsePageObject } from './pom-parser';
import type { SmartLocatorProjectConfig } from '../config/project-config';

export interface PageObjectEntry {
  filePath: string;
  relativePath: string;
  className: string;
  routeHints: string[];
  existingSelectors: string[];
}

export interface RepositoryIndex {
  rootDir: string;
  framework: Framework | null;
  pageObjects: PageObjectEntry[];
  status: 'idle' | 'scanning' | 'ready';
}

export function createIndex(rootDir: string): RepositoryIndex {
  return { rootDir, framework: null, pageObjects: [], status: 'idle' };
}

export async function scanRepository(
  index: RepositoryIndex,
  config?: SmartLocatorProjectConfig,
): Promise<void> {
  index.status = 'scanning';
  index.framework = detectFramework(index.rootDir);

  const files = await findPOMFiles(index.rootDir, config);
  const entries: PageObjectEntry[] = [];
  for (const f of files) {
    entries.push(...parsePageObject(f, index.rootDir));
  }

  index.pageObjects = entries;
  index.status = 'ready';
}

export function watchRepository(index: RepositoryIndex, onUpdate?: () => void): () => void {
  const watcher = chokidar.watch(index.rootDir, {
    ignored: /node_modules|\.git|dist|\.turbo/,
    persistent: true,
    ignoreInitial: true,
    depth: 8,
  });

  // Debounce timers keyed by file path to coalesce rapid save events
  const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  const scheduleRefresh = (filePath: string) => {
    const existing = debounceTimers.get(filePath);
    if (existing) clearTimeout(existing);
    debounceTimers.set(filePath, setTimeout(() => {
      debounceTimers.delete(filePath);
      // Atomic update: collect new entries before mutating the array
      const newEntries = parsePageObject(filePath, index.rootDir);
      index.pageObjects = [
        ...index.pageObjects.filter(e => e.filePath !== filePath),
        ...newEntries,
      ];
      onUpdate?.();
    }, 150));
  };

  watcher
    .on('change', scheduleRefresh)
    .on('add', scheduleRefresh)
    .on('unlink', (filePath) => {
      const t = debounceTimers.get(filePath);
      if (t) { clearTimeout(t); debounceTimers.delete(filePath); }
      index.pageObjects = index.pageObjects.filter(e => e.filePath !== filePath);
      onUpdate?.();
    });

  return () => {
    debounceTimers.forEach(clearTimeout);
    debounceTimers.clear();
    void watcher.close();
  };
}
