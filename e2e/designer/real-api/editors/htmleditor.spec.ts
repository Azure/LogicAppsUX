// We don't load HTML editor in any of our built in operations, so must be done in real API e2e tests
import { test } from '../../fixtures/real-api';
import { expect } from '@playwright/test';
import workflow from './workflow.json' assert { type: 'json' };

test.describe(
  'HTML Editor',
  {
    tag: '@real',
  },
  () => {
    test.beforeEach(async ({ realDataApi }) => {
      await realDataApi.deployWorkflow(workflow);
    });

    test('HTML Editor', async ({ page, realDataApi }) => {
      await page.goto('/');
      await realDataApi.goToWorkflow();
      await page.getByTestId('msla-plus-button-when_a_http_request_is_received-response').click();
      await page.getByTestId('msla-add-button-when_a_http_request_is_received-response').click({ force: true });
      await page.getByTestId('msla-search-box').fill('office');
      await page.getByLabel('Send an email (V2)').click();
      await page.getByLabel('To*').getByRole('paragraph').click();
      await page.getByLabel('To*').fill('test@microsoft.com');
      await page.getByLabel('Subject*').getByRole('paragraph').click();
      await page.getByLabel('Subject*').fill('subject');
      await page.getByLabel('Body*').click();
      await page.getByLabel('Body*').fill('this is a body');
      await page.getByLabel('Body*').press('ControlOrMeta+a');
      await page.getByLabel('Format text as bold. Shortcut').click();
      await page.getByLabel('Toggle code view').click();

      await expect(page.getByLabel('Body*').locator('span')).toContainText(
        '<p class="editor-paragraph"><b><strong class="editor-text-bold">this is a body</strong></b></p>'
      );
      await page.getByLabel('Toggle code view').click();
      await expect(page.getByRole('strong')).toContainText('this is a body');

      await page.getByLabel('Body*').click();
      await page.getByLabel('Body*').press('Shift+ArrowLeft');
      await page.getByLabel('Body*').press('Shift+ArrowLeft');
      await page.getByLabel('Body*').press('Shift+ArrowLeft');
      await page.getByLabel('Body*').press('Shift+ArrowLeft');
      await page.getByLabel('Body*').press('Shift+ArrowLeft');
      await page.getByLabel('Body*').press('Shift+ArrowLeft');
      await page.getByLabel('Format text as italic.').click();
      await page.getByLabel('Formatting background color').click();
      await page.locator('.color-picker-saturation').click();
      await page.getByRole('button', { name: 'Close' }).click();

      await page.getByLabel('Formatting options for font size').click();
      await page.getByText('11px').click();

      await page.getByLabel('Toggle code view').click();
      await expect(page.getByLabel('Body*').locator('span')).toContainText(
        '<p class="editor-paragraph"><b><strong class="editor-text-bold">this is </strong></b><i><b><strong class="editor-text-bold editor-text-italic" style="background-color: rgb(128, 64, 64); font-size: 11px;">a body</strong></b></i></p>'
      );
      await page.getByLabel('Toggle code view').click();

      await realDataApi.saveWorkflow();
    });
  }
);
