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
      await expect(page.getByText('BasicWorkflowOnly', { exact: true })).toBeVisible();
      await expect(page.getByText('Stateful', { exact: true })).toBeVisible();
      expect(await page.getByRole('button', { name: 'create' }).isDisabled()).toBeFalsy();

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

    test('Create workflow should show update information for empty workflow in consumption.', async ({ page }) => {
      await page.goto('/templates');
      await page.getByText('Consumption', { exact: true }).click();
      await GoToMockTemplate(page, '[Mock] Basic Workflow Only Template');
      await page.getByRole('button', { name: 'Use this template' }).click();
      await expect(page.getByText('Update workflow from template', { exact: true })).toBeVisible();
      await expect(page.getByText('Select Update to update this workflow based ', { exact: false })).toBeVisible();
      expect(await page.getByRole('button', { name: 'update' }).isDisabled()).toBeFalsy();
    });

    test('Create workflow should show update information for different tabs in consumption.', async ({ page }) => {
      const parameterValue = 'Parameter Value';
      await page.goto('/templates');
      await page.getByText('Consumption', { exact: true }).click();
      await GoToMockTemplate(page, '[Mock] Simple Parameters Only Template');
      await page.getByRole('button', { name: 'Use this template' }).click();

      await page.getByRole('tab', { name: 'Review + update' }).click();
      await expect(page.getByText('Update workflow from template', { exact: true })).toBeVisible();
      await expect(
        page.getByText('Review your settings, ensure everything is correctly set up, and update your workflow. ', { exact: true })
      ).toBeVisible();
      await expect(page.getByText('----', { exact: true })).toBeVisible();
      expect(await page.getByRole('button', { name: 'update' }).isDisabled()).toBeTruthy();

      await page.getByRole('tab', { name: 'Parameters' }).click();
      await page.locator('[data-testid="msla-templates-parameter-value-LogicMessage_#workflowname#"]').fill(parameterValue);
      await page.getByRole('button', { name: 'Next' }).click();

      await expect(page.getByText('----', { exact: true })).not.toBeVisible();
      await expect(page.getByText(parameterValue, { exact: true })).toBeVisible();

      expect(await page.getByRole('button', { name: 'update' }).isDisabled()).toBeFalsy();
    });
  }
);
