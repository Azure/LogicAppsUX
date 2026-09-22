# VS Code Azure Auth and 1ES ADO E2E Migration Plan

## Goal

Enable authenticated Azure scenarios in LogicAppsUX VS Code extension E2E tests while moving selected E2E coverage from GitHub Actions to 1ES/MountainPass-compliant Azure DevOps pipelines. The migrated tests should use the AzureTools `@vscode/test-cli` approach where appropriate so they can run on latest/stable VS Code instead of being pinned to ExTester and VS Code 1.108.0.

## Non-negotiable requirements

- [ ] New Azure DevOps pipelines must be 1ES/MountainPass compliant from the first PR.
- [ ] Azure authentication must use Azure DevOps Workload Identity Federation, not stored client secrets.
- [ ] Existing local/offline ExTester coverage must not lose its `silentAuth` and prompt-avoidance behavior until replacement coverage is proven.
- [ ] `@vscode/test-cli` must not be treated as a full replacement for WebDriver/webview DOM automation.
- [ ] Branch protection should depend on a stable summary gate, not volatile shard job names.
- [ ] Test logs and artifacts must not expose `SYSTEM_ACCESSTOKEN`, ARM tokens, OIDC assertions, or serialized credentials.

## Research completed

- [x] Reviewed current LogicAppsUX VS Code E2E structure and GitHub Actions topology.
- [x] Reviewed AzureTools auth documentation and `AzureDevOpsSubscriptionProvider`.
- [x] Reviewed AzureTools `@vscode/test-cli` shared config and migration guidance.
- [x] Found real-world Azure auth examples in `vscode-azureresourcegroups` and `vscode-azurecontainerapps`.
- [x] Found 1ES/MountainPass examples in `vscode-azuretools` `azdo-pipelines` templates.
- [x] Confirmed current LogicAppsUX `@vscode/test-cli` tests are extension-host tests and do not replace ExTester webview coverage.
- [x] Confirmed current LogicAppsUX ExTester runner is pinned to VS Code 1.108.0.
- [x] Confirmed current tests deliberately avoid Azure auth prompts with `azureLogicAppsStandard.silentAuth` and empty `WORKFLOWS_*` settings.

## Current LogicAppsUX state

| Area | Current state | Plan implication |
| --- | --- | --- |
| VS Code UI E2E | `apps/vs-code-designer/src/test/ui/run-e2e.ts` uses ExTester/Selenium | Keep initially; reduce only after replacement coverage exists |
| VS Code version | `DEFAULT_VSCODE_VERSION = '1.108.0'` | Move new extension-host lanes to latest/stable first |
| Auth behavior | `silentAuth: true` in E2E settings | Preserve for offline tests |
| Subscription provider | `createVSCodeAzureSubscriptionProvider()` returns `VSCodeAzureSubscriptionProvider` | Add ADO/WIF-capable provider factory |
| Token helper | `getAuthorizationToken.ts` calls `getSessionFromVSCode()` directly | Refactor authenticated test path to use provider-backed tokens |
| ADO pipeline | Existing release/build 1ES pattern under `.azure-pipelines/1esmain.yml` | Reuse repo compliance conventions; prefer newer AzureTools `azdo-pipelines` patterns for new E2E |
| `@vscode/test-cli` lane | Existing `.vscode-test.mjs` and `src/test/e2e/**` | Modernize and extend for auth/runtime scenarios |

## Target architecture

Use a hybrid migration:

1. Keep the current GitHub Actions ExTester workflow as safety coverage.
2. Add a new 1ES/MountainPass-compliant Azure DevOps pipeline for selected VS Code E2E scenarios.
3. Use AzureTools-style `@vscode/test-cli` extension-host tests for:
   - extension activation;
   - command registration;
   - auth provider setup;
   - subscription enumeration;
   - token acquisition;
   - workspace filesystem/product-path assertions;
   - runtime/debug probes that can be driven through VS Code APIs.
4. Keep minimal ExTester coverage for true VS Code shell and webview DOM interactions until Playwright/component coverage or another UI harness replaces it.
5. Use ADO Workload Identity Federation through `AzureDevOpsSubscriptionProvider` for authenticated E2E.

## Parallel worktree execution strategy

Use one worktree per reviewable PR-sized slice. The goal is to keep independent work moving while avoiding merge conflicts in the same VS Code extension files. The first wave should be parallel, but the auth-smoke and scenario-migration work should be stacked once the API seams are available.

### Recommended fan-out

| Worktree | Branch purpose | Owns | Can start now? | Depends on | Definition of done |
| --- | --- | --- | --- | --- | --- |
| 1 | Auth provider seam | `apps/vs-code-designer/src/app/utils/services/*`, `extensionVariables.ts`, token helper tests | Yes | Package version decision for `@microsoft/vscode-azext-azureauth` | Local VS Code auth still works, ADO env vars select the ADO/WIF provider, `silentAuth` behavior is preserved, unit tests cover provider selection |
| 2 | `@vscode/test-cli` baseline | `.vscode-test.mjs`, `apps/vs-code-designer/src/test/e2e/**`, package scripts | Yes | None, but should coordinate with worktree 1 on test-only API names | Latest/stable VS Code extension-host smoke runs locally for activation and command registration |
| 3 | Integrated 1ES ADO pipeline stage | `.azure-pipelines/1esmain.yml`, `.azure-pipelines/templates/vscode-e2e-*.yml` | Yes with placeholders | Owner-supplied 1ES Linux pool/image and service connection names | Existing 1ES build pipeline can opt into a VS Code E2E validation stage that builds once, publishes artifacts, fans out shards, and has a stable summary gate |
| 4 | ADO auth smoke | New `@vscode/test-cli` auth tests plus pipeline env wiring | Stack after worktree 1, can prototype in parallel | Worktree 1 provider seam and owner-created WIF service connection | ADO run proves provider sign-in, subscription enumeration, and token acquisition without VS Code auth prompts |
| 5 | Runtime/debug scenario migration | First migrated runtime/debug probes from ExTester to extension-host tests | Stack after worktrees 1 and 2 | Auth/test CLI seams; owner-approved test resource group | At least one live runtime/debug scenario runs via `@vscode/test-cli`; corresponding ExTester coverage remains until replacement is stable |
| 6 | Rollout and deprecation guardrails | `plan.md`, PR checklist, scenario matrix, branch-policy notes | Yes | Owner rollout decisions | Reviewers can see which GitHub checks remain, which ADO gate is informational/blocking, and when ExTester scenarios may be retired |

### Suggested PR stack

1. **PR A: Auth provider seam** — base branch `main`; smallest product-code change that enables ADO/WIF selection without changing default local behavior.
2. **PR B: Test CLI baseline** — base branch `main`; independent unless it needs test-only hooks from PR A.
3. **PR C: Integrated 1ES VS Code E2E stage** — base branch `main`; can use placeholder parameters until owner setup values are known.
4. **PR D: ADO auth smoke** — base branch should be PR A or a merged/rebased branch containing PR A; consumes provider seam and WIF variables.
5. **PR E: Runtime/debug migration** — base branch should include PRs A, B, and D; starts migrating scenarios that need real auth/runtime.
6. **PR F: Retire or reduce ExTester coverage** — only after repeated green ADO runs and explicit owner approval.

### Worktree launch plan

If using Copilot sessions, create the first three sessions immediately because they have low overlap:

- **Session 1: Auth provider seam** — route to `vscode`; add `test` for unit coverage.
- **Session 2: Test CLI baseline** — route to `vscode-test-specialist`; add `vscode` for extension activation hooks.
- **Session 3: Integrated 1ES VS Code E2E stage** — route to `pr-orchestrator` or `ci-sentinel`; keep it parameterized until owner values are known.

### Active implementation sessions

| Session | ID | Status | Coordinator action |
| --- | --- | --- | --- |
| Auth provider seam | `64e311e7-f027-4ad2-8a4f-9798c2b59b7f` | Implemented in coordinator worktree | Targeted provider/token unit tests pass; full package typecheck still has unrelated existing failures |
| `@vscode/test-cli` baseline | `fb4596c6-63ad-4bcd-a9a5-bafcd0622614` | Implemented in child worktree | Child reported latest/stable activation and command-registration smoke passing; not integrated into this coordinator branch |
| Integrated 1ES VS Code E2E stage | `3a3c43c3-7f69-4083-b0fe-2007ada12117` | Implemented in coordinator worktree | Child paused with unvalidated local edits; coordinator-owned YAML is parameterized, folded into `.azure-pipelines/1esmain.yml`, and locally text-checked |

Create the next two sessions after the first wave reports back:

- **Session 4: ADO auth smoke** — stack on the auth-provider branch once its public test seam is stable.
- **Session 5: Runtime/debug migration** — stack on the auth-smoke branch or start as a prototype if it only touches test files.

Keep this current session as the coordinator and plan owner. It should not implement large code changes directly once child worktrees exist; it should collect results, resolve plan conflicts, update `plan.md`, and decide when to create stacked follow-up sessions.

### Parallelization guardrails

- [x] Do not let two worktrees edit the same auth-provider files at the same time.
- [x] Do not let pipeline YAML work block on final service connection names; use parameters and document the owner-filled values.
- [ ] Do not retire any ExTester phase until the replacement has repeated green ADO runs.
- [ ] Keep the ADO summary job name stable from the first pipeline PR so branch policy does not churn.
- [ ] Keep all live Azure resource creation behind owner-approved subscription/resource-group inputs.
- [ ] Require a review checkpoint before merging each stacked layer, especially where test-only APIs or auth abstractions are introduced.

## Owner intervention checkpoints

These are the areas where engineering implementation will block, or where the wrong choice would create security, compliance, or long-term maintenance risk. The repo changes can prepare for these, but a human owner needs to make or confirm the decision.

### Owner runbook

Use this checklist as the human-side setup path. The implementation PR should not be considered ready to require the ADO gate until each output below is known and documented.

| Step | What you need to do | Output to capture in this plan or pipeline variables | How-to guide |
| --- | --- | --- | --- |
| 1 | Confirm the Azure DevOps organization/project and where the LogicAppsUX pipeline should live. | ADO org URL, project name, repo mapping, pipeline folder/name. | [Create your first Azure Pipeline](https://learn.microsoft.com/en-us/azure/devops/pipelines/create-first-pipeline?view=azure-devops) |
| 2 | Confirm the 1ES/MountainPass template and pool/image contract with the owning compliance team. | Template path/version, Linux pool, Windows pool, image names, required SDL settings. | [AzureTools 1ES ADO pipeline README](https://github.com/microsoft/vscode-azuretools/blob/main/azdo-pipelines/README.md), [AzureTools 1ES main template](https://github.com/microsoft/vscode-azuretools/blob/main/azdo-pipelines/1es-mb-main.yml) |
| 3 | Create or identify an Azure Resource Manager service connection that uses Workload Identity Federation. | Service connection name, service connection ID, tenant ID, client ID. | [AzureTools WIF setup guide](https://github.com/microsoft/vscode-azuretools/blob/main/auth/AzureFederatedCredentialsGuide.md), [Use an Azure Resource Manager service connection](https://learn.microsoft.com/en-us/azure/devops/pipelines/library/connect-to-azure?view=azure-devops) |
| 4 | Grant least-privilege Azure RBAC to the service principal created by the service connection. | Subscription/resource group scope and role assignments. | [Assign Azure roles using the Azure portal](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments-portal) |
| 5 | Authorize the pipeline to use the service connection and any variable groups. | Pipeline resource authorization status and variable group names. | [Manage security in Azure Pipelines](https://learn.microsoft.com/en-us/azure/devops/pipelines/policies/permissions?view=azure-devops), [Manage variable groups](https://learn.microsoft.com/en-us/azure/devops/pipelines/library/variable-groups?view=azure-devops) |
| 6 | Decide the test subscription/resource group ownership model. | Subscription ID, resource group, naming convention, tags, cleanup owner, TTL, alert owner. | [AzureTools WIF setup guide: RBAC step](https://github.com/microsoft/vscode-azuretools/blob/main/auth/AzureFederatedCredentialsGuide.md#2-grant-your-service-principal-required-roles-on-the-desired-subscriptions) |
| 7 | Link the committed YAML as an ADO pipeline and run it manually first. | First run URL, selected branch, variables used, service connection approval status. | [Create your first Azure Pipeline](https://learn.microsoft.com/en-us/azure/devops/pipelines/create-first-pipeline?view=azure-devops), [Resources in YAML pipelines](https://learn.microsoft.com/en-us/azure/devops/pipelines/process/resources?view=azure-devops) |
| 8 | Review the first successful and first failed runs for artifact quality and secret hygiene. | Links to run artifacts, confirmation that tokens/OIDC assertions are not logged. | [Publish and download pipeline artifacts](https://learn.microsoft.com/en-us/azure/devops/pipelines/artifacts/pipeline-artifacts?view=azure-devops) |
| 9 | Decide rollout policy after repeated green runs. | Required green-run count, branch policy date, GitHub check retirement plan. | [Pipeline deployment approvals and checks](https://learn.microsoft.com/en-us/azure/devops/pipelines/process/approvals?view=azure-devops) |

### Owner setup details to record

- [ ] ADO organization:
- [ ] ADO project:
- [ ] ADO pipeline name/path:
- [ ] 1ES/MountainPass template:
- [x] Linux pool/image: `OneESHostedPool` / `Azure-Linux-3` (`os: linux`)
- [ ] Windows pool/image:
- [x] ARM service connection name: `LogicAppsVSCode-E2E-SignIn`
- [ ] ARM service connection ID:
- [ ] Tenant ID:
- [ ] Client ID:
- [ ] Test subscription ID:
- [ ] Test resource group:
- [ ] Required Azure RBAC roles:
- [ ] Variable group names, if any:
- [ ] Cleanup owner:
- [ ] Cost/quota alert owner:
- [ ] Required green-run count before branch policy:

### Pipeline ownership and ADO setup

- [ ] Choose the exact Azure DevOps organization, project, repository mapping, and folder path for the new VS Code E2E pipeline.
- [ ] Create or link the pipeline in ADO after the YAML lands.
- [ ] Grant the pipeline permission to use the required service connection and any variable groups.
- [ ] Decide whether the first ADO pipeline is manual-only, scheduled/nightly, PR-gated, or release-gated.
- [ ] Decide which GitHub Actions checks remain required while the ADO pipeline proves itself.
- [ ] Decide when a stable ADO summary gate becomes branch-policy required.

### 1ES/MountainPass compliance gate

- [ ] Confirm the approved 1ES/MountainPass template version this repo must use.
- [ ] Confirm approved Linux and Windows pools/images for VS Code UI/headless tests.
- [ ] Confirm required SDL, CredScan, CodeQL, Component Governance, artifact, and retention settings.
- [ ] Review and approve any exclusions for `.vscode-test`, generated extension output, downloaded VS Code builds, screenshots, traces, or crash dumps.
- [ ] Confirm whether the pipeline needs official-build signing/provenance behavior or should remain test-only.

### Azure auth and identity setup

- [ ] Create or identify the Azure Resource Manager service connection that uses Workload Identity Federation.
- [ ] Confirm the service connection name, ID, tenant ID, and client ID exposed to jobs through the AzureTools env var contract.
- [ ] Confirm that no client secrets are created for this flow; if any secret is unavoidable, require security approval and store it only in an approved secure variable group.
- [ ] Grant least-privilege Azure RBAC to the service principal for the test subscription or resource group.
- [ ] Validate that `SYSTEM_ACCESSTOKEN` is available to the job and not exposed in logs.
- [ ] Confirm whether legacy `AzCode_*` aliases must be emitted for compatibility with the chosen AzureTools auth package version.

### Test Azure resource ownership

- [ ] Choose the subscription and resource group for authenticated E2E resources.
- [ ] Decide whether resources are pre-provisioned, created per run, or created by a scheduled fixture job.
- [ ] Define naming conventions, tags, cost center, TTL, and cleanup policy for all test-created Azure resources.
- [ ] Approve any live connectors, storage accounts, function apps, app insights instances, or Logic Apps resources used by tests.
- [ ] Identify who receives alerts for quota, cost, cleanup, or service-health failures.

### Auth package and test-framework direction

- [x] Decide whether LogicAppsUX can upgrade `@microsoft/vscode-azext-azureauth` to a version that exposes the ADO provider cleanly.
- [ ] Decide whether to depend directly on `@microsoft/vscode-azext-eng` or copy only the relevant `@vscode/test-cli` config locally.
- [ ] Approve the dependency/version pinning strategy after checking pnpm monorepo compatibility.
- [ ] Approve the boundary between `@vscode/test-cli` extension-host coverage and remaining ExTester/webview DOM coverage.

### Scenario and rollout gates

- [ ] Pick the first required authenticated scenarios: auth smoke only, subscription enumeration, token acquisition, runtime/debug probe, or full workflow execution.
- [ ] Decide which current ExTester phases are allowed to be retired only after ADO coverage is green repeatedly.
- [ ] Decide the required green-run count before promoting the ADO pipeline from informational to blocking.
- [ ] Review failed-run artifacts for the first several ADO runs to confirm logs are useful and do not leak credentials.
- [ ] Approve the long-term replacement plan for true webview DOM coverage.

## Workstream 1: Package and auth provider design

### Checklist

- [x] Verify the exact published `@microsoft/vscode-azext-azureauth` version that LogicAppsUX should consume.
- [x] Confirm whether the target version exposes `AzureDevOpsSubscriptionProvider` via `@microsoft/vscode-azext-azureauth/azdo` or the root export.
- [x] Upgrade `apps/vs-code-designer/package.json` and `pnpm-lock.yaml` if required.
- [x] Add an Azure subscription provider factory that selects ADO/WIF only when ADO env vars are present.
- [x] Keep default desktop/local behavior on `VSCodeAzureSubscriptionProvider`.
- [x] Widen `ext.subscriptionProvider` typing from `VSCodeAzureSubscriptionProvider` to a compatible `AzureSubscriptionProvider` abstraction.
- [x] Refactor `getAuthorizationToken.ts` so authenticated E2E can obtain tokens from provider-backed subscription/authentication.
- [x] Preserve `silentAuth` fallback for unauthenticated/offline tests.
- [x] Add unit tests for provider selection, missing env vars, and fallback behavior.

### Preferred env var contract

Use the AzureTools names rather than inventing new names:

| Variable | Purpose |
| --- | --- |
| `SYSTEM_ACCESSTOKEN` | ADO job token used by the provider credential path |
| `FC_SERVICE_CONNECTION_NAME` | ARM service connection name used as auth-enabled signal |
| `FC_SERVICE_CONNECTION_ID` | ADO service connection resource ID |
| `FC_SERVICE_CONNECTION_TENANT_ID` | Tenant ID for the service connection |
| `FC_SERVICE_CONNECTION_CLIENT_ID` | Service principal application/client ID |
| `AzCode_UseAzureFederatedCredentials` | Legacy compatibility flag used by AzureTools examples |
| `AzCode_ServiceConnectionID` | Legacy service connection ID alias |
| `AzCode_ServiceConnectionDomain` | Legacy tenant/domain alias |
| `AzCode_ServiceConnectionClientID` | Legacy client ID alias |

## Workstream 2: Azure DevOps WIF setup

### Checklist

- [ ] Identify the ADO organization/project where the pipeline will run.
- [ ] Confirm the approved 1ES/MountainPass Linux and Windows pool names/images.
- [ ] Create or identify an Azure Resource Manager service connection using Workload Identity Federation.
- [ ] Scope the service connection to the test subscription or least-privileged test resource group.
- [ ] Grant the service principal required Azure RBAC roles.
- [ ] Grant the pipeline permission to use the service connection.
- [ ] Confirm whether the pipeline must use AzureTools shared variables or LogicAppsUX-owned variable groups.
- [ ] Document cleanup requirements for any live Azure resource creation.

### Auth verification step

Model after `vscode-azuretools/azdo-pipelines/templates/test.yml`:

```yaml
- task: AzureCLI@2
  displayName: Verify test service connection
  inputs:
    azureSubscription: ${{ parameters.testARMServiceConnection }}
    scriptType: pscore
    scriptLocation: inlineScript
    addSpnToEnvironment: true
    inlineScript: |
      Write-Host "##vso[task.setvariable variable=FC_SERVICE_CONNECTION_ID]$env:AZURESUBSCRIPTION_SERVICE_CONNECTION_ID"
      Write-Host "##vso[task.setvariable variable=FC_SERVICE_CONNECTION_CLIENT_ID]$env:servicePrincipalId"
      Write-Host "##vso[task.setvariable variable=FC_SERVICE_CONNECTION_TENANT_ID]$env:tenantId"
```

## Workstream 3: 1ES/MountainPass ADO pipeline integration

### Recommended files

- [x] `.azure-pipelines/1esmain.yml`
- [x] `.azure-pipelines/templates/vscode-e2e-setup.yml`
- [x] `.azure-pipelines/templates/vscode-e2e-build-artifacts.yml`
- [x] `.azure-pipelines/templates/vscode-e2e-run-cli.yml`
- [x] `.azure-pipelines/templates/vscode-e2e-setup-fixtures.yml`
- [x] `.azure-pipelines/templates/vscode-e2e-run-scenario.yml`
- [x] `.azure-pipelines/templates/vscode-e2e-summary.yml`

### Pipeline checklist

- [x] Integrate with the existing 1ES/MicroBuild build pipeline instead of introducing a parallel root pipeline.
- [x] Prefer AzureTools newer `azdo-pipelines` template structure over deprecated `azure-pipelines` examples.
- [x] Configure SDL/CredScan/CodeQL at the 1ES template level.
- [ ] Exclude `.vscode-test` and generated `dist`/artifact directories from Component Governance/CodeQL as appropriate.
- [x] Parameterize the approved 1ES pools/images so owners can fill the final values.
- [x] Build and compile once, then publish build artifacts.
- [x] Add a Container Apps-style `vscode-test` smoke lane that consumes built output and receives the AzureTools WIF env contract.
- [x] Fan out scenario jobs that consume build artifacts.
- [x] Publish logs, screenshots, `.vscode-test` diagnostics, crash dumps, and test results on failure.
- [x] Add a stable summary job that fails closed if any required shard fails, is skipped, or is cancelled.
- [x] Keep the first ADO version manual/non-blocking, but internally compliant.
- [x] Do not use `continueOnError` for required build/test/compliance gates.

### Target topology

| Stage/job | Purpose | Status |
| --- | --- | --- |
| Build extension | Existing release build stage remains the owner for package/sign/stage; optional E2E stage builds reusable VS Code test artifacts from the same release tag | [x] Integrated |
| `vscode-test` CLI smoke | Run latest/stable `@vscode/test-cli` against the built extension output with AzureTools WIF env vars when configured | [x] Integrated |
| Setup fixtures | Create reusable workspaces/bundles where still needed | [x] Integrated |
| Auth smoke | Prove WIF provider sign-in, subscription list, token acquisition | [ ] Future test coverage; pipeline env wiring implemented |
| Extension-host scenario shards | Run migrated `@vscode/test-cli` scenarios | [x] Initial shard fan-out integrated |
| Optional ExTester compatibility | Keep minimal UI smoke while migrating | [ ] Planned |
| Summary gate | One stable result for branch policy | [x] Integrated |

## Workstream 4: `@vscode/test-cli` migration

### Checklist

- [ ] Decide whether to depend directly on `@microsoft/vscode-azext-eng`.
- [ ] If using AzureTools config directly, replace or simplify `.vscode-test.mjs` to export `azExtSrcTestConfig` or a local derived config.
- [ ] If copying locally, include:
  - [ ] `VSCODE_RUNNING_TESTS=1`;
  - [ ] `DEBUGTELEMETRY=1`;
  - [ ] `tsx` Mocha require where compatible;
  - [ ] short temp `--user-data-dir` for non-Windows agents.
- [ ] Verify pnpm/monorepo compatibility before adopting AzureTools' `packageManager: pnpm` template, because AzureTools expects `pnpm ci` and pnpm 11+.
- [ ] Create a test workspace file for migrated extension-host tests.
- [ ] Avoid importing mutable extension state from tests; interact through VS Code APIs, commands, files, or test-only extension APIs.
- [ ] Keep ExTester for webview DOM scenarios until equivalent coverage exists.

### First scenarios to migrate

- [x] Activation smoke on latest/stable VS Code.
- [x] Command registration smoke.
- [ ] ADO auth provider smoke.
- [ ] Subscription enumeration for the configured test subscription.
- [ ] Token acquisition without VS Code auth prompt.
- [ ] Workspace product-path smoke that avoids synthetic-only file creation.
- [ ] Runtime/debug probe using VS Code APIs and `:7071` readiness checks.

## Workstream 5: Product/test API seams

### Checklist

- [ ] Decide whether LogicAppsUX needs a test-only API similar to `vscode-azureresourcegroups/src/testApi.ts`.
- [ ] If needed, expose the test API only when `VSCODE_RUNNING_TESTS` is set.
- [ ] Provide an override hook for subscription provider or Azure service factory if tests need to inject ADO/WIF provider.
- [ ] Ensure production activation does not expose test-only APIs.
- [ ] Avoid direct access to `extensionVariables` from `@vscode/test-cli` tests because tests run as a separate extension-host participant.

## Workstream 6: Scenario migration matrix

| Current scenario | Proposed target | Status |
| --- | --- | --- |
| `p40-nonlogicapp` | `@vscode/test-cli` activation smoke | [ ] Planned |
| `p41a-fixtures` | Keep temporarily; replace with product-path fixture helper later | [ ] Planned |
| `p41b-createworkspace-behavior` | Keep ExTester or replace via product test seam plus component tests | [ ] Planned |
| `p42-standard` | Split: extension-host save/runtime probes plus minimal UI smoke | [ ] Planned |
| `p42-customcode` | Split: extension-host save/runtime probes plus minimal UI smoke | [ ] Planned |
| `p42-rulesengine` | Split: extension-host save/runtime probes plus minimal UI smoke | [ ] Planned |
| `p43-inlinejavascript` | Runtime/debug extension-host probe candidate | [ ] Planned |
| `p43-customcode` | Runtime/debug extension-host probe candidate | [ ] Planned |
| `p43-rulesengine` | Runtime/debug extension-host probe candidate | [ ] Planned |
| `p44-statelessvariables` | Keep UI until product seam or component coverage exists | [ ] Planned |
| `p45-designerviewextended` | Keep UI until product seam or component coverage exists | [ ] Planned |
| `p46-keyboardnav` | Keep UI; true interaction coverage | [ ] Planned |
| `p47-suite` | Split Data Mapper/UI cases from extension-host checks | [ ] Planned |
| `p48* conversion` | Product-path seam plus limited UI smoke | [ ] Planned |
| `p49-descriptionpersistence` | Candidate for extension-host plus file assertions if UI entry is abstracted | [ ] Planned |
| `p412-bundlerepair` | Strong extension-host candidate | [ ] Planned |
| `codefuldebugonly` | Extension-host/runtime probe candidate | [ ] Planned |
| `azuriteonly` | Extension-host/runtime probe candidate | [ ] Planned |

## Validation gates

### Local validation

- [x] `pnpm exec biome check --write <changed-files>`
- [ ] `pnpm --filter vscode-designer test:extension-unit`
- [x] Auth seam targeted Vitest: `pnpm --dir apps\vs-code-designer exec vitest run src/app/utils/services/__test__/VSCodeAzureSubscriptionProvider.test.ts src/app/utils/codeless/__test__/getAuthorizationToken.test.ts`
- [x] Child `@vscode/test-cli` baseline reported `pnpm --dir apps\vs-code-designer run test:e2e-cli:compile` passing.
- [x] Child `@vscode/test-cli` baseline reported `pnpm --dir apps\vs-code-designer run test:e2e-cli:smoke` passing on VS Code stable `1.134.0`.
- [ ] Azure Pipelines YAML compile validation after owner links the pipeline in ADO.
- [ ] Existing targeted ExTester scenario for any coverage not yet migrated.

### ADO validation

- [ ] Manual 1ES/MountainPass run completes SDL/compliance gates.
- [ ] Auth smoke passes with WIF service connection.
- [ ] Artifacts include logs/screenshots/test results.
- [ ] No secrets appear in logs/artifacts.
- [ ] Summary gate fails closed on any required shard failure.
- [ ] ADO run is green repeatedly before any GitHub check is retired.

## Open decisions

- [ ] Which exact ADO project and 1ES pools should LogicAppsUX use?
- [ ] Which service connection should be used for authenticated tests?
- [ ] What Azure subscription/resource group is approved for E2E resources?
- [ ] Should LogicAppsUX depend on `@microsoft/vscode-azext-eng` directly or copy only the relevant test config?
- [ ] Can the repo upgrade to the AzureTools auth version that exposes the ADO provider without dependency conflicts?
- [ ] Does the monorepo need a custom ADO template rather than AzureTools' single-package `packageManager: pnpm` flow?
- [ ] Which scenarios become required in ADO first?
- [ ] What is the long-term replacement for true webview DOM coverage?

## References

### Azure auth

- [AzureTools auth README](https://github.com/microsoft/vscode-azuretools/blob/main/auth/README.md)
- [Azure DevOps subscription provider section](https://github.com/microsoft/vscode-azuretools/blob/main/auth/README.md#azure-devops-subscription-provider)
- [Workflow identity federation guide](https://github.com/microsoft/vscode-azuretools/blob/main/auth/AzureFederatedCredentialsGuide.md)
- [AzureDevOpsSubscriptionProvider source](https://github.com/microsoft/vscode-azuretools/blob/main/auth/src/providers/AzureDevOpsSubscriptionProvider.ts)
- [AzureTools auth package exports](https://github.com/microsoft/vscode-azuretools/blob/main/auth/package.json)
- [AzureTools auth index](https://github.com/microsoft/vscode-azuretools/blob/main/auth/src/index.ts)
- [Azure Resource Groups ADO auth factory](https://github.com/microsoft/vscode-azureresourcegroups/blob/main/src/services/AzureDevOpsSubscriptionProvider.ts)
- [Azure Resource Groups provider switch](https://github.com/microsoft/vscode-azureresourcegroups/blob/main/src/services/getSubscriptionProviderFactory.ts)
- [Azure Resource Groups test auth helper](https://github.com/microsoft/vscode-azureresourcegroups/blob/main/test/utils/azureDevOpsSubscriptionProvider.ts)
- [Azure Resource Groups test API](https://github.com/microsoft/vscode-azureresourcegroups/blob/main/src/testApi.ts)
- [Azure Resource Groups nightly CRUD test](https://github.com/microsoft/vscode-azureresourcegroups/blob/main/test/nightly/crud.test.ts)
- [Azure Container Apps test auth helper](https://github.com/microsoft/vscode-azurecontainerapps/blob/main/test/utils/azureDevOpsSubscriptionProvider.ts)

### `@vscode/test-cli`

- [AzureTools shared VS Code test config](https://github.com/microsoft/vscode-azuretools/blob/main/eng/src/vscode-test/vscodeTestConfigs.ts)
- [AzureTools VS Code test config README](https://github.com/microsoft/vscode-azuretools/blob/main/eng/src/vscode-test/README.md)
- [AzureTools eng migration guide](https://github.com/microsoft/vscode-azuretools/blob/main/eng/MIGRATION.md)
- [VS Code Test CLI README](https://github.com/microsoft/vscode-test-cli/blob/main/README.md)
- [VS Code extension testing docs](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [VS Code docs source for test CLI](https://github.com/microsoft/vscode-docs/blob/main/api/working-with-extensions/testing-extension.md)
- [Azure Functions `vscode-test` baseline](https://github.com/microsoft/vscode-azurefunctions/blob/main/.vscode-test.mjs)
- [Azure Functions ADO build pipeline using AzureTools 1ES template](https://github.com/microsoft/vscode-azurefunctions/blob/main/.config/build.yml)
- [Azure Container Apps ADO build pipeline using AzureTools 1ES template](https://github.com/microsoft/vscode-azurecontainerapps/blob/main/.config/build.yml)

### 1ES/MountainPass and ADO

- [AzureTools new 1ES ADO template README](https://github.com/microsoft/vscode-azuretools/blob/main/azdo-pipelines/README.md)
- [AzureTools new 1ES main template](https://github.com/microsoft/vscode-azuretools/blob/main/azdo-pipelines/1es-mb-main.yml)
- [AzureTools new 1ES stages template](https://github.com/microsoft/vscode-azuretools/blob/main/azdo-pipelines/stages/1es-stages.yml)
- [AzureTools new ADO test template](https://github.com/microsoft/vscode-azuretools/blob/main/azdo-pipelines/templates/test.yml)
- [AzureTools shared variables](https://github.com/microsoft/vscode-azuretools/blob/main/azdo-pipelines/azcode.variables.yml)
- [AzureTools example build pipeline](https://github.com/microsoft/vscode-azuretools/blob/main/.config/build.yml)
- [AzureTools deprecated old 1ES template](https://github.com/microsoft/vscode-azuretools/blob/main/azure-pipelines/1esmain.yml)
- [AzureTools deprecated old test template](https://github.com/microsoft/vscode-azuretools/blob/main/azure-pipelines/templates/test.yml)
- [VS Code Java Test 1ES nightly example](https://github.com/microsoft/vscode-java-test/blob/main/.azure-pipelines/vscode-java-test-nightly.yml)
- [VS Code Java Test 1ES RC example](https://github.com/microsoft/vscode-java-test/blob/main/.azure-pipelines/vscode-java-test-rc.yml)
