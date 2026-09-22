---
name: logic-apps-vscode-health
description: >
  Run or maintain the daily Azure Logic Apps Standard VS Code extension
  live-site health monitor, including fixed Kusto analysis, source
  investigation, issue automation, and Outlook/SharePoint reporting.
---

# Logic Apps VS Code Health

Use this skill for the daily live-site monitor defined by the bundled files in
this directory.

Before running or changing the monitor, read:

1. `shared-health-contract.md`
2. `daily-health-orchestrator.md`
3. `logicappsux-source-investigation.md`
4. `report-rendering.md`
5. `fixed-query-catalog.md`
6. `health-config.json`

`daily-health-orchestrator.md` is the execution entry point. The other files
are its required contracts, fixed queries, rendering rules, and configuration.
Keep their shared allowlists, thresholds, query names, and output requirements
synchronized.

The deployed Logic Apps workflow loads the six resource files into the agent
workspace using those exact filenames. `SKILL.md` is the repository skill entry
point and is not one of the runtime input files.
