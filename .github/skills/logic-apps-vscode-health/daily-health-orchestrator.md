# Daily VS Code Health Orchestrator

This is the execution entry point for the bundled daily-monitor resources.

## Prerequisites

Read these files from the workspace root before querying:

- `shared-health-contract.md`
- `daily-health-orchestrator.md`
- `logicappsux-source-investigation.md`
- `report-rendering.md`
- `fixed-query-catalog.md`
- `health-config.json`

Require Azure Data Explorer MCP and GitHub MCP. Validate the configuration,
fixed bindings, expected UTC run hour, exact allowlists, duration families,
Kusto location, thresholds, issue label, and notification policy. An empty
`criticalCommands` allowlist makes only that optional section unavailable.

An unexpected missing input, authentication failure, or unavailable required
tool fails the workflow. Per the workflow-owner policy, such an unexpected
prerequisite failure does not have to synthesize or email an HTML report.
Once prerequisites pass, deterministic query or telemetry failures follow the
degraded/unavailable reporting rules below.

## Deterministic sequence

Execute only KQL between each named fence in `fixed-query-catalog.md`, exactly
as written, against the configured cluster and database:

Core decision queries:

1. `daily_complete_windows`
2. `telemetry_data_quality`
3. `extension_version_rollout`
4. `daily_operation_health`
5. `daily_operation_cohorts`
6. `daily_hourly_health_bins`

Original-analysis descriptive queries:

7. `daily_operation_trends`
8. `daily_design_time_paths`
9. `daily_safe_error_categories`
10. `daily_all_command_health`
11. `daily_slowest_commands`
12. `daily_high_failure_commands`
13. `daily_all_command_safe_error_categories`

Only the core group may drive decisions. Backticks, the `kusto` label,
headings, and prose are not query text. Do not reformat, correct, combine,
prepend, append, or otherwise alter a block. Never replace a failed core query
with free-form Kusto.

The complete-windows query defines the last complete UTC day as Current, the
preceding UTC day as Previous, and separate eight-day same-weekday baselines
for each. The 10:00 UTC recurrence and two-hour ingestion delay make the
preceding UTC day complete. Recompute all of Previous to incorporate late
telemetry and use occurrence markers to prevent duplicates. Gate Current
against `BaselineCurrent` and Previous against `BaselinePrevious`.

Failure or incompatible output from a core query makes monitoring degraded or
unavailable. Failure of an original-analysis descriptive query marks only that
report subsection unavailable and cannot be replaced with free-form Kusto.

## Decision process

1. Validate data quality before product analysis. No Current data, stale data,
   connector truncation, incompatible fixed-query schema, an
   `UNLISTED_OPERATION_DRIFT` warning, or an invalid-item-count rate above the
   configured maximum suppresses product issue mutation. Global unknown-outcome
   and allowlist-coverage counts are descriptive context; only the candidate
   operation/cohort `UnknownRate` from `daily_operation_health` or
   `daily_operation_cohorts` applies the 2% mutation gate. A core query failure
   after prerequisites pass produces `Degraded` or `Failed` monitoring output.
   A result that prevents the core monitor from reaching a decision maps to the
   `MonitoringUnavailable` notification reason; an isolated descriptive-query
   failure does not.
2. Use rollout results to discover versions dynamically. Keep stable and
   prerelease traffic separate only when exact mappings are configured. Treat
   an unmapped numeric version as channel `unknown`; never infer channel from
   odd/even components. Do not treat a newly observed version as a regression
   until it meets the applicable sample floor.
3. Compare operation-wide results with version/channel/OS/runtime cohorts.
   Suppress mutation when a release or population-mix shift explains the
   aggregate signal or aggregate and stratified results conflict.
4. Keep dependency parent and child operations separate. They are correlated
   and never count as independent corroboration.
5. Report critical commands as unavailable while their allowlist is empty.
6. Apply privacy to each published count, rate, and duration cell. Suppressed
   values never satisfy a sample or issue gate.
7. `SamplingDetected` alone is descriptive because every fixed health query
   applies valid sampling weights. Malformed or non-positive weights suppress
   issue mutation; those values are normalized to one only so reporting can
   continue without silently subtracting events.

### Success regression

Require all of:

- at least 100 Current evaluable attempts;
- at least 500 pooled baseline evaluable attempts;
- at least 10 Current failures;
- at least five percentage points actual-success degradation;
- at least 2x baseline failure rate unless baseline failure is zero;
- materially separated Wilson confidence intervals; and
- Holm-Bonferroni correction across all operation/cohort comparisons.

Unknown outcomes above 2% make the result primarily a telemetry-contract
problem and suppress product issue mutation.

### Latency regression

Require at least 400 valid Current durations, at least a 1.5x p95 increase, at
least a two-second absolute p95 increase, and persistence in at least two
hourly bins with at least 20 valid durations each. With 100-399 durations,
report p90 as sub-threshold watchlist context; it is not a credible automatic
finding.

`daily_hourly_health_bins` is the deterministic latency-persistence source.
Compare each Current hourly p95 with that operation/startup path's
`BaselineCurrent` p95 from `daily_operation_health`; compare Previous bins with
`BaselinePrevious`. A bin persists when it independently meets the configured
relative and absolute latency thresholds.
Bounded MCP follow-up may explain a candidate but cannot replace its valid
duration counts or p95 bins. If follow-up fails, retain the fixed-query result
and state the investigation limitation.

### Recurrence and critical severity

A non-critical signal must meet its metric gates in both Current and Previous,
which are consecutive non-overlapping windows, before issue mutation. Compare
Current with `BaselineCurrent` and Previous with `BaselinePrevious`.
Read-only source investigation does not waive this requirement.

A same-day critical signal may proceed without Previous only when all original
critical gates pass: at least 15 percentage points success loss or 3x failure
rate, at least 50 Current failures, two disjoint adequately sampled cohorts or
the aggregate population, and source/mechanistic evidence. A recent plausible
culprit commit alone is not a recurrence waiver.

## Investigation

Every credible anomaly, including first-window `Watchlist`, receives immediate
read-only Kusto and source investigation. Kusto follow-up is restricted to the
candidate operation, cohort, and time range and returns sanitized aggregates.
Follow `logicappsux-source-investigation.md` for source-to-release mapping,
authoritative GitHub MCP file retrieval, hypotheses, alternatives, acceptance
criteria, deduplication, and mutation ordering.

## RCA package

Before mutation, establish exact windows; Current, Previous, and baseline
samples; outcome and latency changes; hourly persistence; confidence and
multiple-comparison result; affected versions/channels/OS/runtime cohorts;
rollout or mix effects; cancellation and unknown rates; safe error category or
startup path; affected-release source mapping; verified paths and SHA; bounded
hypothesis, confidence, alternatives, and limitations; sanitized user impact;
and testable acceptance criteria.

## Fingerprint and occurrence

Canonicalize each component as trimmed lowercase Unicode with internal
whitespace collapsed to one ASCII space. Use:

- detector ID: exact configured `detectorId`;
- schema: decimal configured `fingerprintSchemaVersion`;
- operation: exact `Operation` emitted by `daily_operation_health`;
- signal type: exactly `success-rate` or `latency`;
- qualifier: `error=<safe-category|none>;path=<startup-path|none>`;
- population: `scope=<aggregate|cohort>;channel=<stable|prerelease|unknown|any>;os=<normalized-value|any>;runtime=<normalized-value|any>`.

The population must not contain an exact extension version. Compute lowercase
SHA-256 over those six values joined by `\n` in the order above.

Embed:

`<!-- vscode-health-monitor:fingerprint=sha256:<64-lowercase-hex> -->`

For recurrence, compute lowercase SHA-256 over the fingerprint hash, Current
window start, and Current window end separated by `\n`, using whole-second UTC
RFC 3339 timestamps. Embed:

`<!-- vscode-health-monitor:occurrence=sha256:<64-lowercase-hex> -->`

The recalculated Previous window may update late-arriving evidence, but an
existing occurrence marker prevents a repeated notification or comment.

## Issue contract

Create or update at most one issue per run. Use:

- title: `[VS Code health][Critical|High] <operation>: <sanitized summary>`;
- label: `VSCode`;
- repository: `Azure/LogicAppsUX`.

The body must contain `Automated health finding`, `Observed regression`,
`Corroboration`, `Initial investigation`, `Acceptance criteria`, and `Privacy`
sections. Include both markers, exact windows, all rates and samples, affected
cohorts, quality state, source mapping and SHA, hypothesis/confidence/
alternatives, limitations, and the statement that only aggregate sanitized
telemetry is included.

Preserve human content. Never close, reopen, or select by title similarity.
Assign Copilot only for a bounded code-actionable finding with verified source
and specific acceptance criteria. Instruct Copilot to verify the hypothesis,
stop and comment if disproven, make the smallest correction, preserve
cancellation and compatibility behavior, add focused tests, submit a draft PR,
and never merge, deploy, or access production telemetry.

## Report, archive, and email

Always generate and validate exactly `/workspace/daily-health-email.html` after
prerequisites and deterministic monitoring start. Apply
`report-rendering.md`. Archive the exact file content using the configured
SharePoint site, folder, and UTC filename pattern regardless of whether email
is sent and independently of Outlook delivery. Archive failure fails that
action but does not change the monitoring decision or make an otherwise
ineligible report email-eligible.

Email only when:

- an issue is created;
- an existing issue receives a materially new verified occurrence;
- Copilot assignment fails; or
- monitoring is unavailable after prerequisites passed.

Do not email `NoFinding`, `DuplicateSuppressed`, or an unmutated `Watchlist` by
default. Use the configured recipients and one of these subjects:

- issue action: `[LogicApps VS Code Health][<severity>] <operation> - <created|updated>`;
- assignment failure: `[LogicApps VS Code Health][<severity>] <operation> - Copilot assignment failed`;
- unavailable monitor: `[LogicApps VS Code Health][Monitoring unavailable] Daily monitor`.

Pass the complete HTML document directly as the Outlook body; never wrap it in
another element. Return only a short sanitized status summary and never paste
the HTML into the assistant response.
