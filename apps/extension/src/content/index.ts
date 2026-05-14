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

let isConnected = false;
let captureMode = false;
let lastCandidates: SelectorCandidatesEvent['payload'] | null = null;
let captureClickHandler: ((e: MouseEvent) => void) | null = null;

const host = createOverlayHost({
  onRequestPatch(candidate: SelectorCandidate, targetFile: string, elementName: string, action) {
    sendToAgent({ type: 'REQUEST_PATCH', payload: { candidate, targetFile, elementName, action } });
  },
  onApprovePatch(patchId: string) {
    sendToAgent({ type: 'APPROVE_PATCH', payload: { patchId } });
  },
  onRejectPatch(patchId: string) {
    sendToAgent({ type: 'REJECT_PATCH', payload: { patchId } });
    if (lastCandidates) showCandidates(host, lastCandidates);
    else hideOverlay(host);
  },
  onRollbackPatch(patchId: string) {
    sendToAgent({ type: 'ROLLBACK_PATCH', payload: { patchId } });
  },
  onClose() {
    hideOverlay(host);
  },
});

function sendToAgent(event: ClientToServerEvent): void {
  chrome.runtime.sendMessage({ type: 'TO_AGENT', event }).catch(() => { /* sw not ready */ });
}

// ── Messages from background service worker ───────────────────────────────────

chrome.runtime.onMessage.addListener((msg: {
  type: string;
  connected?: boolean;
  event?: ServerToClientEvent;
}) => {
  if (msg.type === 'WS_STATUS') {
    isConnected = msg.connected ?? false;
    if (captureMode) {
      showStatus(host, isConnected ? 'capture-ready' : 'disconnected');
    }
    return;
  }

  if (msg.type !== 'FROM_AGENT' || !msg.event) return;
  const event = msg.event;

  if (event.type === 'SELECTOR_CANDIDATES') {
    lastCandidates = event.payload;
    showCandidates(host, event.payload);
  } else if (event.type === 'PATCH_PREVIEW') {
    showPatchPreview(host, event.payload, lastCandidates!);
  } else if (event.type === 'PATCH_APPLIED') {
    showPatchApplied(host, event.payload);
  } else if (event.type === 'PATCH_ROLLED_BACK') {
    if (lastCandidates) showCandidates(host, lastCandidates);
    else hideOverlay(host);
  } else if (event.type === 'ERROR') {
    showStatus(host, 'error', event.payload.message);
  }
});

// ── Keyboard / mouse capture ──────────────────────────────────────────────────

function enterCaptureMode() {
  captureMode = true;
  document.body.style.cursor = 'crosshair';
  captureClickHandler = (e: MouseEvent) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    exitCaptureMode();
    if (!isConnected) {
      showStatus(host, 'disconnected', 'Agent not running. Run: smartlocator start');
      return;
    }
    const payload = extractElementMetadata(e.target as HTMLElement);
    sendToAgent({ type: 'ELEMENT_CAPTURED', payload });
  };
  document.addEventListener('click', captureClickHandler, { capture: true });
  showStatus(host, isConnected ? 'capture-ready' : 'disconnected');
}

function exitCaptureMode() {
  captureMode = false;
  document.body.style.cursor = '';
  if (captureClickHandler) {
    document.removeEventListener('click', captureClickHandler, { capture: true });
    captureClickHandler = null;
  }
}

document.addEventListener('keydown', (e) => {
  if (e.altKey && e.code === 'KeyC' && !e.repeat) {
    e.preventDefault();
    if (captureMode) {
      exitCaptureMode();
      hideOverlay(host);
    } else {
      enterCaptureMode();
    }
    return;
  }

  if (e.code === 'Escape' && captureMode) {
    exitCaptureMode();
    hideOverlay(host);
  }
});

// Register with the background service worker.
chrome.runtime.sendMessage({ type: 'CONTENT_READY' }).catch(() => { /* sw not ready yet */ });
