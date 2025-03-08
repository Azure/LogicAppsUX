import type { Page } from '@playwright/test';

export const GoToRealWorkflow = async (page: Page, appName: string, workflowName: string) => {
  await page.getByPlaceholder('Select an App').click();
  await page.getByPlaceholder('Select an App').fill(appName);
  await page.getByPlaceholder('Select an App').press('Enter');
  await page.getByLabel('Workflow').locator('span').filter({ hasText: '' }).click();
  await page.getByRole('option', { name: workflowName }).click();
  await page.waitForTimeout(100);
  await page.getByRole('button', { name: 'Toolbox' }).click();
  await page.getByLabel('fit view').click({ force: true });
};

export const GoToMockWorkflow = async (page: Page, workflowName: string) => {
  await page.getByText('Local', { exact: true }).click();
  await page.getByText('Select an option').click();
  await page.getByRole('option', { name: workflowName, exact: true }).click();
  await page.waitForTimeout(100);
  await page.getByRole('button', { name: 'Toolbox' }).click();
  await page.getByLabel('fit view').click({ force: true });
};

export const LoadRunFile = async (page: Page, runName: string) => {
  await page.getByRole('button', { name: 'Toolbox' }).click();
  await page.getByRole('heading', { name: '▼ Context Settings' }).click();
  await page.getByText('Monitoring View', { exact: true }).click();
  await page.getByText('Select a run file to load').click();
  await page.getByRole('option', { name: runName, exact: true }).click();
  await page.getByRole('button', { name: 'Toolbox' }).click();
};
