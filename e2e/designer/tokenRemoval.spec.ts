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
      expect(JSON.stringify(serializedNew)).not.toContain("@body('Parse_JSON')");
      expect(JSON.stringify(serializedNew)).not.toContain("@{body('Parse_JSON')}");
    });
    test('Tokens should be removed from parameters when variable is deleted', async ({ page }) => {
      await page.goto('/');

      await GoToMockWorkflow(page, 'Panel');
      const serializedOld: any = await getSerializedWorkflowFromState(page);
      expect(serializedOld.definition.actions.Parse_JSON.inputs.content).toEqual(
        "@{triggerBody()?['string']}@{variables('ArrayVariable')}@{parameters('EILCO Admin Nominations-OCSA List (cr773_EILCOAdminNominations_OCSA_L2)')}"
      );
      expect(serializedOld.definition.actions.HTTP.inputs.body).toEqual("@variables('ArrayVariable')");
      await page.getByLabel('Initialize ArrayVariable operation').click({
        button: 'right',
      });
      await page.getByText('Delete', { exact: true }).click();
      await page.getByRole('button', { name: 'OK' }).click();
      const serializedNew: any = await getSerializedWorkflowFromState(page);
      expect(serializedNew.definition.actions.Parse_JSON.inputs.content).toEqual(
        "@{triggerBody()?['string']}@{parameters('EILCO Admin Nominations-OCSA List (cr773_EILCOAdminNominations_OCSA_L2)')}"
      );
      expect(serializedNew.definition.actions.HTTP.inputs.body).toBeUndefined();
      expect(JSON.stringify(serializedNew)).not.toContain("@variables('ArrayVariable')");
      expect(JSON.stringify(serializedNew)).not.toContain("@{variables('ArrayVariable')}");
    });

    test('Tokens should be removed from parameters when trigger is deleted', async ({ page }) => {
      await page.goto('/');

      await GoToMockWorkflow(page, 'Panel');
      const serializedOld: any = await getSerializedWorkflowFromState(page);
      expect
        .soft(serializedOld.definition.actions.Parse_JSON.inputs.content)
        .toEqual(
          "@{triggerBody()?['string']}@{variables('ArrayVariable')}@{parameters('EILCO Admin Nominations-OCSA List (cr773_EILCOAdminNominations_OCSA_L2)')}"
        );
      await page.getByTestId('card-manual').click({
        button: 'right',
      });
      await page.getByText('Delete', { exact: true }).click();
      await page.getByRole('button', { name: 'OK' }).click();
      const serializedNew: any = await getSerializedWorkflowFromState(page);
      expect(serializedNew.definition.actions.Parse_JSON.inputs.content).toEqual(
        "@{variables('ArrayVariable')}@{parameters('EILCO Admin Nominations-OCSA List (cr773_EILCOAdminNominations_OCSA_L2)')}"
      );
      expect(JSON.stringify(serializedNew)).not.toContain("@triggerBody()?['string']");
      expect(JSON.stringify(serializedNew)).not.toContain("@{triggerBody()?['string']}");
    });

    test('Tokens should be removed from parameters when workflow parameter is deleted', async ({ page }) => {
      await page.goto('/');

      await GoToMockWorkflow(page, 'Panel');
      const serializedOld: any = await getSerializedWorkflowFromState(page);
      expect(serializedOld.definition.actions.Parse_JSON.inputs.content).toEqual(
        "@{triggerBody()?['string']}@{variables('ArrayVariable')}@{parameters('EILCO Admin Nominations-OCSA List (cr773_EILCOAdminNominations_OCSA_L2)')}"
      );
      await page.getByRole('button', { name: 'Workflow Parameters' }).click();
      await page.getByTestId('parameter-edit-icon-button').click();
      await page.getByLabel('Delete Parameter').click();
      await page
        .locator('div')
        .filter({ hasText: /^Parameters$/ })
        .getByRole('button')
        .click();
      const serializedNew: any = await getSerializedWorkflowFromState(page);
      expect(serializedNew.definition.actions.Parse_JSON.inputs.content).toEqual(
        "@{triggerBody()?['string']}@{variables('ArrayVariable')}"
      );
      expect(JSON.stringify(serializedNew)).not.toContain(
        "@parameters('EILCO Admin Nominations-OCSA List (cr773_EILCOAdminNominations_OCSA_L2)')"
      );
      expect(JSON.stringify(serializedNew)).not.toContain(
        "@{parameters('EILCO Admin Nominations-OCSA List (cr773_EILCOAdminNominations_OCSA_L2)')}"
      );
    });
    test('Output should be correct when multiple tokens get removed by removing source', async ({ page }) => {
      await page.goto('/');

      await GoToMockWorkflow(page, 'Panel');
      const serializedOld: any = await getSerializedWorkflowFromState(page);
      expect(serializedOld.definition.actions.Parse_JSON.inputs.content).toEqual(
        "@{triggerBody()?['string']}@{variables('ArrayVariable')}@{parameters('EILCO Admin Nominations-OCSA List (cr773_EILCOAdminNominations_OCSA_L2)')}"
      );
      await page.getByRole('button', { name: 'Workflow Parameters' }).click();
      await page.getByTestId('parameter-edit-icon-button').click();
      await page.getByLabel('Delete Parameter').click();
      await page
        .locator('div')
        .filter({ hasText: /^Parameters$/ })
        .getByRole('button')
        .click();
      await page.getByLabel('Initialize ArrayVariable operation').click({
        button: 'right',
      });
      await page.getByText('Delete', { exact: true }).click();
      await page.getByRole('button', { name: 'OK' }).click();
      const serializedNew: any = await getSerializedWorkflowFromState(page);
      expect(serializedNew.definition.actions.Parse_JSON.inputs.content).toEqual("@triggerBody()?['string']");
      expect(JSON.stringify(serializedNew)).not.toContain("@variables('ArrayVariable')");
      expect(JSON.stringify(serializedNew)).not.toContain("@{variables('ArrayVariable')}");
      expect(JSON.stringify(serializedNew)).not.toContain(
        "@parameters('EILCO Admin Nominations-OCSA List (cr773_EILCOAdminNominations_OCSA_L2)')"
      );
      expect(JSON.stringify(serializedNew)).not.toContain(
        "@{parameters('EILCO Admin Nominations-OCSA List (cr773_EILCOAdminNominations_OCSA_L2)')}"
      );
      expect(JSON.stringify(serializedNew)).toContain("@{body('Parse_JSON')}test");
    });
  }
);
