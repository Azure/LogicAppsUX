# E2E Shape × Test Coverage Audit

Triggers: vscode e2e coverage, workspace shape audit, downstream test fixtures, runtime smoke matrix

Last updated: 2026-05-15
Source: PR #9164 follow-up plan (sub-15min CI restructuring), Step 0

## Workspace shape inventory

From `createWorkspace.test.ts:95` (`appType`) × line 97 (`wfType`):

| App type      | Workflow type            | Created today | Runtime-debug today        | Future runtime-debug needed |
|---------------|--------------------------|---------------|----------------------------|-----------------------------|
| standard      | Stateful                 | ✅ (line 4335) | ✅ Phase 4.2 (p42-standard)  | ✅ (keep) |
| standard      | Stateless                | ✅ (line 4550) | ❌ (rule 3: no run history)  | ❌ wizard-only |
| standard      | Autonomous agents        | ✅ (line 4622) | ❌                          | ❌ wizard-only |
| standard      | Conversational agents    | ✅ (line 4694) | ❌                          | ❌ wizard-only |
| customCode    | Stateful                 | ✅ (line 4474) | ✅ Phase 4.2 (inline test 2) | ✅ (Step 2: extract as `p42-customcode`) |
| customCode    | Stateless                | ✅ (line 4956) | ❌                          | ❌ wizard-only |
| customCode    | Autonomous agents        | ✅ (line 5031) | ❌                          | ❌ wizard-only |
| customCode    | Conversational agents    | ✅ (line 5106) | ❌                          | ❌ wizard-only |
| rulesEngine   | **Stateful**             | ✅ (line 4874) | ❌ **gap**                   | ✅ **NEW shard** (Step 2: `p42-rulesengine`, `p43-rulesengine`) |
| rulesEngine   | Stateless                | ✅ (line 5229) | ❌ (rule 3)                  | ❌ wizard-only |
| rulesEngine   | Autonomous agents        | ✅ (line 5351) | ❌                          | ❌ wizard-only |
| rulesEngine   | Conversational agents    | ✅ (line 5473) | ❌                          | ❌ wizard-only |
| codeful       | Stateful                 | ✅ (line 4168) | Phase 4.10 (separate)       | ✅ keep separate |
| codeful legacy| — (CLI fixture)          | ✅ (Phase 4.8b builds via Logic Apps Tools CLI) | Phase 4.8d (conversion) | ✅ keep separate |

**Wizard creation coverage**: complete — all 13 product matrix combinations (3 appType × 4 wfType for non-codeful, plus codeful/Stateful) are produced by `createWorkspace.test.ts`. The previous draft of this audit claimed `rulesEngine/Stateful` was missing; that was incorrect — it lives at lines 4874-4887 and is appended to the manifest.

**Runtime-debug coverage gap**: only `standard/Stateful` and `customCode/Stateful` exercise the run-trigger / debug path today. `rulesEngine/Stateful` is created but never run-tested. Step 2 closes this by adding `p42-rulesengine` and `p43-rulesengine` scenarios sharing a `rulesEngine/Stateful` manifest entry.

## Per-scenario shape consumption (in `scenarios[]` at run-e2e.js:866-963)

Map every scenario to the workspace shape(s) it opens:

| Scenario | `workspaceSpec` (verbatim from run-e2e.js) | Shape consumed | Runtime smoke? |
|---|---|---|---|
| p40-nonlogicapp | `'plain-folder'` (L871) | — (no resources) | no |
| p41-createworkspace | `'self-creates'` (L886) | creates all 13 shapes | n/a (it IS the wizard test) |
| p42-standard | `{ appType: 'standard', wfType: 'Stateful' }` (L896) | standard/Stateful | ✅ existing |
| p42-customcode (NEW Step 2) | `{ appType: 'customCode', wfType: 'Stateful' }` | customCode/Stateful | ✅ already inline test 2 → split out |
| p42-rulesengine (NEW Step 2) | `{ appType: 'rulesEngine', wfType: 'Stateful' }` | rulesEngine/Stateful | ✅ **NEW shard** |
| p43-inlinejavascript | `{ appType: 'standard', wfType: 'Stateful' }` (L904) | standard/Stateful | ✅ existing |
| p43-customcode (NEW Step 2) | `{ appType: 'customCode', wfType: 'Stateful' }` | customCode/Stateful | ✅ **NEW shard** |
| p43-rulesengine (NEW Step 2) | `{ appType: 'rulesEngine', wfType: 'Stateful' }` | rulesEngine/Stateful | ✅ **NEW shard** |
| p44-statelessvariables | `{ appType: 'standard', wfType: 'Stateful' }` (L910) | standard/Stateful | designer feature, shape-agnostic |
| p45-designerviewextended | `{ appType: 'standard', wfType: 'Stateful' }` (L916) | standard/Stateful | designer feature |
| p46-keyboardnav | `{ appType: 'standard', wfType: 'Stateful', use: 'p41-createworkspace' }` (L922) | standard/Stateful (reused from p41 session) | UI test, shape-agnostic |
| p47-suite | `'manifest-multi'` (L932) | manifest preferred entry = standard/Stateful; tests walk full manifest | data mapper requires data-map file |
| p48a-conversionno | `{ appType: 'standard', wfType: 'Stateful', use: 'wsDir' }` (L941) | manifest entry's `wsDir` (workspace folder, not `.code-workspace`) | conversion |
| p48b-conversioncreate | `'self-contained'` (L877) | builds own legacy fixture via `createLegacyProjectFixture()` | independent |
| p48c-multipledesigners | `'manifest-multi'` (L947) | multi-shape | designer reload |
| p48d-conversionyes | `{ appType: 'standard', wfType: 'Stateful', use: 'wsDir' }` (L953) | manifest entry's `wsDir` | conversion (R1-R9 hardening from PR #9164); `allowFailure: true` (xvfb-flaky) |
| p48e-conversionsubfolder | `{ appType: 'standard', wfType: 'Stateful', use: 'appDir' }` (L960) | manifest entry's `appDir` (app subfolder) | conversion |

`workspaceSpec` resolution lives in `selectWorkspaceForSpec()` at `run-e2e.js:1427-1480`:

- `'plain-folder' | 'self-creates'` → `resources: []`
- `'self-contained'` → builds legacy fixture via `createLegacyProjectFixture()` and exports `LA_E2E_LEGACY_PROJECT_DIR`
- `'manifest-multi'` → preferred standard/Stateful `wsFilePath` (test reads manifest at runtime for the rest)
- `{ appType, wfType, use? }` → manifest match; `use: 'wsDir' | 'appDir'` swaps the returned path key, default is `wsFilePath`

Conversion scenarios use `standard/Stateful` workspace dirs as their *input* (the wizard-produced project is what gets converted/refreshed); they do not require a legacy-shaped wizard output.

## Required runtime fixtures for Step 2

The new `createWorkspace.fixtures.test.ts` (Step 2) must produce at minimum the manifest entries consumed downstream:

| Shape                    | Used by                                                                  |
|--------------------------|--------------------------------------------------------------------------|
| standard/Stateful        | p42-standard, p43-inlinejavascript, p44, p45, p46, p47, p48a, p48d, p48e |
| customCode/Stateful      | p42-customcode (new), p43-customcode (new)                               |
| **rulesEngine/Stateful** | p42-rulesengine (new), p43-rulesengine (new)                             |
| manifest-multi (≥2 shapes incl. standard/Stateful) | p47-suite, p48c-multipledesigners              |
| wsDir on standard/Stateful entry | p48a-conversionno, p48d-conversionyes                            |
| appDir on standard/Stateful entry | p48e-conversionsubfolder                                        |

Net distinct manifest entries required for downstream runtime tests: **3** (`standard/Stateful`, `customCode/Stateful`, `rulesEngine/Stateful`) plus the legacy fixture built inline by p48b. The remaining 10 wizard combinations (all Stateless / Autonomous / Conversational variants × 3 appTypes, plus codeful) are wizard-only — created and asserted by p41-createworkspace, never reopened. Today’s p41-createworkspace already covers them; Step 2 keeps them in `createWorkspace.test.ts` and extracts only the 3 runtime-needed shapes into the fixtures file.

## Constraints (binding)

- **D-001** (see `.squad/decisions.md`): fixtures must come from the wizard, not synthesized.
- **SKILL.md rule 3**: Stateless workflows don't persist run history → no `clickRunTrigger` validation.
- **SKILL.md rule 5**: each E2E test gets its own VS Code session.

## Other CI gates — parallelism verification

Verified against the most recent `e2e-optimizations` PR push, head SHA `922aec9707c90635fcd9459bcb23a8ef0fdb6ea8` (workflows triggered 2026-05-15 17:37:51-17:37:53 UTC, all in parallel):

| Workflow                          | Run ID       | Started (UTC) | Completed (UTC) | Wall (min) |
|-----------------------------------|--------------|---------------|-----------------|------------|
| PR AI Validation                  | 25932242915  | 17:37:51      | 17:38:57        | ~1         |
| Check AI Docs Freshness           | 25932244985  | 17:37:53      | 17:38:22        | <1         |
| PR Coverage Check                 | 25932244828  | 17:37:53      | 17:40:19        | ~2         |
| CodeQL                            | 25932244875  | 17:37:53      | 17:40:58        | ~3         |
| Test Runner                       | 25932244873  | 17:37:53      | 17:42:14        | ~4         |
| Playwright Tests (designer-e2e)   | 25932244876  | 17:37:53      | 17:43:49        | ~6         |
| **VS Code Extension E2E Tests**   | 25932244915  | 17:37:53      | 18:07:52        | ~30        |

Findings:

- All gates start within a ~2-second window — GitHub Actions launches them as independent workflow runs in parallel, not serialized.
- Critical-path wall time of the PR is bounded by VS Code E2E (~30 min), exactly the target Step 2-onward optimization addresses. Coverage / AI / CodeQL / Test Runner / Playwright all finish in ≤6 min and contribute zero serial cost.
- `Chat Client E2E Tests` was **not** triggered for this commit (the `playwright.chatClient.config.ts` path-filtered workflow only runs when chatbot files change). Independent of vscode-e2e when it does run.
- Skipped workflows on this commit: `Auto-merge Validation`, `Deploy Documentation` (correctly skipped — `pull_request` event).

Implication for the sub-15min plan: cutting VS Code E2E wall time is the only lever; no parallelization restructuring of other gates is required.
