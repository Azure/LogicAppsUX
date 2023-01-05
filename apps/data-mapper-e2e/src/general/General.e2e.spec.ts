import { baseUrl } from '../utils';
import { test, expect } from '@playwright/test';

test('Data Mapper - General E2E', async ({ page }) => {
  await page.goto(baseUrl);

  await page.getByText('Select a map definition').click();

  await page.getByRole('option', { name: 'Short Demo Script MD' }).click();

  await page.getByTestId('rf__node-target-/ns0:Root/DirectTranslation').getByRole('button').nth(1).click();

  await page.getByTestId('rf__node-target-/ns0:Root/DirectTranslation/Employee').getByRole('button').nth(1).click();

  await expect(page.getByTestId('ToString-1')).toBeDefined();
  await page.getByTestId('ToString-1').getByRole('button').click();

  await page.getByTestId('inputDropdown-dropdown-0').locator('span:has-text("EmployeeID")').click();

  await page.getByRole('option', { name: 'Enter custom value' }).click();

  await page.getByTestId('inputDropdown-textField-0').click();

  await page.getByTestId('inputDropdown-textField-0').fill('Hello');

  await page.getByRole('button', { name: 'Show code' }).click();

  await expect(page.getByText('EmployeeName, string(Hello)')).toBeDefined();
});
