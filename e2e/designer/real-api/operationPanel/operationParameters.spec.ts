import { expect, test } from '../../fixtures/real-api';

test.describe(
  'Opeartion parameters',
  {
    tag: '@real',
  },
  () => {
    test('Parameters sanity check', async ({ page, realDataApi }) => {
      await page.goto('/');
      await realDataApi.goToWorkflow('OperationParameters');

      // Checks parameters are rendering correctly
      await expect(page.getByLabel('Get current weather operation')).toBeVisible();
      await page.getByLabel('Get current weather operation').click();
      await expect(page.getByRole('paragraph')).toBeVisible();
      await expect(page.getByRole('paragraph')).toContainText('Seattle');
    });
  }
);
