import { test, expect } from '@playwright/test';
import { GoToMockWorkflow } from './utils/GoToWorkflow';

test.describe(
  'Naming nodes tests',
  {
    tag: '@mock',
  },
  () => {
    test('Should collapse actions within scope', async ({ page }) => {
      await page.goto('/');
      await GoToMockWorkflow(page, 'Scope');

      // Rename actions

      // First action
      await page.getByTestId('card-initialize_variable').getByRole('button', { name: 'Initialize variable' }).click();
      await page.getByLabel('Card title').click();
      await page.getByLabel('Card title').fill('new name 1');

      // Second action
      await page.getByTestId('card-increment_variable_2').getByRole('button', { name: 'Increment variable' }).click();
      await page.getByLabel('Card title').click();
      await page.getByLabel('Card title').fill('new name 2');

      // Third action
      await page.getByTestId('card-increment_variable_3').getByRole('button', { name: 'Increment variable' }).click();
      await page.getByLabel('Card title').click();
      await page.getByLabel('Card title').fill('new name 3');

      // Save
      page.once('dialog', (dialog) => {
        console.log(`Dialog message: ${dialog.message()}`);
        dialog.dismiss().catch(() => {});
      });
      await page.getByRole('button', { name: 'Save' }).click();

      // Expect actions to keep their names
      await expect(page.getByTestId('card-new_name_1').getByRole('button', { name: 'new name' })).toBeVisible();
      await expect(page.getByTestId('card-new_name_2').getByRole('button', { name: 'new name' })).toBeVisible();
      await expect(page.getByTestId('card-new_name_3').getByRole('button', { name: 'new name' })).toBeVisible();
    });
  }
);
