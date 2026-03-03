import { updateFoundryAgent, CognitiveServiceService } from '@microsoft/logic-apps-shared';
import type { UpdateFoundryAgentOptions } from '@microsoft/logic-apps-shared';

interface PendingFoundryUpdate {
  projectEndpoint: string;
  agentId: string;
  updates: UpdateFoundryAgentOptions;
}

const pendingUpdates = new Map<string, PendingFoundryUpdate>();

/** Register a pending Foundry agent update (model and/or instructions change). */
export function setPendingFoundryUpdate(nodeId: string, update: PendingFoundryUpdate): void {
  pendingUpdates.set(nodeId, update);
}

/** Clear a pending update for a specific node. */
export function clearPendingFoundryUpdate(nodeId: string): void {
  pendingUpdates.delete(nodeId);
}

/**
 * Flush all pending Foundry agent updates by calling the update API.
 * Only clears successfully flushed entries; failed entries remain for retry.
 * Throws an aggregated error if any updates failed.
 */
export async function flushPendingFoundryUpdates(): Promise<PromiseSettledResult<void>[]> {
  const entries = Array.from(pendingUpdates.entries());
  if (entries.length === 0) {
    return [];
  }

  const getToken = CognitiveServiceService().getFoundryAccessToken;
  if (!getToken) {
    // Token getter not configured (e.g. VS Code) — skip silently
    return [];
  }

  const results = await Promise.allSettled(
    entries.map(async ([nodeId, { projectEndpoint, agentId, updates }]) => {
      const token = await getToken();
      await updateFoundryAgent(projectEndpoint, agentId, token, updates);
      // Only clear this entry on success
      pendingUpdates.delete(nodeId);
    })
  );

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
