import { expect, test } from '@playwright/test';
import { GoToMockTemplate, GoToMockTemplatesGallery } from './utils/GoToTemplate';

test.describe(
  'Sanity Check',
  {
    tag: '@mock',
  },
  () => {
    test('Should open templates gallery', async ({ page }) => {
      await page.goto('/templates');

      await GoToMockTemplatesGallery(page);

      await page.getByRole('tab', { name: 'All' }).click();
      await page.getByText('Blank workflow', { exact: true }).click();
      await page.getByRole('tab', { name: 'Accelerators' }).click();
      await expect(page.getByText('Blank workflow', { exact: true })).not.toBeVisible();
      await expect(page.getByText('[Mock] Simple Accelerator Template', { exact: true })).toBeVisible();
      await page.getByText('A to Z, ascending').click();
      await page.getByRole('tab', { name: 'Workflows' }).click();
      await page.getByText('Blank workflow', { exact: true }).click();
      await expect(page.getByText('[Mock] Basic Workflow Only Template', { exact: true })).toBeVisible();
      await expect(page.getByText('[Mock] Simple Connection Parameter Template', { exact: true })).toBeVisible();
    });

    test('Should open template panel', async ({ page }) => {
      await page.goto('/templates');
      await GoToMockTemplate(page, '[Mock] Basic Workflow Only Template');
      await page.getByRole('tab', { name: 'Workflow' }).click();
      await page.getByRole('tab', { name: 'Summary' }).click();
      await page.getByRole('button', { name: 'Use this template' }).click();
      await page.getByRole('tab', { name: 'Basics' }).click();
      await page.getByText('Stateless', { exact: true }).click();
      await page.getByRole('tab', { name: 'Review + create' }).click();
      await expect(page.getByText('Create a new workflow from template', { exact: true })).toBeVisible();
      await page.getByText('Template details').click();
      await expect(page.getByText('Workflow name', { exact: true })).toBeVisible();
      await expect(page.getByText('State type')).toBeVisible();
    });

    test('Should contain all templates when templates are loaded from packaged files', async ({ page }) => {
      await page.goto('/templates');

      await page.getByText('Local', { exact: true }).click();
      await page.getByLabel('Categories').click();
      await page.getByText('Automation', { exact: true }).click();

      await page.waitForTimeout(10);

      await page.getByText('Azure Business').click();
      await page.getByRole('tab', { name: 'Workflow' }).click();
      await page.getByRole('tab', { name: 'Summary' }).click();
      await page.getByRole('button', { name: 'Use this template' }).click();
      await expect(page.getByText('Create a new workflow from template', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Close' }).click();

      await page.getByPlaceholder('Search').fill('test');
      await page.waitForTimeout(5);
      await expect(page.getByText('Test template', { exact: true })).not.toBeVisible();
    });

    test('Should only contain the mock templates when templates are loaded from azure endpoint', async ({ page }) => {
      await page.goto('/templates');
      await page.getByText('Local', { exact: true }).click();
      await page.getByText('Use Endpoint', { exact: true }).click();
      await page.getByLabel('Categories').click();
      await page.getByText('Automation', { exact: true }).click();

      await page.waitForTimeout(5);

      await expect(page.getByText('Azure Business', { exact: false })).not.toBeVisible();
    });
  }
);
