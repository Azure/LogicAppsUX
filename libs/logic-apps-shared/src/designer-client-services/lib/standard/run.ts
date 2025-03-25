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
import { isHybridLogicApp } from './hybrid';
import { LogEntryLevel } from '../logging/logEntry';
import { LoggerService } from '../logger';

export interface RunServiceOptions {
  apiVersion: string;
  baseUrl: string;
  httpClient: IHttpClient;
  updateCors?: () => void;
  accessToken?: string;
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

  public static getProxyUrl(uri: string): { uri: string; headerPath: string } {
    const [baseUri, path] = uri.split('hostruntime');
    const appName = baseUri.split('/');
    appName.pop();
    return {
      uri: `${baseUri}/providers/Microsoft.App/logicapps/${appName.pop()}/invoke?api-version=2024-02-02-preview`,
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

        const { uri: newUri, headerPath } = StandardRunService.getProxyUrl(uri);
        const response = await httpClient.post<Run, undefined>({
          uri: newUri,
          headers: {
            'X-Ms-Logicapps-Proxy-Path': headerPath,
            'X-Ms-Logicapps-Proxy-Method': 'GET',
          },
        });
        return response;
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
    const headers = this.getAccessTokenHeaders();

    const uri = `${baseUrl}/workflows/${workflowName}/runs?api-version=${apiVersion}`;
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

    if (this._isDev) {
      const test: Record<string, any> = {
        '000000': {
          If_Condition_X_Matches: {
            repetitions: 5,
            actions: {
              HTTP: {
                status: 'Succeeded',
              },
              HTTP_1: {
                status: 'Succeeded',
              },
            },
          },
        },
        '000001': {
          If_Condition_X_Matches: {
            repetitions: 5,
            actions: {
              HTTP: {
                status: 'Succeeded',
              },
              HTTP_1: {
                status: 'Succeeded',
              },
            },
          },
          If_Condition_Y_Matches: {
            repetitions: 5,
            actions: {
              Service_Bus: {
                status: 'Succeeded',
              },
            },
          },
        },
        '000002': {
          If_Condition_Y_Matches: {
            repetitions: 5,
            actions: {
              Service_Bus: {
                status: 'Succeeded',
              },
            },
          },
        },
        '000003': {
          If_Condition_Y_Matches: {
            repetitions: 1,
            actions: {
              Service_Bus: {
                status: 'Succeeded',
              },
            },
          },
        },
        '000004': {
          If_Condition_Y_Matches: {
            repetitions: 5,
            actions: {
              Service_Bus: {
                status: 'Succeeded',
              },
            },
          },
        },
        '000005': {
          If_Condition_Y_Matches: {
            repetitions: 5,
            actions: {
              Service_Bus: {
                status: 'Succeeded',
              },
            },
          },
        },
      };
      return Promise.resolve(test[repetitionId] as LogicAppsV2.RunRepetition);
    }

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
      await this.getHttpRequestByMethod(httpClient, method, { uri });
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
}
