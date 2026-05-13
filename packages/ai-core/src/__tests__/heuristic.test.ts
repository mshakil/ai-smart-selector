import { describe, it, expect } from 'vitest';
import { generateHeuristicCandidates, HEURISTIC_AI_THRESHOLD } from '../scoring/heuristic';
import type { ElementCapturePayload } from '@smartlocator/shared';

function makePayload(overrides: Partial<ElementCapturePayload> = {}): ElementCapturePayload {
  return {
    url: 'http://localhost/test',
    tagName: 'div',
    classList: [],
    attributes: {},
    hierarchy: [],
    ...overrides,
  };
}

describe('generateHeuristicCandidates', () => {
  it('returns data-testid candidate at 90 confidence', () => {
    const candidates = generateHeuristicCandidates(
      makePayload({ attributes: { 'data-testid': 'submit-btn' } })
    );
    expect(candidates[0].selector).toBe('[data-testid="submit-btn"]');
    expect(candidates[0].confidence).toBe(90);
    expect(candidates[0].strategy).toBe('data-testid');
  });

  it('returns data-qa candidate at 90 confidence', () => {
    const candidates = generateHeuristicCandidates(
      makePayload({ attributes: { 'data-qa': 'login-form' } })
    );
    expect(candidates[0].selector).toBe('[data-qa="login-form"]');
    expect(candidates[0].confidence).toBe(90);
  });

  it('returns aria-label candidate at 80 confidence', () => {
    const candidates = generateHeuristicCandidates(
      makePayload({ attributes: { 'aria-label': 'Close dialog' } })
    );
    const c = candidates.find(c => c.strategy === 'aria-label');
    expect(c).toBeDefined();
    expect(c!.confidence).toBe(80);
  });

  it('skips dynamic IDs (UUID-like)', () => {
    const candidates = generateHeuristicCandidates(
      makePayload({ id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
    );
    expect(candidates.every(c => !c.selector.startsWith('#'))).toBe(true);
  });

  it('skips dynamic IDs with long numeric suffix', () => {
    const candidates = generateHeuristicCandidates(
      makePayload({ id: 'button-12345' })
    );
    expect(candidates.every(c => !c.selector.startsWith('#'))).toBe(true);
  });

  it('accepts stable IDs', () => {
    const candidates = generateHeuristicCandidates(makePayload({ id: 'main-nav' }));
    const c = candidates.find(c => c.selector === '#main-nav');
    expect(c).toBeDefined();
    expect(c!.confidence).toBe(75);
  });

  it('filters out Tailwind dynamic classes', () => {
    const candidates = generateHeuristicCandidates(
      makePayload({ classList: ['bg-blue-500', 'text-white', 'hover:opacity-90', 'px-4'] })
    );
    expect(candidates.every(c => c.strategy !== 'css')).toBe(true);
  });

  it('includes stable semantic CSS class', () => {
    const candidates = generateHeuristicCandidates(
      makePayload({ classList: ['btn', 'primary'] })
    );
    const c = candidates.find(c => c.strategy === 'css');
    expect(c).toBeDefined();
    expect(c!.confidence).toBe(40);
  });

  it('generates semantic text candidate from short textContent', () => {
    const candidates = generateHeuristicCandidates(
      makePayload({ textContent: 'Sign In' })
    );
    const c = candidates.find(c => c.strategy === 'text' && c.selector.startsWith('text='));
    expect(c).toBeDefined();
    expect(c!.confidence).toBe(60);
  });

  it('skips long or multi-line textContent', () => {
    const candidates = generateHeuristicCandidates(
      makePayload({ textContent: 'This is a very long text that exceeds fifty chars limit' })
    );
    expect(candidates.every(c => !c.selector.startsWith('text='))).toBe(true);
  });

  it('returns no more than 5 candidates', () => {
    const candidates = generateHeuristicCandidates(
      makePayload({
        attributes: { 'data-testid': 'x', 'data-qa': 'y', 'aria-label': 'z', role: 'button' },
        id: 'stable-id',
        tagName: 'button',
        textContent: 'Click',
        classList: ['btn'],
      })
    );
    expect(candidates.length).toBeLessThanOrEqual(5);
  });

  it('returns candidates sorted by confidence descending', () => {
    const candidates = generateHeuristicCandidates(
      makePayload({
        attributes: { 'aria-label': 'nav', role: 'navigation' },
        classList: ['nav-bar'],
      })
    );
    for (let i = 1; i < candidates.length; i++) {
      expect(candidates[i].confidence).toBeLessThanOrEqual(candidates[i - 1].confidence);
    }
  });

  it('returns empty array for element with no extractable attributes', () => {
    const candidates = generateHeuristicCandidates(makePayload());
    expect(candidates).toHaveLength(0);
  });

  it('HEURISTIC_AI_THRESHOLD is 85', () => {
    expect(HEURISTIC_AI_THRESHOLD).toBe(85);
  });
});
