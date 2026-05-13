import type { ClientToServerEvent, ServerToClientEvent } from '@smartlocator/shared';

const WS_URL = 'ws://localhost:3137';
const RECONNECT_BASE_MS = 2000;
const RECONNECT_MAX_MS = 30_000;

let ws: WebSocket | null = null;
let reconnectDelay = RECONNECT_BASE_MS;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const connectedTabs = new Set<number>();

function broadcast(msg: object) {
  for (const tabId of connectedTabs) {
    chrome.tabs.sendMessage(tabId, msg).catch(() => connectedTabs.delete(tabId));
  }
}

function clearTimer() {
  if (reconnectTimer !== null) { clearTimeout(reconnectTimer); reconnectTimer = null; }
}

function connect() {
  if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) return;

  ws = new WebSocket(WS_URL);

  ws.addEventListener('open', () => {
    reconnectDelay = RECONNECT_BASE_MS;
    clearTimer();
    broadcast({ type: 'WS_STATUS', connected: true });
  });

  ws.addEventListener('message', ({ data }: MessageEvent) => {
    try {
      const event = JSON.parse(data as string) as ServerToClientEvent;
      broadcast({ type: 'FROM_AGENT', event });
    } catch { /* ignore malformed frames */ }
  });

  ws.addEventListener('close', () => {
    broadcast({ type: 'WS_STATUS', connected: false });
    clearTimer();
    reconnectTimer = setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 1.5, RECONNECT_MAX_MS);
      connect();
    }, reconnectDelay);
  });

  ws.addEventListener('error', () => { /* close fires next */ });
}

chrome.runtime.onMessage.addListener((
  msg: { type: string; event?: ClientToServerEvent },
  sender,
) => {
  const tabId = sender.tab?.id;

  if (msg.type === 'CONTENT_READY' && tabId !== undefined) {
    connectedTabs.add(tabId);
    // Immediately tell the tab the current connection state.
    chrome.tabs.sendMessage(tabId, {
      type: 'WS_STATUS',
      connected: ws?.readyState === WebSocket.OPEN,
    }).catch(() => connectedTabs.delete(tabId));
    return;
  }

  if (msg.type === 'TO_AGENT' && msg.event && ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg.event));
  }
});

// Keep the service worker alive and reconnect if the socket died.
chrome.alarms.create('keepAlive', { periodInMinutes: 0.4 });
chrome.alarms.onAlarm.addListener(() => {
  if (ws?.readyState !== WebSocket.OPEN && ws?.readyState !== WebSocket.CONNECTING) {
    connect();
  }
});

connect();
