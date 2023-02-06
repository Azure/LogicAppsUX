import type { IRunService } from '../run';
import type { CallbackInfo } from '../workflow';
import type { Runs, Run, RunError, ContentLink } from '@microsoft/designer-ui';
import { isCallbackInfoWithRelativePath, getCallbackUrl } from '@microsoft/designer-ui';
import type { ArmResources } from '@microsoft/utils-logic-apps';
import { HTTP_METHODS } from '@microsoft/utils-logic-apps';

export interface RunServiceOptions {
  apiVersion: string;
  baseUrl: string;
  accessToken?: string;
  workflowName: string;
}

export class StandardRunService implements IRunService {
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
   * Gets the inputs for an action from a workflow run
   * @arg {ContentLink} inputsLink - Inputs content link
   * @return {Promise<any>}
   */
  async getActionInputs(inputsLink: any): Promise<any> {
    return this.getContent(inputsLink);
  }

  /**
   * Gets the outputs for an action from a workflow run
   * @arg {ContentLink} outputsLink - Outputs content link
   * @return {Promise<any>}
   */
  async getActionOutputs(outputsLink: ContentLink): Promise<any> {
    return this.getContent(outputsLink);
  }

  /**
   * Gets the inputs and outputs for an action repetition from a workflow run
   * @arg {any} action - An object with a repetition record from a workflow run
   * @return {Promise<RunRepetition>}
   */
  async getInputsOutputs(action: any): Promise<any> {
    const { inputsLink, outputsLink } = action;

    const promises: Promise<any | null>[] = [];

    const test: any = {
      uri: 'https://monitoringviewtest.azurewebsites.net:443/runtime/webhooks/workflow/scaleUnits/prod-00/workflows/bb553259c3d44d0b858f44bd02ab1b40/runs/08585262402390848598937015539CU00/actions/Initialize_variable/contents/ActionInputs?api-version=2018-11-01&code=xOUA-I7M8HlfJplWLvjQNDP5XxCdO1eYwCnjfm8BI_n5AzFuXsiWbA%3d%3d&se=2023-02-07T02%3A00%3A00.0000000Z&sp=%2Fruns%2F08585262402390848598937015539CU00%2Factions%2FInitialize_variable%2Fcontents%2FActionInputs%2Fread&sv=1.0&sig=sm9LSlRzwxCDeVQ_cg_m3SX1XJRJUphfUrGVeDpS3mk',
    };

    if (outputsLink) {
      promises.push(this.getActionOutputs(test));
    }
    if (inputsLink) {
      promises.push(this.getActionInputs(test));
    }
    const [inputs, outputs] = await Promise.all(promises);

    return this.parseActionsInputsOutputs({ inputs, outputs });
  }

  parseInputsLinks(test: Record<string, any>) {
    const test1 = Object.keys(test);
    return test1.reduce((prev, current) => {
      return { ...prev, [current]: { displayName: current, value: test[current] } };
    }, {});
  }

  parseActionsInputsOutputs({ inputs, outputs }: any) {
    let testInputs = {};
    if (inputs) {
      testInputs = this.parseInputsLinks(inputs.variables[0]);
    }

    return { inputs: testInputs, outputs };
  }
}
