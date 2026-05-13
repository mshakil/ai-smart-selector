import React from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import type { SelectorCandidatesEvent, PatchPreviewEvent, PatchAppliedEvent } from '@smartlocator/shared';
import { OverlayApp, type OverlayCallbacks } from '../overlay/App';
import type { OverlayState } from '../overlay/store';
import styles from '../overlay/styles.css?inline';

export interface OverlayHost {
  setState: (state: OverlayState) => void;
}

export function createOverlayHost(callbacks: OverlayCallbacks): OverlayHost {
  const container = document.createElement('div');
  container.id = '__smartlocator__';
  container.style.cssText =
    'position:fixed;top:0;left:0;z-index:2147483647;pointer-events:none;';
  document.documentElement.appendChild(container);

  const shadow = container.attachShadow({ mode: 'open' });

  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  shadow.appendChild(styleEl);

  const mount = document.createElement('div');
  shadow.appendChild(mount);

  let root: Root | null = null;

  function render(state: OverlayState) {
    if (!root) root = createRoot(mount);
    root.render(React.createElement(OverlayApp, { state, callbacks }));
  }

  render({ type: 'idle' });

  return { setState: render };
}

export function showCandidates(
  host: OverlayHost,
  payload: SelectorCandidatesEvent['payload']
): void {
  host.setState({ type: 'candidates', candidates: payload });
}

export function showPatchPreview(
  host: OverlayHost,
  patch: PatchPreviewEvent['payload'],
  candidatesPayload: SelectorCandidatesEvent['payload'],
): void {
  host.setState({ type: 'patch-preview', patch, candidatesPayload });
}

export function showPatchApplied(
  host: OverlayHost,
  applied: PatchAppliedEvent['payload'],
): void {
  host.setState({ type: 'patch-applied', applied });
}

export type StatusType = 'capture-ready' | 'disconnected' | 'error';

export function showStatus(
  host: OverlayHost,
  status: StatusType,
  message?: string
): void {
  host.setState({ type: status, message });
}

export function hideOverlay(host: OverlayHost): void {
  host.setState({ type: 'idle' });
}
