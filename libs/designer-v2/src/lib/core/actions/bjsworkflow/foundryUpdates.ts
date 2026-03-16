import { updateFoundryAgentViaProxy, CognitiveServiceService } from '@microsoft/logic-apps-shared';
import type { UpdateFoundryAgentOptions } from '@microsoft/logic-apps-shared';

interface PendingFoundryUpdate {
  projectEndpoint: string;
  agentId: string;
  updates: UpdateFoundryAgentOptions;
}

const pendingUpdates = new Map<string, PendingFoundryUpdate>();

/**
 * Tracks nodes whose Foundry agent was just updated (new version created).
 * Consumed by the parametersTab auto-select effect to bump the version number.
 */
const recentlyFlushedNodes = new Set<string>();

/** Register a pending Foundry agent update (model and/or instructions change). */
export function setPendingFoundryUpdate(nodeId: string, update: PendingFoundryUpdate): void {
  pendingUpdates.set(nodeId, update);
}

/** Clear a pending update for a specific node. */
export function clearPendingFoundryUpdate(nodeId: string): void {
  pendingUpdates.delete(nodeId);
}

/** Check whether a node needs a version refresh (without consuming the flag). */
export function needsVersionRefresh(nodeId: string): boolean {
  return recentlyFlushedNodes.has(nodeId);
}

/**
 * Consume the "recently flushed" flag for a node.
 * Returns true (and clears the flag) if the node's Foundry agent was recently updated.
 * Call only after confirming the new version is available to avoid losing the flag.
 */
export function consumeVersionRefresh(nodeId: string): boolean {
  return recentlyFlushedNodes.delete(nodeId);
}

/**
 * Flush all pending Foundry agent updates by calling the update API.
 * Only clears successfully flushed entries; failed entries remain for retry.
 * Throws an aggregated error if any updates failed.
 * @param onFlushed Optional callback invoked with the node IDs that were successfully flushed.
 */
export async function flushPendingFoundryUpdates(onFlushed?: (flushedNodeIds: string[]) => void): Promise<PromiseSettledResult<void>[]> {
  const entries = Array.from(pendingUpdates.entries());
  if (entries.length === 0) {
    return [];
  }

  const service = CognitiveServiceService();
  const httpClient = service.httpClient;
  const proxyBaseUrl = service.foundryProxyBaseUrl;
  if (!httpClient || !proxyBaseUrl) {
    return [];
  }

  const flushedNodeIds: string[] = [];

  const results = await Promise.allSettled(
    entries.map(async ([nodeId, { projectEndpoint, agentId, updates }]) => {
      await updateFoundryAgentViaProxy({ httpClient, proxyBaseUrl, foundryEndpoint: projectEndpoint }, agentId, updates);
      // Only clear this entry on success
      pendingUpdates.delete(nodeId);
      recentlyFlushedNodes.add(nodeId);
      flushedNodeIds.push(nodeId);
    })
  );

  if (flushedNodeIds.length > 0) {
    onFlushed?.(flushedNodeIds);
  }

  const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (failures.length > 0) {
    const messages = failures.map((f) => (f.reason instanceof Error ? f.reason.message : String(f.reason)));
    throw new Error(`Foundry agent update failed: ${messages.join('; ')}`);
  }

  return results;
}

/** Check if there are any pending Foundry updates. */
export function hasPendingFoundryUpdates(): boolean {
  return pendingUpdates.size > 0;
}

/** Retrieve the pending update for a specific node (if any). */
export function getPendingFoundryUpdate(nodeId: string): PendingFoundryUpdate | undefined {
  return pendingUpdates.get(nodeId);
}
