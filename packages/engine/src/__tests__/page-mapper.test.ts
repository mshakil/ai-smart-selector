import { describe, it, expect } from 'vitest';
import { findTargetFiles } from '../mapper/page-mapper';
import type { RepositoryIndex } from '../analyzer/repository-index';

function makeIndex(entries: { relativePath: string; routeHints: string[] }[]): RepositoryIndex {
  return {
    rootDir: '/project',
    framework: 'playwright',
    status: 'ready',
    pageObjects: entries.map(e => ({
      filePath: `/project/${e.relativePath}`,
      relativePath: e.relativePath,
      className: 'SomePage',
      routeHints: e.routeHints,
      existingSelectors: [],
    })),
  };
}

describe('findTargetFiles', () => {
  it('returns empty array when index has no page objects', () => {
    const index = makeIndex([]);
    expect(findTargetFiles(index, 'http://localhost/login')).toHaveLength(0);
  });

  it('matches by exact URL segment', () => {
    const index = makeIndex([
      { relativePath: 'pages/login.ts', routeHints: ['login'] },
      { relativePath: 'pages/dashboard.ts', routeHints: ['dashboard'] },
    ]);
    const results = findTargetFiles(index, 'http://localhost/login');
    expect(results[0].entry.relativePath).toBe('pages/login.ts');
    expect(results[0].confidence).toBeGreaterThan(0);
  });

  it('ranks higher-confidence match first', () => {
    const index = makeIndex([
      { relativePath: 'pages/checkout.ts', routeHints: ['checkout'] },
      { relativePath: 'pages/checkout-confirm.ts', routeHints: ['checkout', 'confirm'] },
    ]);
    const results = findTargetFiles(index, 'http://localhost/checkout/confirm');
    // checkout-confirm matches both hints so should rank higher
    expect(results[0].entry.relativePath).toBe('pages/checkout-confirm.ts');
  });

  it('returns empty when no hints match the URL', () => {
    const index = makeIndex([
      { relativePath: 'pages/login.ts', routeHints: ['login'] },
    ]);
    expect(findTargetFiles(index, 'http://localhost/dashboard')).toHaveLength(0);
  });

  it('handles malformed URL gracefully', () => {
    const index = makeIndex([
      { relativePath: 'pages/login.ts', routeHints: ['login'] },
    ]);
    expect(() => findTargetFiles(index, 'not-a-url')).not.toThrow();
  });

  it('partial path match scores lower than exact segment match', () => {
    const index = makeIndex([
      { relativePath: 'pages/admin.ts', routeHints: ['admin'] },
    ]);
    // 'admin' is in the URL path but not as an exact segment
    const results = findTargetFiles(index, 'http://localhost/administration');
    if (results.length > 0) {
      expect(results[0].confidence).toBeLessThan(40);
    }
  });
});
