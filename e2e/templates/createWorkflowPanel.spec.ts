import { expect, test } from '@playwright/test';
import { GoToMockTemplate } from './utils/GoToTemplate';

test.describe(
  'Create Workflow Panel Tests',
  {
    tag: '@mock',
  },
  () => {
    test('Basics information visible in review create tab reflecting filled in information', async ({ page }) => {
      const workflowName = 'Example_Workflow_Name';
      await page.goto('/templates');
      await GoToMockTemplate(page, '[Mock] Basic Workflow Only Template');
      await page.getByRole('button', { name: 'Use this template' }).click();
      await page.getByRole('tab', { name: 'Review + create' }).click();
      await expect(page.getByText('----', { exact: true })).toBeVisible();
      await expect(page.getByText('Stateful', { exact: true })).toBeVisible();
      expect(await page.getByRole('button', { name: 'create' }).isDisabled()).toBeTruthy();

      await page.getByRole('tab', { name: 'Basics' }).click();
      await page.locator('[data-testid="msla-templates-workflowName"]').fill(workflowName);
      await page.getByText('Stateless', { exact: true }).click();

      await page.getByRole('button', { name: 'Next' }).click();

      await expect(page.getByText('----', { exact: true })).not.toBeVisible();
      await expect(page.getByText('Stateful', { exact: true })).not.toBeVisible();
      await expect(page.getByText(workflowName, { exact: true })).toBeVisible();
      await expect(page.getByText('Stateless', { exact: true })).toBeVisible();

      expect(await page.getByRole('button', { name: 'create' }).isDisabled()).toBeFalsy();
    });
  }
);
