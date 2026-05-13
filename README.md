# SmartLocator AI

AI-assisted selector intelligence for test automation engineers. SmartLocator AI is a Chrome Extension + Local CLI agent that helps you capture DOM elements, generate robust selectors, and write Page Object Model (POM) code directly into your Playwright or Cypress automation framework — without leaving the browser.

## What It Does

- **Capture** any element on any page with `Alt+C` then click
- **Score** selectors using heuristics (`data-testid`, `aria-label`, stable IDs, semantic roles, etc.) and optionally AI
- **Recommend** which POM file to write the locator into based on the current URL
- **Preview** a diff of the generated code before anything is written
- **Apply or Undo** changes to your source files with one click

## Architecture

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

## Monorepo Structure

```
ai-smart-selector/
├── apps/
│   ├── extension/          # Chrome Extension (React, Vite, Manifest V3)
│   └── cli/                # Local Agent (Commander.js, WebSocket server)
├── packages/
│   ├── engine/             # AST analysis, POM scanning, code generation, patch lifecycle
│   ├── ai-core/            # Heuristic scorer, OpenAI/Claude providers
│   ├── shared/             # TypeScript types & WebSocket event contracts
│   ├── framework-adapters/ # Playwright and Cypress code generators
│   └── ui-kit/             # Shared React components (stub)
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

## Requirements

- Node.js >= 18
- pnpm >= 9
- Google Chrome

## Installation

```bash
# Clone the repo
git clone https://github.com/mshakil/ai-smart-selector.git
cd ai-smart-selector

# Install all workspace dependencies
pnpm install

# Build all packages
pnpm run build
```

## Running the CLI Agent

```bash
# Start the agent (scans cwd for POM files, starts WebSocket on :3137)
node apps/cli/dist/index.js start

# Or with an explicit repo root
node apps/cli/dist/index.js start --root /path/to/your/test-repo

# Heuristic-only mode (no AI API calls)
node apps/cli/dist/index.js start --no-ai

# Configure an AI provider
node apps/cli/dist/index.js configure set --provider openai --key sk-...
node apps/cli/dist/index.js configure set --provider claude --key sk-ant-...
```

## Loading the Chrome Extension

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `apps/extension/dist` folder

## Usage

1. Start the CLI agent (see above)
2. Navigate to the page you want to automate in Chrome
3. Press `Alt+C` — the cursor changes to a crosshair
4. Click any element on the page
5. SmartLocator scores selector candidates and recommends the best POM file
6. Enter a property name, select or confirm the target file, click **Generate Code**
7. Review the diff in the **Patch Preview** panel
8. Click **Apply** to write the locator to your source file, or **Reject** to discard
9. Click **Undo** within 8 seconds to roll back the change

## Selector Scoring

Selectors are scored out of 100 and ranked:

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

AI is called only when the top heuristic score is below 85. The final confidence score is `heuristic × 0.4 + ai × 0.6`.

## Custom Configuration

Create a `smartlocator.config.ts` (or `.js`) in your repo root to extend the defaults:

```typescript
import type { SmartLocatorProjectConfig } from '@smartlocator/engine';

export default {
  includePatterns: ['**/support/**/*.ts'],
  excludePatterns: ['**/fixtures/**'],
  attributeScores: { 'data-automation-id': 95 },
} satisfies SmartLocatorProjectConfig;
```

## Development

```bash
pnpm run dev        # Watch mode for all packages
pnpm run lint       # Type-check all packages
pnpm run test       # Run Vitest (ai-core, engine)
pnpm run format     # Prettier across workspace
```

Run a single test file:

```bash
cd packages/ai-core && pnpm exec vitest run src/__tests__/heuristic.test.ts
cd packages/engine  && pnpm exec vitest run src/__tests__/patch-manager.test.ts
```

## Security

- Your repository source code never leaves your machine — only the captured element's HTML snippet is sent to the AI API
- File writes require explicit approval via the **Apply** button; the agent never auto-writes
- The extension communicates with the local agent only over `ws://localhost:3137`

## Framework Support

| Framework | Locator style |
|---|---|
| Playwright | `page.getByTestId()`, `page.getByLabel()`, `page.locator()` as `readonly` properties |
| Cypress | `cy.get()`, `cy.contains()` getter methods |
