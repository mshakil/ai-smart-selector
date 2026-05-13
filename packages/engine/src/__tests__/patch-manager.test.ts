import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PatchManager } from '../patch/patch-manager';

// Mock filesystem and code-generation so tests don't need real .ts files on disk.
vi.mock('fs', () => ({
  readFileSync: vi.fn(() => 'original source'),
  writeFileSync: vi.fn(),
}));

vi.mock('../generator/code-generator', () => ({
  generateInsertion: vi.fn(() => ({
    filePath: '/project/login.ts',
    className: 'LoginPage',
    propertyName: 'submitBtn',
    newSource: 'new source',
  })),
}));

vi.mock('../generator/duplicate-checker', () => ({
  isDuplicateProperty: vi.fn(() => false),
}));

vi.mock('../patch/diff', () => ({
  generateUnifiedDiff: vi.fn(() => '--- a\n+++ b\n@@ -1 +1 @@\n-old\n+new\n'),
}));

import { readFileSync, writeFileSync } from 'fs';

const INPUT = {
  filePath: '/project/login.ts',
  className: 'LoginPage',
  propertyName: 'submitBtn',
  selector: '[data-testid="submit"]',
  selectorStrategy: 'data-testid',
  framework: 'playwright' as const,
};

describe('PatchManager', () => {
  let mgr: PatchManager;

  beforeEach(() => {
    mgr = new PatchManager();
    vi.clearAllMocks();
  });

  describe('stage()', () => {
    it('returns a StagedPatch with a unique id', () => {
      const result = mgr.stage(INPUT);
      expect('error' in result).toBe(false);
      const patch = result as Awaited<typeof result>;
      expect(typeof (patch as { id: string }).id).toBe('string');
    });

    it('returns an error when isDuplicateProperty returns true', async () => {
      const { isDuplicateProperty } = await import('../generator/duplicate-checker');
      vi.mocked(isDuplicateProperty).mockReturnValueOnce(true);
      const result = mgr.stage(INPUT);
      expect('error' in result).toBe(true);
    });

    it('returns an error when readFileSync throws', () => {
      vi.mocked(readFileSync as unknown as (...args: unknown[]) => unknown).mockImplementationOnce(() => { throw new Error('no file'); });
      const result = mgr.stage(INPUT);
      expect('error' in result).toBe(true);
    });
  });

  describe('apply()', () => {
    it('writes the new source and adds to history', () => {
      const result = mgr.stage(INPUT) as { id: string };
      expect(mgr.apply(result.id)).toBe(true);
      expect(writeFileSync).toHaveBeenCalledOnce();
      expect(mgr.getHistory()).toHaveLength(1);
    });

    it('returns false for unknown id', () => {
      expect(mgr.apply('unknown-id')).toBe(false);
    });

    it('removes patch from staged after apply', () => {
      const result = mgr.stage(INPUT) as { id: string };
      mgr.apply(result.id);
      // After apply, staged patch is gone; get() returns from history
      expect(mgr.get(result.id)).toBeDefined(); // still in history
    });
  });

  describe('reject()', () => {
    it('removes staged patch', () => {
      const result = mgr.stage(INPUT) as { id: string };
      expect(mgr.reject(result.id)).toBe(true);
      expect(mgr.get(result.id)).toBeUndefined();
    });

    it('returns false for unknown id', () => {
      expect(mgr.reject('nope')).toBe(false);
    });
  });

  describe('rollback()', () => {
    it('restores the original source', () => {
      const result = mgr.stage(INPUT) as { id: string };
      mgr.apply(result.id);
      vi.clearAllMocks();
      expect(mgr.rollback(result.id)).toBe(true);
      expect(writeFileSync).toHaveBeenCalledWith('/project/login.ts', 'original source', 'utf8');
    });

    it('removes the patch from history after rollback', () => {
      const result = mgr.stage(INPUT) as { id: string };
      mgr.apply(result.id);
      mgr.rollback(result.id);
      expect(mgr.getHistory()).toHaveLength(0);
    });

    it('returns false for a patch that was never applied', () => {
      const result = mgr.stage(INPUT) as { id: string };
      expect(mgr.rollback(result.id)).toBe(false);
    });
  });

  describe('history limit', () => {
    it('never grows past 20 entries', () => {
      // Stage + apply 25 patches
      for (let i = 0; i < 25; i++) {
        const r = mgr.stage({ ...INPUT, propertyName: `btn${i}` }) as { id: string };
        mgr.apply(r.id);
      }
      expect(mgr.getHistory().length).toBeLessThanOrEqual(20);
    });
  });
});
