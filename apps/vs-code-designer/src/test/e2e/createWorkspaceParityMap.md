# Create Workspace ExTester to @vscode/test-cli parity map

This map tracks how the latest-stable `@vscode/test-cli` Create Workspace coverage relates to the existing ExTester Create Workspace suites. The CLI suite is additive: it does not replace ExTester, and ExTester remains the canonical owner for Selenium DOM coverage and downstream `run-e2e.js` fixture phases.

## CLI labels

Single-host labels can be run directly with `pnpm run test:e2e-cli --label <label>` or their package-script aliases. Runtime-heavy lifecycle labels should be run through their package scripts because those scripts create workspaces in one VS Code host, write a manifest, then reopen the generated project in fresh hosts with the correct startup resource and environment variables.

| CLI label | Script | Purpose |
|---|---|---|
| `unitTests` | `pnpm run test:e2e-cli:smoke` | Activation, dependency hydration, command registration, empty-window startup. |
| `createWorkspace` | `pnpm run test:e2e-cli:create-workspace` | Default focused validation plus core Standard/custom-code/rules-engine creation smoke. |
| `createWorkspaceBehavior` | `pnpm run test:e2e-cli:create-workspace:behavior` | Initial render/content, field validation, review/back, workflow-type review checks, app-type cleanup. |
| `createWorkspaceCoreMatrix` | `pnpm run test:e2e-cli:create-workspace:core-matrix` | Standard/custom-code/rules-engine Stateful and Stateless generated artifact checks. |
| `createWorkspacePreviewMatrix` | `pnpm run test:e2e-cli:create-workspace:preview-matrix` | Autonomous agents and Conversational agents generated artifact checks across Standard/custom-code/rules-engine. |
| `createWorkspaceCodeful` | `pnpm run test:e2e-cli:create-workspace:codeful` | Current codeful project creation plus legacy-control `.csproj` shape simulation. |
| `createWorkspaceFixturesManifest` | `pnpm run test:e2e-cli:create-workspace:fixtures` | CLI-generated manifest compatible with `src/test/ui/workspaceManifest.ts`; focused/manual, not the ExTester fixture owner. |
| `workspaceLifecycle` | `pnpm run test:e2e-cli:workspace-lifecycle` | Generated Standard/custom-code/rules-engine Stateful debug/run smoke. |
| `nugetConversionLifecycle` | `pnpm run test:e2e-cli:nuget-conversion-lifecycle` | Standard Stateful bundle debug/run, conversion to NuGet, regenerated NuGet artifact checks, and post-conversion debug/run without harness port cleanup. |
| `codefulDebugTasks` | `pnpm run test:e2e-cli:codeful-debug-tasks` | Product-created codeful modern-vs-legacy F5 task-event parity: modern skips publish, legacy runs publish, and latest-stable F5 reaches a running Functions host. |

## ExTester behavior suite correlation

Source suite: `src/test/ui/createWorkspace.behavior.test.ts`.

| ExTester coverage area | Representative ExTester tests | CLI correlation | Notes |
|---|---|---|---|
| Initial form shell/content | `should verify all form elements on initial render` | `createWorkspaceBehavior` / `assertInitialCreateWorkspaceContent` | CLI asserts the correct Create Workspace webview, required labels, app-type choices, workflow-type options, disabled Next, and absence of package-flow fields. |
| Parent path validation | `should show validation error for non-existent path`, `should show validation error when path is cleared` | `createWorkspaceBehavior` / `runStandardFieldValidationCases` | CLI validates error text and recovery with a valid temp folder. |
| Workspace name validation | starts with number, special characters, leading/trailing separators, empty, dots, trailing underscore | `createWorkspaceBehavior` / `runStandardFieldValidationCases` | CLI groups these as field-scoped invalid-then-valid cases and required-field progression. |
| Logic app name validation | invalid value, empty value, special characters, leading/trailing separators | `createWorkspaceBehavior` / `runStandardFieldValidationCases` | CLI asserts the target field error and recovery rather than relying only on Next disabled. |
| Workflow name validation | invalid value, empty value, special characters, leading/trailing separators | `createWorkspaceBehavior` / `runStandardFieldValidationCases` | CLI validates the corresponding workflow-name field state and valid recovery. |
| Reserved workflow names | `Artifacts`, `lib`, case-insensitive reserved name, `workflow-designtime`, recovery when valid | `createWorkspaceBehavior` / `runStandardFieldValidationCases` | CLI follows ExTester behavior by asserting the field-scoped reserved-name error and recovery, not a stricter Next-disabled contract. |
| Standard required-field progression | `should keep Next button disabled until all required fields are valid` | `createWorkspaceBehavior` / `runStandardRequiredFieldProgression` | CLI asserts partial-fill gating for Standard required fields. |
| Custom-code field visibility | `should show custom code fields when selecting custom code radio` | `createWorkspaceBehavior` / `runCustomCodeFieldValidationCases` | CLI selects the custom-code app type and asserts required custom-code fields are present before validating them. |
| Custom-code folder validation | invalid folder, same as logic app, empty, special characters, leading/trailing separators | `createWorkspaceBehavior` / `runCustomCodeFieldValidationCases` | CLI validates field-scoped messages and recovery. |
| Custom-code namespace validation | invalid namespace, dotted valid namespace, empty namespace | `createWorkspaceBehavior` / `runCustomCodeFieldValidationCases` | CLI validates namespace-specific message and valid dotted namespace acceptance. |
| Custom-code function name validation | invalid, empty, hyphenated, special characters, leading underscore | `createWorkspaceBehavior` / `runCustomCodeFieldValidationCases` | CLI validates function-name-specific errors and recovery. |
| Custom-code partial-fill gating | `should keep Next disabled for all partial-fill combinations of custom code fields` | `createWorkspaceBehavior` / `runCustomCodeFieldValidationCases` | CLI keeps a partial-fill matrix for custom-code-specific required fields. |
| Rules-engine field visibility | `should show rules engine fields when selecting rules engine radio` | `createWorkspaceBehavior` / `runRulesEngineFieldValidationCases` | CLI selects the rules-engine app type and asserts required rules-engine fields are present before validating them. |
| Rules-engine folder validation | invalid folder, same as logic app, empty, special characters, leading/trailing separators | `createWorkspaceBehavior` / `runRulesEngineFieldValidationCases` | CLI validates field-scoped messages and recovery. |
| Rules-engine namespace validation | invalid namespace, starts with digit, empty namespace | `createWorkspaceBehavior` / `runRulesEngineFieldValidationCases` | CLI validates namespace-specific messages and recovery. |
| Rules-engine function name validation | invalid, empty, hyphenated, special characters, leading underscore | `createWorkspaceBehavior` / `runRulesEngineFieldValidationCases` | CLI validates function-name-specific messages and recovery. |
| Rules-engine partial-fill gating | `should keep Next disabled for all partial-fill combinations of rules engine fields` | `createWorkspaceBehavior` / `runRulesEngineFieldValidationCases` | CLI keeps a partial-fill matrix for rules-engine-specific required fields. |
| Standard review/back | Stateful review/back | `createWorkspaceBehavior` / `goToReviewAndBack` | CLI asserts review content, then Back preserves field values and selections. |
| Workflow-type review/back | Stateless, Autonomous agents, Conversational agents review checks | `createWorkspaceBehavior` / `verifyWorkflowTypeDescriptionAndReview` | CLI verifies selection text/description and review-step echo for each workflow type. |
| Custom-code review/back | custom-code valid values and review | `createWorkspaceBehavior` / `goToReviewAndBack` | CLI asserts custom-code values, .NET selection, review content, and Back preservation. |
| Rules-engine review/back | rules-engine valid values and review | `createWorkspaceBehavior` / `goToReviewAndBack` | CLI asserts rules-engine values, review content, and Back preservation. |
| App-type cleanup | switch custom-code/rules-engine back to Standard | `createWorkspaceBehavior` / `verifyAppTypeCleanup` | CLI asserts app-specific fields are removed and Standard selection remains valid. |
| Codeful webview creation | modern and legacy-control codeful workspace creation | `createWorkspaceCodeful` | CLI creates through the current codeful radio. The legacy-control case patches only `.csproj` target hooks to mirror ExTester Phase 4.10's legacy simulation. |
| Standard workspace creation | Standard Stateful/Stateless and preview workflow creation | `createWorkspaceCoreMatrix`, `createWorkspacePreviewMatrix` | CLI verifies generated folders, `.code-workspace`, workflow JSON, and `.vscode` essentials. |
| Custom-code workspace creation | CustomCode Stateful/Stateless and preview workflow creation | `createWorkspaceCoreMatrix`, `createWorkspacePreviewMatrix` | CLI verifies Logic App and sibling function project artifacts, workflow shape, and `.vscode` essentials. |
| Rules-engine workspace creation | RulesEngine Stateful/Stateless and preview workflow creation | `createWorkspaceCoreMatrix`, `createWorkspacePreviewMatrix` | CLI verifies Logic App and sibling rules function project artifacts, workflow shape, and `.vscode` essentials. |

## ExTester fixture suite correlation

Source suite: `src/test/ui/createWorkspace.fixtures.test.ts`.

| ExTester fixture case | CLI correlation | Notes |
|---|---|---|
| Standard + Stateful workspace manifest entry | `createWorkspaceFixturesManifest` | CLI creates through the real wizard and writes the same manifest shape. |
| Standard + Stateless workspace manifest entry | `createWorkspaceFixturesManifest` | CLI creates through the real wizard and writes the same manifest shape. |
| CustomCode + Stateful workspace manifest entry | `createWorkspaceFixturesManifest` | CLI creates through the real wizard and writes the same manifest shape. |
| RulesEngine + Stateful workspace manifest entry | `createWorkspaceFixturesManifest` | CLI creates through the real wizard and writes the same manifest shape. |

ExTester `p41a-fixtures` remains the canonical producer for downstream `run-e2e.js` phases. The CLI fixture label is for latest-stable parity and local focused verification.

## Runtime/debug correlation

| User-facing requirement | CLI coverage | ExTester coverage that remains relevant |
|---|---|---|
| Standard generated workspace can open designer, add Request/Response, debug, run trigger, and succeed | `workspaceLifecycle` Standard case | ExTester Phase 4.2 remains the deeper Selenium designer lifecycle owner. |
| Custom-code generated workspace can debug and run successfully | `workspaceLifecycle` custom-code case | ExTester still owns broader webview DOM/debug coverage and task-event semantics. |
| Rules-engine generated workspace can debug and run successfully | `workspaceLifecycle` rules-engine case | ExTester still owns broader webview DOM/debug coverage. |
| NuGet conversion can debug and run successfully | `nugetConversionLifecycle` | ExTester `nugetDebugConversion.test.ts` remains the Selenium command-palette/UI owner; CLI now owns latest-stable extension-host runtime parity, including a run-id-specific post-conversion Overview assertion so the pre-conversion run cannot satisfy the NuGet run check. |
| Codeful modern-vs-legacy debug task behavior | `codefulDebugTasks` | ExTester Phase 4.10 remains the Selenium/recorder-extension owner for the pre-F5 design-time auto-start side-effect; CLI now owns latest-stable VS Code task-event parity, generated source compatibility, and F5 host-running evidence with in-test task recording. |
