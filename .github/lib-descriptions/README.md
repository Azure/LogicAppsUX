# Library Descriptions

This directory contains structured descriptions of each library in the monorepo.
These files are used by the **issue triage agent** (`.github/workflows/issue-triage-agent.md`)
to understand library responsibilities, boundaries, and common issue patterns when
analyzing new GitHub issues.

## File naming

Each file is named `{library-directory}.md` (e.g., `designer.md` for `libs/designer/`).

## When to update

Update these files when:
- A library's responsibilities or boundaries change significantly
- New common issue patterns emerge that would help triage accuracy
- A new library is added to `libs/`
