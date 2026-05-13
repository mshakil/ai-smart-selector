# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**SmartLocator AI** is a Chrome Extension + Local CLI agent that helps test automation engineers capture DOM elements, generate robust selectors, and write Page Object Model code directly into their automation framework (Playwright/Cypress). It is explicitly **not** a traditional recorder — it is a selector intelligence and code architecture assistant.

All four implementation phases are complete and the codebase is fully functional.

## Monorepo Structure

```
ai-selector-extension/
├── apps/
│   ├── extension/          # Chrome Extension (React 18, Vite, Manifest V3, Tailwind in Shadow DOM)
│   └── cli/                # Node.js CLI & Local Agent (Commander.js, ws, tsup)
├── packages/
│   ├── engine/             # ts-morph AST analysis, POM scanning, code generation, patch lifecycle
│   ├── ai-core/            # Heuristic scorer, OpenAI/Claude providers, confidence formula
│   ├── shared/             # TypeScript types + WebSocket event contracts (source of truth)
│   ├── framework-adapters/ # IFrameworkAdapter: PlaywrightAdapter, CypressAdapter
│   └── ui-kit/             # Reusable React/Tailwind components (stub, for future use)
├── package.json            # pnpm workspaces + Turborepo root
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

## Commands

```bash
pnpm install             # install all workspace deps
pnpm run build           # turbo build — all packages
pnpm run dev             # turbo dev — watch mode
pnpm run lint            # turbo lint (tsc --noEmit across all packages)
pnpm run test            # turbo test — runs Vitest in ai-core and engine
pnpm run format          # prettier across workspace
smartlocator start       # CLI: scan repo, start WebSocket agent on :3137
smartlocator start --root /path/to/repo   # explicit repo root
smartlocator start --no-ai               # heuristic-only, no AI API calls
smartlocator configure set --provider openai --key sk-...
smartlocator configure show
```

**Running a single test file:**
```bash
cd packages/ai-core && pnpm exec vitest run src/__tests__/heuristic.test.ts
cd packages/engine  && pnpm exec vitest run src/__tests__/patch-manager.test.ts
```

## Architecture

### Data flow

1. User presses `ALT+C` on any page → Content Script enters capture mode (crosshair cursor)
2. User clicks an element → Content Script sends `TO_AGENT / ELEMENT_CAPTURED` to Background SW via `chrome.runtime.sendMessage`
3. Background SW forwards the event over its WebSocket connection to the CLI agent
4. Agent runs heuristic scoring; calls AI only if top heuristic score < 85
5. Agent scans the repo index for URL-matching POM files → `SELECTOR_CANDIDATES` returned over WebSocket
6. Background SW broadcasts `FROM_AGENT` to all registered tabs → Overlay shows ranked candidates + file recommendation
7. User enters element name + target file → `REQUEST_PATCH` sent through the same messaging chain
8. Agent generates ts-morph AST insertion → diffs → stages patch → `PATCH_PREVIEW` returned
9. Overlay shows colored diff; user clicks **Apply** → `APPROVE_PATCH` → file written
10. `PATCH_APPLIED` returned → overlay shows "Applied! Undo" toast (8 s auto-dismiss)
11. User can click **Undo** → `ROLLBACK_PATCH` → original source restored
12. User can click **✕** on any panel to dismiss the overlay without taking action

### WebSocket events (packages/shared/src/events/websocket.ts)

**Client → Server:** `ELEMENT_CAPTURED`, `REQUEST_PATCH`, `APPROVE_PATCH`, `REJECT_PATCH`, `ROLLBACK_PATCH`

**Server → Client:** `SELECTOR_CANDIDATES`, `PATCH_PREVIEW`, `PATCH_APPLIED`, `PATCH_ROLLED_BACK`, `ERROR`, `SCAN_STATUS`

### Selector scoring (packages/ai-core/src/scoring/heuristic.ts)

Scores out of 100, candidates capped at 5, sorted descending:
- `data-testid` / `data-qa`: 90 | `aria-label`: 80 | stable `id`: 75 | explicit `role`: 70
- Implicit semantic HTML role: 65 | `placeholder`: 62 | short text content: 60 | stable CSS class: 40
- Tailwind utility classes, hashed classes, and dynamic IDs are skipped entirely

**Confidence formula** (`ai-core/src/confidence.ts`): `Math.round(heuristic × 0.4 + ai × 0.6)`  
AI is invoked only when the top heuristic score < `HEURISTIC_AI_THRESHOLD` (85).

### Repository analyzer (packages/engine/src/)

- `analyzer/framework-detector.ts` — reads `package.json` to detect `playwright` or `cypress`
- `analyzer/pom-finder.ts` — globs for POM files; merges custom patterns from `smartlocator.config.ts`
- `analyzer/pom-parser.ts` — ts-morph extracts class names, existing locator properties, route hints
- `analyzer/repository-index.ts` — in-memory index; chokidar watches for incremental updates
- `mapper/page-mapper.ts` — scores POM files against current URL via route hint matching
- `generator/code-generator.ts` — ts-morph AST insertion of `readonly` locator property (never string concat)
- `generator/duplicate-checker.ts` — pre-flight check before staging any patch
- `patch/patch-manager.ts` — stage → apply (writes to disk + history) → rollback (restores original); history capped at 20
- `config/project-config.ts` — loads `smartlocator.config.ts|js` from repo root for custom patterns and attribute scores

### CLI agent (apps/cli/src/)

- `commands/start.ts` — loads AI provider, scans repo with project config, creates `PatchManager`, starts WS server
- `server/agent.ts` — `AgentDependencies { aiProvider?, repoIndex, patchManager, framework }` dispatches all WS events
- `server/handlers/element-capture.ts` — runs heuristics + optional AI (1500 ms timeout); logs wall-clock time; warns if > 2 s
- `server/handlers/request-patch.ts` — stages patch, derives class name from file path, sends `PATCH_PREVIEW`
- `server/repository.ts` — calls `loadProjectConfig` + `scanRepository` + `watchRepository`
- `logger.ts` — `log.info/debug/error` writes to `~/.smartlocator/logs.log`; debug only when `SMARTLOCATOR_DEBUG=1`

### Extension (apps/extension/src/)

- `background/service-worker.ts` — owns the WebSocket connection to the CLI agent; handles reconnect with exponential backoff; maintains a set of registered tab IDs and broadcasts `FROM_AGENT` / `WS_STATUS` messages via `chrome.tabs.sendMessage`; kept alive by a `chrome.alarms` ticker every 0.4 min
- `content/index.ts` — keyboard/mouse capture; registers with the background via `chrome.runtime.sendMessage({ type: 'CONTENT_READY' })`; sends agent events as `TO_AGENT` messages and receives `FROM_AGENT` / `WS_STATUS` messages from the background; routes server events to the overlay
- `content/capture.ts` — extracts `data-testid`, `data-qa`, `aria-label`, `role`, `type`, `placeholder`, parent hierarchy (4 levels), iframe/shadow context
- `content/overlay-host.ts` — creates `div#__smartlocator__` → Shadow DOM → injects Tailwind CSS → mounts React
- `overlay/App.tsx` — `CandidatesPanel` (selectable rows, ✕ close button, Generate Code form, file picker), `PatchPreviewPanel` (colored diff, ✕ close button, Apply/Reject), `PatchAppliedToast` (8 s auto-dismiss, Undo button); `OverlayCallbacks` includes `onClose`
- `overlay/store.ts` — discriminated union: `idle | capture-ready | disconnected | error | candidates | patch-preview | patch-applied`

### Framework adapters (packages/framework-adapters/src/)

`IFrameworkAdapter.generateCode(selector, elementName, action)` returns `{ locatorProperty, actionMethod, imports }`.  
`PlaywrightAdapter` emits `page.getByTestId()` / `page.getByLabel()` / `page.locator()` with `readonly` property.  
`CypressAdapter` emits `cy.get()` / `cy.contains()` getter methods.

## Key Conventions

- **`moduleResolution: bundler`** everywhere — no `.js` extension on relative imports
- **`noExternal: [/^@smartlocator\//]`** in `apps/cli/tsup.config.ts` — workspace packages are bundled at build; npm deps stay external
- **Shadow DOM Tailwind**: imported via `?inline` CSS import; `preflight: false` in `tailwind.config.js` (no global reset)
- Tailwind palette is Catppuccin Mocha — use tokens: `surface`, `crust`, `overlay`, `border`, `muted`, `text`, `green`, `blue`, `red`, `yellow` etc.
- **ts-morph code generation**: always use `classDecl.addProperty()` / `insertProperty()` — never string concatenation
- `pnpm` is the package manager (`packageManager: pnpm@9.1.0`); use `pnpm --filter <name>` to scope commands

## Security Constraints

- Repository source code **never** leaves the local machine — only the captured element's HTML hierarchy snippet is sent to the AI API
- File mutations require an explicit `APPROVE_PATCH` event; the agent never auto-writes
- Chrome Extension communicates with the Local Agent only via localhost WebSocket (`ws://localhost:3137`)

## Plugin Architecture

Users can create `smartlocator.config.ts` (or `.js`) in their repo root:

```typescript
import type { SmartLocatorProjectConfig } from '@smartlocator/engine';

export default {
  includePatterns: ['**/support/**/*.ts'],
  excludePatterns: ['**/fixtures/**'],
  attributeScores: { 'data-automation-id': 95 },
} satisfies SmartLocatorProjectConfig;
```

`loadProjectConfig(rootDir)` is called on `smartlocator start` and merges patterns into the POM finder.
