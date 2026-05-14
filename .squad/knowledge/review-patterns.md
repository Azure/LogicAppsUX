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
  2. Tick exactly one `Commit Type` and exactly one `Risk Level` checkbox.
  3. Apply the matching repo label (`risk:low` / `risk:medium` / `risk:high`) in the same `gh pr edit` call.
  4. Include a literal `## Contributors` section listing `@user` mentions — a trailing `Co-authored-by:` git trailer alone does NOT satisfy this requirement.
  5. Tick the Test Plan boxes that actually apply; cite CI run IDs and per-shard wall-times when CI evidence exists.
  6. Remove `needs-pr-update` in the same edit operation.
  7. Wait ~5-7 minutes for the bot to re-validate and verify all sections show ✅ before declaring the body work complete.
- Source: PR #9164 `AI PR Validation` bot comments at `#issuecomment-...`; `.github/workflows/pr-ai-validation.yml`; `.github/pull_request_template.md`.
- Applies to: `release-scribe`, `pr-orchestrator`, `chief-engineer`, `pr-comment-triage`.
- Status: verified.
