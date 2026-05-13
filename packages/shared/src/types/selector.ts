export type SelectorStrategy =
  | 'data-testid'
  | 'data-qa'
  | 'aria-label'
  | 'role'
  | 'text'
  | 'css'
  | 'xpath';

export interface SelectorCandidate {
  selector: string;
  strategy: SelectorStrategy;
  confidence: number;
  reasoning: string;
  source?: 'heuristic' | 'ai';
}
