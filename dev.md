# Slice 4 implementation notes

## Completed in this slice
- Contained monitoring status presentation wired for shared action/scope/tool cards:
  - secondary status line (`data-node-subtitle-kind="status"`)
  - inset 2px perimeter (`data-node-status-perimeter`)
  - failed-only tint (`data-status-tint="failed"`)
  - truthful status labels preserved (`Timed out`, `Waiting`, etc.) via host mapping
- Small tool overhang reserve is removed only for contained status mode; default badge behavior remains.
- Shared tool geometry reserve in layout now uses canonical small tool height (no badge overhang coupling).
- Updated directly impacted E2E selectors/expectations from edge badges to contained status contracts in monitoring flows.
- Added focused unit coverage for contained status rendering, failed-only tint, truthful status mapping, and shared-family contained status behavior.

## Deferred visual blockers
- Browser geometry validation and Playwright execution were deferred for this slice per constraints:
  - no localhost/webServer startup in this session
  - no independently supplied browser measurement environment
- E2E spec updates were made, but live visual/geometry execution evidence is pending in a runtime that can run Playwright against the shared harness.
