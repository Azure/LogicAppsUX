import type { Page } from '@playwright/test';

export const GoToRealWorkflow = async (page: Page, appName: string, workflowName: string) => {
  await page.getByPlaceholder('Select an App').click();
  await page.getByPlaceholder('Select an App').fill(appName);
  await page.getByPlaceholder('Select an App').press('Enter');
  await page.getByLabel('Workflow').locator('span').filter({ hasText: '' }).click();
  await page.getByRole('option', { name: workflowName }).click();
  await page.waitForSelector('[data-testid^="card-"]', { timeout: 30000 });
  await page.getByRole('button', { name: 'Toolbox' }).click();
  await page.getByLabel('Zoom view to fit').click({ force: true });
};

export const GoToMockWorkflow = async (page: Page, workflowName: string) => {
  await page.getByText('Local', { exact: true }).click();
  await page.getByText('Select an option').click();
  await page.getByRole('option', { name: workflowName, exact: true }).click();
  await page.waitForSelector('[data-testid^="card-"]', { timeout: 30000 });
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

/** Query parameters supported by the standalone designer's URL bootstrap. */
export interface MockWorkflowUrlOptions {
  /** Mock run file name (without extension). Implies monitoring view. */
  runFile?: string;
  plan?: 'standard' | 'consumption' | 'hybrid';
  language?: string;
  monitoringView?: boolean;
  readOnly?: boolean;
  darkMode?: boolean;
  customEditors?: boolean;
  showEdgeDrawing?: boolean;
  displayRuntimeInfo?: boolean;
  collapseGraphs?: boolean;
  suppressDefaultNodeSelect?: boolean;
  multiVariable?: boolean;
  queryCachePersist?: boolean;
  firstDesignerV2Load?: boolean;
  /** Keep the Dev Toolbox expanded. Defaults to collapsed for URL driven loads. */
  toolbox?: boolean;
  /** Route to load. Defaults to the designer v1 route. */
  route?: string;
}

export const buildMockWorkflowUrl = (workflowName: string, options: MockWorkflowUrlOptions = {}) => {
  const { route = '/', ...rest } = options;
  const params = new URLSearchParams({ workflow: workflowName });
  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined) {
      params.set(key, String(value));
    }
  }
  return `${route}?${params.toString()}`;
};

/**
 * Loads a mock workflow (and optionally a run file) straight from the URL, skipping the
 * Dev Toolbox interactions that `GoToMockWorkflow` needs. `workflowName` accepts the same
 * display name used by `GoToMockWorkflow` (e.g. 'Simple Big Workflow') or the underlying
 * mock file name (e.g. 'simpleBigworkflow').
 */
export const GoToMockWorkflowUrl = async (page: Page, workflowName: string, options: MockWorkflowUrlOptions = {}) => {
  await page.goto(buildMockWorkflowUrl(workflowName, options));
  await page.waitForSelector('[data-testid^="card-"]', { timeout: 30000 });
  await page.getByLabel('Zoom view to fit').click({ force: true });
};
