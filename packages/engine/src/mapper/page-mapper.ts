import type { RepositoryIndex, PageObjectEntry } from '../analyzer/repository-index';

export interface PageMapResult {
  entry: PageObjectEntry;
  confidence: number;
  matchReason: string;
}

export function findTargetFiles(
  index: RepositoryIndex,
  currentUrl: string,
): PageMapResult[] {
  if (index.pageObjects.length === 0) return [];

  let urlPath = '';
  try {
    urlPath = new URL(currentUrl).pathname;
  } catch {
    urlPath = currentUrl;
  }

  const urlSegments = urlPath
    .split('/')
    .map(s => s.toLowerCase())
    .filter(s => s.length > 1);

  const results: PageMapResult[] = [];

  for (const entry of index.pageObjects) {
    let score = 0;
    const reasons: string[] = [];

    for (const hint of entry.routeHints) {
      if (urlSegments.includes(hint)) {
        score += 40;
        reasons.push(`route hint "${hint}" matches URL`);
      } else if (urlPath.toLowerCase().includes(hint)) {
        score += 20;
        reasons.push(`route hint "${hint}" in URL`);
      }
    }

    if (score > 0) {
      results.push({
        entry,
        confidence: Math.min(score, 100),
        matchReason: reasons.join('; '),
      });
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}
