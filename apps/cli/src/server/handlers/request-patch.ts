import { resolve, sep } from 'path';
import type { WebSocket } from 'ws';
import type { RequestPatchEvent } from '@smartlocator/shared';
import { toCamelCase } from '@smartlocator/shared';
import type { PatchManager, RepositoryIndex } from '@smartlocator/engine';
import type { Framework } from '@smartlocator/engine';
import { send } from '../agent.js';
import { log } from '../../logger.js';

export async function handleRequestPatch(
  ws: WebSocket,
  payload: RequestPatchEvent['payload'],
  patchManager: PatchManager,
  framework: Framework | null,
  repoIndex: RepositoryIndex,
): Promise<void> {
  const { candidate, targetFile, elementName, action } = payload;

  if (!framework) {
    send(ws, { type: 'ERROR', payload: { code: 'NO_FRAMEWORK', message: 'Could not detect framework (playwright/cypress). Ensure package.json lists @playwright/test or cypress.' } });
    return;
  }

  // C-1: Validate targetFile is within the repo root (path traversal guard)
  const absRoot = resolve(repoIndex.rootDir);
  const absFile = resolve(absRoot, targetFile);
  if (!absFile.startsWith(absRoot + sep)) {
    send(ws, { type: 'ERROR', payload: { code: 'INVALID_PATH', message: 'Target file is outside the repository root.' } });
    return;
  }

  // C-4: Look up class name from the index rather than guessing from filename
  const entry = repoIndex.pageObjects.find(
    e => e.filePath === absFile || e.relativePath === targetFile,
  );
  const className = entry?.className ?? deriveClassName(targetFile);

  const result = patchManager.stage({
    filePath: absFile,
    className,
    propertyName: toCamelCase(elementName),
    selector: candidate.selector,
    selectorStrategy: candidate.strategy,
    framework,
    action,
  });

  if ('error' in result) {
    send(ws, { type: 'ERROR', payload: { code: 'PATCH_STAGE_FAILED', message: result.error } });
    return;
  }

  const lines = result.diff.split('\n');
  const additions = lines.filter(l => l.startsWith('+') && !l.startsWith('+++')).length;
  const deletions = lines.filter(l => l.startsWith('-') && !l.startsWith('---')).length;

  log.info(`Patch staged [${result.id}]: +${additions}/-${deletions} lines in ${targetFile}`);

  send(ws, {
    type: 'PATCH_PREVIEW',
    payload: {
      patchId: result.id,
      targetFile,
      diff: result.diff,
      additions,
      deletions,
    },
  });
}

function deriveClassName(filePath: string): string {
  const base = filePath.split(/[\\/]/).pop() ?? filePath;
  const name = base.replace(/\.(ts|js|tsx|jsx)$/, '');
  return name
    .split(/[-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}
