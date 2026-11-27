# Accessibility pilot

The synthetic self-test checks that axe detects a missing button name and that Playwright can distinguish lost from restored keyboard focus. It runs inline HTML in offline Chromium. It does not start a server, open Designer, use credentials, or change the existing PR checks.

From the repository root, with workspace dependencies and the Playwright Chromium browser installed:

```bash
pnpm run test:e2e:accessibility-pilot
```

The command prints the path to a new directory under `accessibility-pilot/artifacts/attempts/`. Open `summary.md` for the five planned Designer v1 journeys and the synthetic run status. `report.json` records execution errors and exit status. When available, `playwright-report.json` contains assertion details and JSON attachments with the actual key/focus observations and axe results, including items that require manual review.

The command exits nonzero if synthetic checks fail or the result is incomplete. An interrupted attempt can be left `in_progress`; it is not a pass. The synthetic report always marks all five Designer journeys `not_run`. Neither command establishes WCAG conformance or sends reports to GitHub or Otto.

Run the report unit tests without a browser:

```bash
node --test scripts/accessibility-pilot/report.test.mjs
```

## Inactive Actions wiring templates

The [producer](workflows/laux-accessibility-producer.template.yml) and [consumer](workflows/laux-accessibility-consumer.template.yml) are outside `.github/workflows/`, and their jobs are disabled. The producer shows how to check out and verify the exact head of a same-repository PR authored by `@takyyon`. It can only run the synthetic self-tests, which leave all five Designer journeys `not_run`.

The consumer uses GitHub metadata to reject stale heads and missing or ambiguous run-to-PR associations. Matching metadata does not validate any report. No path uploads, downloads, or accepts an artifact, calls Otto, or posts to a PR.

Do not register the templates until the base-branch, draft, actor and rerun rules are settled. Hosted product replay also needs proof of exact-head build provenance and process-level network denial. GitHub's [artifact API](https://docs.github.com/en/rest/actions/artifacts#list-workflow-run-artifacts) associates an artifact with a run, not a run attempt; the name is not proof of that association. Keep artifact ingestion disabled until the attempt can be verified independently.

Run the metadata checks locally against mocked GitHub responses:

```bash
node --test scripts/accessibility-pilot/actions-metadata-preflight.test.mjs
```

## Prepare the Designer fixtures

Check the catalog against the workflow JSON used by Standalone:

```bash
node --test scripts/accessibility-pilot/fixtures.test.mjs
```

These checks catch fixture changes before a browser run. They do not resolve UI selectors, measure keyboard or axe behavior, or change any journey status. The catalog maps the five journeys to `AllScopeNodes.json`, `Panel.json`, and `MoreComplex.json` in `__mocks__/workflows`.

The [Standalone local-only production build](../apps/Standalone/EPHEMERAL.md#verification-and-initial-activation) defines Designer v1 at `/` and replaces ARM token and subscription loading with empty results. Selecting **Local** in the ordinary development shell is not equivalent: that shell can load credentials before displaying the selector.

With workspace dependencies available, these existing commands prepare the artifact without starting a server or opening Designer:

```bash
pnpm turbo run build:ephemeral --filter=standalone
python3 -B scripts/ephemeral/validate.py --directory apps/Standalone/dist .ephemeral-site
```

Build from the intended revision and use a fresh output directory. The validator checks the artifact; it does not run it. The repository's preview Playwright configuration starts a server and is not part of this pilot.

## Replay the verified Designer artifact

On macOS, with `/usr/bin/sandbox-exec`, workspace dependencies, and Playwright Chromium installed, run from the repository root:

```bash
node scripts/accessibility-pilot/designer-replay.mjs
# Optional local-only scoped run:
node scripts/accessibility-pilot/designer-replay.mjs --pilot
```

This separate command accepts only the previously verified `.ephemeral-site` bytes. It checks the pinned manifest digest before launching Chromium and does not trust a digest generated from the current directory. If your build differs, the command stops; do not replace the digest to make a different build run.

The launcher denies process network access. Chromium runs offline in fresh contexts, blocks service workers and WebSockets, and serves only exact static-file requests at a reserved `.invalid` origin. It does not use a running server or a signed-in browser profile. `navigator.onLine` reports `true` so TanStack Query can run the local startup query; network access stays disabled.

Fixture rendering and journey results are separate in the replay report. Keyboard assertions and state-specific axe results cover only the tasks actually exercised. Journeys without sufficient interaction or evidence stay `not_run`. Blocked CDN font and icon requests are replay limitations; they affect visual fidelity and are not product findings.

Replay reports now include `scope.mode` (`full` by default, `pilot` with `--pilot`) and `scope.requiredJourneyIds` in both initial and final report states. `--pilot` runs exactly `nested-graph`, `details-open-close`, and `token-editing`, and only the required fixture smokes (`All Scope Nodes` and `Panel`). The report still lists all five catalog journeys; excluded entries remain `not_run` with a scope exclusion note and no attempt credit.

Exit zero requires a matching attempt, scope, and pinned digest, plus passing fixture smokes and keyboard, axe, and assertion evidence for every selected journey. If the worker report is missing or unreadable, the launcher records a failed attempt with the full catalog still listed.

The temporary **LAUX Accessibility Hosted Probe** runs on the first push that creates `takyyon-feature/laux-accessibility-pilot-heap-retry` in `Azure/LogicAppsUX` by `@takyyon`. It builds the exact pushed commit on macOS, with serial Turbo execution and a 4 GiB Node heap for the ephemeral build after the first probe hit Vite's heap limit. It fails closed if the resulting digest differs from the pin and retains only the JSON report for one day. It does not exercise PR events, accept evidence into a trusted consumer, or call Otto.

For Details, the replay tabs to the `manual` node, opens it with Enter, and checks that focus moves to **Close**. It scans the open panel, presses Enter on **Close**, and checks that the panel closes and focus returns to `manual` without setting focus in the test.

In the earlier `attempt-FfmG6U`, Escape on **Close** left the panel open. Current reports cite that trace under `evidence.observations.escapeOnClose` as a UX advisory, not a pass/fail assertion or a WCAG finding. Because Escape did not dismiss the panel, that trace did not test focus restoration. The historical report is unchanged.

For Token Editing, the replay tabs to **Content** in Parse JSON and uses `/`, Down Arrow, and Enter to open **Insert expression**. It waits for the expression editor to receive focus, selects `length`, and uses Right Arrow in the picker tabs to reach **Dynamic content**. It selects **ArrayVariable**, scans the open picker, then verifies that **Add** inserts `length(variables('ArrayVariable'))` and returns focus to **Content**.

Validation Recovery remains `not_run`. In Standalone Designer v1, clearing the HTTP URI and closing Details enables **Errors**, but Tab and Shift+Tab skip the [host command](../apps/Standalone/src/designer/app/LocalDesigner/pseudoCommandBar.tsx#L96-L128). In diagnostic attempt `attempt-U6Ort9`, the [canvas focus order](../libs/designer/src/lib/ui/Controls.tsx#L29-L38) cycled back through the graph instead of reaching the command bar. This is a keyboard accessibility finding for the tested host ([WCAG 2.2 2.1.1 Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html)), not a blocked-network limitation or a completed recovery test.

If the worker exits unsuccessfully after writing a passing report, the launcher marks the attempt `failed` and records the exit under `launcher`, without changing the recorded journey evidence.
