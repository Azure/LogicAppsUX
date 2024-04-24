import { test, expect } from '@playwright/test';

test(
  'Should be able to switch between Initialize Variable types',
  {
    tag: '@mock',
  },
  async ({ page }) => {
    await page.goto('/');
    await page.getByText('Select an option').click();
    await page.getByRole('option', { name: 'Recurrence' }).click();
    await page.getByRole('button', { name: 'Toolbox' }).click();
    await page.getByLabel('Insert a new step after').click();
    await page.getByText('Add an action').click();
    await page.getByPlaceholder('Search').click();
    await page.getByPlaceholder('Search').fill('initialize variable');
    await page.getByLabel('Initialize variable').click();
    await page.getByRole('paragraph').click();
    await page.getByLabel('Name').fill('test');
    await page.getByPlaceholder('Enter initial value').click();
    await page.getByRole('option', { name: 'true' }).click();
    await page.getByText('Boolean').click();
    await page.getByRole('option', { name: 'Integer' }).click();
    await page.getByLabel('Value').getByRole('paragraph').click();
    await page.getByLabel('Value').fill('test');
    await page
      .locator('#msla-node-details-panel-Initialize_variable div')
      .filter({ hasText: 'NametestAdd dynamic data or' })
      .first()
      .click();
    await expect(page.getByRole('alert')).toContainText('Enter a valid integer.');
    await page.getByLabel('Value').getByRole('paragraph').click();
    await page.getByLabel('Value').fill('12');
    await page
      .locator('#msla-node-details-panel-Initialize_variable div')
      .filter({ hasText: 'NametestAdd dynamic data or' })
      .first()
      .click();

    const serialized: any = await page.evaluate(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const state = (window as any).DesignerStore.getState();
          resolve((window as any).DesignerModule.serializeBJSWorkflow(state));
        }, 5000);
      });
    });
    expect(serialized.definition.actions.Initialize_variable.inputs.variables[0].type).toBe('integer');
    expect(serialized.definition.actions.Initialize_variable.inputs.variables[0].value).toEqual(12);

    await page.getByText('Integer').click();
    await page.getByRole('option', { name: 'Boolean' }).click();
    await page.getByPlaceholder('Enter initial value').click();
    await page.getByRole('option', { name: 'true' }).click();
    const serialized2: any = await page.evaluate(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const state = (window as any).DesignerStore.getState();
          resolve((window as any).DesignerModule.serializeBJSWorkflow(state));
        }, 5000);
      });
    });
    expect(serialized2.definition.actions.Initialize_variable.inputs.variables[0].type).toBe('boolean');
    expect(serialized2.definition.actions.Initialize_variable.inputs.variables[0].value).toEqual(true);
  }
);
