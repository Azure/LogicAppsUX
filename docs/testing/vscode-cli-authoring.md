# VS Code CLI E2E authoring: established contracts

Read this guide before adding or changing VS Code native tests. It is the
canonical, repository-tracked source of reusable authoring lessons. Private case
catalogues, original-item text, run receipts and screenshots belong in the
separate private traceability records, not this guide.

## Evidence levels

| Level | Meaning |
| --- | --- |
| Policy | A deliberate engineering/user decision that implementations must follow. |
| Regression-tested | The real helper or production DOM is exercised by automated controls. |
| Native-validated | An actual source-bound Windows/Linux consumer proves the stated behavior. |
| Open limitation | A prerequisite, assertion or evidence gate still lacks proof. |

Do not promote a policy or unit control to native success. Record the exact
scope proved, and preserve earlier failures rather than rewriting their history.

## 1. Azure connector setup is affirmative

**Policy:** When standard setup detects **Enable connectors in Azure**, choose
**Use connectors from Azure**, or the exact **Yes** option when that is the
control's label. Do not automatically select Skip for now, No, Cancel or Escape.

Reuse `affirmativeAzureConnectorPrompt` and `selectWorkbenchPromptOption` in
`apps/vs-code-designer/src/test/e2e/workbenchPromptSelection.ts`. The selector
must use an enabled, visible control in the matching prompt container. Missing
or disabled affirmative controls are blocked setup, not permission to choose a
negative fallback.

Invoke prompt handling before and while waiting for the designer. Detection
already existing in a shared helper does not mean every new test actually calls
that helper. An unanswered connector quick-pick can appear as a designer
readiness timeout even when the design-time host has started.

Affirmative selection continues into subscription/resource-group/authentication
setup. Supply the existing approved service connection and fixture context,
select the existing approved resource group, and fail explicitly when they are
unavailable. Do not create new resources, acquire new grants or intercept dialog
return values to obtain a pass.

This policy is specific to Azure connector setup. Tests intentionally exercising
workspace **No** or **Cancel** retain those original actions and assertions.

**Current boundary:** The affirmative policy has helper regression coverage;
its new native HTTP flow still requires source-bound validation. Do not claim
that the affirmative journey has already passed on both operating systems.

## 2. Bind to the actual designer and editor

Choose the required designer version explicitly. A V2 flow must target
`designerLocalV2`, not the V1 `designerLocal` tab or a different designer window.

`WorkspaceConfiguration` is a snapshot. After awaiting `update`, call
`workspace.getConfiguration` again before checking the effective value.

The current Code view uses CodeMirror `EditorView`, despite compatibility names
that still mention Monaco. Read rendered CodeMirror lines, gutters and viewport
boundaries. Preserve complete-document, overlap, document identity and EOF
checks; never inject a model or filesystem fallback after partial acquisition.

The V2 Save toolbar button has visible/accessible **Save** text; an
`aria-label="Save"` attribute is not guaranteed. Match the actual enabled
production control and independently inspect persisted workflow content.

Controls exercising production DOM live in
`httpTimeoutComposeDom.unit.ts`; configuration snapshot controls live in
`httpTimeoutComposeConfiguration.unit.ts`.

## 3. Treat explicit navigation differently from assertion-time reloads

File -> Open Folder and Close Folder can legitimately reload the workbench
document. Retain the original CDP session and wait for a changed
`performance.timeOrigin`, a loaded visible shell and the expected Explorer view
within the original deadline.

Do not replay the user action or silently attach to a different window. Reject
closed sessions, ambiguous targets, wrong workspaces and non-navigation errors.

Recovery is allowed only at the explicit navigation boundary. An unexpected
reload after the real **No** or **Cancel** is an assertion failure.

`workspacePromptCancel.ts` and `workspacePromptCancel.unit.ts` encode this
contract. The bounded No/Cancel native route has actual Windows/Linux evidence;
that does not certify all workspace variants or every original case.

## 4. Compare workspace identity using platform semantics

`Uri.fsPath` can normalize Windows drive-letter casing. The same physical
workspace expressed with `d:` and `D:` must not be rejected solely for that
difference.

Prefer the established platform-aware/canonical path helper. Preserve
wrong-workspace, escaped-root, missing-file and link-boundary checks. Do not
apply blanket case folding on Linux or use substring containment.

**Current boundary:** Native diagnostics exposed this issue; the HTTP path
correction and its next native validation remain separate from the diagnosis.

## 5. Preserve normal-runtime settings across fresh hosts

Fresh profiles must retain the creating host's admitted dependency-root and
binary-resolution contract. Forwarding an environment variable alone does not
configure the corresponding VS Code setting.

Ordinary activation can replace a pinned Functions path with plain `func` when
managed dependency validation is disabled. Verify actual post-activation
command/PATH resolution and binary identity rather than trusting the profile
pin. Do not migrate to a user cache or download another binary as a fallback.

Regeneration can produce a second, distinct overwrite confirmation after the
initial initialization prompt. Detect and affirm the actual second prompt once;
do not repeatedly click the first prompt while waiting for files.

## 6. Cancellation must establish quiescence

Racing a side-effecting operation against a timer does not stop that operation.
Retain the underlying promise and propagate cancellation. Require quiescence
before restoring settings or beginning a recovery restart.

Late debug sessions may be stopped only when they match the test's exact attempt
marker and workspace identity. Never stop a foreign session or globally clear
tasks to conceal a delayed start. If the operation cannot quiesce, preserve the
fixture and report incomplete restoration.

`statelessVariablesControls.ts`, `statelessVariablesDebug.ts` and their controls
cover delayed resolving starts, not just promises that never finish.

## 7. Finalized evidence is not an exit-code shortcut

Direct and batch routes must produce a fresh invocation, exact registry phase
order, actual per-phase outcomes and truthful final cleanup. A wizard pass or
child exit zero cannot manufacture missing later GUI/runtime phases.

Shared direct orchestration is in `scripts/run-e2e-cli.js`; supplementary
publication is checked by `scripts/family-lifecycle-terminal.js`.

Reconstructing ancestry only after a parent exits can miss reparented
descendants. When original process identities have not been verified after
closure, report `originalProcessClosureVerified: false` and keep execution
diagnostic-only. Directory removal and an empty post-exit tree are not stronger
proof. Do not revive abandoned process-owner frameworks to disguise this gap.

## Validation and maintenance

1. Read this guide and the relevant suite/fixture prerequisites.
2. Search existing helper implementations and controls before adding logic.
3. Compile before running controls:
   `pnpm --dir apps/vs-code-designer run test:e2e-cli:compile`.
4. Run the smallest relevant controls, then the registered
   `test:e2e-cli:unit` chain after shared-helper changes.
5. Validate the actual native selector on isolated source-bound consumers.
   Parallel worktrees do not isolate localhost ports, Code profiles or runtime
   processes on a shared machine.
6. For each lesson, record symptom, root cause, reusable helper/control paths,
   verification level and any remaining limitation. Update this guide after
   meaningful investigation, not only after a green run.

Generated package instructions must be updated from
`docs/ai-setup/packages/vs-code-designer.md` through `pnpm run ai:generate`;
do not edit autogenerated instructions directly.
