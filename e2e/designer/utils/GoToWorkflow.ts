import type { Page } from '@playwright/test';

export const GoToRealWorkflow = async (page: Page, appName: string, workflowName: string) => {
  await page.getByPlaceholder('Select an App').click();
  await page.getByPlaceholder('Select an App').fill(appName);
  await page.getByPlaceholder('Select an App').press('Enter');
  await page.getByLabel('Workflow').locator('span').filter({ hasText: '' }).click();
  await page.getByRole('option', { name: workflowName }).click();
  await page.waitForTimeout(100);
  await page.getByRole('button', { name: 'Toolbox' }).click();
  await page.getByLabel('Zoom view to fit').click({ force: true });
};

export const GoToMockWorkflow = async (page: Page, workflowName: string) => {
  await page.goto('/');
  await page.getByText('Local', { exact: true }).click();
  await page.getByText('Select an option').click();
  await page.getByRole('option', { name: workflowName, exact: true }).click();
  await page.waitForTimeout(100);
  await page.getByRole('button', { name: 'Toolbox' }).click();
  await page.getByLabel('Zoom view to fit').click({ force: true });
};

export const LoadRunFile = async (page: Page, runName: string) => {
  await page.getByRole('button', { name: 'Toolbox' }).click();
  await page.getByRole('heading', { name: '▼ Context Settings' }).click();
  await page.getByText('Monitoring View', { exact: true }).click();
  await page.getByText('Select a run file to load').click();
  await page.getByRole('option', { name: runName, exact: true }).click();
  await page.getByRole('button', { name: 'Toolbox' }).click();
};

export const LoadMockDirect = async (page: Page, workflowName: string, runName?: string, plan = 'standard') => {
  await page.goto(`/?localId=${workflowName}${runName ? `&localRunId=${runName}` : ''}&plan=${plan}`);
};

export const LoadDirect = async (page: Page, workflowName: string, runName?: string, plan = 'standard') => {
  await page.goto(`/?id=${workflowName}${runName ? `&runId=${runName}` : ''}&plan=${plan}`);
};
