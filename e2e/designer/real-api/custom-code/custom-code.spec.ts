import { test } from '../../fixtures/real-api';
import workflow from './workflow.json' assert { type: 'json' };
test.describe(
  'Custom Code',
  {
    tag: '@real',
  },
  () => {
    test.beforeEach(async ({ realDataApi }) => {
      await realDataApi.deployWorkflow(workflow);
    });

    test('Inline Javascript', async ({ page, browserName, realDataApi }) => {
      await page.goto('/');
      await realDataApi.goToWorkflow();
      await page.getByTestId('msla-plus-button-when_a_http_request_is_received-response').click();
      await page.getByTestId('msla-add-button-when_a_http_request_is_received-response').click({ force: true });
      await page.getByTestId('msla-search-box').fill('javascript');
      await page.getByTestId('msla-op-search-result-javascriptcode').click();
      await page.getByRole('code').click();
      await page.keyboard.type('return ');
      await page.getByTestId('msla-tokenpicker-button').click();
      await page.getByRole('button', { name: 'Body' }).click();
      await page.getByRole('code').click();
      await page.keyboard.type('.toUpperCase();');
      await page.getByText('code', { exact: true }).click();
      await page.getByTestId('msla-panel-header-collapse-nav').click();
      await page.getByTestId('card-response').click();
      await page.getByTestId('msla-setting-token-editor-stringeditor-body').click();
      await page.getByTestId('msla-token-picker-entrypoint-button-dynamic-content').click();
      await page.getByRole('button', { name: 'Outputs' }).click();
      await realDataApi.saveWorkflow();
      await realDataApi.verifyWorkflowSaveWithRequest(
        200,
        `hello ${browserName}`.toUpperCase(),
        'When_a_HTTP_request_is_received',
        `hello ${browserName}`
      );
    });
  }
);
