# Staged AzureTools v2 pipeline migration

This folder contains staged Azure DevOps entry points for migrating the Logic Apps VS Code build and release definitions from the legacy `.azure-pipelines` files to the published AzureTools v2 templates. The staged entries follow the documented `azext-pt/v1` contract used by the Resource Groups and Docker migration examples (Resource Groups #1447, Docker #334/#364/#365): select `azext-pt/v1`, satisfy the native package-script contract, and avoid unpublished template revisions or custom wrapper hooks.

## Current status

- `.config/1esmain.yml` is the canonical 24067 build entry candidate. It extends `azdo-pipelines/1es-mb-main.yml@azExtTemplates` at `azext-pt/v1`, sets `packageManager: pnpm`, passes `feedBaseUrl`, and relies on the required root scripts `lint`, `build`, `package`, and `test`.
- `.azure-pipelines/1esmain.yml` is temporarily mirrored to the same AzureTools v2 producer contract because the live ADO definition still resolves that registered YAML path. This branch-only bridge lets definition 24067 validate the new `Build Root/vscode-e2e` producer artifact layout before the definition path is repointed. It is not a fallback to the legacy custom artifact graph.
- `.config/release.yml` is the 24319 release entry candidate. It extends `azdo-pipelines/1es-mb-release-extension.yml@azExtTemplates` at `azext-pt/v1` with only documented parameters. It is intentionally constrained to `dryRun: true` until an owner-approved protected release gate replaces or verifies the current environment-approval gap in the published template.
- `.config/vscode-e2e-cli.1es.yml` is the grouped E2E consumer candidate. It directly extends `azure-pipelines/MicroBuild.1ES.Unofficial.yml@1esPipelines` and marks all consumer jobs as `templateContext.type: validationJob` so it stays a test-only, nonproduction execution path rather than a build/sign/release path. It consumes the producer's native `Build Root` artifact, reads the E2E payload from the fixed `vscode-e2e/` subdirectory, verifies the `vscode-e2e-build` manifest/hash/source identity, then runs one prepared suite cohort per OS.

Native `pnpm run build` is not a clean type-check signal yet. A pnpm 11 native build produced the extension bundles and refreshed the compiled CLI E2E output, but the existing `tsup` `onSuccess` hook swallowed a TypeScript failure: `tsc` exited 2 with 32 errors in unchanged source/test files outside this migration diff (`validateNodeJsIsLatest.ts`, `registerCommands.ts`, `workspaceWebviewCommandHandler.ts`, `switchToDotnetProject.ts`, `azureClients.ts`, `requestUtils.ts`, `src/test/ui/designerHelpers.ts`, `run-e2e.ts`, and `runHelpers.ts`). Some errors are source/API-shape issues and some reflect the current pnpm 11 dependency layout (for example duplicate `@azure/core-client` service-client types). Treat this as a pre-cutover baseline blocker: the staged migration may produce bundles, but it must not be described as clean product type-check readiness until the swallowed `tsc` failures are fixed or the build hook is made fail-fast in a separate change.

The legacy `.azure-pipelines` entry points remain present because live ADO definitions still point at those paths. The build entry at `.azure-pipelines/1esmain.yml` is intentionally bridged to the staged AzureTools v2 build contract on this branch; other legacy `.azure-pipelines` compliance/signing files remain untouched until definitions are repointed and all callers are confirmed to use `.config`.

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
- `.azure-pipelines/1esmain.yml` is kept semantically mirrored with `.config/1esmain.yml` only as a temporary registered-path bridge. Queueing definition 24067 from this branch should use the same public producer parameters as the canonical entry: `isOfficialBuild` (default `true`) and `signType` (default `real`, values `real`, `test`, `none`). For nonproduction compatibility validation, queue with `isOfficialBuild: false` and `signType: none` so the new producer artifact shape can be tested without official/signing behavior.

The queued ADO branch or tag now selects both the VSIX build source and the E2E payload source. This intentionally supersedes the old staged custom-graph behavior that built a release tag while running source-head E2E from a different revision.

## E2E producer/consumer contract

The VS Code E2E harness remains independent, but the producer payload is now packaged through the native Root package lifecycle:

- `pnpm run package` in the staged build still creates the VSIX through the existing extension packaging path.
- With `LA_VSCODE_ADO_PIPELINE=true`, it also writes `extension-build.tar.gz`, `vscode-e2e-build-manifest.json`, and `extension-build.tar.gz.sha256` under `$(Build.ArtifactStagingDirectory)/build/Root/vscode-e2e`.
- The published AzureTools `stage-artifacts.yml` copies VSIXs, `package.json`, signatures/manifests, and tarballs into the same `Build Root` artifact without cleaning the target, so the `vscode-e2e` subdirectory survives native signing/staging.
- The consumer downloads physical artifact `Build Root`, then verifies logical manifest artifact name `vscode-e2e-build` from `Build Root/vscode-e2e` before extracting or executing restored code.

The grouped consumer resolves the stable VS Code build once per run and passes it into both OS cohorts. Azure credential material is minted at suite launch through `AzurePipelinesCredential` from WIF service connection metadata and is scoped only to Azure-required suites; non-Azure suites do not inherit raw AAD tokens. Published batch diagnostics are report-only: VS Code profile logs and channel logs are copied through a text allowlist with redaction and size/link checks, while raw profiles, auth stores, workspaces, and runtime dependency roots are not uploaded. Diagnostic selected reruns report through `report_diagnostic_selected_rerun`; protected checks for full validation must bind `verify_both_os_full_rollup`, which only exists for non-diagnostic full runs.

The E2E consumer Run Pipeline form intentionally exposes only test-selection controls: `diagnosticOnly`, `runLinux`, `runWindows`, `linuxSuites`, and `windowsSuites`. Azure DevOps runtime parameters are always shown in the manual queue UI, so producer identity, WIF/service connection, resource group/location, pool, Node, and .NET values stay fixed in YAML instead of becoming optional blank inputs. Tenant and subscription identity are derived inside the AzureCLI task from the already-authenticated fixed service connection context, then validated as non-empty before live Azure suites run. To run against a specific producer build, use Run pipeline > Resources > producer and select the desired pipeline version. The consumer then derives the admitted producer run ID and source SHA from `resources.pipeline.producer.runID` and `resources.pipeline.producer.sourceCommit`, while still rejecting failed, in-progress, wrong-definition, wrong-source, or manifest-mismatched producer artifacts.

The validationJob consumer is intentionally separate from the producer build and release wrappers. ValidationJob routing avoids build/sign/release tasks by design, but it does not by itself prove unrestricted connector egress or full compliance readiness. The consumer does not set an explicit `networkIsolationPolicy` override; the unofficial wrapper is not an NI-disabled path, and validationJob is only the supported test-only routing choice. Before using it for broader connector coverage, owners must verify the actual expanded run with the selected pool, centrally required controls, WIF/service connection, artifact-publication authorization, actual connector connectivity, and any validationJob upload allowlist required by the deployed 1ES template. The existing diagnostic pipeline-artifact outputs stay enabled so failures remain observable; if artifact upload is not yet authorized, that onboarding is a cutover prerequisite rather than a reason to suppress diagnostics.

## Release limitations

The published release wrapper accepts `releaseApprovalEnvironment`, but the current `azext-pt/v1` source notes that `jobs.job` cannot enforce the environment binding there. For that reason, `.config/release.yml` keeps `dryRun: true` and documents the intended `VSCodeDeployLAUX` environment without claiming the staged release already preserves the legacy protected gate. Live release enablement requires an owner-approved protected-resource replacement or verified wrapper update. The legacy live release remains untouched.

The release pipeline validates `publishVersion` against the checked-in extension `package.json` present in the selected build artifact. It does not repackage an arbitrary version during release.

## External cutover requirements

These files do not register or update ADO definitions by themselves. Before making these paths authoritative, owners must:

1. Validate Azure DevOps template expansion for `.config/1esmain.yml` and `.config/release.yml` against `microsoft/vscode-azuretools@azext-pt/v1` (pinned source evidence used during local review: `e188f06528a3d50be5c4f7b6b957b2d3b8b09bed`).
2. Queue build definition 24067 from the feature branch while it still resolves `.azure-pipelines/1esmain.yml`, and verify the temporary registered-path bridge expands to the same AzureTools v2 producer contract as `.config/1esmain.yml`.
3. Confirm the native `Build Root` artifact layout includes the VSIX, adjacent native signing files, `package.json`, and `vscode-e2e/` payload.
4. Repoint build definition 24067 to `.config/1esmain.yml` only after that canonical path is available on the default `main` branch, then remove the temporary `.azure-pipelines/1esmain.yml` bridge after all callers are confirmed on the canonical path.
5. Create/authorize the grouped validationJob consumer definition for `.config/vscode-e2e-cli.1es.yml`, including WIF/service connection access, artifact-publication authorization, and any validationJob upload allowlist required by the deployed 1ES template. Queue it from the `lambrian/test-cli-baseline-changes` branch while selecting the producer version through the ADO Resources picker; the producer definition must continue to publish `Build Root/vscode-e2e` from the native build.
6. Resolve the native build type-check baseline: either fix the unchanged-source TypeScript failures surfaced by pnpm 11, or make the `tsup` post-build type-check fail-fast and handle the resulting source/dependency work explicitly.
7. Approve a replacement for the legacy protected release environment/TSA owner metadata before enabling real release publishing.
8. Request any required M2 signing and marketplace publish authorization checks for the release definition.
9. Confirm Network Isolation policy/onboarding for live connector E2E before treating MSN Weather lifecycle failures as code failures. The validationJob consumer is a test-only candidate for broader connector probes, not a network-policy fix or unlimited-egress guarantee.
10. Authorize the live WIF/service connection and protected-resource controls for the new consumer definition. Current read-only evidence shows the existing `LogicAppsVSCode-E2E-SignIn` WIF endpoint authorizes 24067, while the future consumer is not yet authorized.

No upstream AzureTools changes, unpublished template refs, unsupported hook-based template extensions, direct MicroBuild equivalence wrappers, Network Isolation allowlists, live queues, grants, or pipeline registration are included here.
