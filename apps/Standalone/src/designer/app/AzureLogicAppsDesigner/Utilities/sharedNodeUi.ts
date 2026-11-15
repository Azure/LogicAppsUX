/**
 * Standalone-only opt-in for the shared node UI (`?useSharedNodeUi=true`).
 *
 * Only the exact lowercase value `true` enables it, matching the Local designer harness, so a
 * missing, `false`, `1`, or differently cased value keeps the legacy (flag-off) experience.
 */
export const isSharedNodeUiRequested = (search: string): boolean => new URLSearchParams(search).get('useSharedNodeUi') === 'true';
