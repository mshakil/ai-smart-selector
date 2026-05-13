import type { DOMNodeContext, ElementCapturePayload } from '@smartlocator/shared';

export function extractElementMetadata(element: HTMLElement): ElementCapturePayload {
  return {
    url: window.location.href,
    tagName: element.tagName.toLowerCase(),
    id: element.id || undefined,
    classList: Array.from(element.classList),
    textContent: element.textContent?.trim() || undefined,
    attributes: extractRelevantAttributes(element),
    hierarchy: buildParentHierarchy(element),
    iframeContext: getIframeContext(),
    shadowHost: getShadowHostSelector(element),
  };
}

const RELEVANT_ATTRS = [
  'data-testid', 'data-qa', 'data-cy', 'data-automation-id',
  'aria-label', 'aria-describedby', 'aria-labelledby',
  'role', 'type', 'name', 'placeholder',
  'href', 'for', 'value',
];

function extractRelevantAttributes(el: HTMLElement): Record<string, string> {
  const out: Record<string, string> = {};
  for (const attr of RELEVANT_ATTRS) {
    const val = el.getAttribute(attr);
    if (val !== null) out[attr] = val;
  }
  return out;
}

function buildParentHierarchy(el: HTMLElement, depth = 0): DOMNodeContext[] {
  const parent = el.parentElement;
  if (depth >= 4 || !parent || parent === document.documentElement) return [];

  const node: DOMNodeContext = {
    tagName: parent.tagName.toLowerCase(),
    id: parent.id || undefined,
    classList: Array.from(parent.classList),
    attributes: {
      ...(parent.getAttribute('role') ? { role: parent.getAttribute('role')! } : {}),
      ...(parent.getAttribute('aria-label') ? { 'aria-label': parent.getAttribute('aria-label')! } : {}),
    },
  };

  return [node, ...buildParentHierarchy(parent, depth + 1)];
}

function getIframeContext(): string | undefined {
  if (window === window.top) return undefined;
  try {
    return window.location.href;
  } catch {
    return 'cross-origin-iframe';
  }
}

function getShadowHostSelector(el: HTMLElement): string | undefined {
  const root = el.getRootNode();
  if (!(root instanceof ShadowRoot)) return undefined;
  const host = root.host as HTMLElement;
  const id = host.id ? `#${host.id}` : '';
  return `${host.tagName.toLowerCase()}${id}`;
}
