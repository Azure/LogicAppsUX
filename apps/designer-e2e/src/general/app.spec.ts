import { baseUrl } from '../utils';
import { expect, test } from '@playwright/test';

test('Sanity Check', async ({ page }) => {
  await page.goto(baseUrl);

  await page.locator('[aria-label="Close React Query Devtools"]').click();
  await page.locator('div[role="button"]:has-text("🧰")').click();
  await page.locator('text=Simple Big Workflow').click();

  await page.locator('button[role="option"]:has-text("Simple Big Workflow")').click();
  await page.locator('div[role="button"]:has-text("🧰")').click();
  await page.locator('[data-testid="card-Increment variable 5"] div[role="button"]:has-text("Increment variable 5")').click();
  await page.locator('p:has-text("1")').click();
  await page.locator('button:has-text("Body")').click();
  await page.locator('text=Collapse/ExpandMore commands Parameters About Code View Settings ScratchNAMEt').click();
  await page.locator('button[role="tab"]:has-text("About")').click();
  await page.locator('button[role="tab"]:has-text("Code View")').click();
  await page.locator('button[role="tab"]:has-text("Settings")').click();
  await page.locator('button[role="tab"]:has-text("Settings")').click();
  await page.locator('text=Run After').click();

  expect(true).toBeTruthy();
});
