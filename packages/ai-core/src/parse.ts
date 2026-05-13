import type { AIProviderResult } from './providers/interface';
import type { SelectorCandidate } from '@smartlocator/shared';

interface RawResponse {
  selector?: unknown;
  confidence?: unknown;
  reasoning?: unknown;
}

export function parseAIResponse(text: string): AIProviderResult {
  let raw: RawResponse = {};

  try {
    const match = /\{[\s\S]*\}/.exec(text);
    if (match) raw = JSON.parse(match[0]) as RawResponse;
  } catch {
    return empty();
  }

  const selector = typeof raw.selector === 'string' ? raw.selector.trim() : '';
  if (!selector) return empty();

  const confidence = typeof raw.confidence === 'number'
    ? Math.max(0, Math.min(100, Math.round(raw.confidence)))
    : 50;
  const reasoning = typeof raw.reasoning === 'string'
    ? raw.reasoning.slice(0, 200)
    : 'AI-generated selector';

  const candidate: SelectorCandidate = {
    selector,
    strategy: inferStrategy(selector),
    confidence,
    reasoning,
    source: 'ai',
  };

  return { selector, confidence, reasoning, candidates: [candidate] };
}

function empty(): AIProviderResult {
  return { selector: '', confidence: 0, reasoning: '', candidates: [] };
}

function inferStrategy(sel: string): SelectorCandidate['strategy'] {
  if (/data-testid/.test(sel)) return 'data-testid';
  if (/data-qa/.test(sel)) return 'data-qa';
  if (/aria-label/.test(sel)) return 'aria-label';
  if (/\[role=/.test(sel)) return 'role';
  if (/^text=/.test(sel)) return 'text';
  if (/^\/\//.test(sel) || /^xpath=/.test(sel)) return 'xpath';
  return 'css';
}
