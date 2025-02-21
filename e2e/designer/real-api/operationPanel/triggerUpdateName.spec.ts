import { expect, test } from '../../fixtures/real-api';
test.describe(
  'Trigger update name',
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

      await expect(page.getByTestId('msla-copy-input-control-textbox')).toHaveValue(/manual/);

      await page.getByTestId('card-manual').getByRole('button', { name: 'manual' }).click();
      await realDataApi.saveWorkflow();
      await page.waitForTimeout(4000);

      await realDataApi.verifyWorkflowSaveWithRequest(200, 'test', updatedName);
      await page.getByTestId('card-initialize_counter').getByRole('button', { name: 'Initialize counter' }).click();

      await page.getByTestId('card-manualUpdated').getByRole('button', { name: 'manualUpdated' }).click();
      await expect(page.getByTestId('msla-panel-header-card-title')).toHaveValue(/manualUpdated/);

      await page.getByLabel('Card title').click();
      await page.getByLabel('Card title').fill(initialName);

      await page.getByTestId('card-manual').getByRole('button', { name: 'manual' }).click();
      await realDataApi.saveWorkflow();
      await realDataApi.verifyWorkflowSaveWithRequest(200, 'test', initialName);
    });
  }
);
