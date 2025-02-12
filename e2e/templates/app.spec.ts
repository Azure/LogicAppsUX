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
  }
);
