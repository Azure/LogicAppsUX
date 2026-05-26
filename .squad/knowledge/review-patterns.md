# Review Patterns

Curated patterns for PR comments, reviewer feedback, and final summaries. Add entries through `session-knowledge-curator`.

## Current Patterns

### Track every actionable comment to closure

- Learning: PR comment triage should map each actionable review thread to a concrete fix, validation evidence, and final summary response. GitHub thread resolution may remain manual even when code changes address the comment.
- Why it matters: It separates implementation completeness from GitHub UI thread state and produces reviewer-ready summaries.
- Source: Current session PR comment resolution workflow.
- Applies to: `pr-comment-triage`, `release-scribe`, `chief-engineer`.
- Status: verified.

### Scope-deferred reviewer suggestions need an explicit rationale reply

- Learning: When declining a reviewer suggestion (e.g., "extract these helpers into the shared module"), reply on the thread with the scope rationale (broadening the PR, requiring additional phase coverage, risking other suites) and confirm the in-scope fix that was applied. Do not silently skip a non-blocking suggestion.
- Why it matters: PR #9161 closed a reviewer thread about helper extraction by accepting the in-scope flakiness fix and explicitly deferring the cross-suite refactor with rationale. This kept the PR focused while leaving an auditable trail for the suggestion.
- Source: Azure/LogicAppsUX#9161 helper-extraction review thread.
- Applies to: `pr-comment-triage`, `release-scribe`, `pr-orchestrator`, `chief-engineer`.
- Status: verified.

### PR body must conform to .github/pull_request_template.md or AI PR Validation fails

- Learning: Opening a PR on `Azure/LogicAppsUX` with a freeform description (no template checkboxes ticked, no `## Contributors` section, no matching `risk:<level>` label) makes the `AI PR Validation` workflow (`pr-ai-validation.yml`) post a `github-actions` bot comment flagging missing sections and apply the `needs-pr-update` label. The PR cannot pass validation until the body satisfies the template AND the matching `risk:<level>` label is applied AND the `needs-pr-update` label is removed.
- Why it matters: PR #9164 hit this on initial open — the `release-scribe`-style PR body shipped without ticking Commit Type, Risk Level, or Test Plan E2E boxes and without a `## Contributors` section, so AI PR Validation flagged 3 sections ❌ + 2 ⚠️. Rewriting the body to match `.github/pull_request_template.md` and applying `risk:medium` cleared all 8 sections to ✅. The bot re-runs on `pull_request_target.types: [edited, labeled, unlabeled]` so a single `gh pr edit --body-file ... --add-label risk:<level> --remove-label needs-pr-update` triggers a fresh validation pass.
- Pattern (release-scribe and pr-orchestrator):
  1. Read `.github/pull_request_template.md` before authoring any PR body — do NOT improvise sections.
  2. Tick exactly one `Commit Type` and exactly one `Risk Level` checkbox. The PR title prefix (`fix:`, `feat:`, `perf:`, `test:`, `ci:`, `docs:`, `chore:`) must match the single ticked commit type.
  3. Apply the matching repo label (`risk:low` / `risk:medium` / `risk:high`) in the same `gh pr edit` call.
  4. Include a literal `## Contributors` section listing `@user` mentions — a trailing `Co-authored-by:` git trailer alone does NOT satisfy this requirement.
  5. Tick the Test Plan boxes that actually apply. If the diff adds a `*.spec.ts(x)` file under a test folder, "Unit tests added/updated" must be ticked. Cite CI run IDs and per-shard wall-times when CI evidence exists.
  6. Remove `needs-pr-update` in the same edit operation.
  7. Wait ~5-7 minutes for the bot to re-validate and verify all sections show ✅ before declaring the body work complete.
- Source: PR #9164 AI PR Validation bot iterations; `.github/workflows/pr-ai-validation.yml`; `.github/pull_request_template.md`.
- Applies to: `release-scribe`, `pr-orchestrator`, `chief-engineer`, `pr-comment-triage`.
- Status: verified.

## Triggers → use this file

- PR comment triage, reviewer feedback, GitHub thread resolution
- PR body authoring, `.github/pull_request_template.md`, AI PR Validation
- `risk:<level>` labels, `needs-pr-update`, `Contributors` section
- Test Plan checkboxes vs actual diff, Commit Type vs title prefix

### AI PR Validation 500s are external unless the report names body defects

- Learning: If `validate-pr` fails with `API request failed with status 500`, inspect the failed log before editing the PR. If no validation report identifies body/title/test-plan defects, treat the first failure as a service-side retry case.
- Why it matters: During #9164 collapse, `validate-pr` returned HTTP 500 three times even though labels/body were structurally correct. A shorter body re-triggered validation and passed, but the failure mode was an API error, not a code/check regression.
- Pattern: capture run/job IDs and the 500 log line, rerun failed jobs with backoff, avoid weakening labels/checks, and only edit the body if the bot report or repeated service failure suggests the body may be triggering the service.
- Source: Azure/LogicAppsUX#9164 `validate-pr` run `26108962474` failed with HTTP 500; run `26111149301` passed after body simplification.
- Applies to: `release-scribe`, `pr-orchestrator`, `ci-sentinel`, `chief-engineer`.
- Status: verified.

### Superseded side PRs should be closed only after integration CI is green

- Learning: When side PRs are collapsed into an integration PR, leave them open until the integration PR contains their heads and has fresh green checks. Then close each side PR with a comment pointing to the integrated head and validation evidence.
- Why it matters: #9175/#9178/#9179/#9180/#9181 had stale labels/checks as independent PRs, but closing them before #9164's collapsed head was green would have made recovery and reviewer traceability harder.
- Source: Azure/LogicAppsUX#9164 collapsed head `4b68281a`; final status comment `#issuecomment-4489982690`; side PR close comments.
- Applies to: `pr-orchestrator`, `release-scribe`, `chief-engineer`.
- Status: verified.
