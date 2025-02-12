import { expect, test } from '@playwright/test';

test.describe(
  'Single Template View Tests',
  {
    tag: '@mock',
  },
  () => {
    test('Templates summary panel should open up Basics Workflow in templates view', async ({ page }) => {
      await page.goto('/templates');
      await page.getByText('Local', { exact: true }).click();
      await page.getByRole('combobox', { name: 'Gallery' }).click();
      await page.getByText('Basic Workflow', { exact: true }).click();
      await page.waitForTimeout(10);

      expect(await page.getByRole('button', { name: 'Close' }).isDisabled()).toBeTruthy();
      expect(await page.getByRole('tab', { name: 'Workflow' })).toBeVisible();
      expect(await page.getByRole('tab', { name: 'Summary' })).toBeVisible();
      await page.getByRole('button', { name: 'Use this template' }).click();

      expect(await page.locator('[data-testid="msla-templates-workflowName"]').isDisabled()).toBeTruthy();
      await expect(await page.locator('[data-testid="msla-templates-workflowName"]')).toHaveValue('overriden-name');
      await expect(page.getByRole('radio', { name: 'Stateful' })).toBeDisabled();

      await expect(page.getByText('Create a new workflow from template', {})).toBeVisible();
      expect(await page.getByRole('button', { name: 'Close' }).isDisabled()).toBeTruthy();
      await page.getByRole('tab', { name: 'Review + create' }).click();
      await expect(page.getByText('----', { exact: true })).not.toBeVisible();
      await expect(page.getByText('overriden-name', { exact: true })).toBeVisible();
      await expect(page.getByText('Stateful', { exact: true })).toBeVisible();
      expect(await page.getByRole('button', { name: 'Create' }).isDisabled()).toBeFalsy();
    });

    test('Create panels should have overriden data from viewTemplate params provided', async ({ page }) => {
      await page.goto('/templates');
      await page.getByText('Local', { exact: true }).click();
      await page.getByRole('combobox', { name: 'Gallery' }).click();
      await page.getByText('Simple Parameters', { exact: true }).click();
      await page.waitForTimeout(10);

      expect(await page.getByRole('button', { name: 'Close' }).isDisabled()).toBeTruthy();
      expect(await page.getByRole('tab', { name: 'Workflow' })).toBeVisible();
      expect(await page.getByRole('tab', { name: 'Summary' })).toBeVisible();
      await page.getByRole('button', { name: 'Use this template' }).click();

      await expect(page.getByText('Create a new workflow from template', {})).toBeVisible();
      expect(await page.getByRole('button', { name: 'Close' }).isDisabled()).toBeTruthy();

      expect(await page.locator('[data-testid="msla-templates-workflowName"]').isDisabled()).toBeTruthy();
      await expect(await page.locator('[data-testid="msla-templates-workflowName"]')).toHaveValue('overriden-name');
      await expect(page.getByRole('radio', { name: 'Stateful' })).toBeDisabled();

      await page.getByRole('tab', { name: 'Parameters' }).click();
      expect(await page.locator('[data-testid="msla-templates-parameter-value-LogicMessage_#workflowname#"]').isDisabled()).toBeTruthy();
      await expect(await page.locator('[data-testid="msla-templates-parameter-value-LogicMessage_#workflowname#"]')).toHaveValue(
        'overriden-default-non-editable'
      );

      await page.getByRole('tab', { name: 'Review + create' }).click();
      await expect(page.getByText('----', { exact: true })).not.toBeVisible();
      await expect(page.getByText('overriden-name', { exact: true })).toBeVisible();
      await expect(page.getByText('Stateful', { exact: true })).toBeVisible();
      await expect(page.getByText('overriden-default-non-editable', { exact: true })).toBeVisible();
      expect(await page.getByRole('button', { name: 'Create' }).isDisabled()).toBeFalsy();
    });
  }
);
