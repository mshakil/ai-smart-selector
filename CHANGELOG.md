# Changelog

All notable changes to SmartLocator AI are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) — [Semantic Versioning](https://semver.org/).

---

## [0.1.4] - 2026-05-14

### Added
- `/release` and `/docs-sync` Claude Code slash commands for automated release workflow and documentation sync
- `@changelog` and `@test-stub` Claude Code agents for generating changelogs and Playwright/Cypress test stubs after POM patches

---

## [0.1.3] - 2026-05-14

### Security
- WebSocket server now rejects connections from non-`chrome-extension://` origins, blocking other local processes from connecting to the agent
- Target file paths are validated against the repository root before any read or write, blocking path traversal attempts
- AI requests now cancel the underlying HTTP connection when the 1.5 s timeout fires, eliminating in-flight promise leaks
- Patch IDs now use `crypto.randomUUID()` instead of `Math.random()`, making them suitable as capability tokens

---

## [0.1.2] - 2026-05-14

### Added
- POM patches now insert both a locator property and an action method together in a single step

### Changed
- [extension] Overlay redesigned as an intuitive 3-step flow: Select selector → Configure element name and action type → Preview and apply
- CI `publish` job now requires `validate` to pass first, preventing broken builds from reaching npm

### Fixed
- [extension] Apply and Undo actions no longer fail silently when Chrome suspends the service worker between preview and apply
- [engine] Code generator now detects whether a POM uses property-style or constructor-style locators and matches the existing convention
- [extension] Preview Changes button now correctly enables after selecting a target file
- npm publish now triggers correctly on direct pushes to master (previously only fired on PR merge)

---

## [0.1.1] - 2026-05-13

Initial npm release. See [README](./README.md) for setup and usage.
