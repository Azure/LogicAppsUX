import { expect, test } from '../../fixtures/real-api';

test.describe(
  'Connection parameters',
  {
    tag: '@real',
  },
  () => {
    test('Oauth connection parameters sanity check', async ({ page, realDataApi }) => {
      await page.goto('/');
      await realDataApi.goToWorkflow('OperationParameters');

      // Checks connection parameters are rendering correctly
      await expect(page.getByLabel('Get current weather operation')).toBeVisible();
      await page.getByLabel('Get current weather operation').click();
      await expect(page.getByRole('paragraph')).toBeVisible();
      await expect(page.getByRole('paragraph')).toContainText('Seattle');
    });
  }
);
