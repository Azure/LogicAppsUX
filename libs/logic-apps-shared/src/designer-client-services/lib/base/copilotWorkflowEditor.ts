import type { ICopilotWorkflowEditorService, WorkflowEditResponse } from '../copilotWorkflowEditor';
import type { Workflow } from '../../../utils/src';
import { ArgumentException } from '../../../utils/src';
import { parseCopilotResponse } from './copilot/copilotWorkflowEditorParsing';
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

  async getWorkflowEdit(prompt: string, workflow: Workflow, signal?: AbortSignal): Promise<WorkflowEditResponse> {
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

    const copilotResponseText: string = response.data?.properties?.response;
    if (!copilotResponseText) {
      throw new Error('No response received from copilot API');
    }

    return parseCopilotResponse(copilotResponseText, workflow);
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
