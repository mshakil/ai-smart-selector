# SmartLocator AI - Technical Implementation Plan

This document outlines the architecture and implementation plan for the SmartLocator AI MVP, based on the requirements defined in `technical-prompt.md` and `requirment.md`.

## 1. Complete Architecture Design
The architecture is divided into three main operational domains:
- **Client (Chrome Extension)**: In-browser agent for DOM element capture, heuristic parsing, and overlay UI display.
- **Local Agent (CLI/Node.js Server)**: The central orchestrator running on the developer's local machine. It bridges the browser extension, the local file system, and the AI Engine.
- **AI & Analysis Engine**: Analyzes ASTs, communicates with AI models for selector intelligence, and handles safe code generation.

These domains communicate over a secure local WebSocket connection, ensuring real-time responsiveness and strictly avoiding cloud upload of repository source code.

## 2. Monorepo Folder Structure
Using **Turborepo** for optimal caching, local linking, and task running across the stack.

```text
ai-selector-extension/
├── apps/
│   ├── extension/          # Chrome Extension (React, Vite, Manifest V3, Zustand)
│   └── cli/                # Node.js CLI & Local Agent Server (Commander.js)
├── packages/
│   ├── engine/             # AST parsing (ts-morph), code generation, patch preview
│   ├── ai-core/            # AI API abstraction layer, confidence scoring logic
│   ├── shared/             # Shared TS types, WebSocket event contracts
│   ├── framework-adapters/ # Playwright & Cypress plugin adapters
│   └── ui-kit/             # Reusable UI components (Tailwind, React)
├── package.json            # Turborepo root
└── turbo.json
```

## 3. Backend Design (Local Agent)
The Local Agent serves as the local "backend".
- **Server**: Express + Socket.IO or `ws`.
- **Ports**: Runs on a dynamic/standard local port.
- **Responsibilities**: 
  - Manage WebSocket connections from the Chrome Extension.
  - Invoke `ts-morph` to analyze file structures and ASTs.
  - Proxy requests to OpenAI/Claude securely using local `.env` keys.
  - Expose a diff patch preview and handle file mutation safely.

## 4. Frontend Design
- **Extension Content Script**: Injected into the host page. Uses a Shadow DOM root for rendering the React Overlay UI to avoid CSS collisions with the host application.
- **State Management**: `Zustand` for lightweight, predictable state updates across the extension context.
- **Styling**: `TailwindCSS` bundled explicitly for the Shadow DOM.

## 5. Websocket Architecture
A persistent, bidirectional WebSocket connection between the extension and local agent.
- `Client -> Server`: `ELEMENT_CAPTURED`, `REQUEST_PATCH`, `APPROVE_PATCH`, `REJECT_PATCH`.
- `Server -> Client`: `SELECTOR_CANDIDATES`, `PATCH_PREVIEW`, `ERROR`, `SCAN_STATUS`.

## 6. AST Analysis Approach
- Use `ts-morph` to parse and manipulate TypeScript/JavaScript Page Object Models (POM).
- Extract class names, properties, methods, and existing selectors to avoid duplicates.
- **Code Generation**: Create new AST nodes (e.g., `PropertyDeclaration`, `MethodDeclaration`) and insert them safely into the parsed Class, then format.

## 7. Selector Scoring Algorithm
A heuristic-first approach scoring out of 100:
- `data-testid` / `data-qa`: +90
- `aria-label`: +80
- Role-based accessibility locators (e.g., `<button>`): +70
- Semantic text content: +60
- CSS classes (stable structural classes): +40
- CSS classes (dynamic/Tailwind): -30
- `nth-child` or unstable DOM paths: -50

## 8. Confidence Scoring Logic
A hybrid engine combining Heuristics + AI.
1. Evaluate heuristics. If heuristic score > 85 (e.g., clear `data-testid`), skip AI.
2. If heuristic score < 85, send HTML hierarchy snippet to the AI layer.
3. AI returns a proposed robust selector and its own confidence.
4. System computes a Final Score: `(Heuristic_Score * 0.4) + (AI_Confidence * 0.6)`.

## 9. Repository Analysis Flow
1. On `smartlocator start`, the CLI scans the workspace `package.json` for framework dependencies.
2. It identifies `tests/`, `e2e/`, or `cypress/` directories.
3. It builds an in-memory index of all Page Object classes, route correlations, and file paths.
4. A file watcher (`chokidar`) listens for file changes to incrementally update the index.

## 10. Framework Adapter Design
A plugin-based architecture for seamless framework support.
- Interface `IFrameworkAdapter` with methods: `generateLocatorCode(selector)`, `generateActionMethod(selector, action)`.
- **PlaywrightAdapter**: Outputs `page.locator('...')` or `page.getByTestId('...')`.
- **CypressAdapter**: Outputs `cy.get('...')` or `cy.contains('...')`.

## 11. Database/Storage Strategy
- **No Cloud Database.**
- Ephemeral session state is managed in the Local Agent's RAM.
- API keys, settings, and project mappings are stored locally in `~/.smartlocator/config.json`.
- A `.smartlocator/cache/` folder per repository can store AST indexes to accelerate startup.

## 12. API Contracts
**WebSocket Payload Examples**:
```typescript
interface ElementCaptureEvent {
  type: 'ELEMENT_CAPTURED';
  payload: {
    url: string;
    tagName: string;
    attributes: Record<string, string>;
    hierarchy: DOMNodeContext[]; // parents/siblings
  }
}

interface SelectorResponseEvent {
  type: 'SELECTOR_CANDIDATES';
  payload: {
    primary: SelectorCandidate;
    fallbacks: SelectorCandidate[];
    targetFileRecommendation: string;
  }
}
```

## 13. Event Flow Diagrams
1. User presses `ALT + C` and clicks an element.
2. Content Script captures DOM context -> emits `ELEMENT_CAPTURED` via WS.
3. Local Agent routes request to Intelligence Engine.
4. Engine processes heuristics + AI fallback.
5. Engine maps context to a target POM file using the Repository Index.
6. Engine replies with `SELECTOR_CANDIDATES`.
7. Overlay UI renders the candidates and target file.
8. User selects candidate and clicks "Generate Code".
9. Local Agent generates AST patch -> emits `PATCH_PREVIEW`.
10. UI shows Git-style diff. User Approves -> Local Agent commits changes to disk.

## 14. State Management Design
**Extension (Zustand)**:
- Stores `connectionStatus`, `currentElementContext`, `candidates`, `patchDiff`, and `overlayVisibility`.

**Local Agent**:
- Runs as a stateless request handler.
- Reads/writes to the singleton `RepositoryIndex` service.

## 15. Security Architecture
- **Strict Local-First Design**: Codebase analysis never leaves the local machine.
- LLM API calls are restricted to sending only the HTML snippet hierarchy of the captured element, not surrounding business logic or source code files.
- File mutations require explicit `APPROVE_PATCH` signals from the user.

## 16. Error Handling Strategy
- **Graceful Degradation**: If the AI model times out or fails, the system immediately falls back to the best heuristic selector available.
- WebSocket automatically reconnects with exponential backoff.
- AST patches are staged in-memory; file writes use atomic operations.

## 17. Logging Strategy
- Local CLI uses standard logging to `~/.smartlocator/logs.log`.
- Log levels support `debug` for payload inspection, `info` for generation milestones, and `error` for AST manipulation errors.

## 18. Future Scalability Strategy
- The Engine and AI modules are decoupled so they can easily be extracted into an Enterprise Central Server if centralized telemetry or fine-tuned company-specific LLMs are required later.
- The `IFrameworkAdapter` ensures easy future additions for Selenium, WebdriverIO, or Appium.

## 19. Plugin Architecture
Support for a `smartlocator.config.ts` in the target repository where automation engineers can define custom locator rules (e.g., favoring a proprietary `data-automation-id` attribute).

## 20. MVP Implementation Plan

**Phase 1: Foundation (Weeks 1-2)**
- Setup Turborepo monorepo and toolchain.
- Build Local Agent CLI (`smartlocator start`) and WebSocket infrastructure.
- Build Chrome Extension Manifest V3 skeleton with `ALT + C` element capture logic.

**Phase 2: Intelligence Engine (Weeks 3-4)**
- Implement local Heuristic scoring algorithm.
- Integrate AI API (OpenAI/Claude) abstraction layer for fallback selector generation.
- Develop the Extension Overlay UI (React/Tailwind in Shadow DOM).

**Phase 3: Repository Analysis & Generation (Weeks 5-6)**
- Implement `ts-morph` AST parser and Repository Analyzer.
- Build Playwright and Cypress `IFrameworkAdapter` implementations.
- Develop the intelligent target mapping engine and Code Generation logic.

**Phase 4: Diff Preview & Polish (Weeks 7-8)**
- Implement Diff / Patch preview logic with approve/reject/rollback flows.
- Perform end-to-end testing against enterprise sample repositories.
- Security audit and performance optimization (< 2s response times).
