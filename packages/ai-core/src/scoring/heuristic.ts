import type { ElementCapturePayload, SelectorCandidate, SelectorStrategy } from '@smartlocator/shared';

export const HEURISTIC_AI_THRESHOLD = 85;

export function generateHeuristicCandidates(
  payload: ElementCapturePayload
): SelectorCandidate[] {
  const { tagName, id, classList, textContent, attributes } = payload;
  const candidates: SelectorCandidate[] = [];

  // data-testid / data-qa: +90
  const testId = attributes['data-testid'];
  if (testId) {
    candidates.push(make(`[data-testid="${testId}"]`, 'data-testid', 90,
      'data-testid is purpose-built for test automation and stable across refactors'));
  }

  const dataQa = attributes['data-qa'];
  if (dataQa) {
    candidates.push(make(`[data-qa="${dataQa}"]`, 'data-qa', 90,
      'data-qa is purpose-built for test automation and stable across refactors'));
  }

  // aria-label: +80
  const ariaLabel = attributes['aria-label'];
  if (ariaLabel) {
    candidates.push(make(`[aria-label="${ariaLabel}"]`, 'aria-label', 80,
      'aria-label is an accessibility attribute that is stable and semantically meaningful'));
  }

  // Stable non-generated id: +75
  if (id && !isDynamicId(id)) {
    candidates.push(make(`#${id}`, 'css', 75,
      'ID attribute is unique per page and explicitly set; verify it is not dynamically generated'));
  }

  // Explicit ARIA role: +70
  const role = attributes['role'];
  if (role) {
    candidates.push(make(`[role="${role}"]`, 'role', 70,
      `Explicit ARIA role="${role}" provides semantic meaning and is accessibility-first`));
  }

  // Implicit semantic HTML role: +65
  const semanticTags = ['button', 'input', 'select', 'textarea', 'a', 'form', 'nav', 'main', 'header', 'footer'];
  if (semanticTags.includes(tagName.toLowerCase()) && !role) {
    const inputType = attributes['type'];
    const sel = inputType
      ? `${tagName.toLowerCase()}[type="${inputType}"]`
      : tagName.toLowerCase();
    candidates.push(make(sel, 'role', 65,
      `<${tagName.toLowerCase()}> has an implicit ARIA role`));
  }

  // Placeholder text (inputs): +62
  const placeholder = attributes['placeholder'];
  if (placeholder) {
    candidates.push(make(`[placeholder="${placeholder}"]`, 'text', 62,
      'placeholder is descriptive and stable for form inputs'));
  }

  // Semantic text content: +60 (short, single-line only)
  if (textContent) {
    const trimmed = textContent.trim();
    if (trimmed.length > 0 && trimmed.length <= 50 && !trimmed.includes('\n')) {
      candidates.push(make(`text=${trimmed}`, 'text', 60,
        'Text content is human-readable; may break if UI copy changes'));
    }
  }

  // Stable CSS classes: +40 (Tailwind/dynamic classes penalised to -30 → skip entirely)
  if (classList && classList.length > 0) {
    const stable = classList.filter(c => !isDynamicClass(c));
    if (stable.length > 0) {
      const sel = stable.slice(0, 2).map(c => `.${c}`).join('');
      candidates.push(make(sel, 'css', 40,
        'Stable semantic CSS class; confirm these classes are not theme-generated'));
    }
  }

  return candidates
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}

function make(
  selector: string,
  strategy: SelectorStrategy,
  confidence: number,
  reasoning: string
): SelectorCandidate {
  return { selector, strategy, confidence, reasoning };
}

function isDynamicClass(cls: string): boolean {
  // Tailwind utility prefixes
  if (/^(text|bg|flex|grid|p[xytrbl]?|m[xytrbl]?|w|h|gap|border|rounded|shadow|font|leading|tracking|opacity|z|top|left|right|bottom|col|row|scale|rotate|translate|transition|duration|ease|delay|animate|cursor|select|resize|overflow|place|justify|items|content|self|order|grow|shrink|basis|inset|space|divide|ring|outline|fill|stroke)-/.test(cls)) return true;
  // Responsive/state/variant prefixes
  if (/^(sm|md|lg|xl|2xl|hover|focus|active|disabled|visited|checked|group|peer|dark|first|last|odd|even|before|after|placeholder|focus-within|focus-visible):/.test(cls)) return true;
  // Arbitrary Tailwind values
  if (cls.includes('[') || cls.startsWith('!')) return true;
  // CSS-Modules / hashed class (e.g. _abc123, --abc123)
  if (/[_-][a-z0-9]{5,}$/i.test(cls)) return true;
  return false;
}

function isDynamicId(id: string): boolean {
  // Long numeric suffixes or UUID-like patterns
  return /\d{4,}/.test(id) || /^[a-f0-9]{8}-[a-f0-9]{4}/.test(id);
}
