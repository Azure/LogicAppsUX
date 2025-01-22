import { expect, test } from '@playwright/test';
import { GoToMockTemplatesGallery } from './utils/GoToTemplate';

test.describe(
  'Template Filters Tests',
  {
    tag: '@mock',
  },
  () => {
    test('Search through names should show valid template cards', async ({ page }) => {
      await page.goto('/templates');

      await GoToMockTemplatesGallery(page);

      await page.getByPlaceholder('Search').fill('Mock');

      await expect(page.getByText('[Mock] Basic Workflow Only')).toBeVisible();
      await expect(page.getByText('[Mock] Simple Accelerator')).toBeVisible();
      await expect(page.getByText('[Mock] Simple Connection')).toBeVisible();

      await page.getByPlaceholder('Search').fill('Basic Workflow Only');

      await expect(page.getByText('[Mock] Basic Workflow Only')).toBeVisible();
      await expect(page.getByText('[Mock] Simple Accelerator')).not.toBeVisible();
      await expect(page.getByText('[Mock] Simple Connection')).not.toBeVisible();

      expect(true).toBeTruthy();
    });

    test('Search through tags should show valid template cards', async ({ page }) => {
      await page.goto('/templates');

      await GoToMockTemplatesGallery(page);

      await page.getByPlaceholder('Search').fill('Mock');

      await expect(page.getByText('[Mock] Basic Workflow Only')).toBeVisible();
      await expect(page.getByText('[Mock] Simple Accelerator')).toBeVisible();
      await expect(page.getByText('[Mock] Simple Connection')).toBeVisible();

      await page.getByPlaceholder('Search').fill('try catch');

      await expect(page.getByText('[Mock] Basic Workflow Only')).toBeVisible();
      await expect(page.getByText('[Mock] Simple Accelerator')).not.toBeVisible();
      await expect(page.getByText('[Mock] Simple Connection')).not.toBeVisible();

      await page.getByPlaceholder('Search').fill('Simple-Connection-Parameter');

      await expect(page.getByText('[Mock] Basic Workflow Only')).not.toBeVisible();
      await expect(page.getByText('[Mock] Simple Accelerator')).not.toBeVisible();
      await expect(page.getByText('[Mock] Simple Connection')).toBeVisible();
    });

    test('Only all and Workflows tabs should show blank workflow card', async ({ page }) => {
      await page.goto('/templates');

      await GoToMockTemplatesGallery(page);

      await page.getByRole('tab', { name: 'All' }).click();
      await expect(page.getByText('Blank workflow', { exact: true })).toBeVisible();

      await page.getByRole('tab', { name: 'Workflows' }).click();
      await expect(page.getByText('Blank workflow', { exact: true })).toBeVisible();

      await page.getByRole('tab', { name: 'Accelerators' }).click();
      await expect(page.getByText('Blank workflow', { exact: true })).not.toBeVisible();
    });
  }
);
