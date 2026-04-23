import type { ICopilotWorkflowEditorService, WorkflowEditResponse } from '../copilotWorkflowEditor';
import type { Workflow } from '../../../utils/src';
import { ArgumentException } from '../../../utils/src';
import { parseCopilotResponse } from './copilotWorkflowEditorParsing';
import axios from 'axios';

export interface ArmCopilotWorkflowEditorServiceOptions {
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
 * Copilot workflow editor service that calls the ARM v3 generateCopilotResponse
 * endpoint instead of making direct LLM calls. The backend handles all LLM
 * orchestration (system prompts, tool calling, etc.) server-side.
 */
export class ArmCopilotWorkflowEditorService implements ICopilotWorkflowEditorService {
  private readonly baseUrl: string;
  private readonly subscriptionId: string;
  private readonly location: string;
  private readonly apiVersion: string;
  private readonly getAccessToken: () => Promise<string>;

  constructor(options: ArmCopilotWorkflowEditorServiceOptions) {
    const { baseUrl, subscriptionId, location, apiVersion, getAccessToken } = options;
    if (!baseUrl) {
      throw new ArgumentException('baseUrl required for ArmCopilotWorkflowEditorService');
    }
    if (!subscriptionId) {
      throw new ArgumentException('subscriptionId required for ArmCopilotWorkflowEditorService');
    }
    if (!location) {
      throw new ArgumentException('location required for ArmCopilotWorkflowEditorService');
    }
    if (!apiVersion) {
      throw new ArgumentException('apiVersion required for ArmCopilotWorkflowEditorService');
    }
    if (!getAccessToken) {
      throw new ArgumentException('getAccessToken required for ArmCopilotWorkflowEditorService');
    }

    this.baseUrl = baseUrl;
    this.subscriptionId = subscriptionId;
    this.location = location;
    this.apiVersion = apiVersion;
    this.getAccessToken = getAccessToken;
  }

  async getWorkflowEdit(prompt: string, workflow: Workflow, signal?: AbortSignal): Promise<WorkflowEditResponse> {
    const accessToken = await this.getAccessToken();
    const uri = `${this.baseUrl}/subscriptions/${this.subscriptionId}/providers/Microsoft.Logic/locations/${this.location}/generateCopilotResponse`;

    const sku = this._resolvesku(workflow);

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
      params: { 'api-version': this.apiVersion },
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
  private _resolvesku(workflow: Workflow): string {
    const kind = workflow.kind?.toLowerCase();
    if (kind === 'stateful' || kind === 'stateless') {
      return 'standard';
    }
    return 'consumption';
  }
}
