You are executing the SmartLocator AI release workflow.

The user invoked `/release $ARGUMENTS`.

---

## Step 1 — Parse the target version

`$ARGUMENTS` can be:
- A bare semver like `0.2.0` → use it directly
- `patch`, `minor`, or `major` → read the current version from `apps/cli/package.json` and auto-calculate the next semver
- Empty or anything else → print a usage error and stop immediately:
  ```
  Usage: /release <version>
  Examples: /release 0.2.0  |  /release patch  |  /release minor  |  /release major
  ```

To auto-calculate: split current version on `.`, increment the relevant part, reset lower parts to `0`.

---

## Step 2 — Pre-flight checks

Run each check and abort (with a clear message) if any fail:

1. **Clean working tree** — run `git status --porcelain`. If output is non-empty, print the dirty files and stop. The version bump commit must be the only change on this release.

2. **Branch warning** — run `git branch --show-current`. If not `dev`, print a yellow warning but continue: "Warning: releasing from branch '<name>' rather than dev."

3. **Lint** — run `pnpm run lint`. Abort on non-zero exit.

4. **Tests** — run `pnpm run test`. Abort on non-zero exit.

Print a green "Pre-flight passed." before continuing.

---

## Step 3 — Bump version

Run:
```
node scripts/bump-version.mjs <VERSION>
```

This updates 5 × `package.json` files and the `.version()` call in `apps/cli/src/index.ts`. Show the output verbatim.

---

## Step 4 — Commit the version bump

Stage only the version files — never use `git add -A`:
```
git add packages/shared/package.json
git add packages/framework-adapters/package.json
git add packages/ai-core/package.json
git add packages/engine/package.json
git add apps/cli/package.json
git add apps/cli/src/index.ts
```

Then commit:
```
git commit -m "chore: bump version to <VERSION>"
```

---

## Step 5 — Publish dry-run + confirmation gate

Run `pnpm run publish:dry-run` and show the full output.

Then **pause and ask the user**:
> "Dry-run looks good above. Type **yes** to merge to master and push (CI will publish to npm). Type **no** to stop here and stay on the current branch."

If the user says anything other than `yes`, print "Release paused. Version bump commit is on <branch>. Push to master manually when ready." and stop.

---

## Step 6 — Merge to master and push

Remember the current branch name (from Step 2).

```
git checkout master
git pull origin master
git merge <branch> --no-ff -m "chore: release v<VERSION>"
git push origin master
```

If any command fails, print the error, attempt `git checkout <branch>` to restore state, and stop.

---

## Step 7 — Return to the original branch

```
git checkout <original-branch>
```

Print a summary:
```
Released v<VERSION>
  Branch merged:   <branch> → master
  Pushed to:       origin/master
  CI publish:      GitHub Actions will publish to npm and create the GitHub Release
  Next steps:      Watch https://github.com/mshakil/ai-smart-selector/actions for the publish job
```
