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

      await expect(page.getByText('Create a new workflow from template', {})).toBeVisible();
      expect(await page.getByRole('button', { name: 'Close' }).isDisabled()).toBeTruthy();
      await page.getByRole('tab', { name: 'Review + create' }).click();
      await expect(page.getByText('----', { exact: true })).toBeVisible();
      await expect(page.getByText('Stateful', { exact: true })).toBeVisible();
      expect(await page.getByRole('button', { name: 'Create' }).isDisabled()).toBeTruthy();
    });
  }
);
