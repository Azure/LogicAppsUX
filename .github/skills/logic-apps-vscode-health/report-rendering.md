# Daily Health Report Rendering

Render one self-contained Outlook-safe HTML5 document. Every run uses the
same section order, palette, table styling, and card format; only data values
and the number of anomaly cards vary. Keep unavailable sections in place with
a muted explanation.

## Safety and delivery

- Inline CSS only. No `<style>`, JavaScript, handlers, forms, iframes, SVG,
  embedded objects, data URIs, remote images, fonts, or tracking pixels.
- Begin with `<!doctype html>` and include exactly one `<html>`, `<head>`, and
  `<body>`, plus UTF-8, viewport, and nonempty title metadata.
- Put a one-sentence plain-text fallback as the first body element.
- Escape dynamic text. Use only credential-free `https` links.
- Do not include raw telemetry, errors, prohibited identifiers, JSON, prompts,
  tool output, hidden evidence, or comments other than approved fingerprint
  and occurrence markers.
- Maximum size is 512 KiB.
- Outlook must receive the exact document content as its body. Do not wrap the
  document in `<p>`, `<div>`, or another HTML envelope. Archive the same bytes
  in SharePoint independently of email delivery.

## Foundation and palette

Use nested presentation tables for layout. Every table has
`role="presentation" cellpadding="0" cellspacing="0" border="0"`. Use
`font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;` on every text cell.
The body background is `#eef1f5`; the centered content table is 680px wide
with `max-width:100%` and background `#ffffff`. Base text is 14px, line-height
1.5, color `#1f2933`.

| Token | Hex |
|---|---|
| Ink | `#1f2933` |
| Muted | `#6b7280` |
| Border | `#e2e8f0` |
| Header row | `#2d3748` |
| Zebra | `#f7fafc` |
| Panel | `#f9fafb` |

| Status | Accent | Badge |
|---|---|---|
| `NoFinding` | `#137333` | NO FINDING |
| `Watchlist` | `#b06f00` | WATCHLIST |
| `IssueCreated` | `#1a56db` | ISSUE CREATED |
| `IssueUpdated` | `#1a56db` | ISSUE UPDATED |
| `DuplicateSuppressed` | `#5f6368` | DUPLICATE SUPPRESSED |
| `Degraded` | `#c05621` | DEGRADED |
| `Failed` | `#b91c1c` | FAILED |

Anomaly-card confidence accents are high `#b91c1c`, medium `#b06f00`, and low
`#5f6368`.

## Required section order

1. Header band with title, status badge, and plain-language summary.
2. Run metadata: opaque run ID, generated UTC time, and tools used.
3. Windows: Current, Previous, and the comparable baseline windows for each.
4. Data quality: state, freshness, ingestion delay, sampling, unknowns,
   malformed fields, event-contract drift, and warnings.
5. Query coverage: completed deterministic queries and unavailable optional
   sections.
6. Rollout and cohorts: versions/channels, exposure, OS/runtime mix, and any
   aggregate-versus-stratified conflict.
7. Aggregate health: family, operation, startup path, scope/cohort, Current
   versus BaselineCurrent, and Previous versus BaselinePrevious success and
   p95 values. Show cancellation and unknown rates.
8. Credible anomalies, or one green no-anomaly panel.
9. Design-time startup paths.
10. GitHub action and Copilot-assignment result.
11. Limitations.
12. Footer with self-contained/no-raw-telemetry notice, timestamp, and approved
    fingerprint/occurrence comments.

## Anomaly card

Show, in order: indexed title; effect; samples; Current/Previous recurrence;
hourly persistence; cohorts; probable root cause explicitly labeled as a
hypothesis until proven; confidence; supporting and conflicting evidence;
alternatives; next step; affected version; source-mapping status; exact SHA;
and verified paths. When mutation occurred, include acceptance criteria, issue
action/link, and Copilot result.

## Data tables

Use full-width tables with `border-collapse:collapse` and a 1px `#e2e8f0`
border. Header cells use `#2d3748`, white 12px uppercase text, left alignment,
and 8px 10px padding. Body cells use 8px 10px padding, top border, 13px
`#1f2933` text, and `#f7fafc` on even rows. Right-align numeric columns. Use
meaningful `<th>` elements and never use color as the only signal.
