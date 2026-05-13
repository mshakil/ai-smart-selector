import type { ElementCapturePayload } from '../types/dom';
import type { SelectorCandidate } from '../types/selector';
export type { SelectorCandidate };

// ── Client → Server ──────────────────────────────────────────────────────────

export interface ElementCapturedEvent {
  type: 'ELEMENT_CAPTURED';
  payload: ElementCapturePayload;
}

export interface RequestPatchEvent {
  type: 'REQUEST_PATCH';
  payload: {
    candidate: SelectorCandidate;
    targetFile: string;
    elementName: string;
  };
}

export interface ApprovePatchEvent {
  type: 'APPROVE_PATCH';
  payload: { patchId: string };
}

export interface RejectPatchEvent {
  type: 'REJECT_PATCH';
  payload: { patchId: string };
}

export interface RollbackPatchEvent {
  type: 'ROLLBACK_PATCH';
  payload: { patchId: string };
}

export type ClientToServerEvent =
  | ElementCapturedEvent
  | RequestPatchEvent
  | ApprovePatchEvent
  | RejectPatchEvent
  | RollbackPatchEvent;

// ── Server → Client ──────────────────────────────────────────────────────────

export interface SelectorCandidatesEvent {
  type: 'SELECTOR_CANDIDATES';
  payload: {
    primary: SelectorCandidate;
    fallbacks: SelectorCandidate[];
    targetFileRecommendation: string;
    targetFileConfidence: number;
    availableFiles: string[];
    aiUsed: boolean;
  };
}

export interface PatchPreviewEvent {
  type: 'PATCH_PREVIEW';
  payload: {
    patchId: string;
    targetFile: string;
    diff: string;
    additions: number;
    deletions: number;
  };
}

export interface AgentErrorEvent {
  type: 'ERROR';
  payload: {
    code: string;
    message: string;
    fallbackSelector?: SelectorCandidate;
  };
}

export interface ScanStatusEvent {
  type: 'SCAN_STATUS';
  payload: {
    status: 'scanning' | 'complete' | 'error';
    progress?: number;
    message?: string;
    filesScanned?: number;
  };
}

export interface PatchAppliedEvent {
  type: 'PATCH_APPLIED';
  payload: {
    patchId: string;
    targetFile: string;
  };
}

export interface PatchRolledBackEvent {
  type: 'PATCH_ROLLED_BACK';
  payload: {
    patchId: string;
    targetFile: string;
  };
}

export type ServerToClientEvent =
  | SelectorCandidatesEvent
  | PatchPreviewEvent
  | PatchAppliedEvent
  | PatchRolledBackEvent
  | AgentErrorEvent
  | ScanStatusEvent;
