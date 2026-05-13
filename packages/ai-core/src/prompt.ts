import type { ElementCapturePayload, DOMNodeContext } from '@smartlocator/shared';

export const SYSTEM_PROMPT = `You are a test automation expert specializing in robust, stable selector generation.

Given an HTML element and its parent context, generate the most stable CSS or accessibility selector for use in Playwright or Cypress.

Prioritize in this order:
1. data-testid, data-qa — purpose-built for automation, never changes with UI refactors
2. aria-label — semantic, stable accessibility attribute
3. Explicit ARIA role — role attribute on the element
4. Text content — readable, but may break if copy changes
5. Stable, non-utility CSS class — avoid Tailwind utilities or hashed classes

Never use: nth-child, nth-of-type, dynamic/Tailwind CSS classes, auto-generated numeric IDs, or overly specific compound selectors.

Respond ONLY with valid JSON, no markdown, no explanation outside the JSON:
{"selector":"string","confidence":0-100,"reasoning":"one sentence"}`;

export function buildElementSnippet(payload: ElementCapturePayload): string {
  const elementLine = buildElementHTML(payload);
  const contextLines = payload.hierarchy.slice(0, 2).map(buildNodeHTML);

  if (contextLines.length > 0) {
    return `Parent context:\n${contextLines.map(l => `  ${l}`).join('\n')}\n\nTarget element:\n  ${elementLine}`;
  }
  return `Target element:\n  ${elementLine}`;
}

function buildElementHTML(p: ElementCapturePayload): string {
  const attrs = Object.entries(p.attributes)
    .filter(([k]) => !['style', 'onclick', 'onmousedown'].includes(k))
    .map(([k, v]) => `${k}="${v.slice(0, 60)}"`)
    .join(' ');
  const id = p.id ? ` id="${p.id}"` : '';
  const cls = p.classList.length > 0 ? ` class="${p.classList.slice(0, 4).join(' ')}"` : '';
  const text = p.textContent ? p.textContent.slice(0, 40).replace(/\s+/g, ' ') : '';
  const inner = text ? text : '';
  return `<${p.tagName}${id}${cls}${attrs ? ' ' + attrs : ''}>${inner}</${p.tagName}>`;
}

function buildNodeHTML(n: DOMNodeContext): string {
  const id = n.id ? ` id="${n.id}"` : '';
  const cls = n.classList.length > 0 ? ` class="${n.classList.slice(0, 2).join(' ')}"` : '';
  const role = n.attributes['role'] ? ` role="${n.attributes['role']}"` : '';
  return `<${n.tagName}${id}${cls}${role}>...</${n.tagName}>`;
}
