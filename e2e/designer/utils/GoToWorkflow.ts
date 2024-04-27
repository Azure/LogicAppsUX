import type { Page } from '@playwright/test';

export const GoToWorkflow = async (page: Page, appName: string, workflowName) => {
  await page.getByPlaceholder('Select an App').click();
  await page.getByPlaceholder('Select an App').fill(appName);
  await page.getByPlaceholder('Select an App').press('Enter');
  await page.getByLabel('Workflow').locator('span').filter({ hasText: '' }).click();
  await page.getByRole('option', { name: workflowName }).click();
  await page.getByRole('button', { name: 'Toolbox' }).click();
};
