export type { DOMNodeContext, ElementCapturePayload } from './types/dom';
export type { SelectorStrategy, SelectorCandidate } from './types/selector';
export type {
  ElementCapturedEvent,
  RequestPatchEvent,
  ApprovePatchEvent,
  RejectPatchEvent,
  RollbackPatchEvent,
  ClientToServerEvent,
  SelectorCandidatesEvent,
  PatchPreviewEvent,
  PatchAppliedEvent,
  PatchRolledBackEvent,
  AgentErrorEvent,
  ScanStatusEvent,
  ServerToClientEvent,
} from './events/websocket';
