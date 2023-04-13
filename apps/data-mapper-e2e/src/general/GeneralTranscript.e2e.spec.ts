import { baseUrl } from '../utils';
import { test } from '@playwright/test';

test.describe('Data Mapper - General Transcript E2E', () => {
  test('Make connections', async ({ page }) => {
    await page.goto(baseUrl);

    /*     
    await page.getByText('Select a map definition').click();

    await page.getByRole('option', { name: 'Transcript' }).click();

    await page.getByTestId('rf__node-target-/ns0:Root/DirectTranslation').getByRole('button').nth(1).click();

    await page.getByTestId('rf__node-target-/ns0:Root/DirectTranslation/Employee').getByRole('button').nth(1).click();

    await page.getByTestId('rf__node-target-/ns0:Root/DirectTranslation/Employee/ID').getByRole('button').click();

    expect(page.getByTestId('inputDropdown-dropdown-0').locator('span:has-text("EmployeeID")')).toBeDefined();
    await page.getByTestId('inputDropdown-dropdown-0').locator('span:has-text("EmployeeID")').click();

    await page.getByRole('option', { name: 'Enter custom value' }).click();

    await page.getByTestId('inputDropdown-textField-0').click();

    await page.getByTestId('inputDropdown-textField-0').fill('Hello');

    await page.getByRole('button', { name: 'Show code' }).click(); */
    // TODO: Uncomment once entire Transcript map definition deserializes properly
    //await expect(page.getByText('EmployeeName, string(Hello)')).toBeDefined();
  });
});
