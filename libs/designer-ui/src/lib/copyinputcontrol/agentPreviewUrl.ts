import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';

/**
 * Shared destination-safety boundary for every Agent-preview navigation sink
 * (CopyInputControlWithAgent's direct popup, AgentUrlViewer's iframe src and
 * fallback popup). Mirrors the parsed-protocol validation already used for
 * a2a popup authentication (libs/a2a-core/src/utils/popup-window.ts):
 * only `https:`, or the documented `http:` loopback preview host, may ever
 * reach a navigation sink. This is independent of, and in addition to, the
 * runtime-only `ParameterInfo.agentUrlMetadata` provenance gate upstream --
 * even a trusted-origin chatUrl value must parse to an allowed scheme
 * before any query credential is attached or any sink navigates.
 *
 * Validates using the URL parser's own protocol/hostname semantics (which
 * normalizes case and strips embedded control characters per the WHATWG URL
 * spec) instead of a string-prefix check, so a disallowed scheme cannot be
 * smuggled past a textual match (e.g. mixed case, or a tab/newline inside
 * the scheme). The original string is still what every sink navigates to --
 * this function only decides whether it is safe to do so; it never
 * rewrites or normalizes the destination itself.
 */

const ALLOWED_AGENT_PREVIEW_PROTOCOLS = new Set(['https:']);
const ALLOWED_AGENT_PREVIEW_LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

export function isSafeAgentPreviewUrl(candidate: string | undefined): boolean {
  if (!candidate) {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    logBlockedAgentPreviewDestination('malformed');
    return false;
  }

  if (parsed.protocol === 'http:' && ALLOWED_AGENT_PREVIEW_LOOPBACK_HOSTNAMES.has(parsed.hostname)) {
    return true;
  }

  if (!ALLOWED_AGENT_PREVIEW_PROTOCOLS.has(parsed.protocol)) {
    logBlockedAgentPreviewDestination(parsed.protocol);
    return false;
  }

  return true;
}

function logBlockedAgentPreviewDestination(reason: string): void {
  // Logs only the disallowed-protocol/"malformed" reason, never the raw destination or any
  // query string, so a blocked attempt cannot leak a secret/payload into logs.
  LoggerService().log({
    level: LogEntryLevel.Warning,
    area: 'AgentUrlPreview_BlockedDestination',
    message: `Blocked an agent-preview destination with a disallowed or malformed value (${reason}).`,
  });
}
