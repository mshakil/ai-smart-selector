import {
  createIndex,
  scanRepository,
  watchRepository,
  loadProjectConfig,
  type RepositoryIndex,
} from '@smartlocator/engine';
import { log } from '../logger.js';

export async function initRepository(rootDir: string): Promise<{
  index: RepositoryIndex;
  stopWatching: () => void;
}> {
  const projectConfig = await loadProjectConfig(rootDir);
  const index = createIndex(rootDir);

  log.info('Scanning repository for Page Object Models...');
  await scanRepository(index, projectConfig);
  log.info(`Found ${index.pageObjects.length} POM class(es) | Framework: ${index.framework ?? 'unknown'}`);

  const stopWatching = watchRepository(index, () => {
    log.debug(`POM index updated (${index.pageObjects.length} classes)`);
  });

  return { index, stopWatching };
}
