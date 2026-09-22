# Shared VS Code Health Contract

The bundled files implement only Workflow 1, the daily live-site monitor. They do
not replace the weekly-summary requirements in the parent plan.

Load `health-config.json` before running a query. Configuration values copied
into fixed KQL—allowlists, version filters, channel mappings, privacy floors,
duration limits, and window settings—must match the catalog. Review and update
both files together when any binding changes.

## Tool boundary

The fenced blocks in `fixed-query-catalog.md` are fixed deterministic queries.
Their text, output schema, allowlists, windows, privacy rules, and configuration
bindings are reviewed. Execute every required block character-for-character
through Azure Data Explorer MCP. Connector execution and truncation metadata,
not columns manufactured by KQL, determine whether a query completed.

Azure Data Explorer MCP may formulate a different query only after a fixed
query establishes a candidate. Follow-up must be read-only, bounded to the
candidate operation, version/cohort, and time range, and return only sanitized
aggregates. Follow-up cannot establish a candidate, replace a failed fixed
query, or override a failed quality, sample, privacy, confidence, persistence,
or cohort-consistency gate.

Follow-up may group only by the dimensions emitted by the fixed catalog:
operation, sanitized period/bin, extension version/channel, OS, runtime cohort,
startup path, and static safe error category. It must never select, project,
group by, summarize into a list, or render `projectPath`, `stack`, `error`,
`value`, `errorMessage`, `errorMessageV2`, `commandName`, `lastStep`, raw
`customDimensions`, raw `customMeasurements`, or any unreviewed dimension.

Every Kusto operation must use the configured `kusto.clusterUri` and
`kusto.database`. Every fixed query must read only from `kusto.table`. Do not
rely on an implicit cluster or database. An empty or placeholder allowlist
makes that section unavailable; never broaden it with prefix, suffix, regex,
or discovery matching.

## Window contract

- Current: the latest complete 24 hours after the configured ingestion delay.
- Previous: the immediately preceding non-overlapping 24 hours, recalculated
  on every run so late telemetry is incorporated.
- BaselineCurrent and BaselinePrevious: separate pools of the eight preceding
  same-weekday 24-hour windows for Current and Previous.
- Current and Previous are the only windows used for the two-window recurrence
  gate. Each window is compared with its matching baseline pool. Baseline days
  must not be represented as one continuous population.
- The occurrence marker prevents a repeated notification when recalculating
  Previous incorporates late telemetry.

The expected 10:00 UTC recurrence aligns windows to UTC day boundaries. This
matches the original day-binned analyses while leaving more than the
configured ingestion delay before execution.

## Outcome and duration contract

- `Succeeded`: reported succeeded and no error signal exists.
- `Failed`: reported failed, or any error signal exists.
- `Canceled`: explicit or verified user cancellation with no error signal.
- `Unknown`: missing or unrecognized result.
- `EvaluableAttempts = Succeeded + Failed`.
- `ActualSuccessRate = Succeeded / EvaluableAttempts`.
- Report cancellation and unknown rates separately.

Duration is in seconds unless its configured family says otherwise. Classify
each duration as `Valid`, `Missing`, `Malformed`, `Negative`, or `OutOfRange`.
Exclude invalid values from percentiles and report every invalid category.
Never average subgroup percentiles. Apply the privacy minimum independently to
physical telemetry rows in each event cell and physical valid-duration rows in
each latency cell before publishing counts, rates, or percentiles. Sampling
weights affect estimates and rates but never satisfy the privacy floor.

## Version and cohort contract

Preserve exact version text, normalized version core, configured release
channel, OS, and remote/runtime cohort. Keep stable and prerelease populations
separate when exact channel mappings are configured. When telemetry contains
no channel marker and no mapping exists, report the channel as `unknown`;
never infer it from odd/even version components.
Apply configured minimum and target versions. A newly observed version is
descriptive until it satisfies the applicable sample floor. Compare aggregate
results with concurrently active version/platform cohorts; a mix conflict
suppresses issue mutation.

## Privacy contract

Never emit raw telemetry rows, raw errors, stack traces, local paths, command
payloads, settings, subscription/tenant/resource/session/customer identifiers,
or pseudonymous user identifiers. Error text may only be mapped inside Kusto
to a static safe category.

Treat prior runs as privacy-sensitive evidence. Read only canonical status,
window, fingerprint, occurrence, and aggregate decision fields needed for
recurrence or deduplication. Never copy prior HTML, prompts, tool transcripts,
issue bodies, or raw history into a new result.

## Output contract

Once prerequisites pass, write exactly one regular UTF-8 file:
`/workspace/daily-health-email.html`. It must be nonempty, at most 512 KiB,
begin with `<!doctype html>`, contain exactly one `<html>`, `<head>`, and
`<body>`, and satisfy `report-rendering.md`. Do not create logs, sidecars,
temporary files, nested output directories, or alternate output names.

The HTML is always suitable for SharePoint archival. Email delivery is
conditional under `daily-health-orchestrator.md`; `NoFinding` and an
unmutated `Watchlist` are archived but are not emailed by default. The Logic
Apps email action must use the HTML file content directly, without wrapping it
in a paragraph or another HTML document.
