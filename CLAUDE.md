# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**SmartLocator AI** is a Chrome Extension + Local CLI agent that helps test automation engineers capture DOM elements, generate robust selectors, and write Page Object Model code directly into their automation framework (Playwright/Cypress). It is explicitly **not** a traditional recorder — it is a selector intelligence and code architecture assistant.

All four implementation phases are complete and the codebase is fully functional. All five packages are published to npm. CI/CD is handled by `.github/workflows/ci.yml` (validate on PRs, publish on push to master — publish requires validate to pass first).

## Monorepo Structure

```
ai-selector-extension/
├── apps/
│   ├── extension/          # Chrome Extension (React 18, Vite, Manifest V3, Tailwind in Shadow DOM)
│   │   └── dist/           # Built extension (gitignored in normal flow; committed via extension-dist/)
│   └── cli/                # Node.js CLI & Local Agent (Commander.js, ws, tsup)
│       ├── extension-dist/ # Pre-built extension bundled into the npm package (committed)
│       └── scripts/
│           ├── copy-extension.mjs   # Copies apps/extension/dist → extension-dist/ at build time
│           └── postinstall.mjs      # Gets-started message shown after npm install -g
├── packages/
│   ├── engine/             # ts-morph AST analysis, POM scanning, code generation, patch lifecycle
│   ├── ai-core/            # Heuristic scorer, OpenAI/Claude providers, confidence formula
│   ├── shared/             # TypeScript types + WebSocket event contracts (source of truth)
│   ├── framework-adapters/ # IFrameworkAdapter: PlaywrightAdapter, CypressAdapter
│   └── ui-kit/             # Reusable React/Tailwind components (stub, for future use)
├── scripts/
│   ├── publish-all.mjs     # Publish all packages in dependency order (supports --dry-run, --otp)
│   └── bump-version.mjs    # Bump version across all package.json files + CLI .version() call
├── package.json            # pnpm workspaces + Turborepo root
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

## Commands

```bash
pnpm install             # install all workspace deps
pnpm run build           # turbo build — all packages in dependency order
pnpm run dev             # turbo dev — watch mode
pnpm run lint            # turbo lint (tsc --noEmit across all packages)
pnpm run test            # turbo test — runs Vitest in ai-core and engine
pnpm run format          # prettier across workspace
smartlocator start       # CLI: scan repo, start WebSocket agent on :3137
smartlocator start --root /path/to/repo   # explicit repo root
smartlocator start --no-ai               # heuristic-only, no AI API calls
smartlocator configure set --provider openai --key sk-...
smartlocator configure show
smartlocator install-extension           # print bundled extension path + Chrome steps
smartlocator install-extension --dest ./ext  # copy extension to a local folder
```

**Publishing:**
```bash
pnpm run publish:dry-run          # simulate full publish without uploading
pnpm run publish:packages         # publish all 5 packages to npm in dependency order
pnpm run version:bump 0.2.0       # bump version in all package.json files + CLI entry
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
7. User enters element name, selects action type + target file → `REQUEST_PATCH` (with `action: ActionType`) sent through the same messaging chain
8. Agent detects POM convention (property-style or constructor-style), generates ts-morph AST insertion of both locator property and action method → diffs → stages patch → `PATCH_PREVIEW` returned
9. Overlay shows colored diff; user clicks **Apply** → `APPROVE_PATCH` → file written
10. `PATCH_APPLIED` returned → overlay shows "Applied! Undo" toast (8 s auto-dismiss)
11. User can click **Undo** → `ROLLBACK_PATCH` → original source restored
12. User can click **✕** on any panel to dismiss the overlay without taking action

### WebSocket events (packages/shared/src/events/websocket.ts)

**Client → Server:** `ELEMENT_CAPTURED`, `REQUEST_PATCH`, `APPROVE_PATCH`, `REJECT_PATCH`, `ROLLBACK_PATCH`

**Server → Client:** `SELECTOR_CANDIDATES`, `PATCH_PREVIEW`, `PATCH_APPLIED`, `PATCH_ROLLED_BACK`, `ERROR`, `SCAN_STATUS`

`REQUEST_PATCH` payload includes `action: ActionType` (`'click' | 'fill' | 'check' | 'select' | 'hover' | 'focus' | 'clear'`). `ActionType` is exported from `@smartlocator/shared`.

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
- `analyzer/pom-parser.ts` — ts-morph extracts class names, existing locator properties (both property-style initializers and constructor-style `this.x = locator()` assignments), route hints; uses shared read-only Project singleton (`ts-project.ts`)
- `analyzer/repository-index.ts` — in-memory index; chokidar watches for incremental updates with 150ms debounce per file and atomic array swap (collect new entries before replacing) to avoid race conditions
- `mapper/page-mapper.ts` — scores POM files against current URL via route hint matching
- `generator/ts-project.ts` — shared ts-morph Project singleton; `getReadOnlyProject()` for pom-parser + duplicate-checker (refreshes from disk on each call), `makeFreshProject()` for code-generator (isolated per mutation)
- `generator/code-generator.ts` — detects POM convention (property-style vs constructor-style) then inserts both a locator property and an action method via ts-morph AST (never string concat); for constructor-style also auto-imports `Locator` from `@playwright/test`; all AST mutations wrapped in try-catch
- `generator/duplicate-checker.ts` — pre-flight check before staging any patch; uses shared read-only Project singleton
- `patch/patch-manager.ts` — stage → apply (writes to disk + history) → rollback (restores original); history capped at 20; patch IDs use `crypto.randomUUID()`
- `config/project-config.ts` — loads `smartlocator.config.ts|js` from repo root; validates config shape at runtime and rejects absolute paths or `../` traversal in `includePatterns`

### CLI agent (apps/cli/src/)

- `commands/start.ts` — loads AI provider, scans repo, creates `PatchManager`, starts WS server; on `listening` detects whether `extension-dist/` is present (npm install) and prints the bundled extension path with Chrome load steps, or falls back to the dev path
- `commands/install-extension.ts` — resolves `extension-dist/` relative to `dist/index.js` via `import.meta.url`; prints path + Chrome instructions; `--dest <path>` copies the files to a user-specified directory
- `server/agent.ts` — `AgentDependencies { aiProvider?, repoIndex, patchManager, framework }` dispatches all WS events; `verifyClient` rejects non-`chrome-extension://` WebSocket origins (set `SMARTLOCATOR_DEBUG=1` to bypass); `REJECT_PATCH` returns `ERROR` for unknown IDs
- `server/handlers/element-capture.ts` — runs heuristics + optional AI (1500 ms timeout via `AbortController`; cancels in-flight HTTP request on timeout); logs wall-clock time; warns if > 2 s
- `server/handlers/request-patch.ts` — validates `targetFile` against `repoIndex.rootDir` (path traversal guard); looks up `className` from `repoIndex.pageObjects` (falls back to `deriveClassName` for files not yet indexed); imports `toCamelCase` from `@smartlocator/shared`
- `server/repository.ts` — calls `loadProjectConfig` + `scanRepository` + `watchRepository`
- `logger.ts` — `log.info/debug/error` writes to `~/.smartlocator/logs.log`; debug only when `SMARTLOCATOR_DEBUG=1`

### Extension (apps/extension/src/)

- `background/service-worker.ts` — owns the WebSocket connection to the CLI agent; handles reconnect with exponential backoff; maintains a set of registered tab IDs and broadcasts `FROM_AGENT` / `WS_STATUS` messages via `chrome.tabs.sendMessage`; kept alive by a `chrome.alarms` ticker every 0.4 min; re-registers the sender tab on every `TO_AGENT` message (recovers from SW suspension); queues critical messages (`APPROVE_PATCH`, `ROLLBACK_PATCH`) in `criticalQueue` and flushes on WebSocket open to prevent silent failures when Chrome suspends the SW between preview and apply
- `content/index.ts` — keyboard/mouse capture via `enterCaptureMode()`/`exitCaptureMode()` helpers that add/remove the click listener per session (prevents listener accumulation); registers with the background via `chrome.runtime.sendMessage({ type: 'CONTENT_READY' })`; sends agent events as `TO_AGENT` messages and receives `FROM_AGENT` / `WS_STATUS` messages from the background; routes server events to the overlay
- `content/capture.ts` — extracts `data-testid`, `data-qa`, `aria-label`, `role`, `type`, `placeholder`, parent hierarchy (4 levels), iframe/shadow context
- `content/overlay-host.ts` — creates `div#__smartlocator__` → Shadow DOM → injects Tailwind CSS → mounts React
- `overlay/App.tsx` — 3-step flow (Select → Configure → Preview) with a `<Steps>` progress indicator in every panel header. `CandidatesPanel`: best selector shown in a prominent preview card, candidate list collapsible when form is open, inline file recommendation. `ActionPicker`: pill buttons for all 7 action types with live method-signature preview. Configure form: autofocus, Enter submits, Back ← / Preview Changes → navigation. `PatchPreviewPanel`: coloured diff row backgrounds, file chip, full-width Apply button. `PatchAppliedToast`: 8 s auto-dismiss with countdown progress bar; Undo as bordered button. `OverlayCallbacks` includes `onClose`.
- `overlay/store.ts` — discriminated union: `idle | capture-ready | disconnected | error | candidates | patch-preview | patch-applied`

### Framework adapters (packages/framework-adapters/src/)

`IFrameworkAdapter.generateCode(selector, elementName, action)` returns `{ locatorProperty, actionMethod, imports }`.  
`PlaywrightAdapter` emits `page.getByTestId()` / `page.getByLabel()` / `page.locator()` with `readonly` property.  
`CypressAdapter` emits `cy.get()` / `cy.contains()` getter methods.

## CI/CD

`.github/workflows/ci.yml` runs on every push to master and every PR targeting master:

- **`validate` job** — runs on PRs (and master pushes): `pnpm install`, `pnpm run build`, `pnpm run lint`, `pnpm run test`
- **`publish` job** — runs only on push to master and **requires `validate` to pass first**; checks if the current version is already on npm; if not, publishes all 5 packages via `scripts/publish-all.mjs` using the `NPM_TOKEN` secret, then creates a GitHub Release with the extension zip attached

`pnpm/action-setup@v4` reads the pnpm version from `packageManager` in root `package.json` — do not specify `version:` explicitly or you'll get a version conflict error. Authentication uses `NODE_AUTH_TOKEN` env var (Classic Automation token bypasses npm 2FA in CI).

## npm Package Distribution

All five publishable packages are available on npm:

| Package | npm name | `private` | Build |
|---|---|---|---|
| CLI agent | `smartlocator` | no | tsup (`build:all` also copies extension) |
| Shared types | `@smartlocator/shared` | no | tsup |
| AI providers | `@smartlocator/ai-core` | no | tsup (peers: openai, @anthropic-ai/sdk) |
| Engine | `@smartlocator/engine` | no | tsup |
| Framework adapters | `@smartlocator/framework-adapters` | no | tsup |

**CLI `apps/cli/package.json` key fields:**
- `"files": ["dist/", "extension-dist/", "scripts/postinstall.mjs", "README.md"]`
- `"build:all"`: builds extension → `copy-extension.mjs` → tsup; run before publishing
- `"prepublishOnly": "pnpm run build:all"` — auto-runs on `npm publish`
- `"postinstall": "node scripts/postinstall.mjs"` — prints getting-started steps; skips in monorepo context

**Sub-package tsup externals:** `@smartlocator/shared` is external in all dependents; `@anthropic-ai/sdk` and `openai` are external in `ai-core`. The CLI's tsup uses `noExternal: [/^@smartlocator\//]` to bundle everything into one file.

**Publish workflow:**
```bash
pnpm run version:bump 0.2.0    # update all versions
pnpm run publish:dry-run       # verify
pnpm run publish:packages      # ship: shared → framework-adapters → ai-core → engine → smartlocator
```

## Key Conventions

- **`moduleResolution: bundler`** everywhere — no `.js` extension on relative imports
- **`noExternal: [/^@smartlocator\//]`** in `apps/cli/tsup.config.ts` — workspace packages are bundled at CLI build; npm deps stay external
- **Shadow DOM Tailwind**: imported via `?inline` CSS import; `preflight: false` in `tailwind.config.js` (no global reset)
- Tailwind palette is Catppuccin Mocha — use tokens: `surface`, `crust`, `overlay`, `border`, `muted`, `text`, `green`, `blue`, `red`, `yellow` etc.
- **ts-morph code generation**: always use `classDecl.addProperty()` / `insertProperty()` — never string concatenation; wrap mutation blocks in try-catch and return `null` on failure
- **`toCamelCase` / `toPascalCase`**: canonical implementations live in `packages/shared/src/utils/naming.ts` and are exported from `@smartlocator/shared`; import from there, not from `framework-adapters`
- **AI provider interface**: `AIProvider.generateSelector(payload, signal?)` accepts an optional `AbortSignal` — pass one from an `AbortController` to cancel in-flight HTTP requests
- `pnpm` is the package manager (`packageManager: pnpm@9.1.0`); use `pnpm --filter <name>` to scope commands

## Security Constraints

- Repository source code **never** leaves the local machine — only the captured element's HTML hierarchy snippet is sent to the AI API
- File mutations require an explicit `APPROVE_PATCH` event; the agent never auto-writes
- Chrome Extension communicates with the Local Agent only via localhost WebSocket (`ws://localhost:3137`)
- WebSocket server rejects connections whose `Origin` header is not a `chrome-extension://` URL; set `SMARTLOCATOR_DEBUG=1` to bypass during development
- `targetFile` from the client is resolved and validated against `repoIndex.rootDir` before any file I/O — path traversal attempts are rejected with an `INVALID_PATH` error
- AI API keys are stored in `~/.smartlocator/config.json` with `chmod 0o600` (Unix only); only the captured HTML snippet is ever sent to the AI

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
