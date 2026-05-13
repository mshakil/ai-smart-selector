# SmartLocator AI

> AI-assisted selector intelligence for test automation engineers.

SmartLocator AI is a **Chrome Extension + Local CLI agent** that captures DOM elements, generates robust selectors, and writes Page Object Model (POM) code directly into your Playwright or Cypress project — without leaving the browser.

---

## Install

```bash
npm install -g smartlocator
```

Requires **Node.js ≥ 18**.

---

## Quick Start

### 1. Start the agent

Run this inside your Playwright or Cypress project root:

```bash
cd /path/to/your/test-project
smartlocator start
```

The agent scans your repo, detects the framework, and starts a local WebSocket server on `ws://localhost:3137`.

### 2. Load the Chrome Extension

```bash
smartlocator install-extension
```

This prints the path to the bundled extension. Then in Chrome:

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select the path printed above

Or copy the extension to a custom folder first:

```bash
smartlocator install-extension --dest ./smartlocator-ext
```

### 3. Capture an element

1. Navigate to any page in Chrome
2. Press **`Alt+C`** — the cursor becomes a crosshair
3. Click any element
4. SmartLocator scores selectors, recommends a POM file, and previews the generated code
5. Enter an element name → click **Apply** — the locator is written into your source file
6. Click **Undo** within 8 seconds to revert

---

## Commands

```bash
smartlocator start                                         # scan cwd, start agent on :3137
smartlocator start --root /path/to/repo                   # explicit repo root
smartlocator start --no-ai                                # heuristic-only, skip AI calls

smartlocator install-extension                            # print bundled extension path
smartlocator install-extension --dest ./ext               # copy extension to a folder

smartlocator configure set --provider openai --key sk-... # set OpenAI key
smartlocator configure set --provider claude --key sk-... # set Anthropic/Claude key
smartlocator configure show                               # show active configuration
```

---

## AI Configuration (optional)

SmartLocator works without AI using heuristic scoring alone. To enable AI fallback for low-confidence elements:

**OpenAI**
```bash
smartlocator configure set --provider openai --key sk-...
```

**Claude (Anthropic)**
```bash
smartlocator configure set --provider claude --key sk-ant-...
```

AI is called only when the top heuristic score is below 85. The final confidence score is `heuristic × 0.4 + ai × 0.6`.

---

## How It Works

```
Chrome Extension (React 18, Vite, MV3)
        │
        │  chrome.runtime messaging
        ▼
Background Service Worker  ──── WebSocket (ws://localhost:3137) ────  CLI Agent (Node.js)
                                                                            │
                                                                   ts-morph AST analysis
                                                                   POM scanning & patching
                                                                   OpenAI / Claude AI provider
```

1. `Alt+C` + click → element HTML captured in the browser
2. CLI scores selectors with heuristics (+ optional AI)
3. CLI scans your repo and recommends the best matching POM file
4. You name the element → CLI generates and previews the locator code
5. You click **Apply** → the locator is inserted into the file via AST (no string concat)
6. **Undo** restores the original file within 8 seconds

---

## Selector Scoring

Selectors are scored out of 100:

| Attribute | Score |
|---|---|
| `data-testid` / `data-qa` | 90 |
| `aria-label` | 80 |
| Stable `id` | 75 |
| Explicit `role` | 70 |
| Semantic HTML role | 65 |
| `placeholder` | 62 |
| Short text content | 60 |
| Stable CSS class | 40 |

Tailwind utility classes, hashed class names, and dynamic IDs are ignored automatically.

---

## Framework Support

| Framework | Generated locator style |
|---|---|
| Playwright | `readonly loginButton = page.getByTestId('login-btn')` |
| Cypress | `get loginButton() { return cy.get('[data-testid="login-btn"]') }` |

Framework is detected automatically from your `package.json`.

---

## Custom Configuration

Create a `smartlocator.config.ts` (or `.js`) in your project root:

```typescript
import type { SmartLocatorProjectConfig } from '@smartlocator/engine';

export default {
  includePatterns: ['**/support/**/*.ts'],
  excludePatterns: ['**/fixtures/**'],
  attributeScores: { 'data-automation-id': 95 },
} satisfies SmartLocatorProjectConfig;
```

---

## Security

- Your **source code never leaves your machine** — only the captured element's HTML snippet is sent to the AI API
- File writes require **explicit approval** via the Apply button; the agent never auto-writes
- The extension communicates with the local agent **only over localhost** (`ws://localhost:3137`)

---

## Programmatic Use

The sub-packages are published individually for teams that want to integrate SmartLocator into their own tooling:

```bash
npm install @smartlocator/engine @smartlocator/shared
```

```typescript
import { scanRepository, PatchManager } from '@smartlocator/engine';
import { generateHeuristicCandidates } from '@smartlocator/ai-core';
```

| Package | Description |
|---|---|
| [`@smartlocator/shared`](https://www.npmjs.com/package/@smartlocator/shared) | TypeScript types and WebSocket event contracts |
| [`@smartlocator/ai-core`](https://www.npmjs.com/package/@smartlocator/ai-core) | Heuristic scorer and OpenAI/Claude provider integrations |
| [`@smartlocator/engine`](https://www.npmjs.com/package/@smartlocator/engine) | AST analysis, POM scanning, code generation, patch lifecycle |
| [`@smartlocator/framework-adapters`](https://www.npmjs.com/package/@smartlocator/framework-adapters) | Playwright and Cypress locator generators |

---

## Links

- [GitHub Repository](https://github.com/mshakil/ai-smart-selector)
- [Report an Issue](https://github.com/mshakil/ai-smart-selector/issues)
- [npm: smartlocator](https://www.npmjs.com/package/smartlocator)

---

## License

MIT
