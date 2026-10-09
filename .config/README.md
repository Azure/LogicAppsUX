# Staged AzureTools v2 pipeline migration

This folder contains staged Azure DevOps entry points for migrating the Logic Apps VS Code build and release definitions from the legacy `.azure-pipelines` files to the published AzureTools v2 templates. The staged entries follow the documented `azext-pt/v1` contract used by the Resource Groups and Docker migration examples (Resource Groups #1447, Docker #334/#364/#365): select `azext-pt/v1`, satisfy the native package-script contract, and avoid unpublished template revisions or custom wrapper hooks.

## Current status

- `.config/1esmain.yml` is the canonical 24067 build entry candidate. It extends `azdo-pipelines/1es-mb-main.yml@azExtTemplates` at `azext-pt/v1`, sets `packageManager: pnpm`, passes `feedBaseUrl`, and relies on the required root scripts `lint`, `build`, `package`, and `test`.
- `.config/release.yml` is the 24319 release entry candidate. It extends `azdo-pipelines/1es-mb-release-extension.yml@azExtTemplates` at `azext-pt/v1` with only documented parameters. It is intentionally constrained to `dryRun: true` until an owner-approved protected release gate replaces or verifies the current environment-approval gap in the published template.
- `.config/vscode-e2e-cli.1es.yml` is the self-contained E2E entry used by definition 28771, `vscode-azurelogicapps-testing`. It directly extends `azure-pipelines/MicroBuild.1ES.Unofficial.yml@1esPipelines`, keeps no-output policy/check jobs as `templateContext.type: validationJob`, and runs artifact-producing build/suite lanes as ordinary 1ES jobs so their outputs go through normal artifact-publication policy. The selected ADO branch resolves `Build.SourceVersion` once, builds the test-only `vscode-e2e-build` artifact in the same run, then runs twelve independent canonical Linux/Windows suite jobs against that admitted payload. Suite jobs do not depend on each other. A Windows behavior smoke lane remains available only for diagnostic selected reruns.

Native `pnpm run build` is not a clean type-check signal yet. A pnpm 11 native build produced the extension bundles and refreshed the compiled CLI E2E output, but the existing `tsup` `onSuccess` hook swallowed a TypeScript failure: `tsc` exited 2 with 32 errors in unchanged source/test files outside this migration diff (`validateNodeJsIsLatest.ts`, `registerCommands.ts`, `workspaceWebviewCommandHandler.ts`, `switchToDotnetProject.ts`, `azureClients.ts`, `requestUtils.ts`, `src/test/ui/designerHelpers.ts`, `run-e2e.ts`, and `runHelpers.ts`). Some errors are source/API-shape issues and some reflect the current pnpm 11 dependency layout (for example duplicate `@azure/core-client` service-client types). Treat this as a pre-cutover baseline blocker: the staged migration may produce bundles, but it must not be described as clean product type-check readiness until the swallowed `tsc` failures are fixed or the build hook is made fail-fast in a separate change.

For the branch-only producer trial, the current canonical `.config/1esmain.yml` content is copied into `.azure-pipelines/1esmain.yml` because build definition 24067 still points at the registered legacy path. During that trial, the canonical `.config/1esmain.yml` remains at blob `860aa268644d0da15c3043a543b687dc2878f31f`; the temporary `.azure-pipelines/1esmain.yml` sets `NODE_OPTIONS=--max-old-space-size=6144` for subsequent native Root Node phases. Queue the trial with `isOfficialBuild=true` and `signType=none`; this uses the required official 1ES wrapper while keeping the validation unsigned and non-release. After the working producer YAML is validated, copy the validated temporary YAML back to `.config/1esmain.yml` if it changed and restore `.azure-pipelines/1esmain.yml` exactly to blob `025ded92acc13c58bd952fc81bf76ad7ace14807` in a normal follow-up commit. The staged `.config` release and E2E validation entries do not register definitions or change the legacy release definition by themselves.

## Published wrapper contract

The published main wrapper runs a single native Root job by default:

1. checkout selected source;
2. setup Node from `.nvmrc`;
3. install the pinned package manager with `pnpm ci`;
4. run `pnpm run lint`, `pnpm run build`, `pnpm run package`, native signing/staging, then `pnpm run test`.

LogicAppsUX adapts to that contract in repo code:

- `.nvmrc` pins Node `22.13.0`, matching the minimum required by `pnpm@11.3.0`.
- `package.json` pins `packageManager: pnpm@11.3.0`, moves pnpm settings/overrides to `pnpm-workspace.yaml`, and exposes root `lint`, `build`, `package`, and `test` scripts.
- The tracked root `.npmrc` is intentionally absent. The published AzureTools setup template only writes the authenticated CFS `.npmrc` from `feedBaseUrl` when no checked-in `.npmrc` exists; that generated runtime `.npmrc` may exist during native lint/build/package/test, but is ignored so credentials are never tracked.
- Those root scripts preserve ordinary local behavior by default. When `LA_VSCODE_ADO_PIPELINE=true`, they run the VS Code extension build/package/test path required by the native wrapper.
- `.config/1esmain.yml` uses `additionalSetupSteps` only for supported build metadata preparation: it sets `NPM_CONFIG_USERCONFIG` to the absolute authenticated npmrc path for later native npm work in `apps/vs-code-designer/dist`, sets `LA_VSCODE_ADO_PIPELINE=true`, and writes the `AI_KEY` placeholder into the selected checkout before native build runs. It does not switch branches/tags mid-run.

The queued ADO branch or tag selects the source for the staged build/release candidates. The separate `.config/vscode-e2e-cli.1es.yml` validation pipeline uses the ADO Run Pipeline Branch selector to choose the source for its same-run test-only payload.

## E2E branch-driven validation contract

The VS Code E2E harness remains independent from ExTester webview DOM coverage and from the production VSIX producer. The validation pipeline is self-contained:

- ADO's Branch selector chooses the commit; `resolve_consumer_context` pins `Build.SourceVersion` once for all downstream jobs.
- `build_current_run_e2e_artifact` checks out that pinned SHA, compiles the extension and `@vscode/test-cli` tests through `pnpm --dir apps/vs-code-designer run test:e2e-cli:build`, then compiles the existing dependency-preparation harness with `tsup.e2e.test.config.ts` before publishing a test-only pipeline artifact named `vscode-e2e-build`. Required payload checks include `out/test/run-e2e.js`; compiling that preparation helper does not run the ExTester E2E suites.
- The artifact root contains `extension-build.tar.gz`, `vscode-e2e-build-manifest.json`, and `extension-build.tar.gz.sha256`; it is not the shipping `Build Root` artifact and is not signed or released.
- Each suite job depends only on the shared context and build jobs, downloads the current run's `vscode-e2e-build` artifact, then verifies logical manifest artifact name `vscode-e2e-build`, archive hash, source SHA, current run ID, current definition ID, repository identity, and checkout ref before extracting or executing restored code. The configured Node 22 runtime is provisioned before the verifier runs.

The independent canonical jobs now keep the same scenario/assertion/variant inventory on both OS cohorts:

| OS | Suite jobs |
| --- | --- |
| Linux | `unitTests`, `createWorkspaceBehavior`, `createWorkspaceCoreMatrix`, `createWorkspacePreviewMatrix`, `createWorkspaceCodeful`, `msnWeatherLifecycle` |
| Windows | `unitTests`, `createWorkspaceBehavior`, `createWorkspaceCoreMatrix`, `createWorkspacePreviewMatrix`, `createWorkspaceCodeful`, `msnWeatherLifecycle` |

The Windows-only `createWorkspaceBehaviorSmoke` lane is intentionally noncanonical: it can be selected in diagnostic mode for a shorter compatibility check, but it is not part of the `windows` alias or the protected full-rollup gate. `unitTests` runs the extension activation and command smoke tests. Every suite has its own visible agent job and tool/dependency preparation, while the extension/test artifact is built only once. Jobs invoke the existing single-suite `--label` or `--msn-weather-lifecycle` entry, not the `--suites` batch controller. A suite failure does not prevent another suite job from running. Internal lifecycle prerequisites, including MSN bootstrap, workspace creation, and workflow execution, remain inside their owning suite.

The pipeline resolves the stable VS Code build once per run and passes it into every suite job. Linux profiles must stay short and isolated to respect VS Code's Unix socket path limit; the deeply nested batch profile layout is not reused. WIF/AzureCLI credential setup is limited to Azure-required MSN jobs; non-Azure smoke and workspace jobs do not receive live Azure credential variables.

Each suite publishes its own JUnit results and one consolidated sanitized diagnostics pipeline artifact named `vscode-e2e-cli-diagnostics-<os-suite>`. That artifact contains `results/`, `log/`, `screenshots/`, and `generated-workspaces/` so each independent lane has one artifact to inspect while the shared `vscode-e2e-build` artifact remains separate. Raw profiles, auth stores, unrestricted workspaces, and runtime dependency roots are not uploaded. Diagnostic selected reruns report through `report_diagnostic_selected_rerun`; protected checks for full validation must bind `verify_both_os_full_rollup`, which only exists for non-diagnostic full runs. The full gate requires all twelve canonical jobs to succeed, nonzero successful per-suite results, stable variant coverage on both OS cohorts, and matching admitted artifact/source/run/repository/VS Code identity. Missing, skipped, failed, empty, mismatched, or diagnostic-only smoke results cannot make the full gate green.

The E2E Run Pipeline form intentionally exposes only test-selection controls: `diagnosticOnly`, `runLinux`, `runWindows`, `linuxSuites`, and `windowsSuites`. Selection is validated before the artifact build. A normal run requires the full canonical inventory on both OSes, expressed through the `linux`/`windows` aliases or complete explicit lists; partial runs must be diagnostic. Unknown, duplicate, overlapping, or OS-incompatible selections are rejected. Diagnostic selection only schedules the selected independent jobs and cannot satisfy the full gate.

The supplementary `httpTimeoutLifecycle`, `statelessVariablesLifecycle`
and `workspaceArtifactRegeneration`/`workspaceMultiRoot`
families have independent Linux and Windows jobs using the same admitted payload,
isolated dependencies/profiles, secure Linux session and required result staging.
Select either or both by their suite IDs in each OS selector with
`diagnosticOnly=true`. Their bootstrap/create/reopen prerequisites run inside
their owning family. The HTTP lifecycle receives only the approved WIF-backed
Azure fixture context required by its affirmative connector setup; workspace-only
families do not receive live Azure credentials. The diagnostic
reporter depends on these jobs and fails if any selected family fails or skips.
They remain outside the established six-suite aliases and twelve-job protected
gate until actual native evidence and explicit baseline promotion are complete.
An existing canonical green does not certify these new families, and a green
family diagnostic does not certify the complete expanded test inventory.

Supplementary success also requires a label-specific finalized terminal report:
the native summary must contain positive executed bodies without failures or
skips, all registry-declared phases must occur exactly once in order, every phase
must exit normally with accepted diagnostics/cleanup, and final owned cleanup
must be verified. `family-lifecycle-terminal.js` checks these gates during result
staging. A direct selector that exits zero without that terminal report fails
publication; a wizard pass alone cannot certify later regular-Code phases.
Original process closure is a separate acceptance gate. A tree reconstructed
only after its parent exits can miss reparented descendants, so supplementary
publication also requires verified retained-original-identity closure evidence.
Until that evidence is available, native execution is diagnostic only and result
staging rejects acceptance even if the GUI bodies and ordinary exits succeeded.

Multi-root jobs explicitly opt into complete native process observation only on
their dedicated ADO worker. The real dependency bootstrap attests the configured
Functions executable and its bytes; callers do not supply a free-form Func path
or hash. After ordinary activation/reload, command resolution and the observed
complete Func population must match that admission. The job archives the current
invocation, bootstrap and wizard handoffs, debug events, final result, screenshots
and collected logs, never the credential profile or dependency cache.

Azure DevOps runtime parameters are always shown in the manual queue UI, so source identity, WIF/service connection, resource group/location, pool, Node, and .NET values stay fixed in YAML instead of becoming optional blank inputs. Tenant and subscription identity are derived inside the AzureCLI task from the already-authenticated fixed service connection context, then validated as non-empty before live Azure suites run. Do not select an external producer resource for this validation flow; wrong source SHA, wrong run/definition identity, wrong repository, archive hash mismatch, or manifest mismatch remain rejection cases through the current-run artifact manifest admission.

The E2E consumer is intentionally separate from the producer build and release wrappers. It keeps source-resolution, full-rollup, and diagnostic-report coordination as no-output validation jobs while publishing the current-run build payload and per-suite diagnostics from ordinary 1ES jobs. This avoids pretending artifact producers have no outputs while preserving the test-only, non-release execution path. Unofficial/no-deployment routing is distinct from artifact security classification, so the artifact outputs retain their normal default scanning path unless owners explicitly approve a non-production artifact classification. The consumer does not set an explicit `networkIsolationPolicy` override; the unofficial wrapper is not an NI-disabled path, and this pipeline does not by itself prove unrestricted connector egress or full compliance readiness. Before using it for broader connector coverage, owners must verify the actual expanded run with the selected pool, centrally required controls, WIF/service connection, artifact-publication authorization, and actual connector connectivity. The existing diagnostic pipeline-artifact outputs stay enabled so failures remain observable; if artifact upload is not yet authorized, that onboarding is a cutover prerequisite rather than a reason to suppress diagnostics.

## Release limitations

The published release wrapper accepts `releaseApprovalEnvironment`, but the current `azext-pt/v1` source notes that `jobs.job` cannot enforce the environment binding there. For that reason, `.config/release.yml` keeps `dryRun: true` and documents the intended `VSCodeDeployLAUX` environment without claiming the staged release already preserves the legacy protected gate. Live release enablement requires an owner-approved protected-resource replacement or verified wrapper update. The legacy live release remains untouched.

The release pipeline validates `publishVersion` against the checked-in extension `package.json` present in the selected build artifact. It does not repackage an arbitrary version during release.

## External cutover requirements

These files do not register or update ADO definitions by themselves. Before making these paths authoritative, owners must:

1. Validate Azure DevOps template expansion for `.config/1esmain.yml` and `.config/release.yml` against `microsoft/vscode-azuretools@azext-pt/v1` (pinned source evidence used during local review: `e188f06528a3d50be5c4f7b6b957b2d3b8b09bed`).
2. Repoint build definition 24067 to `.config/1esmain.yml` only after that canonical path is available on the default `main` branch, the temporary registered-path producer trial has been folded back into `.config/1esmain.yml`, `.azure-pipelines/1esmain.yml` has been restored to blob `025ded92acc13c58bd952fc81bf76ad7ace14807`, and the owner-approved production build cutover is ready.
3. Use the registered E2E definition 28771, `vscode-azurelogicapps-testing`, for `.config/vscode-e2e-cli.1es.yml`, preserving its approved WIF/service connection access and artifact-publication authorization for ordinary output-producing jobs. Queue it from the `lambrian/test-cli-baseline-changes` branch with only the five test selectors; the pipeline builds and admits its own `vscode-e2e-build` artifact from the selected branch SHA, then schedules the selected independent suite jobs.
4. Confirm the self-contained validation run publishes and consumes the current run's `vscode-e2e-build` artifact on both Linux and Windows, and that the protected full-validation check binds `verify_both_os_full_rollup`.
5. Resolve the native build type-check baseline: either fix the unchanged-source TypeScript failures surfaced by pnpm 11, or make the `tsup` post-build type-check fail-fast and handle the resulting source/dependency work explicitly.
6. Approve a replacement for the legacy protected release environment/TSA owner metadata before enabling real release publishing.
7. Request any required M2 signing and marketplace publish authorization checks for the release definition.
8. Confirm Network Isolation policy/onboarding for live connector E2E before treating MSN Weather lifecycle failures as code failures. The E2E consumer is a test-only candidate for broader connector probes, not a network-policy fix or unlimited-egress guarantee.
9. Authorize the live WIF/service connection and protected-resource controls for the new E2E validation definition.

No upstream AzureTools changes, unpublished template refs, unsupported hook-based template extensions, direct MicroBuild equivalence wrappers, Network Isolation allowlists, live queues, grants, or pipeline registration are included here.
