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
      await expect(page.getByText('Workflow name*', { exact: true })).toBeVisible();
      await page.getByText('Stateless', { exact: true }).click();
      await page.getByRole('tab', { name: 'Review + create' }).click();
      await expect(page.getByText('Create a new workflow from template', { exact: true })).toBeVisible();
      await page.getByText('Template details').click();
      await expect(page.getByText('Workflow name')).toBeVisible();
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
      await page.getByTestId('template-footer-primary-button').click();
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

    test('Should show basics tab for consumption workflow when it is create view and tabs to be enabled.', async ({ page }) => {
      await page.goto('/templates');
      await page.getByText('Local', { exact: true }).click();
      await page.getByText('Consumption', { exact: true }).click();
      await page.getByText('Create View', { exact: true }).click();
      await page.getByLabel('Categories').click();
      await page.getByText('Mock', { exact: true }).click();
      await page.getByText('[Mock] Simple Parameters', { exact: false }).click();
      await page.getByRole('button', { name: 'Use this template' }).click();
      await page.getByRole('tab', { name: 'Basics' }).click();
      await expect(page.getByText('Workflow name*', { exact: true })).toBeVisible();
      await expect(page.getByText('State type')).not.toBeVisible();

      await page.getByRole('button', { name: 'Next' }).click();
      await page.getByRole('tab', { name: 'Review + create' }).click();
    });

    test('Should show resource selection in basics tab for consumption workflow when it is create view.', async ({ page }) => {
      await page.goto('/templates');
      await page.getByText('Local', { exact: true }).click();
      await page.getByText('Consumption', { exact: true }).click();
      await page.getByText('Create View', { exact: true }).click();
      await page.getByText('Resource Selection', { exact: true }).click();
      await page.getByLabel('Categories').click();
      await page.getByText('Mock', { exact: true }).click();
      await page.getByText('[Mock] Simple Parameters', { exact: false }).click();

      await page.getByRole('button', { name: 'Use this template' }).click();
      await page.getByRole('tab', { name: 'Basics' }).click();
      await expect(page.getByText('Subscription 1', { exact: true })).toBeVisible();
      await expect(page.getByText('SecondRG', { exact: true })).toBeVisible();
      await expect(page.getByText('East US', { exact: true })).toBeVisible();
      await expect(page.getByText('Workflow name*', { exact: true })).toBeVisible();

      await page.getByRole('button', { name: 'Next' }).click();
      await page.getByRole('tab', { name: 'Review + create' }).click();

      await page.getByRole('tab', { name: 'Basics' }).click();
      await page.getByRole('button', { name: 'Close' }).click();
      await page.getByRole('combobox', { name: 'Gallery' }).click();
      await page.getByText('Simple Parameters', { exact: true }).click();
      await page.waitForTimeout(10);

      await page.getByRole('button', { name: 'Use this template' }).click();
      await page.getByRole('tab', { name: 'Basics' }).click();
      await expect(page.getByText('Subscription 1', { exact: true })).toBeVisible();
      await expect(page.getByText('SecondRG', { exact: true })).toBeVisible();
      await expect(page.getByText('East US', { exact: true })).toBeVisible();
      await expect(page.getByText('Workflow name*', { exact: true })).toBeVisible();

      await page.getByRole('button', { name: 'Next' }).click();
      await page.getByRole('tab', { name: 'Review + create' }).click();
    });

    test('Should disable navigation is resource selection in basics tab is invalid.', async ({ page }) => {
      await page.goto('/templates');
      await page.getByText('Local', { exact: true }).click();
      await page.getByText('Consumption', { exact: true }).click();
      await page.getByText('Create View', { exact: true }).click();
      await page.getByText('Resource Selection', { exact: true }).click();
      await page.getByLabel('Categories').click();
      await page.getByText('Mock', { exact: true }).click();
      await page.getByText('[Mock] Simple Parameters', { exact: false }).click();

      await page.getByRole('button', { name: 'Use this template' }).click();
      await page.getByRole('tab', { name: 'Basics' }).click();
      await page.getByText('Subscription 1', { exact: true }).click();
      await page.getByText('Subscription 2', { exact: true }).click();

      await expect(page.getByText('Please select a valid resource', { exact: false })).toBeVisible();

      const button = await page.getByRole('button', { name: 'Next' });
      expect(button).toBeDisabled();

      const tab = await page.getByRole('tab', { name: 'Parameters' });
      await expect(tab).toBeDisabled();
    });
  }
);
