import { expect, test } from '@playwright/test';

test(
  'Sanity Check',
  {
    tag: '@mock',
  },
  async ({ page }) => {
    await page.goto('/');

    await page.getByText('Select an option').click();
    await page.getByRole('option', { name: 'Simple Big Workflow' }).click();
    await page.getByRole('button', { name: 'Toolbox' }).click();
    await page.getByTestId('card-Increment variable').getByRole('button').click();
    await page.getByLabel('Value').getByRole('paragraph').click();
    await page.getByLabel('Value').press('Escape');
    await page.getByRole('tab', { name: 'Code View' }).click();
    await page.getByRole('tab', { name: 'About' }).click();
    await page.getByRole('tab', { name: 'Settings' }).click();
    await page.getByRole('tab', { name: 'Parameters' }).click();
    await page.getByRole('tab', { name: 'Settings' }).click();
    await page.getByRole('button', { name: 'Expanded Run After, Click to Collapse' }).click();
    await page.getByRole('button', { name: 'Collapsed Run After, Click to Expand' }).click();
    await page.getByRole('button', { name: 'Expanded Tracking, Click to Collapse' }).click();
    await page.getByRole('button', { name: 'Collapsed Tracking, Click to Expand' }).click();
    await page.getByRole('button', { name: 'Expand Initialize variable' }).click();
    await page.getByRole('button', { name: 'Collapse Initialize variable' }).click();
    expect(true).toBeTruthy();
  }
);
