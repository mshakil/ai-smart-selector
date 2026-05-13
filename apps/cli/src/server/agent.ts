import { WebSocketServer, WebSocket } from 'ws';
import type { ClientToServerEvent, ServerToClientEvent } from '@smartlocator/shared';
import type { AIProvider } from '@smartlocator/ai-core';
import type { RepositoryIndex, PatchManager, Framework } from '@smartlocator/engine';
import { handleElementCapture } from './handlers/element-capture.js';
import { handleRequestPatch } from './handlers/request-patch.js';
import { log } from '../logger.js';

export const WS_PORT = 3137;

export interface AgentDependencies {
  aiProvider?: AIProvider;
  repoIndex: RepositoryIndex;
  patchManager: PatchManager;
  framework: Framework | null;
}

export function startAgent(deps: AgentDependencies): WebSocketServer {
  const wss = new WebSocketServer({ port: WS_PORT });

  wss.on('connection', (ws) => {
    log.info('Extension connected');

    ws.on('message', (raw) => {
      let event: ClientToServerEvent;
      try { event = JSON.parse(raw.toString()) as ClientToServerEvent; }
      catch { return; }

      void dispatch(ws, event, deps);
    });

    ws.on('close', () => log.info('Extension disconnected'));
    ws.on('error', (err) => log.error(`WebSocket error: ${err.message}`));
  });

  wss.on('error', (err) => {
    if ((err as NodeJS.ErrnoException).code === 'EADDRINUSE') {
      log.error(`Port ${WS_PORT} already in use — is another smartlocator instance running?`);
      process.exit(1);
    }
    throw err;
  });

  return wss;
}

async function dispatch(
  ws: WebSocket,
  event: ClientToServerEvent,
  deps: AgentDependencies
): Promise<void> {
  switch (event.type) {
    case 'ELEMENT_CAPTURED':
      await handleElementCapture(ws, event.payload, deps.aiProvider, deps.repoIndex);
      break;

    case 'REQUEST_PATCH':
      await handleRequestPatch(ws, event.payload, deps.patchManager, deps.framework);
      break;

    case 'APPROVE_PATCH': {
      const patch = deps.patchManager.get(event.payload.patchId);
      if (!patch) {
        send(ws, { type: 'ERROR', payload: { code: 'PATCH_NOT_FOUND', message: `No staged patch with id ${event.payload.patchId}` } });
        break;
      }
      if (deps.patchManager.apply(event.payload.patchId)) {
        log.info(`Patch ${event.payload.patchId} applied → ${patch.filePath}`);
        send(ws, { type: 'PATCH_APPLIED', payload: { patchId: event.payload.patchId, targetFile: patch.filePath } });
      } else {
        send(ws, { type: 'ERROR', payload: { code: 'PATCH_APPLY_FAILED', message: `Could not write to ${patch.filePath}` } });
      }
      break;
    }

    case 'REJECT_PATCH':
      deps.patchManager.reject(event.payload.patchId);
      log.debug(`Patch ${event.payload.patchId} rejected`);
      break;

    case 'ROLLBACK_PATCH': {
      const patch = deps.patchManager.get(event.payload.patchId);
      if (!patch) {
        send(ws, { type: 'ERROR', payload: { code: 'PATCH_NOT_FOUND', message: `No applied patch with id ${event.payload.patchId}` } });
        break;
      }
      if (deps.patchManager.rollback(event.payload.patchId)) {
        log.info(`Patch ${event.payload.patchId} rolled back ← ${patch.filePath}`);
        send(ws, { type: 'PATCH_ROLLED_BACK', payload: { patchId: event.payload.patchId, targetFile: patch.filePath } });
      } else {
        send(ws, { type: 'ERROR', payload: { code: 'ROLLBACK_FAILED', message: `Could not restore ${patch.filePath}` } });
      }
      break;
    }
  }
}

export function send(ws: WebSocket, event: ServerToClientEvent): void {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(event));
}
