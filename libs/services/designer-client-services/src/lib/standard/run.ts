import { inputsResponse, outputsResponse } from '../__test__/__mocks__/monitoringInputsOutputsResponse';
import type { HttpRequestOptions, IHttpClient } from '../httpClient';
import type { IRunService } from '../run';
import type { CallbackInfo } from '../workflow';
import type { Runs, Run, ContentLink, BoundParameters } from '@microsoft/designer-ui';
import { isCallbackInfoWithRelativePath, getCallbackUrl } from '@microsoft/designer-ui';
import type { ArmResources } from '@microsoft/utils-logic-apps';
import { ArgumentException, HTTP_METHODS, UnsupportedException } from '@microsoft/utils-logic-apps';

export interface RunServiceOptions {
  apiVersion: string;
  baseUrl: string;
  httpClient: IHttpClient;
  accessToken?: string;
  workflowName: string;
  isDev?: boolean;
}

export class StandardRunService implements IRunService {
  _isDev = false;

  constructor(public readonly options: RunServiceOptions) {
    const { apiVersion, baseUrl, isDev } = options;
    if (!baseUrl) {
      throw new ArgumentException('baseUrl required');
    } else if (!apiVersion) {
      throw new ArgumentException('apiVersion required');
    }
    this._isDev = isDev || false;
  }

  async getContent(contentLink: ContentLink): Promise<any> {
    const { uri } = contentLink;
    const { httpClient } = this.options;

    if (!uri) {
      throw new Error();
    }

    try {
      const response = await httpClient.get<any>({
        uri,
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
    const response = await httpClient.get<any>({
      uri: continuationToken,
      headers: headers as Record<string, any>,
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const { nextLink, value: runs }: ArmResources<Run> = await response.json();
    return { nextLink, runs };
  }

  async getRun(runId: string): Promise<LogicAppsV2.RunInstanceDefinition> {
    const { apiVersion, baseUrl, httpClient, workflowName } = this.options;

    const uri = `${baseUrl}/workflows/${workflowName}/runs/${runId}?api-version=${apiVersion}&$expand=properties/actions,workflow/properties`;

    try {
      const response = await httpClient.get<any>({
        uri,
      });
      return response;
    } catch (e: any) {
      throw new Error(e.message);
    }
  }

  async getRuns(): Promise<Runs> {
    const { apiVersion, baseUrl, workflowName, httpClient } = this.options;
    const headers = this.getAccessTokenHeaders();

    const uri = `${baseUrl}/workflows/${workflowName}/runs?api-version=${apiVersion}`;
    const response = await httpClient.get<any>({
      uri,
      headers: headers as Record<string, any>,
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const test: ArmResources<Run> = await response.json();
    const { nextLink, value: runs } = test;
    return { nextLink, runs };
  }

  async runTrigger(callbackInfo: CallbackInfo): Promise<void> {
    const { httpClient } = this.options;
    const method = isCallbackInfoWithRelativePath(callbackInfo) ? callbackInfo.method : HTTP_METHODS.POST;
    const uri = getCallbackUrl(callbackInfo);
    if (!uri) {
      throw new Error();
    }

    const response = await this.getHttpRequestByMethod(httpClient, method, { uri, queryParameters: { mode: 'no-cors' } });

    if (!response.ok && response.status !== 0) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
  }

  /**
   * Gets the inputs and outputs for an action repetition from a workflow run
   * @param {{inputsLink: ContentLink, outputsLink: ContentLink}} actionMetadata - Workflow file path.
   * @param {string} nodeId - Action ID.
   * @returns {Promise<any>} Action inputs and outputs.
   */
  async getActionLinks(actionMetadata: { inputsLink?: ContentLink; outputsLink?: ContentLink }, nodeId: string): Promise<any> {
    const { inputsLink, outputsLink } = actionMetadata;
    let inputs: Record<string, any> = {};
    let outputs: Record<string, any> = {};

    if (this._isDev) {
      inputs = inputsResponse[nodeId] ?? {};
      outputs = outputsResponse[nodeId] ?? {};
      return Promise.resolve({ inputs: this.parseActionLink(inputs), outputs: this.parseActionLink(outputs) });
    }

    if (outputsLink && outputsLink.uri) {
      outputs = await this.getContent(outputsLink);
    }
    if (inputsLink && inputsLink.uri) {
      inputs = await this.getContent(inputsLink);
    }
    return { inputs: this.parseActionLink(inputs), outputs: this.parseActionLink(outputs) };
  }

  /**
   * Parse inputs and outputs into dictionary.
   * @param {Record<string, any>} inputs - Workflow file path.
   * @returns {BoundParameters} List of parametes.
   */
  parseActionLink(response: Record<string, any>): BoundParameters {
    if (!response) {
      return response;
    }

    return Object.keys(response).reduce((prev, current) => {
      return { ...prev, [current]: { displayName: current, value: response[current] } };
    }, {});
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
