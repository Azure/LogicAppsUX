import type { ArmResources, CallbackInfo, ContentLink, IRunService, Run, RunError, Runs } from './types';
import { getCallbackUrl, isCallbackInfoWithRelativePath } from './utils';

export interface RunServiceOptions {
  apiVersion: string;
  baseUrl: string;
  accessToken?: string;
  workflowName: string;
}

export class RunService implements IRunService {
  constructor(private options: RunServiceOptions) {}

  async getContent(contentLink: ContentLink): Promise<any> {
    const { uri } = contentLink;
    if (!uri) {
      throw new Error();
    }

    const response = await fetch(uri);
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

  async getMoreRuns(continuationToken: string): Promise<Runs> {
    const { accessToken } = this.options;
    let headers: Headers | undefined;
    if (accessToken) {
      headers = new Headers({
        Authorization: accessToken,
      });
    }
    const response = await fetch(continuationToken, { headers });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const { nextLink, value: runs }: ArmResources<Run> = await response.json();
    return { nextLink, runs };
  }

  async getRun(runId: string): Promise<Run | RunError> {
    const { apiVersion, baseUrl, accessToken, workflowName } = this.options;
    let headers: Headers | undefined;
    if (accessToken) {
      headers = new Headers({
        Authorization: accessToken,
      });
    }
    const uri = `${baseUrl}/workflows/${workflowName}/runs/${runId}?api-version=${apiVersion}`;
    const response = await fetch(uri, { headers });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getRuns(workflowId: string): Promise<Runs> {
    const { apiVersion, baseUrl, accessToken, workflowName } = this.options;
    let headers: Headers | undefined;
    if (accessToken) {
      headers = new Headers({
        Authorization: accessToken,
      });
    }
    const uri = `${baseUrl}/workflows/${workflowName}/runs?api-version=${apiVersion}`;
    const response = await fetch(uri, { headers });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const test: ArmResources<Run> = await response.json();
    const { nextLink, value: runs } = test;
    return { nextLink, runs };
  }

  async runTrigger(callbackInfo: CallbackInfo): Promise<any> {
    const method = isCallbackInfoWithRelativePath(callbackInfo) ? callbackInfo.method : 'POST';
    const uri = getCallbackUrl(callbackInfo);
    if (!uri) {
      throw new Error();
    }

    const response = await fetch(uri, { method, mode: 'no-cors' });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    return json;
  }
}
