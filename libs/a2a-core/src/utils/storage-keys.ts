/**
 * Utility functions for generating storage keys that properly isolate
 * sessions between different agents
 */

/**
 * Generates a unique identifier for an agent based on its URL
 * This ensures sessions are isolated between different agents on the same domain
 */
export function getAgentStorageIdentifier(agentUrl: string): string {
  try {
    const url = new URL(agentUrl);

    // Extract the path and normalize it
    let path = url.pathname;

    // Remove trailing slashes
    path = path.replace(/\/+$/, '');

    // Remove common suffixes
    path = path.replace(/\/(\.well-known\/)?agent(-card)?\.json$/, '');
    path = path.replace(/\/IFrame$/i, '');
    path = path.replace(/\/iframe$/i, '');

    // If path is empty after cleaning, use the host
    if (!path || path === '/') {
      return url.host.replace(/\./g, '-');
    }

    // Create a safe key by replacing special characters
    const safeKey = path
      .split('/')
      .filter(Boolean)
      .join('-')
      .replace(/[^a-zA-Z0-9-_]/g, '-');

    // Include host for additional uniqueness
    const hostKey = url.host.replace(/\./g, '-');

    return `${hostKey}-${safeKey}`;
  } catch (error) {
    // Fallback for invalid URLs - create a hash of the URL
    const hashNum = agentUrl
      .split('')
      .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0);

    const hashStr = Math.abs(hashNum).toString(36);
    return `agent-${hashStr}`;
  }
}

/**
 * Generates a storage key for messages that includes agent isolation
 */
export function getAgentMessagesStorageKey(agentUrl: string, sessionKey: string): string {
  const agentId = getAgentStorageIdentifier(agentUrl);
  return `a2a-messages-${agentId}-${sessionKey}`;
}

/**
 * Generates a storage key for context ID that includes agent isolation
 */
export function getAgentContextStorageKey(agentUrl: string, sessionKey: string): string {
  const agentId = getAgentStorageIdentifier(agentUrl);
  return `a2a-context-${agentId}-${sessionKey}`;
}

/**
 * Extracts agent identifier from a storage key
 */
export function extractAgentFromStorageKey(storageKey: string): string | null {
  const messagesMatch = storageKey.match(/^a2a-messages-([^-]+(?:-[^-]+)*)-/);
  const contextMatch = storageKey.match(/^a2a-context-([^-]+(?:-[^-]+)*)-/);

  const match = messagesMatch || contextMatch;
  return match ? match[1] : null;
}
