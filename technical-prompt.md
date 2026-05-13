You are a Senior Staff Engineer, Solution Architect, QA Automation Architect, Browser Extension Expert, and AI Product Engineer.

Your task is to design and implement a production-grade MVP called SmartLocator AI.

# Product Overview

SmartLocator AI is an AI-assisted locator intelligence platform for test automation engineers.

The product solves flaky automation selectors by:
1. Capturing web elements from browser
2. Generating robust locator strategies
3. Mapping selectors to the correct Page Object files
4. Automatically generating reusable automation code
5. Integrating directly into existing automation frameworks

This is NOT a traditional recorder tool.
This is a selector intelligence and automation architecture assistant.

The product must feel like a native extension of the automation framework.

--------------------------------------------------
# PRIMARY OBJECTIVE
--------------------------------------------------

Build a production-ready MVP architecture that includes:

1. Chrome Extension
2. Local CLI Agent
3. Repository Analyzer
4. Selector Intelligence Engine
5. Code Generator Engine
6. Patch Preview System
7. Framework Adapter System

The solution must be scalable, modular, and enterprise-ready.

--------------------------------------------------
# REQUIRED TECH STACK
--------------------------------------------------

# Frontend
- React
- TypeScript
- TailwindCSS
- Zustand OR Redux Toolkit
- Vite

# Chrome Extension
- Chrome Extension Manifest V3
- TypeScript
- Content Scripts
- Background Service Workers
- Message Passing APIs

# Local Agent / CLI
- Node.js
- TypeScript
- Commander.js OR Yargs
- WebSocket communication
- File System APIs

# Repository Analysis
- ts-morph
- Babel Parser
- AST Analysis
- TypeScript Compiler APIs

# AI Integration
- OpenAI API OR Claude API abstraction layer
- Structured prompt architecture
- Confidence scoring engine
- Heuristic-first approach before AI fallback

# Code Generation
- AST-based generation preferred
- Avoid string concatenation whenever possible
- Generate framework-safe code

# Diff / Patch Engine
- Git-style patch generation
- Safe file modifications
- Rollback support

--------------------------------------------------
# MVP FEATURES
--------------------------------------------------

Implement the following MVP features:

# 1. CLI Command

Command:
smartlocator start

Responsibilities:
- Start local agent
- Open Chrome with extension enabled
- Create session handshake
- Connect repository
- Initialize websocket communication

--------------------------------------------------
# 2. Chrome Extension

The extension must:
- Detect ALT + C hotkey
- Capture clicked element
- Generate selector candidates
- Display overlay UI
- Show confidence score
- Send metadata to local agent

The extension must capture:
- tagName
- id
- classList
- textContent
- aria-label
- role
- placeholder
- data-testid
- data-qa
- parent hierarchy
- sibling hierarchy
- iframe context
- shadow DOM context

--------------------------------------------------
# 3. Selector Intelligence Engine

The engine must generate:
- primary selector
- fallback selectors
- selector confidence score
- selector reasoning

Preferred selector priority:
1. data-testid
2. data-qa
3. aria-label
4. accessibility locators
5. role-based locators
6. semantic text locators
7. stable CSS selectors
8. XPath fallback

The engine must:
- avoid nth-child selectors
- avoid dynamic classes
- avoid unstable DOM paths
- identify brittle selectors
- detect duplicate selectors

--------------------------------------------------
# 4. Repository Analyzer

The analyzer must:
- detect automation framework
- detect project architecture
- detect naming conventions
- identify Page Object classes
- identify component structures
- scan routes and file structures

Support initial frameworks:
- Playwright
- Cypress

Future-ready architecture for:
- Selenium
- Selenide
- WebdriverIO

--------------------------------------------------
# 5. Intelligent Page Mapping

The system must infer target files using:
- current URL
- route names
- class names
- folder names
- nearby selectors
- naming conventions

Example:
URL: /login
Potential targets:
- LoginPage.ts
- AuthPage.ts

The system must use confidence scoring.

If confidence < threshold:
- ask user to choose target file

--------------------------------------------------
# 6. Code Generation Engine

Generate:
- selectors
- methods
- imports
- comments
- reusable utilities

Example:

readonly loginButton =
page.getByTestId('login-button');

async clickLoginButton() {
   await this.loginButton.click();
}

The generated code must:
- follow repository conventions
- avoid duplicates
- preserve formatting
- preserve linting standards

--------------------------------------------------
# 7. Patch Preview System

The system must:
- generate patch preview
- show diff before applying
- allow approve/reject
- support rollback

Never directly mutate repository without approval.

--------------------------------------------------
# 8. Extension Overlay UI

The UI must display:
- selector candidates
- confidence score
- selector reasoning
- target Page Object
- Generate Code button
- Copy Selector button

--------------------------------------------------
# ARCHITECTURE REQUIREMENTS
--------------------------------------------------

Use modular architecture.

Suggested modules:
- packages/extension
- packages/cli
- packages/engine
- packages/shared
- packages/framework-adapters

Use monorepo structure.

Recommended:
- Turborepo OR Nx

--------------------------------------------------
# COMMUNICATION FLOW
--------------------------------------------------

Extension <-> Local Agent:
- WebSocket preferred

The extension must never directly access repository files.

--------------------------------------------------
# SECURITY REQUIREMENTS
--------------------------------------------------

- No cloud upload of repository
- All analysis local-first
- Secure websocket communication
- Explicit user approval before file mutation

--------------------------------------------------
# PERFORMANCE REQUIREMENTS
--------------------------------------------------

- Selector generation under 2 seconds
- Repository scan incremental
- Support enterprise repositories
- Avoid blocking UI thread

--------------------------------------------------
# CODE QUALITY REQUIREMENTS
--------------------------------------------------

- SOLID principles
- Clean Architecture
- Plugin-based adapters
- Testable modules
- Typed APIs
- Production-ready folder structure

--------------------------------------------------
# OUTPUT REQUIREMENTS
--------------------------------------------------

Generate:
1. Complete architecture design
2. Monorepo folder structure
3. Backend design
4. Frontend design
5. Websocket architecture
6. AST analysis approach
7. Selector scoring algorithm
8. Confidence scoring logic
9. Repository analysis flow
10. Framework adapter design
11. Database/storage strategy if needed
12. API contracts
13. Event flow diagrams
14. State management design
15. Security architecture
16. Error handling strategy
17. Logging strategy
18. Future scalability strategy
19. Plugin architecture
20. MVP implementation plan

Provide:
- technical reasoning
- implementation approach
- production considerations
- edge cases
- scalability concerns
- developer experience improvements

Do not provide vague explanations.
Provide enterprise-grade implementation details.