---
name: verify-pr
description: >
  Verify PR readiness before requesting review or merging. Checks title format, description
  compliance with the team template, risk label alignment, review thread resolution, CI status,
  coverage report, and screenshot requirements. Reasons about each review comment to help the
  engineer understand what's being asked and decide how to respond — rather than auto-fixing blindly.
---

# Verify PR Skill

Use this skill when an engineer asks to "check my PR", "is this ready for review", "verify PR",
or before requesting reviewers. It provides a structured assessment that the engineer acts on.

## Repository Context

LogicAppsUX is a pnpm + turbo monorepo with this structure:
- `libs/` — shared libraries (designer, designer-ui, data-mapper-v2, logic-apps-shared, etc.)
- `apps/` — applications (vs-code-designer, vs-code-react, Standalone, iframe-app)
- `e2e/` — end-to-end tests
- `.squad/` — agent squad configuration, playbooks, knowledge

Build and test commands use turbo:
- `pnpm turbo run build` — full build
- `pnpm turbo run test:lib` — unit tests
- `pnpm turbo run lint` — linting

## What This Skill Checks

### 1. Title Format

The PR title must start with one of: `feat:`, `fix:`, `chore:`, `refactor:`, `perf:`, `docs:`, `test:` — with an optional scope in parentheses.

Good: `feat(designer): add conditional action branching`
Good: `fix(data-mapper): resolve schema loading for nested arrays`
Good: `chore(ci): update pnpm lock workflow`
Good: `fix: resolve token picker overflow in dark theme`
Bad: `Update API endpoint` (too vague, no prefix)
Bad: `[WIP] working on stuff` (no prefix, not descriptive)

### 2. Description Template

The PR body must include these sections with real content (not just placeholders):

| Section | Required? | What to check |
|---------|-----------|---------------|
| Commit Type | Yes | At least one `[x]` selected (feat, fix, refactor, perf, docs, test, chore) |
| Risk Level | Yes | Exactly one `[x]` selected. Must match `risk:*` label. |
| What & Why | Yes | >50 chars of actual content explaining the change |
| Impact of Change | Yes | At least one of Users/Developers/System has content |
| Test Plan | For code PRs | At least one testing approach selected. If unit/e2e checked, verify tests exist in the diff. |
| Screenshots/Videos | For UI changes | Required when PR changes `libs/designer-ui/src/` or `libs/designer/src/` (non-test files) |
| Contributors | Optional | Nudge if blank — remind to credit PMs/designers |

### 3. Risk Label

- PR must have exactly one label matching `risk:low`, `risk:medium`, or `risk:high`
- The label must match what's selected in the Risk Level section
- Estimate what the risk SHOULD be based on the diff:
  - **High**: security/auth changes, breaking API changes, credential handling, `libs/logic-apps-shared` core utilities that many packages depend on
  - **Medium**: `libs/logic-apps-shared` (shared across monorepo), `apps/vs-code-designer` (extension distribution), state management changes, new dependencies, CI/infra, multi-package changes
  - **Low**: docs, tests only, single-component UI fixes, config changes, generated files, `libs/designer-ui` cosmetic changes
- If declared risk is lower than estimated, flag it clearly

### 4. Review Threads

For each unresolved review thread:

1. **Read the comment carefully** — understand what the reviewer is actually asking
2. **Classify it**:
   - **Blocking bug** — reviewer found a real issue that must be fixed
   - **Design question** — reviewer wants clarification on approach
   - **Suggestion** — reviewer proposes an improvement, not required
   - **Nit** — style/naming preference, non-blocking
   - **Outdated** — the code has changed since the comment was made
3. **Explain to the engineer** what the reviewer wants and why
4. **Suggest a response** — but let the engineer decide:
   - For bugs: "This needs a fix — here's what to change: ..."
   - For questions: "The reviewer is asking about X. You could respond with: ..."
   - For suggestions: "This is optional. The tradeoff is ... You can accept or explain why not."
   - For outdated: "This was about old code. Verify it's fixed, then resolve."

**Do NOT auto-fix or auto-resolve.** The engineer should understand each comment and make an informed decision.

### 5. CI Status

Check all CI check runs:
- List any failures with the job name and a brief explanation of what likely failed
- For passing checks, just confirm "all green"
- If PR desc check failed, explain which sections need updating
- **Cross-reference with ci-sentinel:** If CI failures are complex or flaky, recommend invoking `@ci-sentinel` for deeper diagnosis with log analysis

### 6. Coverage Report

- Check if the `pr-coverage.yml` workflow has posted its comment (look for the coverage report comment)
- If coverage decreased, flag it and identify which changed files lack test coverage
- If coverage report is not yet posted, note it as pending
- Do NOT duplicate what pr-coverage already reports — just reference it as part of readiness

### 7. Merge Readiness

After checking everything, give a clear verdict:

```
## PR Readiness: [READY / NOT READY / NEEDS ATTENTION]

Title: fix(designer): resolve token picker overflow
Description: all sections filled
Risk: medium (declared) matches medium (estimated — touches libs/designer/)
Label: risk:medium present
CI: 14/14 checks green
Coverage: pr-coverage reports 87% on changed files (above threshold)
Review threads: 3 unresolved (1 blocking, 1 question, 1 nit)
Screenshots: provided (before/after token picker)

### Unresolved Threads

#### Thread 1 — Blocking (libs/designer-ui/src/tokenPicker/index.tsx:147)
**Reviewer says:** "This overflow fix might clip the dropdown in narrow panels. Have you tested in the VS Code webview?"
**What this means:** The reviewer is concerned about a different host environment where the panel may be narrower.
**Suggested action:** Test in the VS Code extension (Standalone host may be wider). If confirmed working, reply with a screenshot from VS Code.

#### Thread 2 — Question (libs/designer/src/core/state/tokens/tokenSlice.ts:22)
**Reviewer says:** "Why not use the existing selectTokensByNodeId selector?"
**What this means:** The reviewer wants to understand the design choice.
**Suggested response:** "selectTokensByNodeId returns all token types. This PR needs only expression tokens for the overflow fix, so a new selector avoids re-renders from unrelated token updates."

#### Thread 3 — Nit (libs/designer-ui/src/tokenPicker/styles.ts:88)
**Reviewer says:** "Consider using tokens.spacingHorizontalM instead of 12px"
**What this means:** Minor style preference to use Fluent design tokens instead of hardcoded pixels.
**Suggested action:** Accept — using tokens is the project convention. Or respond "Kept as px because this needs to match a fixed-size icon."
```

## Cross-References with Existing Agents

- **ci-sentinel:** For complex CI failures, recommend the engineer invoke ci-sentinel for log-level diagnosis
- **customer-repro-tester:** For bug-fix PRs, check if there's a linked customer issue. If so, recommend asking customer-repro-tester to validate the fix against the original repro steps
- **pr-orchestrator:** This skill feeds INTO pr-orchestrator's lifecycle — verify-pr checks readiness, pr-orchestrator manages the full PR flow
- **release-scribe:** If the PR body needs rewriting, reference release-scribe's conventions

## How to Invoke

Engineers can use this skill in Copilot Chat:
- "Load verify-pr and check my PR"
- "Is PR #4521 ready for review?"
- "What do I need to fix before merging?"

The skill works with the current branch's PR automatically, or with a specific PR number.

## Continuous Monitoring

Once invoked, the skill should **keep monitoring until the PR is fully green**:

1. Run the initial verification (title, body, labels, threads, CI, coverage)
2. Report findings to the engineer
3. After the engineer makes changes (commits, edits description, responds to threads):
   - Re-check what's changed
   - Report updated status: "2 of 3 issues resolved. Remaining: ..."
4. Repeat until ALL of these are true:
   - Title matches prefix format
   - Description passes all template sections
   - Risk label present and matches body + estimated risk
   - All review threads resolved (or classified as non-blocking with response)
   - CI checks all green
   - pr-coverage report posted and above threshold
   - Screenshots present (if UI changes detected in libs/designer-ui or libs/designer)
5. Then report: "**PR is ready for review/merge.** All checks pass."

The monitoring loop should feel like a helpful co-pilot sitting next to the engineer, not a nagging bot. After each check:
- Only report what CHANGED since last check
- Celebrate progress ("Risk level fixed — 2 items remaining")
- If the engineer asks to stop monitoring: stop immediately

## Important

- **Never auto-fix code** — explain what needs to change and let the engineer decide
- **Never auto-resolve threads** — help the engineer understand what to respond
- **Always explain WHY** a comment was made, not just WHAT to do
- **Distinguish blocking from non-blocking** — engineers should know what MUST be fixed vs what's optional
- **Check the diff** — verify review comments are still relevant to the current code
- **Respect pr-coverage** — don't duplicate its analysis; reference its comment as authoritative for coverage data
