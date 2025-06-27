import { inputsResponse, outputsResponse } from '../__test__/__mocks__/monitoringInputsOutputsResponse';
import type { HttpRequestOptions, IHttpClient } from '../httpClient';
import type { IRunService } from '../run';
import type { CallbackInfo } from '../callbackInfo';
import type { ContentLink, Runs, ArmResources, Run, LogicAppsV2 } from '../../../utils/src';
import {
  isCallbackInfoWithRelativePath,
  HTTP_METHODS,
  getCallbackUrl,
  getRecordEntry,
  UnsupportedException,
  isNullOrUndefined,
  validateRequiredServiceArguments,
} from '../../../utils/src';
import { hybridApiVersion, isHybridLogicApp } from './hybrid';
import { LogEntryLevel } from '../logging/logEntry';
import { LoggerService } from '../logger';

// Import FLOW_STATUS constants from designer
// Since this is in logic-apps-shared, we need to reference the designer constants
const FLOW_STATUS = {
  ABORTED: 'Aborted',
  CANCELLED: 'Cancelled',
  FAILED: 'Failed',
  FAULTED: 'Faulted',
  IGNORED: 'Ignored',
  PAUSED: 'Paused',
  RUNNING: 'Running',
  SKIPPED: 'Skipped',
  SUCCEEDED: 'Succeeded',
  SUSPENDED: 'Suspended',
  TIMEDOUT: 'TimedOut',
  WAITING: 'Waiting',
} as const;

/**
 * Validates that the provided status is one of the allowed FLOW_STATUS values
 * @param status - The status string to validate
 * @throws {Error} If the status is not a valid FLOW_STATUS value
 */
function validateFlowStatus(status: string): void {
  const allowedStatuses = Object.values(FLOW_STATUS);
  if (!allowedStatuses.includes(status as any)) {
    throw new Error(`Invalid status value: '${status}'. Allowed values are: ${allowedStatuses.join(', ')}`);
  }
}

export interface RunServiceOptions {
  apiVersion: string;
  baseUrl: string;
  httpClient: IHttpClient;
  updateCors?: () => void;
  workflowName: string;
  isDev?: boolean;
}

export class StandardRunService implements IRunService {
  _isDev = false;

  constructor(public readonly options: RunServiceOptions) {
    const { apiVersion, baseUrl, isDev } = options;
    validateRequiredServiceArguments({ apiVersion, baseUrl });

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
      area: 'getContent standard run service',
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

  async getMoreRuns(continuationToken: string): Promise<Runs> {
    const { httpClient } = this.options;

    try {
      const response = await httpClient.get<ArmResources<Run>>({
        uri: continuationToken,
      });

      const { nextLink, value: runs }: ArmResources<Run> = response;
      return { nextLink, runs };
    } catch (e: any) {
      throw new Error(e.message);
    }
  }

  public static getProxyUrl(uri: string): { uri: string; headerPath: string } {
    const [baseUri, path] = uri.split('hostruntime');
    const appName = baseUri.split('/');
    appName.pop();
    return {
      uri: `${baseUri}/providers/Microsoft.App/logicapps/${appName.pop()}/invoke?api-version=${hybridApiVersion}`,
      headerPath: path,
    };
  }

  /**
   * Gets run details.
   * @param {string} runId - Run id.
   * @returns {Promise<Run>} Workflow runs.
   */
  async getRun(runId: string): Promise<Run> {
    const { apiVersion, baseUrl, httpClient, workflowName } = this.options;
    const onlyRunId = runId.split('/')?.at(-1);
    let uri = `${baseUrl}/workflows/${workflowName}/runs/${onlyRunId}?api-version=${apiVersion}&$expand=properties/actions,workflow/properties`;

    try {
      if (isHybridLogicApp(uri)) {
        uri = `${baseUrl}/workflows/${workflowName}/runs/${onlyRunId}?$expand=properties/actions,workflow/properties`;
        return this.fetchHybridLogicAppRunRepetitions<Run>(uri, 'GET', httpClient);
      }
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
    const { apiVersion, baseUrl, workflowName, httpClient } = this.options;

    const uri = `${baseUrl}/workflows/${workflowName}/runs?api-version=${apiVersion}`;
    try {
      const response = await httpClient.get<ArmResources<Run>>({
        uri,
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

    const queryParameters: Record<string, string> = {};
    if (status) {
      // Validate status against allowed FLOW_STATUS values
      validateFlowStatus(status);
      queryParameters['$filter'] = `status eq '${status}'`;
    }
    const uri = `${baseUrl}${runId}/actions/${nodeId}/scopeRepetitions`;

    try {
      if (isHybridLogicApp(uri)) {
        return this.fetchHybridLogicAppRunRepetitions<{ value: LogicAppsV2.RunRepetition[] }>(uri, 'GET', httpClient, queryParameters);
      }

      const response = await httpClient.get<{ value: LogicAppsV2.RunRepetition[] }>({
        uri,
        queryParameters: {
          ...queryParameters,
          'api-version': apiVersion,
        },
      });

      return response;
    } catch (e: any) {
      throw new Error(e.message);
    }
  }

  /**
   * Retrieves the repetition details of a specific agent action run.
   *
   * This function constructs the request URI using the provided run ID, action node ID, and repetition ID,
   * and then uses an HTTP client to fetch the run repetition data.
   * @param action - An object containing the identifier for the action node and the run ID.
   * @param action.nodeId - The unique identifier for the action node.
   * @param action.runId - The identifier of the run; can be undefined.
   * @param repetitionId - The identifier for the specific repetition of the agent action.
   * @returns A promise that resolves to the run repetition details.
   * @throws Will throw an error if the HTTP request fails.
   */
  async getAgentRepetition(
    action: { nodeId: string; runId: string | undefined },
    repetitionId: string
  ): Promise<LogicAppsV2.RunRepetition> {
    const { nodeId, runId } = action;
    const { apiVersion, baseUrl, httpClient } = this.options;
    const uri = `${baseUrl}${runId}/actions/${nodeId}/agentRepetitions/${repetitionId}`;

    try {
      if (isHybridLogicApp(uri)) {
        return this.fetchHybridLogicAppRunRepetitions(uri, 'GET', httpClient);
      }

      const response = await httpClient.get<LogicAppsV2.RunRepetition>({
        uri: `${uri}?api-version=${apiVersion}`,
      });

      return response;
    } catch (e: any) {
      throw new Error(e.message);
    }
  }

  /**
   * Retrieves the actions of an agent repetition for a specific node and run.
   *
   * This function constructs the API endpoint URI using the provided node and run identifiers,
   * along with the given repetition ID, then sends an HTTP GET request to fetch the corresponding actions.
   * @param action - An object containing:
   *   - nodeId: The identifier for the node.
   *   - runId: The identifier for the run (may be undefined).
   * @param repetitionId - The identifier for the repetition to query.
   * @returns A promise that resolves with the run repetition actions retrieved from the API.
   * @throws An error if the HTTP request fails, propagating the error message.
   */
  async getAgentActionsRepetition(action: { nodeId: string; runId: string | undefined }, repetitionId: string): Promise<any> {
    const { nodeId, runId } = action;
    const { apiVersion, baseUrl, httpClient } = this.options;
    const uri = `${baseUrl}${runId}/actions/${nodeId}/agentRepetitions/${repetitionId}/actions`;

    try {
      if (isHybridLogicApp(uri)) {
        return this.fetchHybridLogicAppRunRepetitions<{ value: LogicAppsV2.RunRepetition[] }>(uri, 'GET', httpClient);
      }

      const response = await httpClient.get<LogicAppsV2.RunRepetition>({
        uri: `${uri}?api-version=${apiVersion}`,
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

    try {
      const response = await httpClient.get<LogicAppsV2.RunRepetition>({
        uri: continuationToken,
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

    const uri = `${baseUrl}${runId}/actions/${nodeId}/repetitions/${repetitionId}`;

    try {
      if (isHybridLogicApp(uri)) {
        return this.fetchHybridLogicAppRunRepetitions<LogicAppsV2.RunRepetition>(uri, 'GET', httpClient);
      }

      const response = await httpClient.get<LogicAppsV2.RunRepetition>({
        uri: `${uri}?api-version=${apiVersion}`,
      });

      return response;
    } catch (e: any) {
      throw new Error(e.message);
    }
  }

  /**
   * Triggers a workflow run
   * @param {CallbackInfo} callbackInfo - Information to call Api to trigger workflow.
   */
  async runTrigger(callbackInfo: CallbackInfo): Promise<void> {
    const { httpClient } = this.options;
    const method = isCallbackInfoWithRelativePath(callbackInfo) ? callbackInfo.method : HTTP_METHODS.POST;
    const uri = getCallbackUrl(callbackInfo);
    if (!uri) {
      throw new Error();
    }

    try {
      await this.getHttpRequestByMethod(httpClient, method, { uri, noAuth: true });
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
  async getChatHistory(action: { nodeId: string; runId: string | undefined }): Promise<any> {
    const { apiVersion, baseUrl, httpClient } = this.options;
    const { nodeId, runId } = action;
    const uri = `${baseUrl}${runId}/actions/${nodeId}/chatHistory`;

    try {
      if (isHybridLogicApp(uri)) {
        const response = await this.fetchHybridLogicAppRunRepetitions<any>(uri, 'GET', httpClient);
        return response.value;
      }

      const response = await httpClient.get<any>({
        uri: `${uri}?api-version=${apiVersion}`,
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

    const uri = `${baseUrl}${idSuffix}/listCallBackUrl`;

    try {
      if (isHybridLogicApp(uri)) {
        const response = await this.fetchHybridLogicAppRunRepetitions<any>(uri, 'POST', httpClient);
        return response?.value;
      }

      const response = await httpClient.post<any, any>({
        uri: `${uri}?api-version=${apiVersion}`,
      });

      return response?.value;
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
        noAuth: true,
        content: data,
      });

      return response;
    } catch (e: any) {
      throw new Error(e.message);
    }
  }

  async cancelRun(runId: string): Promise<any> {
    const { apiVersion, baseUrl, httpClient } = this.options;

    let uri = `${baseUrl}${runId}/cancel?api-version=${apiVersion}`;
    try {
      if (isHybridLogicApp(uri)) {
        uri = `${baseUrl}${runId}/cancel`;

        return this.fetchHybridLogicAppRunRepetitions(uri, 'POST', httpClient);
      }
      const response = await httpClient.post({
        uri,
      });
      return response;
    } catch (e: any) {
      return new Error(e.message);
    }
  }

  private async fetchHybridLogicAppRunRepetitions<T>(
    uri: string,
    httpMethod: string,
    httpClient: IHttpClient,
    queryParameters?: Record<string, string>
  ) {
    const { uri: newUri, headerPath } = StandardRunService.getProxyUrl(uri);
    const response = await httpClient.post<T, undefined>({
      uri: newUri,
      queryParameters,
      headers: {
        'X-Ms-Logicapps-Proxy-Path': headerPath,
        'X-Ms-Logicapps-Proxy-Method': httpMethod,
      },
    });
    return response;
  }
}
