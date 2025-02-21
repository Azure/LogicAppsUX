import { expect, test } from '../../fixtures/real-api';
test.describe(
  'Nested loops',
  {
    tag: '@real',
  },
  () => {
    test('Sanity check', async ({ page, realDataApi }) => {
      await page.goto('/');
      const initialName = 'manual';
      const updatedName = 'manualUpdated';

      await realDataApi.goToWorkflow('NestedLoops');

      await page.getByTestId(`card-${initialName}`).getByRole('button', { name: initialName }).click();
      await page.getByLabel('Card title').click();
      await page.getByLabel('Card title').fill(updatedName);

      await expect(page.getByTestId('msla-panel-header-card-title')).toHaveValue('NestedLoops');

      await page.getByTestId('card-manual').getByRole('button', { name: 'manual' }).click();
      await realDataApi.saveWorkflow();
      await realDataApi.verifyWorkflowSaveWithRequest(200, 'test', updatedName);

      await page.getByTestId(`card-${updatedName}`).getByRole('button', { name: updatedName }).click();
      await expect(page.getByRole('textbox', { name: 'URL will be generated after' })).toBeVisible();
      await expect(page.locator('#Method424')).toContainText('Method');

      await page.getByLabel('Card title').click();
      await page.getByLabel('Card title').fill(initialName);

      await page.getByTestId('card-manual').getByRole('button', { name: 'manual' }).click();
      await realDataApi.saveWorkflow();
      await realDataApi.verifyWorkflowSaveWithRequest(200, 'test', initialName);
    });
  }
);
