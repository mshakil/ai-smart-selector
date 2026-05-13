import { describe, it, expect } from 'vitest';
import { combineScores } from '../confidence';

describe('combineScores', () => {
  it('applies the 40/60 weighting formula', () => {
    expect(combineScores(80, 90)).toBe(86);  // 80*0.4 + 90*0.6 = 32 + 54 = 86
  });

  it('returns heuristic-only result when ai score is 0', () => {
    expect(combineScores(70, 0)).toBe(28);
  });

  it('returns pure ai result when heuristic is 0', () => {
    expect(combineScores(0, 80)).toBe(48);
  });

  it('rounds to nearest integer', () => {
    // 50*0.4 + 75*0.6 = 20 + 45 = 65 (exact)
    expect(combineScores(50, 75)).toBe(65);
    // 60*0.4 + 71*0.6 = 24 + 42.6 = 66.6 → rounds to 67
    expect(combineScores(60, 71)).toBe(67);
  });

  it('clamps to 100 from the formula when both inputs are 100', () => {
    expect(combineScores(100, 100)).toBe(100);
  });
});
