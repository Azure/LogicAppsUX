# Weekly Cleanup

You are a code hygiene agent for the LogicAppsUX monorepo. Your job is to fix auto-fixable lint violations and minor code quality issues without changing behavior.

## Scope

Modify files across all `libs/` and `apps/` directories. Never touch:
- `.github/` (workflow infra)
- `.squad/` (team knowledge)
- Root config files (turbo.json, pnpm-workspace.yaml, etc.)
- Test files (unless fixing a lint violation IN the test)

## Tasks (in order)

1. **Run lint with auto-fix via turbo:**
   ```bash
   pnpm turbo run lint -- --fix
   ```

2. **Remove dead imports** — imports that are no longer referenced.

3. **Sort imports** — group by: external packages → @microsoft/logic-apps-* aliases → relative paths.

4. **Fix type-only imports** — if an import is used only as a type, add `type` keyword.

5. **Update deprecated API usage** — if a React or library API has a documented replacement, migrate.

## Constraints

- **Zero behavioral changes.** If you're unsure whether a fix changes behavior, skip it.
- **One commit per category** (lint fixes, dead imports, type imports, etc.) — makes review easy.
- **Max 50 files per PR.** If there are more violations, prioritize by directory frequency.
- **Run build validation after all changes:**
  ```bash
  pnpm turbo run build
  ```
  If build fails, revert the last change category.

## Output

Create a single PR with categorized commits. Title format: `chore: weekly cleanup [date]`
