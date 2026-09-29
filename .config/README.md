# Staged AzureTools v2 pipeline migration

This folder contains staged Azure DevOps entry points for migrating the Logic Apps VS Code build and release definitions from the legacy `.azure-pipelines` files to the published AzureTools v2 templates. The staged entries follow the documented `azext-pt/v1` contract used by the Resource Groups and Docker migration examples (Resource Groups #1447, Docker #334/#364/#365): select `azext-pt/v1`, satisfy the native package-script contract, and avoid unpublished template revisions or custom wrapper hooks.

## Current status

- `.config/1esmain.yml` is the canonical 24067 build entry candidate. It extends `azdo-pipelines/1es-mb-main.yml@azExtTemplates` at `azext-pt/v1`, sets `packageManager: pnpm`, passes `feedBaseUrl`, and relies on the required root scripts `lint`, `build`, `package`, and `test`.
- `.config/release.yml` is the 24319 release entry candidate. It extends `azdo-pipelines/1es-mb-release-extension.yml@azExtTemplates` at `azext-pt/v1` with only documented parameters. It is intentionally constrained to `dryRun: true` until an owner-approved protected release gate replaces or verifies the current environment-approval gap in the published template.
- `.config/vscode-e2e-cli.1es.yml` is the grouped E2E validation candidate. It directly extends `azure-pipelines/MicroBuild.1ES.Unofficial.yml@1esPipelines` and marks all jobs as `templateContext.type: validationJob` so it stays a test-only, nonproduction execution path rather than a build/sign/release path. The selected ADO branch resolves `Build.SourceVersion` once, builds the test-only `vscode-e2e-build` artifact in the same run, verifies the manifest/hash/source identity, then runs one prepared suite cohort per OS from that admitted payload.

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
- `build_current_run_e2e_artifact` checks out that pinned SHA, compiles the extension and `@vscode/test-cli` tests through `pnpm --dir apps/vs-code-designer run test:e2e-cli:build`, and publishes a test-only pipeline artifact named `vscode-e2e-build`.
- The artifact root contains `extension-build.tar.gz`, `vscode-e2e-build-manifest.json`, and `extension-build.tar.gz.sha256`; it is not the shipping `Build Root` artifact and is not signed or released.
- Linux and Windows cohorts depend on the build job, download the current run's `vscode-e2e-build` artifact, then verify logical manifest artifact name `vscode-e2e-build`, archive hash, source SHA, current run ID, current definition ID, repository identity, and checkout ref before extracting or executing restored code.

The grouped consumer resolves the stable VS Code build once per run and passes it into both OS cohorts. Azure credential material is minted at suite launch through `AzurePipelinesCredential` from WIF service connection metadata and is scoped only to Azure-required suites; non-Azure suites do not inherit raw AAD tokens. Published batch diagnostics are report-only: VS Code profile logs and channel logs are copied through a text allowlist with redaction and size/link checks, while raw profiles, auth stores, workspaces, and runtime dependency roots are not uploaded. Diagnostic selected reruns report through `report_diagnostic_selected_rerun`; protected checks for full validation must bind `verify_both_os_full_rollup`, which only exists for non-diagnostic full runs.

The E2E Run Pipeline form intentionally exposes only test-selection controls: `diagnosticOnly`, `runLinux`, `runWindows`, `linuxSuites`, and `windowsSuites`. Azure DevOps runtime parameters are always shown in the manual queue UI, so source identity, WIF/service connection, resource group/location, pool, Node, and .NET values stay fixed in YAML instead of becoming optional blank inputs. Tenant and subscription identity are derived inside the AzureCLI task from the already-authenticated fixed service connection context, then validated as non-empty before live Azure suites run. Do not select an external producer resource for this validation flow; wrong source SHA, wrong run/definition identity, wrong repository, archive hash mismatch, or manifest mismatch remain rejection cases through the current-run artifact manifest admission.

The validationJob consumer is intentionally separate from the producer build and release wrappers. ValidationJob routing avoids build/sign/release tasks by design, but it does not by itself prove unrestricted connector egress or full compliance readiness. The consumer does not set an explicit `networkIsolationPolicy` override; the unofficial wrapper is not an NI-disabled path, and validationJob is only the supported test-only routing choice. Before using it for broader connector coverage, owners must verify the actual expanded run with the selected pool, centrally required controls, WIF/service connection, artifact-publication authorization, actual connector connectivity, and any validationJob upload allowlist required by the deployed 1ES template. The existing diagnostic pipeline-artifact outputs stay enabled so failures remain observable; if artifact upload is not yet authorized, that onboarding is a cutover prerequisite rather than a reason to suppress diagnostics.

## Release limitations

The published release wrapper accepts `releaseApprovalEnvironment`, but the current `azext-pt/v1` source notes that `jobs.job` cannot enforce the environment binding there. For that reason, `.config/release.yml` keeps `dryRun: true` and documents the intended `VSCodeDeployLAUX` environment without claiming the staged release already preserves the legacy protected gate. Live release enablement requires an owner-approved protected-resource replacement or verified wrapper update. The legacy live release remains untouched.

The release pipeline validates `publishVersion` against the checked-in extension `package.json` present in the selected build artifact. It does not repackage an arbitrary version during release.

## External cutover requirements

These files do not register or update ADO definitions by themselves. Before making these paths authoritative, owners must:

1. Validate Azure DevOps template expansion for `.config/1esmain.yml` and `.config/release.yml` against `microsoft/vscode-azuretools@azext-pt/v1` (pinned source evidence used during local review: `e188f06528a3d50be5c4f7b6b957b2d3b8b09bed`).
2. Repoint build definition 24067 to `.config/1esmain.yml` only after that canonical path is available on the default `main` branch, the temporary registered-path producer trial has been folded back into `.config/1esmain.yml`, `.azure-pipelines/1esmain.yml` has been restored to blob `025ded92acc13c58bd952fc81bf76ad7ace14807`, and the owner-approved production build cutover is ready.
3. Create/authorize the grouped validationJob E2E definition for `.config/vscode-e2e-cli.1es.yml`, including WIF/service connection access, artifact-publication authorization, and any validationJob upload allowlist required by the deployed 1ES template. Queue it from the `lambrian/test-cli-baseline-changes` branch with only the five test selectors; the pipeline builds and admits its own `vscode-e2e-build` artifact from the selected branch SHA.
4. Confirm the self-contained validation run publishes and consumes the current run's `vscode-e2e-build` artifact on both Linux and Windows, and that the protected full-validation check binds `verify_both_os_full_rollup`.
5. Resolve the native build type-check baseline: either fix the unchanged-source TypeScript failures surfaced by pnpm 11, or make the `tsup` post-build type-check fail-fast and handle the resulting source/dependency work explicitly.
6. Approve a replacement for the legacy protected release environment/TSA owner metadata before enabling real release publishing.
7. Request any required M2 signing and marketplace publish authorization checks for the release definition.
8. Confirm Network Isolation policy/onboarding for live connector E2E before treating MSN Weather lifecycle failures as code failures. The validationJob consumer is a test-only candidate for broader connector probes, not a network-policy fix or unlimited-egress guarantee.
9. Authorize the live WIF/service connection and protected-resource controls for the new E2E validation definition.

No upstream AzureTools changes, unpublished template refs, unsupported hook-based template extensions, direct MicroBuild equivalence wrappers, Network Isolation allowlists, live queues, grants, or pipeline registration are included here.
