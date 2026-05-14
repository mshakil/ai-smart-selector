# SmartLocator AI

AI-assisted selector intelligence for test automation engineers. SmartLocator AI is a Chrome Extension + Local CLI agent that helps you capture DOM elements, generate robust selectors, and write Page Object Model (POM) code directly into your Playwright or Cypress automation framework — without leaving the browser.

## What It Does

- **Capture** any element on any page with `Alt+C` then click
- **Score** selectors using heuristics (`data-testid`, `aria-label`, stable IDs, semantic roles, etc.) and optionally AI
- **Recommend** which POM file to write the locator into based on the current URL
- **Preview** a diff of the generated code before anything is written
- **Apply or Undo** changes to your source files with one click

## Quick Start (npm)

```bash
# Install globally
npm install -g smartlocator

# Start the agent inside your test repo
cd /path/to/your/playwright-or-cypress-project
smartlocator start

# Get the Chrome extension path and load instructions
smartlocator install-extension

# Or copy the extension to a local folder first
smartlocator install-extension --dest ./smartlocator-ext
```

**Loading the extension in Chrome:**
1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select the path printed by `install-extension`
4. Press `Alt+C` on any page, click an element → a **3-step overlay** appears: Select a selector → Configure the element name and action type → Preview and Apply the generated code

## Commands

```bash
smartlocator start                                        # scan cwd, start agent on :3137
smartlocator start --root /path/to/repo                  # explicit repo root
smartlocator start --no-ai                               # heuristic-only, no AI API calls
smartlocator install-extension                           # print bundled extension path
smartlocator install-extension --dest ./ext              # copy extension to a folder
smartlocator configure set --provider openai --key sk-... # set OpenAI key
smartlocator configure set --provider claude --key sk-ant-... # set Claude key
smartlocator configure show                              # show current config
```

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

## Programmatic Use

The engine and AI-core packages are published individually for teams that want to integrate SmartLocator into their own tooling:

```bash
npm install @smartlocator/engine @smartlocator/shared
```

```typescript
import { scanRepository, PatchManager } from '@smartlocator/engine';
import { generateHeuristicCandidates } from '@smartlocator/ai-core';
```

| Package | Description |
|---|---|
| `@smartlocator/shared` | TypeScript types and WebSocket event contracts |
| `@smartlocator/ai-core` | Heuristic scorer and OpenAI/Claude provider integrations |
| `@smartlocator/engine` | AST analysis, POM scanning, code generation, patch lifecycle |
| `@smartlocator/framework-adapters` | Playwright and Cypress locator generators |

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

## Framework Support

Both a **locator property** and an **action method** are generated and inserted into your POM class. The code-generator detects whether the existing class uses property-style or constructor-style locators and matches the convention automatically.

| Framework | Locator property | Action method |
|---|---|---|
| Playwright | `readonly loginButton = page.getByTestId('login-btn')` | `async clickLoginButton() { await this.loginButton.click(); }` |
| Cypress | `get loginButton() { return cy.get('[data-testid="login-btn"]') }` | `clickLoginButton() { return this.getLoginButton().click(); }` |

## Security

- Your repository source code never leaves your machine — only the captured element's HTML snippet is sent to the AI API
- File writes require explicit approval via the **Apply** button; the agent never auto-writes
- The extension communicates with the local agent only over `ws://localhost:3137`
- The local agent accepts WebSocket connections only from `chrome-extension://` origins — other localhost processes are rejected
- All file paths provided by the extension are validated against the repo root before any read or write — path traversal attempts are blocked
- AI API keys are stored with `chmod 0o600` (Unix)

## Install from Source

```bash
git clone https://github.com/mshakil/ai-smart-selector.git
cd ai-smart-selector
pnpm install
pnpm run build
node apps/cli/dist/index.js start
```

## Development

```bash
pnpm run dev              # watch mode for all packages
pnpm run lint             # type-check all packages
pnpm run test             # run Vitest (ai-core, engine)
pnpm run format           # prettier across workspace
pnpm run publish:dry-run  # simulate publishing all packages
pnpm run version:bump 0.2.0  # bump version across all packages
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
├── scripts/
│   ├── publish-all.mjs     # Publish all packages in dependency order
│   └── bump-version.mjs    # Bump version across all packages
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```
