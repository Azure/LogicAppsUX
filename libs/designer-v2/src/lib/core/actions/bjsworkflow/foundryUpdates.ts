import { updateFoundryAgent, CognitiveServiceService } from '@microsoft/logic-apps-shared';
import type { UpdateFoundryAgentOptions } from '@microsoft/logic-apps-shared';

interface PendingFoundryUpdate {
  projectEndpoint: string;
  agentId: string;
  updates: UpdateFoundryAgentOptions;
}

const pendingUpdates = new Map<string, PendingFoundryUpdate>();

/**
 * Register a pending Foundry agent update (model and/or instructions change).
 * Call this from the ParameterSection when the user edits Foundry agent properties.
 */
export function setPendingFoundryUpdate(nodeId: string, update: PendingFoundryUpdate): void {
  pendingUpdates.set(nodeId, update);
}

/**
 * Clear a pending update for a specific node.
 */
export function clearPendingFoundryUpdate(nodeId: string): void {
  pendingUpdates.delete(nodeId);
}

/**
 * Flush all pending Foundry agent updates by calling the PATCH API.
 * Call this from the host's save workflow flow, alongside serializeWorkflow().
 * Returns an array of results (resolved or rejected).
 */
export async function flushPendingFoundryUpdates(): Promise<PromiseSettledResult<void>[]> {
  const entries = Array.from(pendingUpdates.entries());
  if (entries.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(
    entries.map(async ([nodeId, { projectEndpoint, agentId, updates }]) => {
      const getToken = CognitiveServiceService().getFoundryAccessToken;
      if (!getToken) {
        throw new Error('Foundry access token getter is not available');
      }
      const token = await getToken();
      await updateFoundryAgent(projectEndpoint, agentId, token, updates);
      pendingUpdates.delete(nodeId);
    })
  );

  return results;
}

/**
 * Check if there are any pending Foundry updates.
 */
export function hasPendingFoundryUpdates(): boolean {
  return pendingUpdates.size > 0;
}
