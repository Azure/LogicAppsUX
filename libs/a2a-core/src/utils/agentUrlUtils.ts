/**
 * Utility functions for working with agent URLs and agent card URLs
 */

/**
 * Determines if a URL is a direct agent card URL (points directly to a JSON file)
 * @param url - The URL to check
 * @returns true if the URL is a direct agent card URL, false otherwise
 *
 * @example
 * ```ts
 * isDirectAgentCardUrl('https://example.com/.well-known/agent-card.json') // true
 * isDirectAgentCardUrl('https://example.com/agent.json') // true
 * isDirectAgentCardUrl('https://example.com') // false
 * ```
 */
export function isDirectAgentCardUrl(url: string): boolean {
  return url.includes('/.well-known/agent-card.json') || url.endsWith('.json');
}
