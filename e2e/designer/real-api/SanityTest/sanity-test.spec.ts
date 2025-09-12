import { test } from '../../fixtures/real-api';
import workflow from './workflow.json' assert { type: 'json' };

test.describe(
  'Sanity Check',
  {
    tag: '@real',
  },
  () => {
    test.beforeEach(async ({ realDataApi }) => {
      await realDataApi.deployWorkflow(workflow);
    });
    test('Sanity Check', async ({ page, realDataApi }) => {
      await page.goto('/');
      await realDataApi.goToWorkflow();
      await page.getByTestId('card-when_a_http_request_is_received').click();
      await page.getByRole('combobox', { name: 'Method' }).click();
      await page.getByRole('option', { name: 'GET' }).click();
      await page.getByTestId('msla-panel-header-collapse-nav').click();
      await page.getByTestId('msla-plus-button-when_a_http_request_is_received-undefined').click();
      await page.getByTestId('msla-add-button-when_a_http_request_is_received-undefined').click({ force: true });
      await page.getByTestId('msla-search-box').fill('response');
      await page.getByTestId('msla-op-search-result-response').click();
      await page.getByTestId('msla-setting-token-editor-stringeditor-body').click();
      await page.keyboard.type('Test Body');
      await realDataApi.saveWorkflow();
      await realDataApi.verifyWorkflowSaveWithRequest(200, 'Test Body', 'When_a_HTTP_request_is_received');
    });
  }
);
