import type { ElementCapturePayload, SelectorCandidate } from '@smartlocator/shared';

export interface AIProvider {
  readonly name: string;
  generateSelector(payload: ElementCapturePayload, signal?: AbortSignal): Promise<AIProviderResult>;
}

export interface AIProviderResult {
  selector: string;
  confidence: number;
  reasoning: string;
  candidates: SelectorCandidate[];
}
