import { test, expect } from '@playwright/test';

test('Data Mapper - General E2E', async ({ page }) => {
  await page.goto('http://localhost:4200/');

  await page.getByText('Select a map definition').click();

  await page.getByRole('option', { name: 'Demo Script MD' }).click();

  await page.getByTestId('rf__node-target-/ns0:Root/DirectTranslation').getByRole('button').nth(1).click();

  await page.getByTestId('rf__node-target-/ns0:Root/DirectTranslation/Employee').getByRole('button').nth(1).click();

  await page.getByTestId('rf__node-target-/ns0:Root/DirectTranslation/Employee/ID').click();

  await expect(page.getByTestId('rf__node-source-/ns0:Root/DirectTranslation/EmployeeID')).toBeDefined();
});
