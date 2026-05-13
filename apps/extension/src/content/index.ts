import type {
  ServerToClientEvent,
  ClientToServerEvent,
  SelectorCandidatesEvent,
  SelectorCandidate,
} from '@smartlocator/shared';
import { extractElementMetadata } from './capture';
import {
  createOverlayHost,
  showCandidates,
  showPatchPreview,
  showPatchApplied,
  showStatus,
  hideOverlay,
} from './overlay-host';

const WS_URL = 'ws://localhost:3137';
const RECONNECT_BASE_MS = 2000;
const RECONNECT_MAX_MS = 30_000;

let ws: WebSocket | null = null;
let reconnectDelay = RECONNECT_BASE_MS;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let captureMode = false;

let lastCandidates: SelectorCandidatesEvent['payload'] | null = null;

function sendWs(event: ClientToServerEvent): void {
  if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(event));
}

const host = createOverlayHost({
  onRequestPatch(candidate: SelectorCandidate, targetFile: string, elementName: string) {
    sendWs({ type: 'REQUEST_PATCH', payload: { candidate, targetFile, elementName } });
  },
  onApprovePatch(patchId: string) {
    sendWs({ type: 'APPROVE_PATCH', payload: { patchId } });
  },
  onRejectPatch(patchId: string) {
    sendWs({ type: 'REJECT_PATCH', payload: { patchId } });
    if (lastCandidates) showCandidates(host, lastCandidates);
    else hideOverlay(host);
  },
  onRollbackPatch(patchId: string) {
    sendWs({ type: 'ROLLBACK_PATCH', payload: { patchId } });
  },
});

// ── WebSocket ─────────────────────────────────────────────────────────────────

function connect(): void {
  if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) return;

  ws = new WebSocket(WS_URL);

  ws.addEventListener('open', () => {
    reconnectDelay = RECONNECT_BASE_MS;
    clearReconnectTimer();
    if (captureMode) showStatus(host, 'capture-ready');
  });

  ws.addEventListener('message', ({ data }: MessageEvent) => {
    let event: ServerToClientEvent;
    try { event = JSON.parse(data as string) as ServerToClientEvent; }
    catch { return; }

    if (event.type === 'SELECTOR_CANDIDATES') {
      lastCandidates = event.payload;
      showCandidates(host, event.payload);
    } else if (event.type === 'PATCH_PREVIEW') {
      showPatchPreview(host, event.payload, lastCandidates!);
    } else if (event.type === 'PATCH_APPLIED') {
      showPatchApplied(host, event.payload);
    } else if (event.type === 'PATCH_ROLLED_BACK') {
      // Restore candidates after rollback so the user can re-generate if needed.
      if (lastCandidates) showCandidates(host, lastCandidates);
      else hideOverlay(host);
    } else if (event.type === 'ERROR') {
      showStatus(host, 'error', event.payload.message);
    }
  });

  ws.addEventListener('close', scheduleReconnect);
  ws.addEventListener('error', () => { /* close fires next */ });
}

function scheduleReconnect(): void {
  clearReconnectTimer();
  reconnectTimer = setTimeout(() => {
    reconnectDelay = Math.min(reconnectDelay * 1.5, RECONNECT_MAX_MS);
    connect();
  }, reconnectDelay);
}

function clearReconnectTimer(): void {
  if (reconnectTimer !== null) { clearTimeout(reconnectTimer); reconnectTimer = null; }
}

// ── Keyboard / mouse capture ──────────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
  if (e.altKey && e.code === 'KeyC' && !e.repeat) {
    e.preventDefault();
    captureMode = !captureMode;
    document.body.style.cursor = captureMode ? 'crosshair' : '';

    if (captureMode) {
      const connected = ws?.readyState === WebSocket.OPEN;
      showStatus(host, connected ? 'capture-ready' : 'disconnected');
    } else {
      hideOverlay(host);
    }
    return;
  }

  if (e.code === 'Escape' && captureMode) {
    captureMode = false;
    document.body.style.cursor = '';
    hideOverlay(host);
  }
});

document.addEventListener('click', (e) => {
  if (!captureMode) return;
  e.preventDefault();
  e.stopImmediatePropagation();

  captureMode = false;
  document.body.style.cursor = '';

  if (ws?.readyState !== WebSocket.OPEN) {
    showStatus(host, 'disconnected', 'Agent not running. Run: smartlocator start');
    return;
  }

  const payload = extractElementMetadata(e.target as HTMLElement);
  sendWs({ type: 'ELEMENT_CAPTURED', payload });
}, true);

connect();
