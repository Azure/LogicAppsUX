import { inputsResponse, outputsResponse } from '../__test__/__mocks__/monitoringInputsOutputsResponse';
import type { HttpRequestOptions, IHttpClient } from '../httpClient';
import type { IRunService } from '../run';
import type { CallbackInfo } from '../callbackInfo';
import type { ContentLink, Runs, ArmResources, Run, LogicAppsV2 } from '../../../utils/src';
import {
  ArgumentException,
  isCallbackInfoWithRelativePath,
  HTTP_METHODS,
  getCallbackUrl,
  getRecordEntry,
  UnsupportedException,
  isNullOrUndefined,
} from '../../../utils/src';
import { LoggerService } from '../logger';
import { LogEntryLevel } from '../logging/logEntry';

export interface ConsumptionRunServiceOptions {
  apiVersion: string;
  baseUrl: string;
  httpClient: IHttpClient;
  updateCors?: () => void;
  accessToken?: string;
  workflowId: string;
  isDev?: boolean;
}

export class ConsumptionRunService implements IRunService {
  _isDev = false;

  constructor(public readonly options: ConsumptionRunServiceOptions) {
    const { apiVersion, baseUrl, isDev } = options;
    if (!baseUrl) {
      throw new ArgumentException('baseUrl required');
    }
    if (!apiVersion) {
      throw new ArgumentException('apiVersion required');
    }
    this._isDev = isDev || false;
  }

  async getContent(contentLink: ContentLink): Promise<any> {
    const { uri, contentSize } = contentLink;
    const { httpClient } = this.options;

    if (!uri) {
      throw new Error();
    }

    LoggerService().log({
      level: LogEntryLevel.Verbose,
      area: 'getContent consumption run service',
      message: `Content size: ${contentSize}`,
      args: [`size: ${contentSize}`],
    });

    // 2MB
    if (contentSize > 2097152) {
      return undefined;
    }

    try {
      const response = await httpClient.get<any>({
        uri,
        noAuth: true,
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
      return response;
    } catch (e: any) {
      throw new Error(e.message);
    }
  }

  private getAccessTokenHeaders = () => {
    const { accessToken } = this.options;
    if (!accessToken) {
      return undefined;
    }

    return new Headers({
      Authorization: accessToken,
    });
  };

  async getMoreRuns(continuationToken: string): Promise<Runs> {
    const headers = this.getAccessTokenHeaders();
    const { httpClient } = this.options;

    try {
      const response = await httpClient.get<ArmResources<Run>>({
        uri: continuationToken,
        headers: headers as Record<string, any>,
      });

      const { nextLink, value: runs }: ArmResources<Run> = response;
      return { nextLink, runs };
    } catch (e: any) {
      throw new Error(e.message);
    }
  }

  /**
   * Gets run details.
   * @param {string} runId - Run id.
   * @returns {Promise<Run>} Workflow runs.
   */
  async getRun(runId: string): Promise<Run> {
    const { apiVersion, baseUrl, httpClient } = this.options;

    const uri = `${baseUrl}${runId}?api-version=${apiVersion}&$expand=properties/actions,workflow/properties`;

    try {
      const response = await httpClient.get<Run>({
        uri,
      });
      return response;
    } catch (e: any) {
      throw new Error(e.message);
    }
  }

  /**
   * Gets workflow run history
   * @returns {Promise<Runs>} Workflow runs.
   */
  async getRuns(): Promise<Runs> {
    const { apiVersion, baseUrl, workflowId, httpClient } = this.options;
    const headers = this.getAccessTokenHeaders();

    const uri = `${baseUrl}${workflowId}/runs?api-version=${apiVersion}`;
    try {
      const response = await httpClient.get<ArmResources<Run>>({
        uri,
        headers: headers as Record<string, any>,
      });

      const { nextLink, value: runs }: ArmResources<Run> = response;
      return { nextLink, runs };
    } catch (e: any) {
      throw new Error(e.message);
    }
  }

  /**
   * Gets an array of scope repetition records for a node with the specified status.
   * @param {{ actionId: string, runId: string }} action - An object with nodeId and the runId of the workflow
   * @param {string} status - The status of scope repetition records to fetch
   * @return {Promise<RunScopeRepetition[]>}
   */
  async getScopeRepetitions(
    action: { nodeId: string; runId: string | undefined },
    status?: string
  ): Promise<{ value: LogicAppsV2.RunRepetition[] }> {
    const { nodeId, runId } = action;

    if (this._isDev) {
      return Promise.resolve({ value: [] });
    }

    const { apiVersion, baseUrl, httpClient } = this.options;
    const headers = this.getAccessTokenHeaders();

    const filter = status ? `&$filter=status eq '${status}'` : '';
    const uri = `${baseUrl}${runId}/actions/${nodeId}/scopeRepetitions?api-version=${apiVersion}${filter}`;

    try {
      const response = await httpClient.get<{ value: LogicAppsV2.RunRepetition[] }>({
        uri,
        headers: headers as Record<string, any>,
      });

      return response;
    } catch (e: any) {
      throw new Error(e.message);
    }
  }

  /**
   * Retrieves additional scope repetitions using a continuation token.
   *
   * @param continuationToken - The token used to fetch the next set of scope repetitions.
   * @returns A promise that resolves with the response containing the scope repetitions.
   * @throws Throws an error if the HTTP request fails.
   */
  async getMoreScopeRepetitions(continuationToken: string): Promise<{ value: LogicAppsV2.RunRepetition[]; nextLink?: string }> {
    const { httpClient } = this.options;
    const headers = this.getAccessTokenHeaders();

    try {
      const response = await httpClient.get<{ value: LogicAppsV2.RunRepetition[]; nextLink?: string }>({
        uri: continuationToken,
        headers: headers as Record<string, any>,
      });

      return response;
    } catch (e: any) {
      throw new Error(e.message);
    }
  }

  /**
   * Gets an array of workflow-level action repetitions for a run.
   * @param {string} runId - The ID of the workflow run.
   * @returns {Promise<any>}
   */
  async getTimelineRepetitions(_runId: string): Promise<any> {
    // A2A is not supported in consumption
    return undefined;
  }

  /**
   * Gets an array of scope repetition records for a node with the specified status.
   * @param {{ actionId: string, runId: string }} action - An object with nodeId and the runId of the workflow
   * @param {string} repetitionId - A string with the resource ID of a repetition record
   * @return {Promise<RunScopeRepetition[]>}
   */
  async getAgentRepetition(
    action: { nodeId: string; runId: string | undefined },
    repetitionId: string
  ): Promise<LogicAppsV2.RunRepetition> {
    const { nodeId, runId } = action;

    const { apiVersion, baseUrl, httpClient } = this.options;
    const headers = this.getAccessTokenHeaders();

    const uri = `${baseUrl}${runId}/actions/${nodeId}/agentRepetitions/${repetitionId}?api-version=${apiVersion}`;

    try {
      const response = await httpClient.get<LogicAppsV2.RunRepetition>({
        uri,
        headers: headers as Record<string, any>,
      });

      return response;
    } catch (e: any) {
      throw new Error(e.message);
    }
  }

  /**
   * Retrieves the agent repetitions for a specific action node and run.
   * @param action - An object containing the identifier for the action node and the run ID.
   * @param action.nodeId - The unique identifier for the action node.
   * @param action.runId - The identifier of the run; can be undefined.
   * @returns A promise that resolves to an array of agent repetitions.
   * @throws Will throw an error if the HTTP request fails.
   */
  async getAgentRepetitions(action: { nodeId: string; runId: string | undefined }): Promise<LogicAppsV2.RunRepetition[]> {
    const { nodeId, runId } = action;

    const { apiVersion, baseUrl, httpClient } = this.options;
    const headers = this.getAccessTokenHeaders();

    const uri = `${baseUrl}${runId}/actions/${nodeId}/agentRepetitions?api-version=${apiVersion}`;

    try {
      const response = await httpClient.get<LogicAppsV2.RunRepetition[]>({
        uri,
        headers: headers as Record<string, any>,
      });

      return (response as any).value;
    } catch (e: any) {
      throw new Error(e.message);
    }
  }

  /**
   * Gets an array of scope repetition records for a node with the specified status.
   * @param {{ actionId: string, runId: string }} action - An object with nodeId and the runId of the workflow
   * @param {string} repetitionId - A string with the resource ID of a repetition record
   * @return {Promise<RunScopeRepetition[]>}
   */
  async getAgentActionsRepetition(action: { nodeId: string; runId: string | undefined }, repetitionId: string): Promise<any> {
    const { nodeId, runId } = action;

    const { apiVersion, baseUrl, httpClient } = this.options;
    const headers = this.getAccessTokenHeaders();

    const uri = `${baseUrl}${runId}/actions/${nodeId}/agentRepetitions/${repetitionId}/actions?api-version=${apiVersion}`;

    try {
      const response = await httpClient.get<LogicAppsV2.RunRepetition>({
        uri,
        headers: headers as Record<string, any>,
      });

      return response;
    } catch (e: any) {
      throw new Error(e.message);
    }
  }

  /**
   * Retrieves additional agent actions repetition data based on the provided continuation token.
   *
   * This method constructs an HTTP GET request using the continuation token as the URI and leverages the authorized HTTP client.
   * It returns a promise that resolves with the run repetition data in the form of a [[LogicAppsV2.RunRepetition]] object.
   * @param continuationToken - A string token used to fetch the next set of agent actions repetition data.
   * @returns A promise that resolves with the run repetition data.
   * @throws Will throw an error with the corresponding message if the HTTP request fails.
   */
  async getMoreAgentActionsRepetition(continuationToken: string): Promise<any> {
    const { httpClient } = this.options;
    const headers = this.getAccessTokenHeaders();

    try {
      const response = await httpClient.get<LogicAppsV2.RunRepetition>({
        uri: continuationToken,
        headers: headers as Record<string, any>,
      });

      return response;
    } catch (e: any) {
      throw new Error(e.message);
    }
  }

  /**
   * Gets the repetition record for the repetition item with the specified ID
   * @param {{ actionId: string, runId: string }} action - An object with nodeId and the runId of the workflow
   * @param {string} repetitionId - A string with the resource ID of a repetition record
   * @return {Promise<any>}
   */
  async getRepetition(action: { nodeId: string; runId: string | undefined }, repetitionId: string): Promise<LogicAppsV2.RunRepetition> {
    const { apiVersion, baseUrl, httpClient } = this.options;
    const { nodeId, runId } = action;
    const headers = this.getAccessTokenHeaders();

    const uri = `${baseUrl}${runId}/actions/${nodeId}/repetitions/${repetitionId}?api-version=${apiVersion}`;
    try {
      const response = await httpClient.get<LogicAppsV2.RunRepetition>({
        uri,
        headers: headers as Record<string, any>,
      });

      return response;
    } catch (e: any) {
      throw new Error(e.message);
    }
  }

  /**
   * Gets all repetitions for the action
   * @param {{ actionId: string, runId: string }} action - An object with nodeId and the runId of the workflow
   */
  async getRepetitions(action: { nodeId: string; runId: string | undefined }): Promise<LogicAppsV2.RunRepetition[]> {
    const { apiVersion, baseUrl, httpClient } = this.options;
    const { nodeId, runId } = action;
    const headers = this.getAccessTokenHeaders();

    const uri = `${baseUrl}${runId}/actions/${nodeId}/repetitions?api-version=${apiVersion}`;
    try {
      const response = await httpClient.get<LogicAppsV2.RunRepetition[]>({
        uri,
        headers: headers as Record<string, any>,
      });

      return (response as any).value;
    } catch (e: any) {
      throw new Error(e.message);
    }
  }

  /**
   * Triggers a workflow run
   * @param {CallbackInfo} callbackInfo - Information to call Api to trigger workflow.
   * @param {any} options - Options for the trigger call including headers, queries and body.
   */
  async runTrigger(callbackInfo: CallbackInfo, options?: any): Promise<any> {
    const { httpClient } = this.options;
    const method = isCallbackInfoWithRelativePath(callbackInfo) ? callbackInfo.method : HTTP_METHODS.POST;
    const uri = getCallbackUrl(callbackInfo);
    if (!uri) {
      throw new Error();
    }

    try {
      // Parse query params from uri
      const [baseUri, queryString] = uri.split('?');
      const urlSearchParams = new URLSearchParams(queryString ?? '');
      const uriParams: Record<string, string> = {};
      urlSearchParams.forEach((value, key) => {
        uriParams[key] = value;
      });

      // Merge with options?.queries (options take precedence)
      const mergedParams = { ...uriParams, ...(options?.queries ?? {}) };

      return await this.getHttpRequestByMethod(httpClient, method, {
        uri: baseUri,
        returnHeaders: true,
        headers: options?.headers,
        queryParameters: mergedParams,
        content: options?.body,
      });
    } catch (e: any) {
      throw new Error(`${e.status} ${e?.data?.error?.message}`);
    }
  }

  /**
   * Gets the inputs and outputs for an action repetition from a workflow run
   * @param {{inputsLink: ContentLink, outputsLink: ContentLink}} actionMetadata - Workflow file path.
   * @param {string} nodeId - Action ID.
   * @returns {Promise<any>} Action inputs and outputs.
   */
  async getActionLinks(actionMetadata: { inputsLink?: ContentLink; outputsLink?: ContentLink }, nodeId: string): Promise<any> {
    const { inputsLink, outputsLink } = actionMetadata ?? {};
    const { updateCors } = this.options;
    let inputs: Record<string, any> = {};
    let outputs: Record<string, any> = {};

    if (this._isDev) {
      inputs = getRecordEntry(inputsResponse, nodeId) ?? {};
      outputs = getRecordEntry(outputsResponse, nodeId) ?? {};
      return Promise.resolve({ inputs, outputs });
    }

    try {
      if (outputsLink && outputsLink.uri) {
        outputs = await this.getContent(outputsLink);
      }
      if (inputsLink && inputsLink.uri) {
        inputs = await this.getContent(inputsLink);
      }
    } catch (e: any) {
      if (e.message.includes('Failed to fetch') && !isNullOrUndefined(updateCors)) {
        updateCors();
      } else {
        throw new Error(e.message);
      }
    }

    return { inputs, outputs };
  }

  /**
   * Gets http request acording to method.
   * @param {IHttpClient} httpClient - HTTP Client.
   * @param {string} method - HTTP method.
   * @param {HttpRequestOptions<unknown>} options - Request options.
   * @returns {Promise<any>}
   */
  getHttpRequestByMethod(httpClient: IHttpClient, method: string, options: HttpRequestOptions<unknown>): Promise<any> {
    switch (method.toLowerCase()) {
      case 'get':
        return httpClient.get(options);
      case 'post':
        return httpClient.post(options);
      case 'put':
        return httpClient.put(options);
      default:
        throw new UnsupportedException(`Unsupported call connector method - '${method}'`);
    }
  }

  /**
   * Retrieves the chat history for a specified run.
   * @param runId - The unique identifier of the run.
   * @returns
   */

  async getRunChatHistory(runId: string): Promise<any> {
    const { apiVersion, baseUrl, httpClient } = this.options;
    const headers = this.getAccessTokenHeaders();
    const uri = `${baseUrl}${runId}/chatHistory?api-version=${apiVersion}&$expand=properties/actions,workflow/properties`;

    try {
      const response = await httpClient.get<any>({
        uri,
        headers: headers as Record<string, any>,
      });
      return response.value;
    } catch (e: any) {
      throw new Error(e.message);
    }
  }

  /**
   * Retrieves the chat history for a specified action.
   *
   * This function constructs a URI based on the provided runId and nodeId, along with the
   * baseUrl and apiVersion from the options. It then sends an HTTP GET request to obtain the
   * chat history information associated with the specified action.
   * @param action - An object containing the necessary identifiers.
   * @param action.nodeId - The unique identifier of the node to retrieve the chat history for.
   * @param action.runId - The unique identifier of the run; may be undefined.
   * @returns A promise that resolves with the chat history response.
   * @throws {Error} Throws an error with a message if the HTTP request fails.
   */
  async getActionChatHistory(action: { nodeId: string; runId: string | undefined }): Promise<any> {
    const { apiVersion, baseUrl, httpClient } = this.options;
    const { nodeId, runId } = action;
    const headers = this.getAccessTokenHeaders();

    const uri = `${baseUrl}${runId}/actions/${nodeId}/chatHistory?api-version=${apiVersion}`;
    try {
      const response = await httpClient.get<any>({
        uri,
        headers: headers as Record<string, any>,
      });

      return response.value;
    } catch (e: any) {
      throw new Error(e.message);
    }
  }

  /**
   * Retrieves the chat history for a specified action.
   *
   * This function constructs a URI based on the provided runId and nodeId, along with the
   * baseUrl and apiVersion from the options. It then sends an HTTP GET request to obtain the
   * chat history information associated with the specified action.
   * @param action - An object containing the necessary identifiers.
   * @param action.id - Id suffix for agent and channel.
   * @returns A promise that resolves with the agent chat url.
   * @throws {Error} Throws an error with a message if the HTTP request fails.
   */
  async getAgentChatInvokeUri(action: { idSuffix: string }): Promise<any> {
    const { apiVersion, baseUrl, httpClient } = this.options;
    const { idSuffix } = action;
    const headers = this.getAccessTokenHeaders();

    const uri = `${baseUrl}${idSuffix}/listCallBackUrl?api-version=${apiVersion}`;
    try {
      const response = await httpClient.post({
        uri,
        headers: headers as Record<string, any>,
      });

      return response;
    } catch (e: any) {
      throw new Error(e.message);
    }
  }

  async invokeAgentChat(action: { id: string; data: any }): Promise<any> {
    const { httpClient } = this.options;
    const { id: uri, data } = action;

    try {
      const response = await httpClient.post<any, any>({
        uri,
        content: data,
      });

      return response;
    } catch (e: any) {
      throw new Error(e.message);
    }
  }

  async resubmitRun(runId: string, triggerName: string): Promise<any> {
    const { apiVersion, baseUrl, httpClient } = this.options;

    try {
      const resubmitUrl = `${baseUrl}/triggers/${triggerName}/histories/${runId}/resubmit?api-version=${apiVersion}`;
      const headers = { 'If-Match': '*' };
      const response = await httpClient.post({
        uri: resubmitUrl,
        headers,
      });
      return response;
    } catch (e: any) {
      return new Error(e.message);
    }
  }

  async cancelRun(runId: string): Promise<any> {
    const { apiVersion, baseUrl, httpClient } = this.options;

    const uri = `${baseUrl}${runId}/cancel?api-version=${apiVersion}`;
    try {
      const response = await httpClient.post({
        uri,
      });
      return response;
    } catch (e: any) {
      return new Error(e.message);
    }
  }
}
