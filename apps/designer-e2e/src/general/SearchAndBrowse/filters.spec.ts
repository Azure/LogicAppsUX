import { baseUrl } from '../../utils';
import { expect, test } from '@playwright/test';

test('Connectors without a trigger get filters out of browse when filter is set to browse', async ({ page }) => {
  await page.goto(baseUrl);

  // await page.locator('[aria-label="Close React Query Devtools"]').click();
  await page.locator('div[role="button"]:has-text("🧰")').click();
  await page.locator('text=Simple Big Workflow').click();

  await page.locator('button[role="option"]:has-text("Empty/New")').click();
  await page.locator('div[role="button"]:has-text("🧰")').click();
  await page.getByTestId('card-Add a trigger').getByRole('button', { name: 'Add a trigger' }).click();

  await expect(page.locator('role=button[name="SFTP SFTP In App"]')).toHaveCount(1);
  await expect(page.locator('role=button[name="Test Connector Test Connector In App"]')).toHaveCount(0);
});

test('Connectors without a trigger are shown when filter is off', async ({ page }) => {
  await page.goto(baseUrl);
  // await page.locator('[aria-label="Close React Query Devtools"]').click();
  await page.locator('div[role="button"]:has-text("🧰")').click();
  await page.locator('text=Simple Big Workflow').click();
  await page.locator('button[role="option"]:has-text("Simple Big Workflow")').click();
  await page.locator('div[role="button"]:has-text("🧰")').click();
  await page.getByTestId('rf__edge-Response-Initialize_variable').getByRole('button', { name: 'Insert a new step' }).click();
  await page.getByRole('button', { name: 'Add an action' }).click();

  await expect(page.locator('role=button[name="SFTP SFTP In App"]')).toHaveCount(1);
  await expect(page.locator('role=button[name="Test Connector Test Connector In App"]')).toHaveCount(1);
});
