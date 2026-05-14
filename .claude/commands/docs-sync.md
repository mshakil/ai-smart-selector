You are executing the SmartLocator AI documentation sync workflow.

The user invoked `/docs-sync $ARGUMENTS`.

Your job is to compare what the code currently does against what CLAUDE.md and README.md say, find the gaps, and make surgical edits to close them. Never rewrite whole sections — one focused edit per logical change.

---

## Step 1 — Determine the base ref

- If `$ARGUMENTS` is non-empty, use it as the base ref (e.g., `v0.1.2`, a commit SHA, or a branch name).
- Otherwise run `git describe --tags --abbrev=0` to get the most recent tag. If no tags exist, use `git log --oneline | tail -1` to get the first commit.

Print: "Diffing from <base-ref> to HEAD..."

---

## Step 2 — Get the list of changed files

Run:
```
git diff <base-ref>..HEAD --name-only
```

Group the output by subsystem using this map:

| Path prefix | CLAUDE.md section |
|---|---|
| `packages/engine/src/analyzer/` | Repository analyzer |
| `packages/engine/src/generator/` | Repository analyzer (generator subsection) |
| `packages/engine/src/patch/` | Repository analyzer (patch-manager) |
| `packages/engine/src/config/` | Plugin Architecture |
| `packages/engine/src/mapper/` | Repository analyzer (page-mapper) |
| `packages/engine/src/` (other) | Repository analyzer |
| `packages/ai-core/src/` | Selector scoring / Confidence formula |
| `packages/framework-adapters/src/` | Framework adapters |
| `packages/shared/src/events/` | WebSocket events |
| `packages/shared/src/` (other) | Key Conventions |
| `apps/cli/src/server/` | CLI agent |
| `apps/cli/src/commands/` | Commands section |
| `apps/cli/src/` (other) | CLI agent |
| `apps/extension/src/background/` | Extension (background SW) |
| `apps/extension/src/content/` | Extension (content script) |
| `apps/extension/src/overlay/` | Extension (overlay) |
| `apps/extension/src/` (other) | Extension |
| `.github/workflows/` | CI/CD |
| `scripts/` | Publishing |

If no source files changed (e.g., only docs changed), print "No source changes since <base-ref>. CLAUDE.md is already in sync." and stop.

Print the grouped list of changed files before proceeding.

---

## Step 3 — Read current state

For each affected CLAUDE.md section:

1. Read the **actual source files** that changed (use the Read tool — not just the diff). You need to understand the current behavior, not just what changed.
2. Read the **corresponding section** of `CLAUDE.md` to understand what it currently says.

Focus on:
- **New files** that exist in code but aren't mentioned in docs
- **Removed or renamed files/functions** that are still mentioned in docs
- **Changed signatures, parameters, constants, or behavior** that contradict the docs
- **New security or performance patterns** not documented

---

## Step 4 — Edit CLAUDE.md

Use the Edit tool to make targeted replacements. Rules:
- **One edit per logical change** — don't bundle unrelated changes into a single Edit call
- **Never rewrite a whole section** — replace the specific line(s) that are stale
- **Preserve voice and style** — CLAUDE.md uses bullet points and inline code, keep that consistent
- **Add new file entries** in the same format as existing ones (e.g., `- \`analyzer/new-file.ts\` — brief description`)
- **Remove entries** for files that no longer exist

After all edits, re-read the affected sections to verify they read correctly.

---

## Step 5 — Check README.md

Only update README.md if the corresponding source changed:

| Changed source | README.md section to check |
|---|---|
| `apps/cli/src/server/agent.ts` or `apps/cli/src/config.ts` or `apps/cli/src/server/handlers/request-patch.ts` | Security section |
| `packages/ai-core/src/scoring/heuristic.ts` | Selector Scoring table |
| `packages/framework-adapters/src/` | Framework Support table |
| `apps/cli/src/commands/` | Commands section |
| `apps/cli/src/logger.ts` | Commands section (debug flag docs) |
| `apps/cli/src/server/repository.ts` | Commands section |

Apply the same rules as Step 4: surgical edits only, preserve style.

---

## Step 6 — Commit

Stage only the files that were actually edited — never stage a file you did not modify:
```
git add CLAUDE.md      # only if CLAUDE.md was edited in Steps 3–4
git add README.md      # only if README.md was edited in Step 5
```

If at least one file was staged, commit:
```
git commit -m "docs: sync CLAUDE.md and README.md with <base-ref>..HEAD changes"
```

Print a summary:
```
Docs synced
  Base ref:          <base-ref>
  Sections updated:  <list>
  Files committed:   <exact list of staged files, or "none">
```

If no edits were needed in either file, print "CLAUDE.md and README.md are already in sync with the code." and do not create an empty commit.
