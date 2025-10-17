import { test as base, expect } from '@playwright/test';
import type { APIRequestContext, Page } from '@playwright/test';
import * as Constants from '../utils/Constants';

export class RealDataApi {
  private workflowName: string;
  private siteId: string;
  public siteName: string;
  constructor(
    public readonly page: Page,
    public readonly request: APIRequestContext
  ) {
    this.workflowName = 'testworkflow2';
    this.siteName = process.env.AZURE_SITE_NAME ?? '';
    this.siteId = `/subscriptions/${process.env.AZURE_SUBSCRIPTION_ID}/resourceGroups/${process.env.AZURE_RESOURCE_GROUP}/providers/Microsoft.Web/sites/${this.siteName}`;
  }
  async goToWorkflow(workflowName?: string) {
    await this.page.getByPlaceholder('Select an App').click();
    await this.page.getByPlaceholder('Select an App').fill(this.siteName);
    await this.page.getByPlaceholder('Select an App').press('Enter');
    await this.page.getByText('Select a Workflow').click();
    await this.page.getByRole('option', { name: workflowName ?? this.workflowName, exact: true }).click();
    await this.page.getByRole('button', { name: 'Toolbox' }).click();
    await this.page.waitForTimeout(2000);
    await this.page.getByLabel('Zoom view to fit').click({ force: true });
  }
  async saveWorkflow() {
    const responsePromise = this.page.waitForResponse(
      `${Constants.managementUrl}${this.siteId}/deployWorkflowArtifacts?api-version=${Constants.siteApiVersion}`
    );
    await this.page.getByRole('menuitem', { name: 'Save Save', exact: true }).click();
    await responsePromise;
  }
  async verifyWorkflowSaveWithRequest(expectedStatus: number, expectedBody: string, triggerName: string, dataToSend?: any) {
    let listCallbackUrlCall = await this.request.post(
      `${Constants.managementUrl}${this.siteId}/hostruntime/runtime/webhooks/workflow/api/management/workflows/${this.workflowName}/triggers/${triggerName}/listCallbackUrl?api-version=${Constants.siteApiVersion}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.AZURE_MANAGEMENT_TOKEN}`,
          'If-Match': '*',
        },
      }
    );

    let listCallbackUrlResponseValue = await listCallbackUrlCall.json();
    let listCallbackUrl: string = listCallbackUrlResponseValue.value;
    let callbackMethod = listCallbackUrlResponseValue.method;
    let LAResult = await this.request.fetch(listCallbackUrl, {
      data: dataToSend,
      method: callbackMethod,
      headers: {
        'Content-Type': 'text/plain',
      },
    });

    let retries = 5;
    while (retries-- > 0 && (LAResult.status() !== expectedStatus || (await LAResult.text()) !== expectedBody)) {
      await this.page.waitForTimeout(4000);
      listCallbackUrlCall = await this.request.post(
        `${Constants.managementUrl}${this.siteId}/hostruntime/runtime/webhooks/workflow/api/management/workflows/${this.workflowName}/triggers/${triggerName}/listCallbackUrl?api-version=${Constants.siteApiVersion}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.AZURE_MANAGEMENT_TOKEN}`,
            'If-Match': '*',
          },
        }
      );

      listCallbackUrlResponseValue = await listCallbackUrlCall.json();
      listCallbackUrl = listCallbackUrlResponseValue.value;
      callbackMethod = listCallbackUrlResponseValue.method;
      LAResult = await this.request.fetch(listCallbackUrl, {
        data: dataToSend,
        method: callbackMethod,
      });
    }

    if (retries <= 0) {
      throw new Error('Max retries reached');
    }
    expect(LAResult.status()).toBe(expectedStatus);
    expect(await LAResult.text()).toBe(expectedBody);
  }

  async deployWorkflow(workflowData: any) {
    if ((workflowData.kind as string).toLowerCase() === 'stateless') {
      this.workflowName = `${this.workflowName}-stateless`;
    } else if ((workflowData.kind as string).toLowerCase() === 'agentic') {
      this.workflowName = `${this.workflowName}-agentic`;
    }
    return this.request.post(`${Constants.managementUrl}${this.siteId}/deployWorkflowArtifacts?api-version=${Constants.siteApiVersion}`, {
      data: {
        files: {
          [`${this.workflowName}/workflow.json`]: workflowData,
        },
      },
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AZURE_MANAGEMENT_TOKEN}`,
        'If-Match': '*',
      },
    });
  }

  async getConnectionsJSON() {
    const response = await this.request.fetch(
      `${Constants.managementUrl}${this.siteId}/workflowsconfiguration/connections?api-version=2018-11-01`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.AZURE_MANAGEMENT_TOKEN}`,
          'If-Match': '*',
        },
      }
    );
    console.log('getConnectionsJSON response', response.json());
    return (await response.json()).properties.files['connections.json'];
  }

  async deployConnectionsJSON(connectionsData: any) {
    return this.request.post(`${Constants.managementUrl}${this.siteId}/deployWorkflowArtifacts?api-version=${Constants.siteApiVersion}`, {
      data: {
        files: {
          ['connections.json']: connectionsData,
        },
      },
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.AZURE_MANAGEMENT_TOKEN}`,
        'If-Match': '*',
      },
    });
  }

  async removeConnectionFromConnectionsJSON(type: string, connectionName: string) {
    const connectionsData = await this.getConnectionsJSON();
    if (connectionsData?.[type]?.[connectionName]) {
      delete connectionsData[type][connectionName];
      await this.deployConnectionsJSON(connectionsData);
    }
  }
}

type MyFixtures = {
  realDataApi: RealDataApi;
};

export const test = base.extend<MyFixtures>({
  realDataApi: async ({ page, request }, use) => {
    await use(new RealDataApi(page, request));
  },
});
export { expect } from '@playwright/test';
