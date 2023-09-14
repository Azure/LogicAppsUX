import { baseUrl } from '../utils';
import { expect, test } from '@playwright/test';

test('Sanity Check', async ({ page }) => {
  await page.goto(baseUrl);

  await page.locator('text=Select an option').click();
  await page.locator('button[role="option"]:has-text("Simple Big Workflow")').click();
  await page.locator('div[role="button"]:has-text("🧰")').click();

  await page.locator('[data-testid="card-Increment variable"] div[role="button"]:has-text("Increment variable")').click();
  await page.locator('p:has-text("1")').click();
  await page.getByRole('textbox', { name: 'Value' }).press('Escape');
  await page.locator('button[role="tab"]:has-text("About")').click();
  await page.locator('button[role="tab"]:has-text("Code View")').click();
  await page.locator('button[role="tab"]:has-text("Settings")').click();
  await page.locator('button[role="tab"]:has-text("Settings")').click();
  await page.locator('text=Run After').click();

  expect(true).toBeTruthy();
});
