import { test } from '../../fixtures/real-api';
import workflow from './workflow.json' assert { type: 'json' };

test.describe(
  'Stateless Variables',
  {
    tag: '@real',
  },
  () => {
    test.beforeEach(async ({ realDataApi }) => {
      await realDataApi.deployWorkflow(workflow);
    });
    test('Variable Functionality works', async ({ page, realDataApi, browserName }) => {
      await page.goto('/');
      await realDataApi.goToWorkflow();

      await page.getByTestId('msla-plus-button-when_a_http_request_is_received-response').click();
      await page.getByTestId('msla-add-button-when_a_http_request_is_received-response').click({ force: true });
      await page.getByTestId('msla-search-box').fill('init');

      await page.getByTestId('msla-op-search-result-initializevariable').click();

      await page.getByTestId('msla-setting-token-editor-stringeditor-name').click();
      await page.keyboard.type('v1');

      await page.getByTestId('msla-setting-token-editor-dropdowneditor-type').click();
      await page.getByRole('option', { name: 'Array' }).click();
      await page.getByTestId('msla-setting-token-editor-stringeditor-value').click();
      await page.keyboard.type('[1,2]');
      await page.getByTestId('msla-panel-header-collapse-nav').click();

      await page.getByTestId('msla-plus-button-initialize_variable-response').click();
      await page.getByTestId('msla-add-button-initialize_variable-response').click({ force: true });

      await page.getByTestId('msla-search-box').fill('Append to array variable');
      await page.getByTestId('msla-op-search-result-appendtoarrayvariable').click();

      await page.getByTestId('msla-setting-token-editor-dropdowneditor-name').click();
      await page.getByRole('option', { name: 'v1' }).click();

      await page.getByTestId('msla-setting-token-editor-stringeditor-value').click();
      await page.keyboard.type('3');

      await page.getByTestId('msla-plus-button-append_to_array_variable-response').click();
      await page.getByTestId('msla-add-button-append_to_array_variable-response').click();
      await page.getByTestId('msla-search-box').fill('initalize');

      await page.getByTestId('msla-op-search-result-initializevariable').click();

      await page.getByTestId('msla-setting-token-editor-stringeditor-name').click();
      await page.keyboard.type('v2');

      await page.getByTestId('msla-setting-token-editor-dropdowneditor-type').click();
      await page.getByRole('option', { name: 'String' }).click();
      await page.getByTestId('msla-setting-token-editor-stringeditor-value').click();
      await page.keyboard.type('foo');
      await page.getByTestId('msla-panel-header-collapse-nav').click();

      await page.getByTestId('msla-plus-button-initialize_variable_1-response').click();
      await page.getByTestId('msla-add-button-initialize_variable_1-response').click();
      await page.getByTestId('msla-search-box').fill('append string');

      await page.getByTestId('msla-op-search-result-appendtostringvariable').click();
      await page.getByTestId('msla-setting-token-editor-dropdowneditor-name').click();
      await page.getByRole('option', { name: 'v2' }).click();
      await page.getByTestId('msla-setting-token-editor-stringeditor-value').click();
      await page.keyboard.type(browserName);
      await page.getByTestId('msla-panel-header-collapse-nav').click();

      await page.getByTestId('card-response').click();
      await page.getByTestId('msla-setting-token-editor-stringeditor-body').click();
      await page.getByTestId('msla-token-picker-entrypoint-button-dynamic-content').click();
      await page.getByRole('button', { name: 'v1' }).click();
      await page.getByTestId('msla-token-picker-entrypoint-button-dynamic-content').click();
      await page.getByRole('button', { name: 'v2' }).click();
      await page.getByTestId('msla-panel-header-collapse-nav').click();
      await realDataApi.saveWorkflow();
      await realDataApi.verifyWorkflowSaveWithRequest(200, `[1,2,3]foo${browserName}`, 'When_a_HTTP_request_is_received');
    });
  }
);
