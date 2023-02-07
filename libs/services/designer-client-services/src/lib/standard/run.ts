import { inputsResponse, outputsResponse } from '../__test__/__mocks__/monitoringInputsOutputsResponse';
import type { IHttpClient } from '../httpClient';
import type { IRunService } from '../run';
import type { CallbackInfo } from '../workflow';
import type { Runs, Run, RunError, ContentLink } from '@microsoft/designer-ui';
import { isCallbackInfoWithRelativePath, getCallbackUrl } from '@microsoft/designer-ui';
import type { ArmResources } from '@microsoft/utils-logic-apps';
import { ArgumentException, HTTP_METHODS } from '@microsoft/utils-logic-apps';

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
    const response = await httpClient.get<any>({
      uri,
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('Content-Type');
    if (contentType?.startsWith('application/json')) {
      return response.json();
    } else if (contentType?.startsWith('text/')) {
      return response.text();
    } else if (contentType?.startsWith('application/octet-stream')) {
      return response.blob();
    } else if (contentType?.startsWith('multipart/form-data')) {
      return response.formData();
    } else {
      return response.arrayBuffer();
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
    const response = await fetch(continuationToken, { headers });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const { nextLink, value: runs }: ArmResources<Run> = await response.json();
    return { nextLink, runs };
  }

  async getRun(runId: string): Promise<Run | RunError> {
    const { apiVersion, baseUrl, workflowName } = this.options;
    const headers = this.getAccessTokenHeaders();

    const uri = `${baseUrl}/workflows/${workflowName}/runs/${runId}?api-version=${apiVersion}`;
    const response = await fetch(uri, { headers });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getRuns(): Promise<Runs> {
    const { apiVersion, baseUrl, workflowName } = this.options;
    const headers = this.getAccessTokenHeaders();

    const uri = `${baseUrl}/workflows/${workflowName}/runs?api-version=${apiVersion}`;
    const response = await fetch(uri, { headers });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const test: ArmResources<Run> = await response.json();
    const { nextLink, value: runs } = test;
    return { nextLink, runs };
  }

  async runTrigger(callbackInfo: CallbackInfo): Promise<void> {
    const method = isCallbackInfoWithRelativePath(callbackInfo) ? callbackInfo.method : HTTP_METHODS.POST;
    const uri = getCallbackUrl(callbackInfo);
    if (!uri) {
      throw new Error();
    }

    const response = await fetch(uri, { method, mode: 'no-cors' });
    if (!response.ok && response.status !== 0) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
  }

  /**
   * Gets the inputs and outputs for an action repetition from a workflow run
   * @arg {any} action - An object with a repetition record from a workflow run
   * @return {Promise<RunRepetition>}
   */
  async getActionLinks(action: any, nodeId: string): Promise<any> {
    const { inputsLink, outputsLink } = action;
    const promises: Promise<any | null>[] = [];

    if (this._isDev) {
      const inputs = inputsResponse[nodeId] ?? {};
      const outputs = outputsResponse[nodeId] ?? {};
      return Promise.resolve({ inputs: this.parseActionLink(inputs), outputs: this.parseActionLink(outputs) });
    }

    if (outputsLink) {
      promises.push(this.getContent(outputsLink));
    }
    if (inputsLink) {
      promises.push(this.getContent(inputsLink));
    }
    const [inputs, outputs] = await Promise.all(promises);

    return { inputs: this.parseActionLink(inputs), outputs: this.parseActionLink(outputs) };
  }

  parseActionLink(test: Record<string, any>) {
    if (!test) {
      return test;
    }

    const test1 = Object.keys(test);
    const hello = test1.reduce((prev, current) => {
      return { ...prev, [current]: { displayName: current, value: test[current] } };
    }, {});

    return hello;
  }
}
