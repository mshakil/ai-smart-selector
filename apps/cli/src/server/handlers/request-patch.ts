import type { WebSocket } from 'ws';
import type { RequestPatchEvent } from '@smartlocator/shared';
import type { PatchManager } from '@smartlocator/engine';
import type { Framework } from '@smartlocator/engine';
import { send } from '../agent.js';

export async function handleRequestPatch(
  ws: WebSocket,
  payload: RequestPatchEvent['payload'],
  patchManager: PatchManager,
  framework: Framework | null,
): Promise<void> {
  const { candidate, targetFile, elementName } = payload;

  if (!framework) {
    send(ws, { type: 'ERROR', payload: { code: 'NO_FRAMEWORK', message: 'Could not detect framework (playwright/cypress). Ensure package.json lists @playwright/test or cypress.' } });
    return;
  }

  const result = patchManager.stage({
    filePath: targetFile,
    className: deriveClassName(targetFile),
    propertyName: toCamelCase(elementName),
    selector: candidate.selector,
    selectorStrategy: candidate.strategy,
    framework,
  });

  if ('error' in result) {
    send(ws, { type: 'ERROR', payload: { code: 'PATCH_STAGE_FAILED', message: result.error } });
    return;
  }

  const lines = result.diff.split('\n');
  const additions = lines.filter(l => l.startsWith('+') && !l.startsWith('+++')).length;
  const deletions = lines.filter(l => l.startsWith('-') && !l.startsWith('---')).length;

  console.log(`  Patch staged [${result.id}]: +${additions}/-${deletions} lines in ${targetFile}`);

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

function toCamelCase(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^./, c => c.toLowerCase());
}
