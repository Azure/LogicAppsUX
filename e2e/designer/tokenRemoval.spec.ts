import test, { expect } from '@playwright/test';
import { GoToMockWorkflow } from './utils/GoToWorkflow';
import { getSerializedWorkflowFromState } from './utils/designerFunctions';

test.describe(
  'Token Picker Tests',
  {
    tag: '@mock',
  },
  async () => {
    test('Tokens should be removed from parameters when operation is deleted', async ({ page }) => {
      await page.goto('/');
      await GoToMockWorkflow(page, 'Panel');
      const serializedOld: any = await getSerializedWorkflowFromState(page);
      expect(serializedOld.definition.actions.Filter_array.inputs.from).toEqual("@{body('Parse_JSON')}test");
      await page.getByLabel('Parse JSON operation, Data').click({
        button: 'right',
      });
      await page.getByText('Delete', { exact: true }).click();
      await page.getByRole('button', { name: 'OK' }).click();
      const serializedNew: any = await getSerializedWorkflowFromState(page);
      expect(serializedNew.definition.actions.Filter_array.inputs.from).toEqual('test');
    });
    test('Tokens should be removed from parameters when variable is deleted', async ({ page }) => {
      await page.goto('/');

      await GoToMockWorkflow(page, 'Panel');
    });
    test('Tokens should be removed from parameters when workflow parameter is deleted', async ({ page }) => {
      await page.goto('/');

      await GoToMockWorkflow(page, 'Panel');
    });
  }
);
