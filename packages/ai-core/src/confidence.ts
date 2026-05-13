/**
 * Combines the best heuristic score with an AI-generated confidence score.
 * Formula from the architecture spec: (heuristic * 0.4) + (ai * 0.6)
 */
export function combineScores(heuristicScore: number, aiScore: number): number {
  return Math.round(heuristicScore * 0.4 + aiScore * 0.6);
}
