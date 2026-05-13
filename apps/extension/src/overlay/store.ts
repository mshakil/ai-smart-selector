import type { SelectorCandidatesEvent, PatchPreviewEvent, PatchAppliedEvent } from '@smartlocator/shared';

export type OverlayState =
  | { type: 'idle' }
  | { type: 'capture-ready'; message?: string }
  | { type: 'disconnected'; message?: string }
  | { type: 'error'; message?: string }
  | { type: 'candidates'; candidates: SelectorCandidatesEvent['payload'] }
  | { type: 'patch-preview'; patch: PatchPreviewEvent['payload']; candidatesPayload: SelectorCandidatesEvent['payload'] }
  | { type: 'patch-applied'; applied: PatchAppliedEvent['payload'] };
