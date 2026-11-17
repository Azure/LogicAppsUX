import { expect, test, type Locator, type Page } from '@playwright/test';
import { getSerializedWorkflowFromStateV2 } from './utils/designerFunctions';
import { openSharedWorkflow } from './utils/sharedNodeUi';

async function connectHandles(page: Page, source: Locator, target: Locator) {
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) {
    throw new Error('The actual source and target connection handles must be mounted.');
  }
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 + 5, from.y + from.height / 2 + 5, { steps: 3 });
  await expect(page.locator('.react-flow__connection')).toBeVisible();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect(page.locator('.react-flow__connection')).toHaveCount(0);
}

for (const flag of ['true', 'false'] as const) {
  test.describe(`Shared node UI additional commands, flag ${flag}`, { tag: ['@mock', '@shared-node-ui'] }, () => {
    test('connects actual independent actions and rejects duplicate and self connections', async ({ page }) => {
      await openSharedWorkflow(page, 'General Run After', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      const source = page.locator('.react-flow__handle.source[data-nodeid="Compose"]');
      const target = page.locator('.react-flow__handle.target[data-nodeid="Execute_a_navigation_plan"]');
      await connectHandles(page, source, target);
      await expect
        .poll(async () => (await getSerializedWorkflowFromStateV2(page)).definition.actions.Execute_a_navigation_plan.runAfter)
        .toEqual({ ...before.definition.actions.Execute_a_navigation_plan.runAfter, Compose: ['SUCCEEDED'] });
      const connected = await getSerializedWorkflowFromStateV2(page);
      expect(connected.definition.actions.Compose).toEqual(before.definition.actions.Compose);
      expect(connected.definition.actions.Execute_a_navigation_plan.inputs).toEqual(
        before.definition.actions.Execute_a_navigation_plan.inputs
      );
      await connectHandles(page, source, target);
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(connected.definition.actions);
      await connectHandles(page, source, page.locator('.react-flow__handle.target[data-nodeid="Compose"]'));
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(connected.definition.actions);
    });

    test('duplicates through the actual keyboard command and preserves undo', async ({ page }) => {
      await openSharedWorkflow(page, 'General Run After', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      await page.locator('#msla-node-Compose').press('Enter');
      await page.locator('#msla-node-Compose').focus();
      await page.keyboard.press('ControlOrMeta+d');
      await expect
        .poll(async () => Object.keys((await getSerializedWorkflowFromStateV2(page)).definition.actions).length)
        .toBe(Object.keys(before.definition.actions).length + 1);
      const after = await getSerializedWorkflowFromStateV2(page);
      const duplicateId = Object.keys(after.definition.actions).find((id) => !before.definition.actions[id]);
      if (!duplicateId) {
        throw new Error('The actual duplicate command must create a new operation identity.');
      }
      expect(after.definition.actions[duplicateId].type).toBe(before.definition.actions.Compose.type);
      expect(after.definition.actions[duplicateId].inputs).toEqual(before.definition.actions.Compose.inputs);
      expect(after.definition.actions[duplicateId].runAfter).toEqual({ Compose: ['SUCCEEDED'] });
      await page.getByRole('button', { name: 'Undo', exact: true }).click();
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
    });

    test('cuts an actual multi-selection through its context menu without losing clipboard operations', async ({ page }) => {
      await openSharedWorkflow(page, 'General Run After', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      for (const id of ['Compose', 'Execute_a_navigation_plan']) {
        await page.locator(`[id="msla-node-${id}"]`).click({ modifiers: ['ControlOrMeta'] });
      }
      await page.locator('#msla-node-Compose').click({ button: 'right' });
      await expect(page.getByTestId('msla-bulk-cut-menu-option')).toHaveText('Cut 2 actions');
      await expect(page.getByTestId('msla-bulk-copy-menu-option')).toHaveText('Copy 2 actions');
      await page.getByTestId('msla-bulk-cut-menu-option').click();
      await expect(page.locator('#msla-node-Compose')).toHaveCount(0);
      await expect(page.locator('#msla-node-Execute_a_navigation_plan')).toHaveCount(0);
      const clipboard = JSON.parse(await page.evaluate(() => navigator.clipboard.readText()));
      expect(clipboard).toMatchObject({
        mslaNode: true,
        isMultiNode: true,
        edges: [],
        nodes: expect.arrayContaining([
          expect.objectContaining({
            nodeId: 'Compose-copy',
            nodeOperationInfo: expect.objectContaining({ type: before.definition.actions.Compose.type }),
            isScopeNode: false,
          }),
          expect.objectContaining({
            nodeId: 'Execute_a_navigation_plan-copy',
            nodeOperationInfo: expect.objectContaining({ type: before.definition.actions.Execute_a_navigation_plan.type }),
            isScopeNode: false,
          }),
        ]),
      });
      expect(clipboard.nodes).toHaveLength(2);
      const after = await getSerializedWorkflowFromStateV2(page);
      expect(after.definition.actions.Compose).toBeUndefined();
      expect(after.definition.actions.Execute_a_navigation_plan).toBeUndefined();
      expect(after.definition.actions.Initialize_test_var).toEqual(before.definition.actions.Initialize_test_var);
      await page.getByRole('button', { name: 'Undo', exact: true }).click();
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
    });
  });
}
