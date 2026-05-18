import type { ICopilotWorkflowEditorService, WorkflowEditResponse } from '../copilotWorkflowEditor';
import type { Workflow } from '../../../utils/src';
import { ArgumentException } from '../../../utils/src';
import { parseCopilotResponse } from './copilot/copilotWorkflowEditorParsing';
import { executeCopilotTool } from './copilot/copilotWorkflowEditorTools';
import axios from 'axios';

export interface BaseCopilotWorkflowEditorServiceOptions {
  /** ARM base URL (e.g. https://management.azure.com) */
  baseUrl: string;
  /** Azure subscription ID */
  subscriptionId: string;
  /** Azure region (e.g. westus2) */
  location: string;
  /** ARM API version for the v3 endpoint */
  apiVersion: string;
  /** Function that returns a Bearer-prefixed ARM token (e.g. "Bearer eyJ...") */
  getAccessToken: () => Promise<string>;
}

/**
 * Copilot workflow editor service that calls the generateCopilotResponse
 * endpoint instead of making direct LLM calls. The backend handles all LLM
 * orchestration (system prompts, tool calling, etc.) server-side.
 */
export class BaseCopilotWorkflowEditorService implements ICopilotWorkflowEditorService {
  constructor(public readonly options: BaseCopilotWorkflowEditorServiceOptions) {
    const { baseUrl, subscriptionId, apiVersion, getAccessToken } = options;
    if (!baseUrl) {
      throw new ArgumentException('baseUrl required for BaseCopilotWorkflowEditorService');
    }
    if (!subscriptionId) {
      throw new ArgumentException('subscriptionId required for BaseCopilotWorkflowEditorService');
    }
    if (!apiVersion) {
      throw new ArgumentException('apiVersion required for BaseCopilotWorkflowEditorService');
    }
    if (!getAccessToken) {
      throw new ArgumentException('getAccessToken required for BaseCopilotWorkflowEditorService');
    }
  }

  async getWorkflowEdit(
    prompt: string,
    workflow: Workflow,
    signal?: AbortSignal,
    onProgress?: (status: string) => void
  ): Promise<WorkflowEditResponse> {
    const { baseUrl, subscriptionId, location, apiVersion, getAccessToken } = this.options;
    if (!location) {
      throw new ArgumentException('location required for BaseCopilotWorkflowEditorService');
    }
    const accessToken = await getAccessToken();
    if (!accessToken) {
      throw new ArgumentException('getAccessToken returned an empty or undefined token');
    }
    if (!accessToken.startsWith('Bearer ')) {
      throw new ArgumentException('getAccessToken must return a Bearer-prefixed token (e.g. "Bearer eyJ...")');
    }
    const uri = `${baseUrl}/subscriptions/${subscriptionId}/providers/Microsoft.Logic/locations/${location}/generateCopilotResponse`;

    const sku = this._resolveSku(workflow);
    const maxToolRounds = 10;

    let toolResults: Array<{ toolCallId: string; result: string }> | undefined;
    let previousToolCalls: Array<{ id: string; name: string; arguments: string }> | undefined;
    const discoveredConnectors: Record<string, { connectorId: string; connectorName: string }> = {};

    onProgress?.('thinking');

    for (let round = 0; round < maxToolRounds; round++) {
      const requestBody = {
        properties: {
          query: prompt,
          workflow: {
            definition: workflow.definition,
            kind: workflow.kind,
            connectionReferences: workflow.connectionReferences,
            ...(workflow.parameters && Object.keys(workflow.parameters).length > 0 ? { parameters: workflow.parameters } : {}),
            ...(workflow.notes && Object.keys(workflow.notes).length > 0 ? { notes: workflow.notes } : {}),
          },
          sku,
          ...(toolResults ? { toolResults, toolCalls: previousToolCalls } : {}),
        },
      };

      const response = await axios.post(uri, requestBody, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: accessToken,
        },
        params: { 'api-version': apiVersion },
        signal,
      });

      const responseType: string = response.data?.properties?.responseType ?? 'final';
      const toolCalls: Array<{ id: string; name: string; arguments: string }> | undefined = response.data?.properties?.toolCalls;

      if (responseType === 'tool_requests' && Array.isArray(toolCalls) && toolCalls.length > 0) {
        previousToolCalls = toolCalls;
        onProgress?.('searching-connectors');
        toolResults = await Promise.all(
          toolCalls.map(async (tc) => ({
            toolCallId: tc.id,
            result: await executeCopilotTool(tc.name, tc.arguments),
          }))
        );

        // Extract connector IDs from discover_connectors results for connection pre-population
        for (const tr of toolResults) {
          try {
            const parsed = JSON.parse(tr.result);
            for (const results of Object.values(parsed)) {
              if (!Array.isArray(results)) {
                continue;
              }
              for (const op of results as any[]) {
                if (op.connectorId && op.actionDefinition?.inputs?.host?.connection?.referenceName) {
                  const refName = op.actionDefinition.inputs.host.connection.referenceName;
                  discoveredConnectors[refName] = {
                    connectorId: op.connectorId,
                    connectorName: op.connectorName ?? refName,
                  };
                }
              }
            }
          } catch {
            // Tool result wasn't JSON or didn't have connector info — skip
          }
        }

        onProgress?.('building-workflow');
        continue;
      }

      const copilotResponseText: string = response.data?.properties?.response;
      if (!copilotResponseText) {
        return { type: 'text', text: 'Sorry, I was unable to generate a response. Please try again.' };
      }

      const result = parseCopilotResponse(copilotResponseText, workflow);
      if (Object.keys(discoveredConnectors).length > 0) {
        result.discoveredConnectors = discoveredConnectors;
      }
      return result;
    }

    // Tool loop exhausted — send one final request without tool results so the LLM
    // can respond to the user asking for clarification instead of hard-failing.
    const finalRequestBody = {
      properties: {
        query: prompt,
        workflow: {
          definition: workflow.definition,
          kind: workflow.kind,
          connectionReferences: workflow.connectionReferences,
          ...(workflow.parameters && Object.keys(workflow.parameters).length > 0 ? { parameters: workflow.parameters } : {}),
          ...(workflow.notes && Object.keys(workflow.notes).length > 0 ? { notes: workflow.notes } : {}),
        },
        sku,
        toolResults: toolResults?.map((tr) => ({
          ...tr,
          result: JSON.stringify({ error: 'Tool calling limit reached. Ask the user to clarify which connector or operation to use.' }),
        })),
        toolCalls: previousToolCalls,
      },
    };

    const finalResponse = await axios.post(uri, finalRequestBody, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: accessToken,
      },
      params: { 'api-version': apiVersion },
      signal,
    });

    const finalText: string = finalResponse.data?.properties?.response;
    if (finalText) {
      const result = parseCopilotResponse(finalText, workflow);
      if (Object.keys(discoveredConnectors).length > 0) {
        result.discoveredConnectors = discoveredConnectors;
      }
      return result;
    }

    return {
      type: 'text',
      text: "I wasn't able to find the right connectors. Could you clarify which service or connector you'd like to use?",
    };
  }

  /**
   * Maps the workflow kind to a SKU string expected by the v3 endpoint.
   */
  private _resolveSku(workflow: Workflow): string {
    const kind = workflow.kind?.toLowerCase();
    if (kind === 'stateful' || kind === 'stateless') {
      return 'standard';
    }
    return 'consumption';
  }
}
