import { test, expect } from '@playwright/test';
import { GoToMockWorkflow } from '../utils/GoToWorkflow';
import { getSerializedWorkflowFromState } from '../utils/designerFunctions';

test(
  'Should be able to switch between Initialize Variable types',
  {
    tag: '@mock',
  },
  async ({ page }) => {
    await page.goto('/');
    await GoToMockWorkflow(page, 'Recurrence');
    await page.getByLabel('Insert a new step after').click();
    await page.getByText('Add an action').click();
    await page.getByPlaceholder('Search').click();
    await page.getByPlaceholder('Search').fill('initialize variable');
    await page.getByLabel('Initialize variables').click();
    await page.getByRole('textbox', { name: 'Enter variable name' }).getByRole('paragraph').click();
    await page.getByRole('textbox', { name: 'Enter variable name' }).fill('test');
    await page.getByText('Select variable type').click();
    await page.getByRole('option', { name: 'Integer' }).click();
    await page.getByRole('textbox', { name: 'Enter initial value' }).getByRole('paragraph').click();
    await page.getByRole('textbox', { name: 'Enter initial value' }).fill('test');
    await page
      .locator('#msla-node-details-panel-Initialize_variables div')
      .filter({ hasText: 'Variables*testname*testAdd' })
      .first()
      .click();
    await expect(page.locator('#msla-node-details-panel-Initialize_variables')).toContainText('Value must be a valid integer');
    await page.getByRole('textbox', { name: 'Enter initial value' }).getByRole('paragraph').click();
    await page.getByRole('textbox', { name: 'Enter initial value' }).fill('12');
    await page
      .locator('#msla-node-details-panel-Initialize_variables div')
      .filter({ hasText: 'Variables*testname*testAdd' })
      .first()
      .click();

    const serialized: any = await getSerializedWorkflowFromState(page);
    expect(serialized.definition.actions.Initialize_variables.inputs.variables[0].type).toBe('integer');
    expect(serialized.definition.actions.Initialize_variables.inputs.variables[0].value).toEqual(12);

    await page.getByText('Integer').click();
    await page.getByRole('option', { name: 'Boolean' }).click();
    await page.getByLabel('Clear custom value').click();
    await page.getByPlaceholder('Enter initial value').click();
    await page.getByRole('option', { name: 'true' }).click();
    const serialized2: any = await getSerializedWorkflowFromState(page);
    expect(serialized2.definition.actions.Initialize_variables.inputs.variables[0].type).toBe('boolean');
    expect(serialized2.definition.actions.Initialize_variables.inputs.variables[0].value).toEqual(true);
  }
);
