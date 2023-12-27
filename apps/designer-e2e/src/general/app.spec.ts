import { baseUrl } from '../utils';
import { expect, test } from '@playwright/test';

test('Sanity Check', async ({ page }) => {
  await page.goto(baseUrl);

  await page.getByText('Select an option').click();
  await page.getByRole('option', { name: 'Simple Big Workflow' }).click();
  await page.getByRole('button', { name: 'Toolbox' }).click();
  await page.getByTestId('card-Increment variable').getByRole('button', { name: 'Variables connector icon Increment variable' }).click();
  await page.getByLabel('Value').getByRole('paragraph').click();
  await page.getByLabel('Value').press('Escape');
  await page.getByRole('tab', { name: 'Code View' }).click();
  await page.getByRole('tab', { name: 'About' }).click();
  await page.getByRole('tab', { name: 'Settings' }).click();
  await page.getByRole('tab', { name: 'Parameters' }).click();
  await page.getByRole('tab', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Collapse Run After Run After' }).click();
  await page.getByRole('button', { name: 'Expand Run After Run After' }).click();
  await page.getByRole('button', { name: 'Collapse Tracking Tracking' }).click();
  await page.getByRole('button', { name: 'Expand Tracking Tracking' }).click();
  await page.getByRole('button', { name: 'Expand Initialize variable Initialize variable Initialize variable' }).click();
  await page.getByRole('button', { name: 'Collapse Initialize variable Initialize variable Initialize variable' }).click();
  expect(true).toBeTruthy();
});
