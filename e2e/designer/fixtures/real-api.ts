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
  async goToWorkflow() {
    await this.page.getByPlaceholder('Select an App').click();
    await this.page.getByPlaceholder('Select an App').fill(this.siteName);
    await this.page.getByPlaceholder('Select an App').press('Enter');
    await this.page.getByLabel('Workflow').locator('span').filter({ hasText: '' }).click();
    await this.page.getByRole('option', { name: this.workflowName, exact: true }).click();
    await this.page.getByRole('button', { name: 'Toolbox' }).click();
    await this.page.getByLabel('fit view').click({ force: true });
  }
  async saveWorkflow() {
    const responsePromise = this.page.waitForResponse(
      `${Constants.managementUrl}${this.siteId}/deployWorkflowArtifacts?api-version=${Constants.siteApiVersion}`
    );
    await this.page.getByRole('menuitem', { name: 'Save Save' }).click();
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
    while (LAResult && LAResult.status() !== expectedStatus && await LAResult.text() !== expectedBody) {
      await this.page.waitForTimeout(1500);
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

    expect(LAResult.status()).toBe(expectedStatus);
    expect(await LAResult.text()).toBe(expectedBody);
  }
  async deployWorkflow(workflowData: any) {
    if ((workflowData.kind as string).toLowerCase() === 'stateless') {
      this.workflowName = `${this.workflowName}-stateless`;
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
