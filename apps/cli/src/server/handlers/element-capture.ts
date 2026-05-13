import type { WebSocket } from 'ws';
import type { ElementCapturePayload, SelectorCandidate } from '@smartlocator/shared';
import {
  generateHeuristicCandidates,
  HEURISTIC_AI_THRESHOLD,
  combineScores,
  type AIProvider,
} from '@smartlocator/ai-core';
import { findTargetFiles, type RepositoryIndex } from '@smartlocator/engine';
import { send } from '../agent.js';
import { log } from '../../logger.js';

const AI_TIMEOUT_MS = 1500;

export async function handleElementCapture(
  ws: WebSocket,
  payload: ElementCapturePayload,
  aiProvider?: AIProvider,
  repoIndex?: RepositoryIndex,
): Promise<void> {
  const t0 = Date.now();

  const heuristics = generateHeuristicCandidates(payload).map(
    (c): SelectorCandidate => ({ ...c, source: 'heuristic' })
  );

  if (heuristics.length === 0) {
    send(ws, {
      type: 'ERROR',
      payload: {
        code: 'NO_CANDIDATES',
        message: 'No stable selectors found for this element. Add a data-testid attribute.',
      },
    });
    return;
  }

  const topScore = heuristics[0].confidence;
  let candidates = heuristics;
  let aiUsed = false;

  if (aiProvider && topScore < HEURISTIC_AI_THRESHOLD) {
    try {
      const result = await withTimeout(aiProvider.generateSelector(payload), AI_TIMEOUT_MS);

      if (result && result.candidates.length > 0) {
        const aiCandidates: SelectorCandidate[] = result.candidates.map(c => ({
          ...c,
          confidence: combineScores(topScore, c.confidence),
          source: 'ai' as const,
        }));

        candidates = [...candidates, ...aiCandidates]
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 5);

        aiUsed = true;
        log.debug(`AI (${aiProvider.name}) improved candidates to ${candidates[0].confidence}%`);
      }
    } catch (err) {
      log.error(`AI provider error (${aiProvider.name}): ${(err as Error).message}`);
    }
  }

  let targetFileRecommendation = '';
  let targetFileConfidence = 0;
  let availableFiles: string[] = [];

  if (repoIndex && repoIndex.status === 'ready' && payload.url) {
    const matches = findTargetFiles(repoIndex, payload.url);
    if (matches.length > 0) {
      targetFileRecommendation = matches[0].entry.relativePath;
      targetFileConfidence = matches[0].confidence;
    }
    availableFiles = repoIndex.pageObjects.map(e => e.relativePath);
  }

  const elapsed = Date.now() - t0;
  log.debug(`Element capture processed in ${elapsed}ms (ai=${aiUsed})`);
  if (elapsed > 2000) log.error(`Response time ${elapsed}ms exceeded 2 s target`);

  const [primary, ...fallbacks] = candidates;

  send(ws, {
    type: 'SELECTOR_CANDIDATES',
    payload: {
      primary,
      fallbacks,
      targetFileRecommendation,
      targetFileConfidence,
      availableFiles,
      aiUsed,
    },
  });
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>(resolve => setTimeout(() => resolve(null), ms)),
  ]);
}
